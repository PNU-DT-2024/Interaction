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
let qrCode;
let initialHandY = null;

let handHoldingMessage = false;
let handHoldingTime = null;

let handshakeEndedMessage = false;
let handshakeEndedTime = null;

let imageSentMessage = false;
let imageSentTime = null;

let currentMessage = "";
let qrCodeGenerated = false; // QR 코드 생성 상태 추적
let qrCodeTimer = null; // QR 코드 타이머
let isDrawing = false; // 원 생성 상태를 나타내는 변수

const socket = io();

function setup() {
  createCanvas(1280, 720).parent("container"); // 캔버스를 'container' 요소에 추가
  frameRate(30); // 프레임 속도 설정

  video = createCapture(VIDEO, () => {
    video.size(1280, 720); // 해상도 줄이기
    video.hide();
    videoReady = true;
  });

  video.elt.addEventListener("loadedmetadata", checkVideoDimensions);
  video.elt.addEventListener("canplay", () => (videoReady = true));
  video.elt.addEventListener("error", (err) =>
    console.error("Error capturing video:", err)
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
    onFrame: async () => await hands.send({ image: video.elt }),
    width: 1280,
    height: 720,
  });
  camera.start();

  qrCode = new QRCode(document.getElementById("qrcode"), {
    text: "http://example.com",
    width: 300,
    height: 300,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H,
  });
}

function onResults(results) {
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

    const data = {
      boundingBoxes: boundingBoxes,
      multiHandLandmarks: predictions,
    };

    fetch("/update_data", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }).catch((error) => console.error("Error sending data to server:", error));
  }
}

function draw() {
  background(255);

  if (!videoReady) {
    fill(0);
    textSize(32);
    textAlign(CENTER, CENTER);
    text("Loading...", width / 2, height / 2);
    return;
  }

  if (video.width > 0 && video.height > 0) {
    image(video, 0, 0, width, height);

    // Draw bounding boxes and landmarks
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
          text("Hand", box.x * width, box.y * height - 10);
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
        }
      } else {
        if (touched && !closeLogged) {
          const indexTip1 = createVector(
            hand1[9].x * width,
            hand1[9].y * height
          );
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
            trajectory.shift(); // Remove the oldest trajectory item
          }

          closeLogged = true;
          touched = false;
          lastApartTime = millis();
          imageSaved = false;
          handshakeEndedMessage = true;
          handshakeEndedTime = millis();
          currentMessage = "악수가 끝났습니다";
          isDrawing = true; // 원 생성 시작
        }
      }
    } else {
      if (!lastApartTime) {
        lastApartTime = millis();
      } else if (millis() - lastApartTime > 5000 && !imageSaved) {
        saveOnlyShapes(); // Save and send image if 5 seconds have passed
        imageSaved = true;
        imageSentMessage = true;
        imageSentTime = millis();
        currentMessage = "이미지를 전송했습니다";
        isDrawing = false; // 원 생성 종료
      }
    }

    // Display current message if any
    if (handHoldingMessage || handshakeEndedMessage || imageSentMessage) {
      fill(0);
      textSize(32);
      textAlign(CENTER, CENTER);
      text(currentMessage, width / 2, height / 2);

      if (handHoldingMessage && millis() - handHoldingTime > 2000) {
        handHoldingMessage = false;
      }
      if (handshakeEndedMessage && millis() - handshakeEndedTime > 2000) {
        handshakeEndedMessage = false;
      }
      if (imageSentMessage && millis() - imageSentTime > 2000) {
        imageSentMessage = false;
      }
    }

    // Draw the trajectory
    noStroke();
    trajectory.forEach((pos) => {
      fill(pos.color);
      drawGradientEllipse(
        pos.position.x,
        pos.position.y,
        pos.width,
        pos.height,
        pos.color
      );
    });

    // Show drawing status
    if (isDrawing) {
      fill(0);
      textSize(24);
      textAlign(CENTER, CENTER);
      text("원이 생성되고 있습니다", width / 2, height / 2 - 50);
    }
  } else {
    console.log("Video dimensions not set yet.");
  }
}

function saveOnlyShapes() {
  let shapeCanvas = createGraphics(1280, 720); // 해상도 줄이기
  shapeCanvas.background(255);

  noStroke();
  trajectory.forEach((pos) => {
    shapeCanvas.fill(pos.color);
    drawGradientEllipseOnGraphics(
      shapeCanvas,
      pos.position.x,
      pos.position.y,
      pos.width,
      pos.height,
      pos.color
    );
  });

  shapeCanvas.canvas.toBlob((blob) => {
    if (!blob) {
      console.error("Failed to create Blob from canvas.");
      return;
    }

    // URL을 직접 지정하여 이미지 API에 POST 요청을 보냅니다.
    const formData = new FormData();
    formData.append("image", blob, "hand_art.png");

    fetch("https://api.example.com/upload_image", {
      // 실제 이미지 API URL로 변경 필요
      method: "POST",
      body: formData,
    })
      .then((response) => {
        if (!response.ok) {
          return response.text().then((text) => {
            throw new Error("Network response was not ok: " + text);
          });
        }
        return response.json();
      })
      .then((data) => {
        if (data.error) {
          throw new Error("Server error: " + data.error);
        }
        console.log("Image uploaded successfully:", data);
        const absoluteUrl = data.url; // 이미지 URL
        displayQRCode(absoluteUrl);
        qrCodeGenerated = true; // QR 코드 생성 상태 업데이트
        qrCodeTimer = millis(); // QR 코드 타이머 설정
      })
      .catch((error) => {
        console.error("Error uploading image:", error);
      });
  });
}

function displayQRCode(url) {
  const qrcodeContainer = document.getElementById("qrcode");
  qrcodeContainer.style.display = "block"; // QR 코드 영역을 표시합니다.
  qrcodeContainer.innerHTML = ""; // QR 코드 내용을 지웁니다.

  new QRCode(qrcodeContainer, {
    text: url,
    width: 300,
    height: 300,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H,
  });
}

function drawGradientEllipse(x, y, w, h, baseColor) {
  for (let i = 0; i < 10; i++) {
    let inter = map(i, 0, 10, 0, 1);
    let c = lerpColor(baseColor, color(255), inter);
    fill(c);
    ellipse(x, y, w - i * (w / 10), h - i * (h / 10));
  }
}

function drawGradientEllipseOnGraphics(pg, x, y, w, h, baseColor) {
  for (let i = 0; i < 10; i++) {
    let inter = map(i, 0, 10, 0, 1);
    let c = lerpColor(baseColor, color(255), inter);
    pg.fill(c);
    pg.ellipse(x, y, w - i * (w / 10), h - i * (h / 10));
  }
}

function hideQRCode() {
  const qrcodeContainer = document.getElementById("qrcode");
  qrcodeContainer.style.display = "none";
  qrcodeContainer.innerHTML = ""; // Clear the QR code
}

function resetShapes() {
  trajectory = [];
  circlePosition = null;
  lastApartTime = null;
  imageSaved = false;
  qrCodeGenerated = false; // QR 코드 생성 상태 리셋
  isDrawing = false; // 원 생성 상태 리셋
}

function checkVideoDimensions() {
  console.log("Checking video dimensions:", video.width, video.height);
  if (video.width > 0 && video.height > 0) {
    console.log("Video dimensions set:", video.width, video.height);
  } else {
    console.log("Video dimensions not set yet.");
  }
}
