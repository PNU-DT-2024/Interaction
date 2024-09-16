let video;
let videoReady = false;
let predictions = [];
let boundingBoxes = [];
let isDrawing = false;
let trajectory = [];
let circlePosition = null;
let touched = false;
let closeLogged = false;
let lastApartTime = null;
let lastCircleTime = null; // 마지막 원 생성 시간 기록
let imgData;
let saveTriggered = false; // 이미지 저장이 한번만 되도록 플래그
let prevHandY = null; // 이전 손의 Y 좌표 저장 변수
let isMovingUp = false; // 손이 위로 움직이고 있는지 추적하는 변수
let handPairsDistanceThreshold = 20; // 두 손이 얼마나 가까워져야 원을 생성할지 기준값 (픽셀)

function setup() {
  const canvas = createCanvas(1280, 720);
  canvas.parent("container");

  // 웹캠 비디오 설정
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

  // Mediapipe Hands 설정
  const hands = new Hands({
    locateFile: (file) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
  });
  hands.setOptions({
    maxNumHands: 2, // 두 손만 인식
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
}

function onResults(results) {
  predictions = [];
  boundingBoxes = [];

  if (results.multiHandLandmarks && results.multiHandLandmarks.length == 2) {
    let hand1 = results.multiHandLandmarks[0];
    let hand2 = results.multiHandLandmarks[1];

    // 두 손의 9번 랜드마크 좌표 추출 (중지 손가락의 관절)
    const middleJoint1 = createVector(hand1[9].x * width, hand1[9].y * height);
    const middleJoint2 = createVector(hand2[9].x * width, hand2[9].y * height);

    // 두 손의 9번 랜드마크 사이 거리 계산
    const distanceBetweenMiddleJoints = dist(
      middleJoint1.x,
      middleJoint1.y,
      middleJoint2.x,
      middleJoint2.y
    );

    // 9번 랜드마크가 가까워졌을 때 (20 픽셀 이하일 때) 원을 생성
    const distanceThreshold = 20;

    if (distanceBetweenMiddleJoints < distanceThreshold) {
      // trajectory 배열에 원 추가
      trajectory.push({
        position: createVector(
          (middleJoint1.x + middleJoint2.x) / 2, // 두 손의 9번 랜드마크 중간 위치
          (middleJoint1.y + middleJoint2.y) / 2
        ),
        width: random(50, 100),
        height: random(50, 100),
        color: color(random(255), random(255), random(255)),
      });

      lastCircleTime = millis(); // 원 생성 시간 기록
      saveTriggered = false; // 새 원이 생성되면 저장 플래그 리셋
    }

    predictions.push(hand1, hand2);
  }
}

// 바운딩 박스를 계산하는 함수
function getBoundingBox(handLandmarks) {
  const xCoords = handLandmarks.map((landmark) => landmark.x);
  const yCoords = handLandmarks.map((landmark) => landmark.y);
  return {
    xMin: Math.min(...xCoords),
    xMax: Math.max(...xCoords),
    yMin: Math.min(...yCoords),
    yMax: Math.max(...yCoords),
  };
}

function draw() {
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

    // 저장된 원 그리기
    trajectory.forEach((pos) => {
      drawGlowingCircle(
        pos.position.x,
        pos.position.y,
        pos.width,
        pos.height,
        pos.color
      );
    });
  }

  // 5초 동안 원이 생성되지 않았으면 이미지를 저장
  if (lastCircleTime && millis() - lastCircleTime > 5000 && !saveTriggered) {
    saveImage(); // 이미지 저장
    saveTriggered = true; // 이미지 저장이 한번만 일어나도록 플래그 설정
  }
}

// 그라데이션 효과로 원을 그리는 함수
function drawGlowingCircle(x, y, w, h, baseColor) {
  colorMode(HSB, 360, 100, 100, 100);
  noStroke();
  push();
  translate(x, y);

  for (let i = 100; i > 0; i--) {
    fill(
      hue(baseColor),
      saturation(baseColor),
      brightness(baseColor),
      (10 / i) * 10
    );
    ellipse(0, 0, w + i * 5, h + i * 5);
  }

  fill(hue(baseColor), saturation(baseColor), brightness(baseColor), 20);
  ellipse(0, 0, w, h);

  pop();
}

// 이미지를 저장하는 함수
function saveImage() {
  console.log("저장할 이미지 생성 시작");

  if (trajectory.length === 0) {
    console.error("Trajectory is empty. No circles to save.");
    return;
  }

  // 원본 크기 (1280x720)를 400x600 크기로 축소
  let scaleX = 400 / 1280; // 가로 스케일링 비율
  let scaleY = 600 / 720; // 세로 스케일링 비율

  let pg = createGraphics(400, 600); // 이미지 크기를 400x600으로 설정
  pg.background(255); // 배경을 흰색으로 설정

  // trajectory 배열을 순회하면서 원을 그린다.
  trajectory.forEach((pos) => {
    // 좌표와 크기를 각각 축소된 비율에 맞게 조정
    let scaledX = pos.position.x * scaleX; // X 좌표 축소
    let scaledY = pos.position.y * scaleY; // Y 좌표 축소
    let scaledWidth = pos.width * scaleX; // 원의 가로 크기 축소
    let scaledHeight = pos.height * scaleY; // 원의 세로 크기 축소

    console.log(
      `원 좌표: (${scaledX}, ${scaledY}), 크기: (${scaledWidth}, ${scaledHeight})`
    );

    drawGlowingCircleOnGraphics(
      pg, // 그래픽 객체에 원을 그림
      scaledX,
      scaledY,
      scaledWidth,
      scaledHeight,
      pos.color
    );
  });

  // 날짜와 시간 정보를 하단에 추가
  pg.fill(0);
  pg.textSize(20);
  pg.textAlign(CENTER);
  let now = new Date();
  let dateString = `${now.getFullYear()}년 ${
    now.getMonth() + 1
  }월 ${now.getDate()}일 ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
  pg.text(dateString, pg.width / 2, pg.height - 30);

  // 캔버스를 이미지 데이터 URL로 변환
  const dataUrl = pg.canvas.toDataURL("image/png");
  console.log("이미지 데이터 URL:", dataUrl); // 이미지 데이터 URL 로그

  imgData = dataUrl;

  if (imgData) {
    // 서버에 이미지 업로드 요청
    fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: imgData }),
    })
      .then((response) => {
        console.log("응답 받음:", response); // 응답이 왔는지 확인
        return response.json();
      })
      .then((data) => {
        console.log("서버 응답 데이터:", data); // 서버에서 받은 데이터를 확인
        if (data.imageUrl) {
          console.log("이미지 업로드 성공, URL:", data.imageUrl);

          // 이미지 페이지로 리디렉션, URL 포함
          window.location.href = `/image_page.html?imageUrl=${encodeURIComponent(
            data.imageUrl
          )}`;
        } else {
          console.error("이미지 업로드 실패");
        }
      })
      .catch((error) => {
        console.error("이미지 업로드 중 오류 발생:", error);
      });
  } else {
    console.error("이미지 캡처 실패");
  }
}

// 그라데이션 원을 그래픽 객체에 그리는 함수
function drawGlowingCircleOnGraphics(pg, x, y, w, h, baseColor) {
  pg.colorMode(HSB, 360, 100, 100, 100);
  pg.noStroke();
  pg.push();
  pg.translate(x, y);

  for (let i = 100; i > 0; i--) {
    pg.fill(
      hue(baseColor),
      saturation(baseColor),
      brightness(baseColor),
      (10 / i) * 10
    );
    pg.ellipse(0, 0, w + i * 5, h + i * 5);
  }

  pg.fill(hue(baseColor), saturation(baseColor), brightness(baseColor), 20);
  pg.ellipse(0, 0, w, h);

  pg.pop();
}

function checkVideoDimensions() {
  console.log("Checking video dimensions:", video.width, video.height);
  if (video.width > 0 && video.height > 0) {
    console.log("Video dimensions set:", video.width, video.height);
  } else {
    console.log("Video dimensions not set yet.");
  }
}
