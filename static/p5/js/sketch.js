let video;
let videoReady = false;
let predictions = [];
let boundingBoxes = [];
let trajectory = [];
let touched = false;
let closeLogged = false;
let circlePosition = null;
let lastApartTime = null;
let imageSaved = false;
let currentMessage = "";
let isDrawing = false;
let isQRGenerated = false; // QR 코드 생성 상태를 나타내는 변수
let qrCodeUrl = ""; // 생성된 QR 코드 URL 저장 변수

// 새로운 변수 추가
let handHoldingMessage = false;
let handshakeEndedMessage = false;
let imageSentMessage = false;
let handHoldingTime = 0;
let handshakeEndedTime = 0;
let imageSentTime = 0;

function setup() {
  createCanvas(1280, 720).parent("container");
  frameRate(30);

  video = createCapture(VIDEO, () => {
    video.size(1280, 720);
    video.hide();
  });

  video.elt.addEventListener("loadedmetadata", checkVideoDimensions);
  video.elt.addEventListener("canplay", () => {
    videoReady = true;
    console.log("비디오 준비 완료");
  });
  video.elt.addEventListener("error", (err) =>
    console.error("비디오 캡처 중 오류 발생:", err)
  );

  const hands = new Hands({
    locateFile: (file) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
  });
  hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7,
  });
  hands.onResults(onResults);

  const camera = new Camera(video.elt, {
    onFrame: async () => {
      if (videoReady) {
        await hands.send({ image: video.elt });
      }
    },
    width: 1280,
    height: 720,
  });
  camera.start();
}

function checkVideoDimensions() {
  console.log("비디오 크기 확인 중:", video.width, video.height);
  if (video.width > 0 && video.height > 0) {
    console.log("비디오 크기 설정됨:", video.width, video.height);
  } else {
    console.log("비디오 크기가 아직 설정되지 않음.");
  }
}

function onResults(results) {
  if (isQRGenerated) return; // QR 코드가 생성되면 동작하지 않음

  predictions = [];
  boundingBoxes = [];

  if (results.multiHandLandmarks) {
    for (let landmarks of results.multiHandLandmarks) {
      const xCoords = landmarks.map((landmark) => landmark.x);
      const yCoords = landmarks.map((landmark) => landmark.y);
      const bbox = {
        x: Math.min(...xCoords),
        y: Math.min(...yCoords),
        width: Math.max(...xCoords) - Math.min(...xCoords),
        height: Math.max(...yCoords) - Math.min(...yCoords),
      };
      boundingBoxes.push(bbox);
      predictions.push(landmarks);
    }
  }

  if (predictions.length >= 2) {
    const hand1 = predictions[0];
    const hand2 = predictions[1];

    const thumbTip1 = createVector(hand1[4].x * width, hand1[4].y * height);
    const thumbTip2 = createVector(hand2[4].x * width, hand2[4].y * height);

    if (thumbTip1.dist(thumbTip2) < 50) {
      if (!touched) {
        touched = true;
        closeLogged = false;
        lastApartTime = null;
        handHoldingMessage = true;
        handHoldingTime = millis();
        currentMessage = "손을 잡았다";
        console.log("손이 가까워짐. 손잡기 감지됨.");
      }
    } else {
      if (touched && !closeLogged) {
        const indexTip1 = createVector(hand1[9].x * width, hand1[9].y * height);
        const handHeight = ((hand1[0].y + hand2[0].y) / 2) * height;
        const ellipseWidth = random(50, 200);
        const ellipseHeight = map(handHeight, 0, height, 100, 300);
        circlePosition = indexTip1;
        trajectory.push({
          position: circlePosition,
          width: ellipseWidth,
          height: ellipseHeight,
          color: color(random(255), random(255), random(255)),
        });

        if (trajectory.length > 100) {
          trajectory.shift(); // 가장 오래된 경로 항목 제거
        }

        closeLogged = true;
        touched = false;
        lastApartTime = millis();
        imageSaved = false;
        currentMessage = "악수가 끝났습니다";
        isDrawing = true; // 원 생성 시작
        console.log("손이 떨어짐. 원 그리기 시작됨.");
      }
    }
  } else {
    if (!lastApartTime) {
      lastApartTime = millis();
      console.log("손이 감지되지 않음. 타이머 시작됨.");
    } else if (millis() - lastApartTime > 5000 && !imageSaved) {
      currentMessage = "이미지를 저장하려면 키보드 1을 누르세요";
      isDrawing = false; // 원 생성 종료
    }
  }
}

