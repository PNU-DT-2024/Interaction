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
const socket = io();

function setup() {
  const canvas = createCanvas(1280, 720);
  canvas.parent("container");

  video = createCapture(VIDEO, () => {
    video.size(1280, 720);
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
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });
  hands.onResults(onResults);

  const camera = new Camera(video.elt, {
    onFrame: async () => await hands.send({ image: video.elt }),
    width: 1280,
    height: 720,
  });
  camera.start();

  // QR관련 코드
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
        touched = true;
        closeLogged = false;
        lastApartTime = null;
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
          closeLogged = true;
          touched = false;
          lastApartTime = millis();
          imageSaved = false;
        }
      }
    } else {
      if (!lastApartTime) {
        lastApartTime = millis();
      } else if (millis() - lastApartTime > 5000 && !imageSaved) {
        saveOnlyShapes();
        imageSaved = true;
      }
    }

    noStroke();
    trajectory.forEach((pos, idx) => {
      fill(pos.color);
      drawGradientEllipse(
        pos.position.x,
        pos.position.y,
        pos.width,
        pos.height,
        pos.color
      );
    });
  } else {
    console.log("Video dimensions not set yet.");
  }
}

function drawGradientEllipse(x, y, w, h, baseColor) {
  for (let i = 0; i < 10; i++) {
    let inter = map(i, 0, 10, 0, 1);
    let c = lerpColor(baseColor, color(255), inter);
    fill(c);
    ellipse(x, y, w - i * (w / 10), h - i * (h / 10));
  }
}

function checkVideoDimensions() {
  console.log("Checking video dimensions:", video.width, video.height);
  if (video.width > 0 && video.height > 0) {
    console.log("Video dimensions set:", video.width, video.height);
  } else {
    console.log("Video dimensions not set yet.");
  }
}

function saveOnlyShapes() {
  let shapeCanvas = createGraphics(1280, 720);
  shapeCanvas.background(255);

  noStroke();
  trajectory.forEach((pos, idx) => {
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
    const formData = new FormData();
    formData.append("image", blob, "hand_art.png");

    fetch("/upload_image", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("Image uploaded successfully:", data);
        const absoluteUrl = `${window.location.origin}${data.url}`;
        displayQRCode(absoluteUrl);
        setTimeout(() => {
          hideQRCode();
          resetShapes(); // 원 초기화 함수 호출
        }, 30000);
      })
      .catch((error) => {
        console.error("Error uploading image:", error);
      });
  });
}

function drawGradientEllipseOnGraphics(pg, x, y, w, h, baseColor) {
  for (let i = 0; i < 10; i++) {
    let inter = map(i, 0, 10, 0, 1);
    let c = lerpColor(baseColor, color(255), inter);
    pg.fill(c);
    pg.ellipse(x, y, w - i * (w / 10), h - i * (h / 10));
  }
}

function displayQRCode(url) {
  const qrcodeContainer = document.getElementById("qrcode");
  qrcodeContainer.style.display = "block";
  if (!qrCode) {
    qrCode = new QRCode(qrcodeContainer, {
      text: url,
      width: 300,
      height: 300,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H,
    });
  } else {
    qrCode.makeCode(url);
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
}
