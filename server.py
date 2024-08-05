from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit
import threading

app = Flask(__name__)
app.secret_key = 'secret!'
socketio = SocketIO(app, cors_allowed_origins="*")  # 모든 도메인에서의 소켓 연결을 허용

data = {}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/update_data', methods=['POST'])
def update_data():
    global data
    data = request.json
    socketio.emit('data_update', data)
    return jsonify(success=True)

@socketio.on('connect')
def handle_connect():
    print("Client connected")

@socketio.on('disconnect')
def handle_disconnect():
    print("Client disconnected")

def run_server():
    socketio.run(app, debug=True, use_reloader=False)

if __name__ == '__main__':
    server_thread = threading.Thread(target=run_server)
    server_thread.start()

    # Simulate hand_tracking.py running and sending data
    import hand_tracking
    hand_tracking.video_feed()
