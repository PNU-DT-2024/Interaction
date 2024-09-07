let video;
let videoReady = false;
let predictions = [];
let boundingBoxes = [];
let isDrawing = false;
let handDetected = false; // 손 감지 여부를 추적하는 변수
let saveTriggered = false; // 키보드 1이 눌렸는지 여부를 추적하는 변수
let currentMessage = "";
let imgData;

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
  if (isDrawing) return; // 원 그리기 중이면 손 인식 처리 안 함

  predictions = [];
  boundingBoxes = [];
  handDetected = false; // 매 프레임마다 손이 감지되었는지 여부를 초기화

  if (results.multiHandLandmarks) {
    handDetected = true; // 손이 감지되었음을 표시
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

  if (handDetected && !isDrawing) {
    if (!saveTriggered) {
      currentMessage = "손이 감지되었습니다. 5초 후에 화면을 저장합니다.";
      setTimeout(() => {
        if (handDetected) {
          isDrawing = true; // 모든 기능 중지
          saveTriggered = true;
          currentMessage = "5초 경과. 화면을 저장 중입니다.";
          console.log("손이 감지되었습니다. 5초 후 화면 저장 시작.");
          saveImage();
        }
      }, 5000);
    }
  }
}

function draw() {
  if (isDrawing) {
    background(255); // 전체 화면을 흰색으로 채움
    fill(0);
    textSize(32);
    textAlign(CENTER, CENTER);
    text("손", width / 2, height / 2); // 중앙에 "손"이라는 텍스트를 그리기
    return; // 이미지를 저장한 후 화면에는 다른 내용을 그리지 않음
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
      boundingBoxes.forEach((box) => {
        noFill();
        stroke(0, 255, 0);
        strokeWeight(2);
        rect(
          box.x * width,
          box.y * height,
          box.width * width,
          box.height * height
        );
      });
    }

    if (predictions.length > 0) {
      predictions.forEach((hand) => {
        hand.forEach((landmark) => {
          fill(0, 0, 255);
          ellipse(landmark.x * width, landmark.y * height, 10, 10);
        });
      });
    }

    if (currentMessage) {
      fill(0);
      textSize(32);
      textAlign(CENTER, CENTER);
      text(currentMessage, width / 2, height / 2);
    }
  }
}

function saveImage() {
  // 캔버스 이미지를 데이터 URL 형식으로 가져오기
  const dataUrl = get().canvas.toDataURL("image/png");

  // imgData에 데이터 URL 저장
  imgData = dataUrl;

  // 데이터 URL을 서버로 전송하기
  if (imgData) {
    fetch("http://127.0.0.1:5500/api/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ image: imgData }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          console.error("이미지 업로드 오류:", data.error);
        } else {
          console.log("이미지 URL:", data.imageUrl);
          console.log("QR 코드 URL:", data.qrCodeUrl);
          // QR 코드 페이지로 리디렉션
          window.location.href = `/qrcode_page.html?imageUrl=${encodeURIComponent(
            data.imageUrl
          )}&qrCodeUrl=${encodeURIComponent(data.qrCodeUrl)}`;
        }
      })
      .catch((error) => {
        console.error("이미지 업로드 오류:", error);
        saveTriggered = false;
        isDrawing = false;
      });
  } else {
    console.error("imgData가 정의되지 않았습니다.");
  }
}
