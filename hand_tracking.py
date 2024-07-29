# hand_tracking.py

import cv2
import mediapipe as mp
import json
import asyncio
import websockets

mp_hands = mp.solutions.hands
hands = mp_hands.Hands(max_num_hands=2, min_detection_confidence=0.5, min_tracking_confidence=0.5)

async def send_data_to_server(data):
    uri = "ws://localhost:5000/ws"  # 서버 WebSocket URL로 변경하세요
    async with websockets.connect(uri) as websocket:
        await websocket.send(json.dumps(data))

def calculate_bounding_box(hand_landmarks):
    min_x = min(lm.x for lm in hand_landmarks)
    min_y = min(lm.y for lm in hand_landmarks)
    max_x = max(lm.x for lm in hand_landmarks)
    max_y = max(lm.y for lm in hand_landmarks)
    return {
        'x': min_x, 'y': min_y,
        'width': max_x - min_x, 'height': max_y - min_y
    }

def main():
    cap = cv2.VideoCapture(0)

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = hands.process(image)

        if results.multi_hand_landmarks:
            landmarks_data = []
            bounding_boxes = []

            for hand_landmarks in results.multi_hand_landmarks:
                landmarks = []
                for lm in hand_landmarks.landmark:
                    landmarks.append({'x': lm.x, 'y': lm.y, 'z': lm.z})
                landmarks_data.append(landmarks)
                bounding_boxes.append(calculate_bounding_box(hand_landmarks.landmark))

            data = {
                'multiHandLandmarks': landmarks_data,
                'boundingBoxes': bounding_boxes
            }

            asyncio.run(send_data_to_server(data))

        image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
        cv2.imshow('Hand Tracking', image)

        if cv2.waitKey(5) & 0xFF == 27:
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