function draw() {
  if (isQRGenerated) {
    fill(255);
    rect(0, 0, width, height);
    fill(0);
    textSize(32);
    textAlign(CENTER, CENTER);
    text("QR 코드가 생성되었습니다.", width / 2, height / 2);
    return; // QR 코드 생성 시 다른 내용은 그리지 않음
  }

  background(255);

  if (!videoReady) {
    fill(0);
    textSize(32);
    textAlign(CENTER, CENTER);
    text("로딩 중...", width / 2, height / 2);
    return;
  }

  if (video.width > 0 && video.height > 0) {
    image(video, 0, 0, width, height);

    if (boundingBoxes.length > 0) {
      boundingBoxes.forEach((box, index) => {
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
          text("손", box.x * width, box.y * height - 10);
        }
      });
    }

    if (predictions.length > 0) {
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

    if (predictions.length >= 2) {
      const hand1 = predictions[0];
      const hand2 = predictions[1];

      const thumbTip1 = createVector(hand1[4].x * width, hand1[4].y * height);
      const thumbTip2 = createVector(hand2[4].x * width, hand2[4].y * height);

      if (thumbTip1.dist(thumbTip2) < 50) {
        if (!touched) {
          touched = true;
          closeLogged = false;
          lastApartTime = null;
          handHoldingMessage = true;
          handHoldingTime = millis();
          currentMessage = "손을 잡았다";
          console.log("손이 가까워짐. 손잡기 감지됨(draw 함수).");
        }
      } else {
        if (touched && !closeLogged) {
          stopDrawing(); // 악수 끝났을 때 호출하여 이미지 저장 및 업로드
          closeLogged = true;
          touched = false;
          console.log("손이 떨어짐(draw 함수). 원 그리기 중지됨.");
        }
      }
    } else {
      if (!lastApartTime) {
        lastApartTime = millis();
      } else if (millis() - lastApartTime > 5000 && !imageSaved) {
        currentMessage = "이미지를 저장하려면 키보드 1을 누르세요";
        isDrawing = false; // 원 생성 종료
        console.log("5초 경과(손 감지 안 됨). 이미지 저장 메시지 표시.");
      }
    }

    if (handHoldingMessage || handshakeEndedMessage || imageSentMessage) {
      fill(0);
      textSize(32);
      textAlign(CENTER, CENTER);
      text(currentMessage, width / 2, height / 2);

      if (handHoldingMessage && millis() - handHoldingTime > 2000) {
        handHoldingMessage = false;
        currentMessage = "";
        console.log("손잡기 메시지 시간 초과.");
      }

      if (handshakeEndedMessage && millis() - handshakeEndedTime > 2000) {
        handshakeEndedMessage = false;
        currentMessage = "";
        console.log("악수 종료 메시지 시간 초과.");
      }

      if (imageSentMessage && millis() - imageSentTime > 2000) {
        imageSentMessage = false;
        currentMessage = "";
        console.log("이미지 전송 메시지 시간 초과.");
      }
    }

    if (isDrawing) {
      trajectory.forEach((t) => {
        noFill();
        stroke(t.color);
        strokeWeight(2);
        ellipse(t.position.x, t.position.y, t.width, t.height);
        console.log("경로에 따라 타원 그리기 중.");
      });
    }
  }
}

function keyPressed() {
  if (key === "1") {
    stopDrawing(); // 모든 동작을 중지하고 이미지 저장
    noLoop(); // p5.js의 draw() 루프를 정지
    console.log(
      "키보드 1이 눌렸습니다. 모든 동작이 정지되고 이미지 저장 및 QR 코드 생성이 수행됩니다."
    );
  }
}

function stopDrawing() {
  isDrawing = false; // 원 생성 종료
  saveOnlyShapes(); // 이미지를 저장 및 업로드
  currentMessage = "악수가 끝났습니다";
  handshakeEndedMessage = true;
  handshakeEndedTime = millis();
  console.log("그리기 중지 및 이미지 저장.");
}

function saveOnlyShapes() {
  let shapeCanvas = createGraphics(1280, 720);
  shapeCanvas.background(255);

  console.log("도형 캔버스 생성됨.");

  noStroke();
  trajectory.forEach((pos) => {
    drawSimpleEllipseOnGraphics(
      shapeCanvas,
      pos.position.x,
      pos.position.y,
      pos.width,
      pos.height,
      pos.color
    );
  });

  console.log("도형 캔버스에 타원 그리기 완료.");

  shapeCanvas.canvas.toBlob((blob) => {
    console.log("도형 캔버스에서 Blob 생성됨.");

    const formData = new FormData();
    formData.append("file", blob, "hand_art.png");

    console.log("업로드를 위한 FormData 준비 완료.");

    fetch("https://interaction-beryl.vercel.app/api/upload", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.filePath) {
          qrCodeUrl = `/uploads/${path.basename(data.filePath)}`;
          console.log("이미지 업로드 성공. 파일 경로:", data.filePath);
          displayQRCode(qrCodeUrl); // QR 코드 생성
          console.log("QR 코드 생성 시작됨.");
        } else {
          console.error("이미지 업로드 오류:", data);
        }
      })
      .catch((error) => console.error("이미지 업로드 중 오류 발생:", error));
  });
}

function drawSimpleEllipseOnGraphics(g, x, y, w, h, c) {
  g.fill(c);
  g.ellipse(x, y, w, h);
  console.log(
    `도형 캔버스에 타원 그리기 중 (${x}, ${y}) 크기: 가로 ${w}, 세로 ${h}`
  );
}

function displayQRCode(imageUrl) {
  const qrCodeDiv = select("#qrcode");
  qrCodeDiv.html(""); // 기존 QR 코드 내용 삭제
  qrCodeDiv.style("display", "block"); // QR 코드 div 표시
  new QRCode(qrCodeDiv.elt, {
    text: imageUrl,
    width: 128,
    height: 128,
  });

  console.log("QR 코드가 생성되었습니다:", imageUrl);
  currentMessage = "QR 코드가 생성되었습니다.";
  imageSentMessage = true;
  imageSentTime = millis();
}
