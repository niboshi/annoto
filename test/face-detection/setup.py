#!/usr/bin/env python2

import os
import sys
import subprocess


THIS_DIR = os.path.dirname(os.path.realpath(__file__))


def run_script(name):
    ret = subprocess.call([
        sys.executable,
        os.path.join(THIS_DIR, name),
    ])
    if ret != 0:
        raise RutimeError()


def main():
    print("Downloading test images...")
    #run_script("download_test_images.py")

    print("Running face detector...")
    run_script("detect_faces.py")

    print("Completed!")

if __name__ == '__main__':
    main()
