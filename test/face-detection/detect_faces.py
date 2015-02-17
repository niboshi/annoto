#!/usr/bin/env python2

import os
import sys
import cv2
import urllib
import yaml


THIS_DIR = os.path.dirname(os.path.realpath(__file__))
CACHE_DIR = os.path.join(THIS_DIR, '_cache')


def get_file_list(image_dir):
    filenames = os.listdir(image_dir)
    return [os.path.join(image_dir, _) for _ in filenames]


def get_face_detector():
    cascade_file = os.path.join(CACHE_DIR, 'detectors', 'haarcascade_frontalface_default.xml')
    if not os.path.isfile(cascade_file):
        url = 'https://raw.githubusercontent.com/Itseez/opencv/2.4.10.1/data/haarcascades/haarcascade_frontalface_default.xml'
        if not os.path.isdir(os.path.dirname(cascade_file)):
            os.makedirs(os.path.dirname(cascade_file))
        urllib.urlretrieve(url, cascade_file)

    face_cascade = cv2.CascadeClassifier(cascade_file)
    assert not face_cascade.empty()
    return face_cascade


def detect_faces(im, face_cascade):
    im = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(im, scaleFactor=1.3, minNeighbors=5)
    if len(faces) == 0:
        return []
    else:
        return faces.tolist()

def make_item_data(pk, faces):
    model_data = [dict(name='rect', data=face) for face in faces]
    model_data.append(dict(name='rect', current=True))
    item_data = {
        'pk': pk,
        'mime_type': 'image/jpeg',
        'model_data': model_data,
    }
    return item_data

def main():
    image_dir = os.path.join(THIS_DIR, 'images')
    db_dir = os.path.join(THIS_DIR, 'db', 'items')

    face_cascade = get_face_detector()

    if not os.path.isdir(db_dir):
        os.makedirs(db_dir)

    for image_path in get_file_list(image_dir):
        pk = os.path.basename(image_path)
        print(pk)

        im = cv2.imread(image_path)
        faces = detect_faces(im, face_cascade)
        if len(faces) == 0:
            continue

        item_data = make_item_data(pk, faces)
        item_yaml = yaml.safe_dump(item_data)
        with open(os.path.join(db_dir, pk + '.yml'), 'wb') as f:
            f.write(item_yaml)


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
