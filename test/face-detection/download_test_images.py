#!/usr/bin/env python2

import os
import re
import urllib
import json
import contextlib


THIS_DIR = os.path.dirname(os.path.realpath(__file__))


def download(url):
    # contextlib is to be eliminated in Python 3 where with statement is applicable.
    with contextlib.closing(urllib.urlopen(url)) as f:
        return f.read()


def download_files(out_dir):
    #done_file = os.path.join(out_dir, '__done')
    #if os.path.isfile(done_file):
    #    return

    limit = 100
    category_name = "People"
    query_api_url = 'https://commons.wikimedia.org/w/api.php?format=json&action=query&list=categorymembers&cmtitle=Category:{}&cmtype=file&cmlimit={}'.format(category_name, limit)
    results = json.loads(download(query_api_url))

    if not os.path.isdir(out_dir):
        os.makedirs(out_dir)

    for item in results['query']['categorymembers']:
        pageid = item['pageid']
        title = item['title']

        if not title.startswith('File:'):
            # should not happen though
            continue

        title = title[len('File:'):]

        # We download JPEG file only
        if not re.match(r'.*\.[jJ][pP](e|E|)[gG]$', title):
            continue

        print(title)
        title_quoted = urllib.quote(title.encode('utf8'))
        file_api_url = 'https://commons.wikimedia.org/w/api.php?format=json&action=query&list=allimages&aifrom={title:}&aito={title:}'.format(title=title_quoted)
        file_result = json.loads(download(file_api_url))
        file_url = file_result['query']['allimages'][0]['url']

        dst = os.path.join(out_dir, title)
        urllib.urlretrieve(file_url, dst)


    #with open(done_file, 'wb'):
    #    pass

def main():
    out_dir = os.path.join(THIS_DIR, 'images')
    download_files(out_dir)

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(1)
    except Exception:
        import traceback
        traceback.print_exc()

        import pdb
        pdb.post_mortem()
