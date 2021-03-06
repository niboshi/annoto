import sys
import os

import annoto

class Item(annoto.Item):
    def __init__(self, *args, **kwargs):
        self.paths = None

        super(Item, self).__init__(*args, **kwargs)

    def get_image_path(self):
        return os.path.join(self.server.get_files_dir(), self.pk)

    def get_thumb_image(self):
        try:
            import cv2
        except ImportError:
            raise RuntimeError("OpenCV 2.x python module is needed for thumbnail generation.")

        tw, th = 80, 60

        path = self.get_image_path()
        if isinstance(path, unicode):
            path = path.encode('utf8')
        im = cv2.imread(path)
        w, h = im.shape[1::-1]
        if w * th > tw * h:
            ww = tw
            hh = tw * h / w
        else:
            ww = th * w / h
            hh = th
        im = cv2.resize(im, (ww, hh), interpolation=cv2.INTER_LINEAR)

        _, data = cv2.imencode('.jpg', im)
        if not _:
            raise RuntimeError("Failed to encode image: {}".format(path))
        return data.tostring(), 'image/jpeg'


class Server(annoto.Server):
    item_cls = Item

    def get_files_dir(self):
        files_dir = self.config.get('files_dir', "./images")
        files_dir = os.path.realpath(os.path.join(self.root_dir, files_dir))
        return files_dir

    def get_item_pks(self):
        filenames = os.listdir(self.get_files_dir())
        return filenames

    def request_api(self, path, handler, qs):
        if path == 'thumb':
            pk = qs['pk'][0]
            db = self.get_database()
            item = db.load_item(pk)
            data, mime_type = item.get_thumb_image()
            handler.send_data(data, mime_type)
            return True

        else:
            return super(Server, self).request_api(path, handler, qs)


def main(args):
    annoto.run(args, server=Server())


if __name__ == '__main__':
    main(sys.argv[1:])
