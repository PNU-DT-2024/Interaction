from flask import Flask, render_template, request, send_file
from flask_socketio import SocketIO, emit
from PIL import Image, ImageDraw
import io

app = Flask(__name__, static_folder='static/p5', static_url_path='/static/p5')
socketio = SocketIO(app)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload():
    data = request.json
    trajectory = data.get('trajectory', [])
    
    # 이미지 생성
    img = Image.new('RGB', (800, 600), color='white')
    draw = ImageDraw.Draw(img)
    
    # 궤적 그리기
    for point in trajectory:
        x = point.get('x', 0)
        y = point.get('y', 0)
        draw.ellipse((x-5, y-5, x+5, y+5), fill='blue', outline='blue')
    
    # 이미지 파일로 변환
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='PNG')
    img_bytes.seek(0)
    
    # 클라이언트에 이미지 제공
    return send_file(img_bytes, mimetype='image/png', as_attachment=True, download_name='trajectory.png')

@socketio.on('connect')
def handle_connect():
    print("Client connected")
    emit('message', "Welcome to the server!")  # 클라이언트가 연결되면 환영 메시지 전송
    
@socketio.on('message')
def handle_message(message):
    print(f"Received message: {message}")
    emit('message', message, broadcast=True)


if __name__ == "__main__":
    socketio.run(app, port=5000, debug=True)
