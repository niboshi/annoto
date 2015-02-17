import os
import argparse
import yaml
import json
import re
import urlparse
import yaml

from SimpleHTTPServer import SimpleHTTPRequestHandler
import SocketServer as socket_server



SERVER = None

__mime_map = {
    '.jpg': 'image/jpeg',
    '.png': 'image/png',
}
def path_to_mime_type(path):
    ext = os.path.splitext(path)[-1].lower()
    mime = __mime_map.get(ext, None)
    return mime


class Item(object):
    fields = ['pk', 'mime_type', 'display', 'model_data']

    def __init__(self, server, pk=None, display=None, mime_type=None, model_data=None):
        assert server is not None
        for key in self.__class__.fields:
            setattr(self, key, None)

        self.server = server
        self.pk = pk
        self.display = display
        self.mime_type = mime_type
        self.model_data = model_data

        if self.mime_type is None:
            self.mime_type = path_to_mime_type(self.get_image_path())


    def to_dict(self):
        data = dict((_,getattr(self, _)) for _ in self.__class__.fields)
        return data

    def get_image_path(self):
        raise NotImplementedError()

    def get_image_data(self):
        path = self.get_image_path()
        with open(path, 'rb') as f:
            data = f.read()
        return data

    def __setitem__(self, key, value):
        self.set_field(key, value)

    def __getitem__(self, key):
        return self.get_field(key)

    def set_field(self, key, value):
        if not key in self.__class__.fields:
            raise ValueError("Invalid field key: {}".format(key))
        setattr(self, key, value)

    def get_field(self, key):
        if not key in self.__class__.fields:
            raise ValueError("Invalid field key: {}".format(key))
        return getattr(self, key)


class Database(object):
    def __init__(self, server, dirname, item_cls=None):
        assert server is not None

        self.server = server
        self.dir = dirname
        self.item_cls = item_cls

    def get_item_data_path(self, pk):
        return os.path.join(self.dir, 'items',  pk + '.yml')

    def load_item(self, pk):
        data_path = self.get_item_data_path(pk)
        if os.path.isfile(data_path):
            with open(data_path, 'r') as f:
                data = yaml.safe_load(f)
        else:
            data = {
                'pk': pk,
            }
        item = self.item_cls(self.server, **data)
        return item

    def write_item(self, item):
        pk = item.pk
        data = item.to_dict()
        data_path = self.get_item_data_path(pk)
        if not os.path.isdir(os.path.dirname(data_path)):
            os.makedirs(os.path.dirname(data_path))
        with open(data_path, 'wb') as f:
            f.write(yaml.safe_dump(data))


class JsonEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, Item):
            return o.to_dict()

        return super(JsonEncoder, self).default(o)


class HttpRequestHandler(SimpleHTTPRequestHandler):
    def get_server(self):
        return SERVER

    def do_POST(self):
        import cgi
        form = cgi.FieldStorage(
            fp=self.rfile,
            headers=self.headers,
            environ={
                'REQUEST_METHOD': 'POST',
                'CONTENT_TYPE': self.headers['Content-Type'],
            })
        qs = dict((key, [form[key].value]) for key in form.keys())

        r = self._process_request(self.path, qs)
        if not r:
            SimpleHTTPRequestHandler.do_GET(self)

    def do_GET(self):
        o = urlparse.urlparse(self.path)
        path = o.path
        qs = urlparse.parse_qs(o.query)

        r = self._process_request(path, qs)
        if not r:
            SimpleHTTPRequestHandler.do_GET(self)

    def _process_request(self, path, qs):
        m = re.match(r'/api/(.*)', path)
        if m:
            subpath = m.group(1)
            return self.get_server().request_api(subpath, self, qs)

        return False

    def translate_path(self, path):
        return self.get_server().translate_path(path)

    def send_json(self, obj):
        jdata = json.dumps(obj, cls=JsonEncoder)
        self.send_data(jdata, 'text/plain')

    def send_data(self, data, mime_type):
        self.send_response(200)
        self.send_header('Content-type', mime_type)
        self.end_headers()
        self.wfile.write(data)


class Server(object):
    item_cls = Item
    handler_cls = HttpRequestHandler

    def __init__(self):
        self.config = None
        self.root_dir = None

    def setup(self, root_dir):
        config_file = os.path.join(root_dir, "server-config.yml")

        if not os.path.isfile(config_file):
            raise RuntimeError("Server config file not found: {}".format(config_file))

        config = ServerConfig(config_file)

        self.root_dir = root_dir
        self.config = config

    def get_database(self):
        db_dir = self.config.get_path('annoto.database_dir')
        return Database(self, db_dir, item_cls=self.__class__.item_cls)

    def get_item_pks(self):
        raise NotImplementedError()

    def get_items(self):
        pks = self.get_item_pks()
        db = self.get_database()
        items = [db.load_item(pk) for pk in pks]
        return items

    def translate_path(self, path):
        document_root = self.config.get_path('annoto.document_root')
        path = urlparse.urlparse(path).path
        path = os.path.join(document_root, path[1:])
        return path

    def request_api(self, path, handler, qs):
        if path == 'list':
            items = self.get_items()
            handler.send_json(items)
            return  True

        elif path == 'get_item':
            pk = qs['pk'][0]
            db = self.get_database()
            item = db.load_item(pk)
            data = item.to_dict()
            handler.send_json(data)
            return  True

        elif path == 'image':
            pk = qs['pk'][0]
            db = self.get_database()
            item = db.load_item(pk)
            data = item.get_image_data()
            mime_type = item.mime_type
            handler.send_data(data, mime_type)
            return  True

        elif path == 'update_item':
            #
            # Query parameters
            # ----------------
            # json: JSON representation of [ [pk, { key1:val1, key2: val2, ... }], ... ]
            #     list of updates for each item
            #

            db = self.get_database()
            js = qs['json'][0]
            updates = json.loads(js)
            
            for pk, keyvals in updates:
                item = db.load_item(pk)
                for key,val in keyvals.items():
                    item.set_field(key, val)
                db.write_item(item)
            return  True

        return False

    def run(self):
        hostname = self.config.get('annoto.hostname', "")
        port = self.config.get('annoto.port', 8080)
        tcp_server = TCPServer((hostname, port), self.__class__.handler_cls)
        try:
            tcp_server.serve_forever()
        finally:
            tcp_server.server_close()


class TCPServer(socket_server.TCPServer):
    allow_reuse_address = True


class ServerConfig(object):
    def __init__(self, config_file):
        config_file = os.path.abspath(config_file)
        with open(config_file) as fi:
            self.data = yaml.safe_load(fi)

        self.config_dir = os.path.dirname(config_file)

    def __getitem__(self, key):
        return self.data[key]

    def get(self, key, default):
        return self.data.get(key, default)

    def get_path(self, key):
        path = self.data[key]
        path = os.path.realpath(os.path.join(self.config_dir, path))
        return path


def run_server(server):
    global SERVER
    SERVER = server

    server.run()


def run(args, server=None):
    parser = argparse.ArgumentParser(description="Sample Server")
    parser.add_argument('--root', type=str, required=True, help="Server root directory where server-config.yml settles.")
    a = parser.parse_args(args)

    root_dir = os.path.abspath(a.root)

    server.setup(root_dir)
    run_server(server)
