import os
import annoto
import annoto.plugins

import numpy as np
import cv2

import urllib


THIS_DIR = os.path.dirname(os.path.realpath(__file__))
CACHE_DIR = os.path.join(THIS_DIR, '_cache')

plugin_class = 'FaceDetectionPlugin'


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


class FaceDetectionPlugin(annoto.plugins.Plugin):
    def request_api(self, server, path, handler, qs):
        if path == 'plugin/facedetect':
            pk = qs['pk'][0]

            db = server.get_database()
            item = db.load_item(pk)
            image_data = item.get_image_data()
            image_data = np.fromstring(image_data, dtype=np.uint8)
            im = cv2.imdecode(image_data, flags=1)
            assert im is not None

            face_cascade = get_face_detector()
            faces = detect_faces(im, face_cascade)

            handler.send_json({
                'pk': pk,
                'faces': faces,
            })
            return True

        return False
