import logging
import cv2
import mediapipe as mp
import requests
import json
import time

# 로그 설정
logging.basicConfig(filename='hand_tracking.log', level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')

mp_hands = mp.solutions.hands
hands = mp_hands.Hands()
mp_drawing = mp.solutions.drawing_utils

def process_frame(frame):
    try:
        image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        image.flags.writeable = False
        results = hands.process(image)
        image.flags.writeable = True
        image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
        
        if results.multi_hand_landmarks:
            for hand_landmarks in results.multi_hand_landmarks:
                mp_drawing.draw_landmarks(image, hand_landmarks, mp_hands.HAND_CONNECTIONS)
        else:
            logging.debug("No hands detected in this frame.")

        return results
    except Exception as e:
        logging.error(f"Exception in process_frame: {e}")
        return None


def generate_bounding_boxes_and_landmarks(results):
    try:
        logging.debug("generate_bounding_boxes_and_landmarks() called")
        bounding_boxes = []
        multi_hand_landmarks = []

        if results and results.multi_hand_landmarks:
            for hand_landmarks in results.multi_hand_landmarks:
                x_coords = [landmark.x for landmark in hand_landmarks.landmark]
                y_coords = [landmark.y for landmark in hand_landmarks.landmark]
                bbox = {
                    'x': min(x_coords),
                    'y': min(y_coords),
                    'width': max(x_coords) - min(x_coords),
                    'height': max(y_coords) - min(y_coords)
                }
                bounding_boxes.append(bbox)
                landmarks = [{'x': landmark.x, 'y': landmark.y, 'z': landmark.z} for landmark in hand_landmarks.landmark]
                multi_hand_landmarks.append(landmarks)

        return bounding_boxes, multi_hand_landmarks
    except Exception as e:
        logging.error(f"Exception in generate_bounding_boxes_and_landmarks: {e}")
        return [], []

def video_feed():
    try:
        logging.debug("video_feed() started")
        cap = cv2.VideoCapture(0)
        if not cap.isOpened():
            logging.error("Error: Could not open video capture.")
            return

        logging.debug("Video capture opened.")
        while True:
            ret, frame = cap.read()
            if not ret:
                logging.error("Error: Failed to read frame.")
                break
            results = process_frame(frame)
            bounding_boxes, multi_hand_landmarks = generate_bounding_boxes_and_landmarks(results)
            data = {
                'boundingBoxes': bounding_boxes,
                'multiHandLandmarks': multi_hand_landmarks
            }
            try:
                response = requests.post('http://127.0.0.1:5000/data_update', json=data)
                if response.status_code != 200:
                    logging.error(f"Error: Failed to send data to server. Status code: {response.status_code}")
            except Exception as e:
                logging.error(f"Exception occurred while sending data to server: {e}")
            time.sleep(0.1)
    except Exception as e:
        logging.error(f"Exception in video_feed: {e}")

if __name__ == '__main__':
    video_feed()