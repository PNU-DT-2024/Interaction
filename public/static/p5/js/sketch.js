// node server.js
// http://127.0.0.1:5500/

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
let hands; // Hands 인스턴스
let camera; // Camera 인스턴스

// 원 크기 관련 변수 추가
let startingCircleSize = 80; // 첫 번째 원의 크기
let minCircleSize = 10; // 원의 최소 크기
let circleSizeDecrement = 30; // 원의 크기를 줄이는 값
let currentCircleSize = startingCircleSize; // 현재 원의 크기

function setup() {
  console.log("setup() 함수가 호출되었습니다.");

  const canvas = createCanvas(1280, 720);
  canvas.parent("container");

  // 기존의 hands와 camera 인스턴스가 있으면 종료
  if (hands) {
    hands.close();
    hands = null;
  }

  if (camera) {
    camera.stop();
    camera = null;
  }

  // 웹캠 비디오 설정
  if (video) {
    video.remove();
    video = null;
  }

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
  hands = new Hands({
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

  // 카메라 설정
  camera = new Camera(video.elt, {
    onFrame: async () => await hands.send({ image: video.elt }),
    width: 1280,
    height: 720,
  });
  camera.start();

  // **변수 초기화 상태 확인**
  // console.log("setup() 함수가 호출되었습니다.");
  // console.log("Setup 단계에서 변수 초기화 확인");
  // console.log("trajectory 초기화 상태:", trajectory);
  // console.log("saveTriggered 초기화 상태:", saveTriggered);
  // console.log("lastCircleTime 초기화 상태:", lastCircleTime);
}

function onResults(results) {
  console.log("onResults 함수가 호출되었습니다.");

  predictions = [];
  boundingBoxes = [];

  if (results.multiHandLandmarks && results.multiHandLandmarks.length == 2) {
    let hand1 = results.multiHandLandmarks[0];
    let hand2 = results.multiHandLandmarks[1];

    // 두 손의 9번 랜드마크 좌표 추출
    const middleJoint1 = createVector(hand1[9].x * width, hand1[9].y * height);
    const middleJoint2 = createVector(hand2[9].x * width, hand2[9].y * height);

    // 두 손의 9번 랜드마크 사이 거리 계산
    const distanceBetweenMiddleJoints = dist(
      middleJoint1.x,
      middleJoint1.y,
      middleJoint2.x,
      middleJoint2.y
    );

    // 9번 랜드마크가 가까워졌을 때 원을 생성
    const distanceThreshold = 20;

    if (distanceBetweenMiddleJoints < distanceThreshold) {
      console.log("원 생성됨");

      // 원의 크기를 설정
      let circleSize = currentCircleSize;

      // 최소 크기 이상일 때만 크기를 감소
      if (currentCircleSize > minCircleSize) {
        currentCircleSize -= circleSizeDecrement;
      }

      // trajectory 배열에 원 추가
      trajectory.push({
        position: createVector(
          (middleJoint1.x + middleJoint2.x) / 2,
          (middleJoint1.y + middleJoint2.y) / 2
        ),
        width: circleSize,
        height: circleSize,
        color: color(random(255), random(255), random(255)),
      });

      console.log("trajectory 배열 길이:", trajectory.length);

      lastCircleTime = Date.now(); // 수정: millis()에서 Date.now()로 변경
      console.log("lastCircleTime 업데이트:", lastCircleTime);

      saveTriggered = false; // 새 원이 생성되면 저장 플래그 리셋
      console.log("saveTriggered 상태:", saveTriggered);
    }

    predictions.push(hand1, hand2);
  }
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
  if (lastCircleTime && Date.now() - lastCircleTime > 5000 && !saveTriggered) {
    // console.log("saveImage() 함수 호출 조건 충족");
    // console.log("현재 시간:", Date.now());
    // console.log("마지막 원 생성 시간:", lastCircleTime);
    // console.log("시간 차이:", Date.now() - lastCircleTime);

    saveImage(); // 이미지 저장
    saveTriggered = true; // 이미지 저장이 한번만 일어나도록 플래그 설정
  } else {
    console.log("saveImage() 함수 호출 조건 미충족");
    console.log("lastCircleTime:", lastCircleTime);
    console.log("Date.now() - lastCircleTime:", Date.now() - lastCircleTime);
    console.log("saveTriggered:", saveTriggered);
  }
}

// 그라데이션 효과로 원을 그리는 함수
function drawGlowingCircle(x, y, w, h, baseColor) {
  colorMode(HSB, 360, 100, 100, 100);
  noStroke();
  push();
  translate(x, y);

  // 채도와 밝기를 높여 색상을 명료하고 화사하게 설정
  let adjustedSaturation = saturation(baseColor) * 1.5; // 채도를 150%로 증가
  let adjustedBrightness = brightness(baseColor) * 1.5; // 밝기를 150%로 증가
  adjustedSaturation = min(adjustedSaturation, 100); // 채도 최대값 제한
  adjustedBrightness = min(adjustedBrightness, 100); // 밝기 최대값 제한

  for (let i = 100; i > 0; i--) {
    fill(hue(baseColor), adjustedSaturation, adjustedBrightness, (14 / i) * 14);
    ellipse(0, 0, w + i * 5, h + i * 5);
  }

  fill(hue(baseColor), adjustedSaturation, adjustedBrightness, 50);
  ellipse(0, 0, w, h);

  pop();
}

// 이미지를 저장하는 함수
function saveImage() {
  console.log("saveImage() 함수가 호출되었습니다.");
  console.log("trajectory 배열 길이:", trajectory.length);

  if (trajectory.length === 0) {
    console.error("Trajectory is empty. No circles to save.");
    return;
  }

  // 원본 크기 (1280x720)를 400x700 크기로 축소
  let scaleX = 400 / 1280; // 가로 스케일링 비율
  let scaleY = 700 / 720; // 세로 스케일링 비율

  let pg = createGraphics(400, 700); // 이미지 크기를 400x600으로 설정
  pg.background(255); // 배경을 흰색으로 설정

  // 상단에 '너와 나의 관계' 텍스트 추가
  pg.fill(0, 0, 0);
  pg.textSize(40);
  pg.textAlign(CENTER, TOP); // 텍스트를 상단에 정렬
  pg.textStyle(BOLD);
  pg.text("너와 나의 관계", pg.width / 3, 20); // 상단에 텍스트 위치 설정

  // 날짜와 시간 정보를 하단에 추가
  pg.fill(0);
  pg.textSize(20);
  pg.textAlign(CENTER, BOTTOM); // 텍스트를 하단에 정렬
  pg.textStyle(NORMAL);
  let now = new Date();
  let dateString = `${now.getFullYear()}/ ${
    now.getMonth() + 1
  }/ ${now.getDate()}/ ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
  pg.text(dateString, pg.width / 2, pg.height - 10); // 하단에 텍스트 위치 설정

  // trajectory 배열을 순회하면서 원을 그린다.
  trajectory.forEach((pos) => {
    let scaledX = pos.position.x * scaleX; // X 좌표 축소
    let scaledY = pos.position.y * scaleY; // Y 좌표 축소
    let scaledWidth = pos.width * scaleX; // 원의 가로 크기 축소
    let scaledHeight = pos.height * scaleY; // 원의 세로 크기 축소

    drawGlowingCircleOnGraphics(
      pg, // 그래픽 객체에 원을 그림
      scaledX,
      scaledY,
      scaledWidth,
      scaledHeight,
      pos.color
    );
  });

  // 캔버스를 이미지 데이터 URL로 변환
  const dataUrl = pg.canvas.toDataURL("image/png");
  console.log("이미지 데이터 URL 생성 완료");

  // 이미지를 Cloudinary에 업로드
  uploadImageToCloudinary(dataUrl);
}

function uploadImageToCloudinary(imageData) {
  console.log("uploadImageToCloudinary() 함수가 호출되었습니다.");
  fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: imageData }),
  })
    .then((response) => {
      if (!response.ok) {
        // 서버에서 에러 응답을 보낸 경우
        return response.json().then((data) => {
          throw new Error(data.error || "Unknown server error");
        });
      }
      return response.json();
    })
    .then((data) => {
      if (data.imageUrl) {
        console.log("이미지 업로드 성공, URL:", data.imageUrl);
        // QR 코드 생성 및 이미지 페이지로 이동
        const qrCodeUrl = data.qrCodeUrl;
        window.location.href = `/image_page.html?imageUrl=${encodeURIComponent(
          data.imageUrl
        )}&qrCodeUrl=${encodeURIComponent(qrCodeUrl)}`;
      } else {
        console.error("이미지 업로드 실패");
      }
    })
    .catch((error) => {
      console.error("이미지 업로드 중 오류 발생:", error);
    })
    .finally(() => {
      // 업로드 후 변수 초기화
      trajectory = [];
      saveTriggered = false;
      lastCircleTime = null;
      currentCircleSize = startingCircleSize; // 원의 크기 초기화

      // 초기화 후 상태 확인
      // console.log("이미지 업로드 후 변수 초기화");
      // console.log("trajectory 초기화 상태:", trajectory);
      // console.log("saveTriggered 초기화 상태:", saveTriggered);
      // console.log("lastCircleTime 초기화 상태:", lastCircleTime);
    });
}

// 그라데이션 원을 그래픽 객체에 그리는 함수
function drawGlowingCircleOnGraphics(pg, x, y, w, h, baseColor) {
  pg.colorMode(HSB, 360, 100, 100, 100);
  pg.noStroke();
  pg.push();
  pg.translate(x, y);

  // 채도와 밝기를 높여 색상을 명료하고 화사하게 설정
  let adjustedSaturation = saturation(baseColor) * 1.5; // 채도를 150%로 증가
  let adjustedBrightness = brightness(baseColor) * 1.5; // 밝기를 150%로 증가
  adjustedSaturation = min(adjustedSaturation, 100); // 채도 최대값 제한
  adjustedBrightness = min(adjustedBrightness, 100); // 밝기 최대값 제한

  for (let i = 100; i > 0; i--) {
    pg.fill(
      hue(baseColor),
      adjustedSaturation,
      adjustedBrightness,
      (14 / i) * 14
    );
    pg.ellipse(0, 0, w + i * 5, +i * 5);
  }

  pg.fill(hue(baseColor), adjustedSaturation, adjustedBrightness, 50);
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
