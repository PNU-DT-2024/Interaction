// 1번 코드: 두 손이 인식되면 9번 위치에 원 생성

// 필요한 변수 선언
let handpose;
let video;
let predictions = [];

// setup 함수는 캔버스, 비디오 캡처 및 Mediapipe Hands를 초기화합니다.
function setup() {
  const canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent("canvas-container"); // 'canvas-container' id를 가진 div에 캔버스를 첨부합니다.
  video = createCapture(VIDEO);
  video.size(windowWidth, windowHeight);
  video.hide(); // HTML 비디오 요소를 숨기고, 대신 캔버스에 그릴 예정입니다.

  // Mediapipe Hands 초기화
  handpose = new Hands({
    locateFile: (file) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
  });
  handpose.setOptions({
    maxNumHands: 2, // 최대 2개의 손을 인식합니다.
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });
  handpose.onResults(onResults); // 손 인식 결과가 있을 때 호출되는 함수 설정

  // Mediapipe Camera Utils를 사용하여 비디오 스트림을 설정합니다.
  const camera = new Camera(video.elt, {
    onFrame: async () => {
      await handpose.send({ image: video.elt });
    },
    width: windowWidth,
    height: windowHeight,
  });
  camera.start(); // 카메라 시작
}

// Mediapipe Hands의 결과를 처리하는 함수
function onResults(results) {
  predictions = results.multiHandLandmarks;
}

// 매 프레임마다 호출되는 p5.js의 draw 함수
function draw() {
  image(video, 0, 0, width, height); // 비디오 프레임을 캔버스에 그림

  // 각 손의 ImList[9] 랜드마크가 인식되었을 때
  predictions.forEach((hand) => {
    if (hand && hand.length > 9) {
      const landmark = hand[9]; // 손의 9번째 랜드마크
      const x = landmark.x * width;
      const y = landmark.y * height;

      fill(0, 255, 0);
      noStroke();
      ellipse(x, y, 50, 50); // 고정된 크기의 원을 그림 (원하는 크기로 조정 가능)
    }
  });
}

//2번 코드: 두 손의 9번이 가까워지면 원 생성
// let video;
// let hands;
// let predictions = [];

// function setup() {
//   const canvas = createCanvas(windowWidth, windowHeight);
//   canvas.parent("canvas-container");

//   video = createCapture(VIDEO);
//   video.size(windowWidth, windowHeight);
//   video.hide();

//   hands = new Hands({
//     locateFile: (file) => {
//       return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
//     },
//   });

//   hands.setOptions({
//     maxNumHands: 2,
//     modelComplexity: 1,
//     minDetectionConfidence: 0.5,
//     minTrackingConfidence: 0.5,
//   });

//   hands.onResults(onResults);

//   const camera = new Camera(video.elt, {
//     onFrame: async () => {
//       await hands.send({ image: video.elt });
//     },
//     width: windowWidth,
//     height: windowHeight,
//   });

//   camera.start();
// }

// function onResults(results) {
//   predictions = results.multiHandLandmarks || [];
// }

// function draw() {
//   image(video, 0, 0, width, height);

//   if (predictions.length === 2) {
//     const hand1 = predictions[0];
//     const hand2 = predictions[1];

//     if (hand1.length > 0 && hand2.length > 0) {
//       const x1 = hand1[9].x * width;
//       const y1 = hand1[9].y * height;
//       const x2 = hand2[9].x * width;
//       const y2 = hand2[9].y * height;

//       const distance = dist(x1, y1, x2, y2);

//       // 원하는 거리 값으로 설정
//       const thresholdDistance = 50;

//       if (distance < thresholdDistance) {
//         fill(0, 0, 255, 150);
//         noStroke();
//         ellipse((x1 + x2) / 2, (y1 + y2) / 2, 50, 50);
//       }
//     }
//   }

//   drawLandmarks();
// }

// function drawLandmarks() {
//   predictions.forEach((hand) => {
//     for (let i = 0; i < hand.length; i++) {
//       const x = hand[i].x * width;
//       const y = hand[i].y * height;

//       fill(255, 0, 0);
//       noStroke();
//       ellipse(x, y, 10, 10);
//     }
//   });
// }
