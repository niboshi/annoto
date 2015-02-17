#!/usr/bin/env python2
import os
import urllib

urls = [
    'https://upload.wikimedia.org/wikipedia/commons/c/c4/Rana_%28skokan%29.JPG',
    'https://upload.wikimedia.org/wikipedia/commons/b/b7/Swallowtail_butterfly_-_Public_Domain.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/2/2b/Wild_duck_in_a_pond_%28public_domain%29_1.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/9/91/Flamingo_%28Germany%29.JPG',
]

def main():
    out_dir = os.path.join(os.path.dirname(os.path.realpath(__file__)), "images")
    if not os.path.isdir(out_dir):
        os.makedirs(out_dir)

    n = len(urls)
    for i, url in enumerate(urls):
        print("{} / {}".format(i+1, n))
        dst_file = os.path.join(out_dir, "{:03d}.jpg".format(i))
        urllib.urlretrieve(url, dst_file)

if __name__ == '__main__':
    main()
