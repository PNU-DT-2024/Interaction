let video;
let videoReady = false;
let predictions = [];
let boundingBoxes = [];
let trajectory = [];
let touched = false;
let closeLogged = false;
let circlePosition = null;
let lastLogTime = 0; // 마지막 로그 출력 시간
const logInterval = 5000; // 로그 출력 간격 (밀리초 단위, 5000ms = 5초)

const socket = io("http://127.0.0.1:5000"); // 서버의 URL과 포트 설정

socket.on("connect", () => {
  console.log("Socket.IO connection opened");
  socket.send("클라이언트와 서버 간의 WebSocket 연결이 성공적으로 수립");
});

socket.on("data_update", (data) => {
  const currentTime = Date.now();
  if (currentTime - lastLogTime >= logInterval) {
    console.log("sketch.js ) Data received from server:", data); // 데이터 수신 확인
  }
  if (data.boundingBoxes) {
    boundingBoxes = data.boundingBoxes;
    if (currentTime - lastLogTime >= logInterval) {
      console.log("sketch.js ) Bounding boxes updated:", boundingBoxes); // 경계 상자 데이터 확인
    }
  } else {
    if (currentTime - lastLogTime >= logInterval) {
      console.log("sketch.js ) No boundingBoxes in data.");
    }
  }
  if (data.multiHandLandmarks) {
    predictions = data.multiHandLandmarks;
    if (currentTime - lastLogTime >= logInterval) {
      console.log("sketch.js ) Predictions updated:", predictions); // 예측 데이터 확인
    }
  } else {
    if (currentTime - lastLogTime >= logInterval) {
      console.log("sketch.js ) No multiHandLandmarks in data.");
    }
  }
  if (currentTime - lastLogTime >= logInterval) {
    lastLogTime = currentTime; // 마지막 로그 출력 시간 갱신
  }
});

function setup() {
  const canvas = createCanvas(1280, 720); // 고정 크기로 캔버스 설정
  canvas.parent("container"); // 'container' div에 캔버스 첨부

  video = createCapture(VIDEO, () => {
    console.log("sketch.js ) Video capture started.");
    video.size(1280, 720); // 비디오 크기 설정
    video.hide(); // 비디오 요소를 숨깁니다.
    videoReady = true; // 비디오가 준비 상태로 설정
  });

  video.elt.addEventListener("loadedmetadata", () => {
    console.log("sketch.js ) Video metadata loaded.");
    checkVideoDimensions(); // 비디오 크기 확인
  });

  video.elt.addEventListener("canplay", () => {
    console.log("sketch.js ) Video can play");
    videoReady = true; // 비디오가 재생 가능한 상태로 변경
  });

  video.elt.addEventListener("error", (err) => {
    console.error("sketch.js ) Error capturing video:", err);
    console.log("sketch.js ) Detailed error:", JSON.stringify(err));
  });
}

function checkVideoDimensions() {
  console.log(
    "sketch.js ) Checking video dimensions:",
    video.width,
    video.height
  );
  if (video.width > 0 && video.height > 0) {
    console.log("sketch.js ) Video dimensions set:", video.width, video.height);
  } else {
    console.log("sketch.js ) Video dimensions not set yet.");
  }
}

function draw() {
  const currentTime = Date.now();
  background(255);

  if (currentTime - lastLogTime >= logInterval) {
    console.log("드로우 들어오긴 함");
  }

  // 비디오가 준비되기 전에는 로딩 메시지를 표시
  if (!videoReady) {
    fill(0);
    textSize(32);
    textAlign(CENTER, CENTER);
    text("Loading...", width / 2, height / 2);
    return;
  }

  // 비디오의 크기 정보가 설정되었는지 확인 (한 번만 호출되도록)
  if (video.width > 0 && video.height > 0) {
    image(video, 0, 0, width, height); // 비디오를 캔버스에 그리기

    // 손의 경계 상자를 그립니다
    if (boundingBoxes.length > 0) {
      if (currentTime - lastLogTime >= logInterval) {
        console.log("경계상자 그리는 중");
      }
      boundingBoxes.forEach((box, index) => {
        if (currentTime - lastLogTime >= logInterval) {
          console.log("각 경계상자: ", box);
        }
        noFill();
        stroke(0, 255, 0);
        strokeWeight(2);
        rect(
          box.x * width,
          box.y * height,
          box.width * width,
          box.height * height
        );

        if (index === 0) {
          fill(0, 255, 0);
          textSize(24);
          text("Hand", box.x * width, box.y * height - 10);
        }
      });
    }

    // 손의 랜드마크를 그립니다
    if (predictions.length > 0) {
      if (currentTime - lastLogTime >= logInterval) {
        console.log("랜드마크 그리는 중");
      }
      predictions.forEach((hand, index) => {
        hand.forEach((landmark, idx) => {
          if (index === 0 && idx === 9) {
            fill(255, 0, 0);
            ellipse(landmark.x * width, landmark.y * height, 15, 15);
            if (circlePosition) {
              fill(0, 255, 0);
              ellipse(circlePosition.x, circlePosition.y, 15, 15);
            }
          } else {
            fill(0, 0, 255);
            ellipse(landmark.x * width, landmark.y * height, 10, 10);
          }
        });
      });
    }

    // 악수를 감지하고 원 생성
    if (predictions.length >= 2) {
      const hand1 = predictions[0];
      const hand2 = predictions[1];

      const thumbTip1 = createVector(hand1[4].x * width, hand1[4].y * height);
      const thumbTip2 = createVector(hand2[4].x * width, hand2[4].y * height);

      if (thumbTip1.dist(thumbTip2) < 50) {
        touched = true;
        closeLogged = false; // 거리가 가까움을 기록하지 않음
      } else {
        if (touched && !closeLogged) {
          const indexTip1 = createVector(
            hand1[9].x * width,
            hand1[9].y * height
          );
          circlePosition = indexTip1;
          trajectory.push(circlePosition);
          closeLogged = true; // 거리가 멀어진 것을 기록
          touched = false; // 초기화
        }
      }
    }

    // 경로에 원을 그립니다
    trajectory.forEach((pos, idx) => {
      fill(0, 255, 0);
      ellipse(pos.x, pos.y, 10, 10);
    });

    if (currentTime - lastLogTime >= logInterval) {
      lastLogTime = currentTime; // 마지막 로그 출력 시간 갱신
    }
  } else {
    console.log("sketch.js ) Video dimensions not set yet.");
  }
}
