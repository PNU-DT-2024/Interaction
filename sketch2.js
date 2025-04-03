// let video;
// let videoReady = false;
// let predictions = [];
// let boundingBoxes = [];
// let isDrawing = false;
// let trajectory = [];
// let circlePosition = null;
// let touched = false;
// let closeLogged = false;
// let lastApartTime = null;
// let lastCircleTime = null; // 마지막 원 생성 시간 기록
// let imgData;
// let hand9Position = []; // 손 규칙 디버깅용 hand[9]의 위치를 저장할 변수
// let saveTriggered = false; // 이미지 저장이 한번만 되도록 플래그
// let prevHandY = null; // 이전 손의 Y 좌표 저장 변수
// let isMovingUp = false; // 손이 위로 움직이고 있는지 추적하는 변수
// let distanceThreshold = 20; // 두 손이 얼마나 가까워져야 원을 생성할지 기준값 (픽셀)
// let hands; // Hands 인스턴스
// let camera; // Camera 인스턴스

// // 이 밑 let, const 변수들 김경린이 쓰고 있음
// // 두 손 -> 한 손 순차 진행 아래 t/f 변수로 핸들링 중
// let bothHandsInRange = false; // 두 손이 범위 안에 있는지를 체크하는 변수
// let bothHandsDetected = false; // 두 손이 보였는지 추적하는 변수
// let oneHandRemaining = false; // 한 손만 남았는지 추적하는 변수
// let currentStep = 1; // 현재 단계 추적S
// const movementThreshold = 200;
// const apartThreshold = 50;
// //인식 범위(파란 박스 범위 여기서 수정)
// const handRange = {
//   // x 좌표 640 기준 200 넓이로 우선 해둠
//   xMin: 540, // 최소 X 좌표
//   xMax: 740, // 최대 X 좌표
//   yMin: 0, // 최소 Y 좌표
//   yMax: 720, // 최대 Y 좌표
// };

// function setup() {
//   //console.log("setup() 함수가 호출되었습니다.");

//   const canvas = createCanvas(1280, 720);
//   canvas.parent("container");

//   // 기존의 hands와 camera 인스턴스가 있으면 종료
//   if (hands) {
//     hands.close();
//     hands = null;
//   }

//   if (camera) {
//     camera.stop();
//     camera = null;
//   }

//   // 웹캠 비디오 설정
//   if (video) {
//     video.remove();
//     video = null;
//   }

//   video = createCapture(VIDEO, () => {
//     video.size(1280, 720);
//     video.hide();
//     videoReady = true;
//   });

//   video.elt.addEventListener("loadedmetadata", checkVideoDimensions);
//   video.elt.addEventListener("canplay", () => (videoReady = true));
//   video.elt.addEventListener("error", (err) =>
//     console.error("Error capturing video:", err)
//   );

//   // Mediapipe Hands 설정
//   hands = new Hands({
//     locateFile: (file) =>
//       `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
//   });
//   hands.setOptions({
//     maxNumHands: 2, // 두 손만 인식
//     modelComplexity: 1,
//     minDetectionConfidence: 0.5,
//     minTrackingConfidence: 0.5,
//   });
//   hands.onResults(onResults);

//   // 카메라 설정
//   camera = new Camera(video.elt, {
//     onFrame: async () => await hands.send({ image: video.elt }),
//     width: 1280,
//     height: 720,
//   });
//   camera.start();

//   // **변수 초기화 상태 확인**
//   // console.log("setup() 함수가 호출되었습니다.");
//   // console.log("Setup 단계에서 변수 초기화 확인");
//   // console.log("trajectory 초기화 상태:", trajectory);
//   // console.log("saveTriggered 초기화 상태:", saveTriggered);
//   // console.log("lastCircleTime 초기화 상태:", lastCircleTime);
// }

// /**
// function onResults(results) {
//   predictions = [];
//   boundingBoxes = [];
//   hand9Position = [];

//   if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
//     results.multiHandLandmarks.forEach((landmarks) => {
//       const hand9 = landmarks[9];
//       if (hand9) {
//         // 배열에 각 hand9의 위치 추가
//         hand9Position.push(createVector(hand9.x * width, hand9.y * height));
//       }

//       let minX = Infinity,
//         minY = Infinity,
//         maxX = -Infinity,
//         maxY = -Infinity;

//       landmarks.forEach((landmark) => {
//         let x = landmark.x * width;
//         let y = landmark.y * height;

//         minX = min(minX, x);
//         minY = min(minY, y);
//         maxX = max(maxX, x);
//         maxY = max(maxY, y);
//       });
//       boundingBoxes.push({ minX, minY, maxX, maxY });
//     });
//   }

//   if (results.multiHandLandmarks && results.multiHandLandmarks.length === 2) {
//     if (results.multiHandLandmarks) {
//       console.log("인식된 손의 개수:", results.multiHandLandmarks.length);
//     }

//     console.log("두 손 다 들어옴");
//     let hand1 = results.multiHandLandmarks[0];
//     let hand2 = results.multiHandLandmarks[1];

//     const middleJoint1 = createVector(hand1[9].x * width, hand1[9].y * height);
//     const middleJoint2 = createVector(hand2[9].x * width, hand2[9].y * height);

//     const distanceBetweenMiddleJoints = dist(
//       middleJoint1.x,
//       middleJoint1.y,
//       middleJoint2.x,
//       middleJoint2.y
//     );

//     // 두 손이 가까워질 때 원 생성
//     if (distanceBetweenMiddleJoints < distanceThreshold) {
//       if (!closeLogged) {
//         console.log("처음 원 생성됨");
//         // trajectory.push({
//         //   position: createVector(
//         //     (middleJoint1.x + middleJoint2.x) / 2,
//         //     (middleJoint1.y + middleJoint2.y) / 2
//         //   ),
//         //   width: random(50, 100),
//         //   height: random(50, 100),
//         //   color: color(random(255), random(255), random(255)),
//         // });
//         trajectory.push({
//           position: createVector(
//             middleJoint1.x, // 첫 번째 손의 중간 마디의 x 좌표
//             middleJoint1.y // 첫 번째 손의 중간 마디의 y 좌표
//           ),
//           width: random(50, 100),
//           height: random(50, 100),
//           color: color(random(255), random(255), random(255)),
//         });

//         closeLogged = true; // 원 생성 기록
//         lastCircleTime = Date.now(); // 시간 기록
//         saveTriggered = false; // 플래그 초기화
//       }

//       // 일정 거리 이상 움직였을 때만 원 생성
//       const currentPosition = createVector(
//         (middleJoint1.x + middleJoint2.x) / 2,
//         (middleJoint1.y + middleJoint2.y) / 2
//       );

//       const distanceMoved = dist(
//         circlePosition.x,
//         circlePosition.y,
//         currentPosition.x,
//         currentPosition.y
//       );

//       const movementThreshold = 200; // 200픽셀 이상 움직였을 때
//       if (
//         distanceMoved > movementThreshold &&
//         Date.now() - lastCircleTime > 500
//       ) {
//         console.log("원 생성됨");
//         console.log("지금 거리 : ", distanceMoved);
//         trajectory.push({
//           position: currentPosition.copy(),
//           width: random(50, 100),
//           height: random(50, 100),
//           color: color(random(255), random(255), random(255)),
//         });
//         circlePosition = currentPosition.copy(); // 위치 업데이트
//         lastCircleTime = Date.now(); // 시간 업데이트
//       }
//     } else if (closeLogged && distanceBetweenMiddleJoints > apartThreshold) {
//       // 손이 멀어진 경우
//       console.log("손이 떨어졌음, closeLogged 리셋");
//       closeLogged = false; // 원 생성 가능 상태로 리셋
//       saveImage(); // 이미지 저장 흐름 시작
//     }

//     predictions.push(hand1, hand2);
//   }
// }
// **/

// function onResults(results) {
//   predictions = [];
//   boundingBoxes = [];
//   hand9Position = [];

//   //손 규칙 디버깅 ([9]위치 & 핸드박스)
//   if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
//     results.multiHandLandmarks.forEach((landmarks) => {
//       const hand9 = landmarks[9];
//       if (hand9) {
//         hand9Position.push(createVector(hand9.x * width, hand9.y * height));
//       }

//       let minX = Infinity,
//         minY = Infinity,
//         maxX = -Infinity,
//         maxY = -Infinity;

//       landmarks.forEach((landmark) => {
//         let x = landmark.x * width;
//         let y = landmark.y * height;

//         minX = min(minX, x);
//         minY = min(minY, y);
//         maxX = max(maxX, x);
//         maxY = max(maxY, y);
//       });
//       boundingBoxes.push({ minX, minY, maxX, maxY });
//     });
//   }

//   if (results.multiHandLandmarks) {
//     if (results.multiHandLandmarks.length === 2) {
//       let hand1 = results.multiHandLandmarks[0];
//       let hand2 = results.multiHandLandmarks[1];

//       const middleJoint1 = createVector(
//         hand1[9].x * width,
//         hand1[9].y * height
//       );
//       const middleJoint2 = createVector(
//         hand2[9].x * width,
//         hand2[9].y * height
//       );

//       if (isHandInRange(middleJoint1) && isHandInRange(middleJoint2)) {
//         console.log("범위 안에 두 손이 들어옴");
//         bothHandsInRange = true; // 두 손이 범위 안에 있다는 상태로 설정
//         predictions.push(hand1, hand2);
//         oneHandRemaining = false; // 한 손 남은 상태 리셋
//       }
//     }

//     if (bothHandsInRange && results.multiHandLandmarks.length === 1) {
//       let hand = results.multiHandLandmarks[0];
//       const currentPosition = createVector(
//         hand[9].x * width,
//         hand[9].y * height
//       );

//       if (!circlePosition) {
//         circlePosition = currentPosition.copy();
//       }

//       let distanceMoved = dist(
//         currentPosition.x,
//         currentPosition.y,
//         circlePosition.x,
//         circlePosition.y
//       );

//       if (
//         distanceMoved > movementThreshold &&
//         Date.now() - lastCircleTime > 500
//       ) {
//         console.log("원 생성됨");
//         trajectory.push({
//           position: currentPosition.copy(),
//           width: random(50, 100),
//           height: random(50, 100),
//           color: color(random(255), random(255), random(255)),
//         });

//         circlePosition = currentPosition.copy();
//         lastCircleTime = Date.now();
//         closeLogged = true;
//       }

//       oneHandRemaining = true; // 한 손만 남은 상태 표시
//       console.log("두 손이 보인 후 한 손만 인식됨");
//     }

//     if (
//       bothHandsInRange &&
//       results.multiHandLandmarks.length === 2 &&
//       oneHandRemaining
//     ) {
//       console.log("다시 두 손이 인식됨, 이미지 저장 흐름 시작");
//       closeLogged = false; // 원 생성 가능 상태로 리셋
//       oneHandRemaining = false; // 한 손만 남은 상태 리셋
//       saveImage(); // 이미지 저장 흐름 시작
//       bothHandsInRange = false; // 상태 초기화
//     }
//   }
// }

// // 손이 범위 안에 있는지 체크하는 함수
// function isHandInRange(handPosition) {
//   return (
//     handPosition.x >= handRange.xMin &&
//     handPosition.x <= handRange.xMax &&
//     handPosition.y >= handRange.yMin &&
//     handPosition.y <= handRange.yMax
//   );
// }

// function draw() {
//   background(255);

//   if (!videoReady) {
//     fill(0);
//     textSize(32);
//     textAlign(CENTER, CENTER);
//     text("로딩 중...", width / 2, height / 2);
//     return;
//   }

//   if (video.width > 0 && video.height > 0) {
//     image(video, 0, 0, width, height);

//     // 인식 범위를 시각적으로 표시
//     noFill();
//     stroke(0, 0, 255); // 파란색 선으로 경계 표시
//     strokeWeight(2);
//     rect(
//       handRange.xMin,
//       handRange.yMin,
//       handRange.xMax - handRange.xMin,
//       handRange.yMax - handRange.yMin
//     );

//     // 저장된 원 그리기
//     trajectory.forEach((pos) => {
//       drawGlowingCircle(
//         pos.position.x,
//         pos.position.y,
//         pos.width,
//         pos.height,
//         pos.color
//       );
//     });
//   }

//   // 손 규칙 디버깅 [9]에 랜드마크 표시
//   hand9Position.forEach((pos) => {
//     fill(255, 0, 0); // 빨간색으로 표시
//     noStroke();
//     ellipse(pos.x, pos.y, 20, 20); // 원을 그린다
//   });
//   // 손 규칙 디버깅 손에 경계 상자 그리기
//   boundingBoxes.forEach((box) => {
//     stroke(0, 255, 0);
//     strokeWeight(2);
//     noFill();
//     rect(box.minX, box.minY, box.maxX - box.minX, box.maxY - box.minY);
//   });

//   // 5초 동안 원이 생성되지 않았으면 이미지를 저장
//   if (lastCircleTime && Date.now() - lastCircleTime > 5000 && !saveTriggered) {
//     console.log("saveImage() 함수 호출 조건 충족");
//     console.log("현재 시간:", Date.now());
//     console.log("마지막 원 생성 시간:", lastCircleTime);
//     console.log("시간 차이:", Date.now() - lastCircleTime);

//     saveImage(); // 이미지 저장
//     saveTriggered = true; // 이미지 저장이 한번만 일어나도록 플래그 설정
//   } else {
//     // console.log("saveImage() 함수 호출 조건 미충족");
//     // console.log("lastCircleTime:", lastCircleTime);
//     // console.log("Date.now() - lastCircleTime:", Date.now() - lastCircleTime);
//     // console.log("saveTriggered:", saveTriggered);
//   }
// }

// // 그라데이션 효과로 원을 그리는 함수
// function drawGlowingCircle(x, y, w, h, baseColor) {
//   colorMode(HSB, 360, 100, 100, 100);
//   noStroke();
//   push();
//   translate(x, y);

//   for (let i = 100; i > 0; i--) {
//     fill(
//       hue(baseColor),
//       saturation(baseColor),
//       brightness(baseColor),
//       (10 / i) * 10
//     );
//     ellipse(0, 0, w + i * 5, h + i * 5);
//   }

//   fill(hue(baseColor), saturation(baseColor), brightness(baseColor), 20);
//   ellipse(0, 0, w, h);

//   pop();
// }

// // 이미지를 저장하는 함수
// function saveImage() {
//   console.log("saveImage() 함수가 호출되었습니다.");
//   console.log("trajectory 배열 길이:", trajectory.length);

//   if (trajectory.length === 0) {
//     console.error("Trajectory is empty. No circles to save.");
//     return;
//   }

//   // 원본 크기 (1280x720)를 400x600 크기로 축소
//   let scaleX = 400 / 1280; // 가로 스케일링 비율
//   let scaleY = 600 / 720; // 세로 스케일링 비율

//   let pg = createGraphics(400, 600); // 이미지 크기를 400x600으로 설정
//   pg.background(255); // 배경을 흰색으로 설정

//   // trajectory 배열을 순회하면서 원을 그린다.
//   trajectory.forEach((pos) => {
//     let scaledX = pos.position.x * scaleX; // X 좌표 축소
//     let scaledY = pos.position.y * scaleY; // Y 좌표 축소
//     let scaledWidth = pos.width * scaleX; // 원의 가로 크기 축소
//     let scaledHeight = pos.height * scaleY; // 원의 세로 크기 축소

//     drawGlowingCircleOnGraphics(
//       pg, // 그래픽 객체에 원을 그림
//       scaledX,
//       scaledY,
//       scaledWidth,
//       scaledHeight,
//       pos.color
//     );
//   });

//   // 날짜와 시간 정보를 하단에 추가
//   pg.fill(0);
//   pg.textSize(20);
//   pg.textAlign(CENTER);
//   let now = new Date();
//   let dateString = `${now.getFullYear()}년 ${
//     now.getMonth() + 1
//   }월 ${now.getDate()}일 ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
//   pg.text(dateString, pg.width / 2, pg.height - 30);

//   // 캔버스를 이미지 데이터 URL로 변환
//   const dataUrl = pg.canvas.toDataURL("image/png");
//   console.log("이미지 데이터 URL 생성 완료");

//   // 이미지를 Cloudinary에 업로드
//   uploadImageToCloudinary(dataUrl);
// }

// function uploadImageToCloudinary(imageData) {
//   console.log("uploadImageToCloudinary() 함수가 호출되었습니다.");
//   fetch("/api/upload", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ image: imageData }),
//   })
//     .then((response) => {
//       if (!response.ok) {
//         // 서버에서 에러 응답을 보낸 경우
//         return response.json().then((data) => {
//           throw new Error(data.error || "Unknown server error");
//         });
//       }
//       return response.json();
//     })
//     .then((data) => {
//       if (data.imageUrl) {
//         console.log("이미지 업로드 성공, URL:", data.imageUrl);
//         // QR 코드 생성 및 이미지 페이지로 이동
//         const qrCodeUrl = data.qrCodeUrl;
//         window.location.href = `/image_page.html?imageUrl=${encodeURIComponent(
//           data.imageUrl
//         )}&qrCodeUrl=${encodeURIComponent(qrCodeUrl)}`;
//       } else {
//         console.error("이미지 업로드 실패");
//       }
//     })
//     .catch((error) => {
//       console.error("이미지 업로드 중 오류 발생:", error);
//     })
//     .finally(() => {
//       // 업로드 후 변수 초기화
//       trajectory = [];
//       saveTriggered = false;
//       lastCircleTime = null;

//       // 초기화 후 상태 확인
//       console.log("이미지 업로드 후 변수 초기화");
//       console.log("trajectory 초기화 상태:", trajectory);
//       console.log("saveTriggered 초기화 상태:", saveTriggered);
//       console.log("lastCircleTime 초기화 상태:", lastCircleTime);
//     });
// }

// // 그라데이션 원을 그래픽 객체에 그리는 함수
// function drawGlowingCircleOnGraphics(pg, x, y, w, h, baseColor) {
//   pg.colorMode(HSB, 360, 100, 100, 100);
//   pg.noStroke();
//   pg.push();
//   pg.translate(x, y);

//   for (let i = 100; i > 0; i--) {
//     pg.fill(
//       hue(baseColor),
//       saturation(baseColor),
//       brightness(baseColor),
//       (10 / i) * 10
//     );
//     pg.ellipse(0, 0, w + i * 5, h + i * 5);
//   }

//   pg.fill(hue(baseColor), saturation(baseColor), brightness(baseColor), 20);
//   pg.ellipse(0, 0, w, h);

//   pg.pop();
// }

// function checkVideoDimensions() {
//   console.log("Checking video dimensions:", video.width, video.height);
//   if (video.width > 0 && video.height > 0) {
//     console.log("Video dimensions set:", video.width, video.height);
//   } else {
//     console.log("Video dimensions not set yet.");
//   }
// }

// let myvideo;
// let videoReady = false;
// let predictions = [];
// let boundingBoxes = [];
// let isDrawing = false;
// let trajectory = [];
// let circlePosition = null;
// let touched = false;
// let closeLogged = false;
// let lastApartTime = null;
// let lastCircleTime = null; // 마지막 원 생성 시간 기록
// let imgData;
// let hand9Position = []; // 손 규칙 디버깅용 hand[9]의 위치를 저장할 변수
// let saveTriggered = false; // 이미지 저장이 한번만 되도록 플래그
// let prevHandY = null; // 이전 손의 Y 좌표 저장 변수
// let isMovingUp = false; // 손이 위로 움직이고 있는지 추적하는 변수
// let distanceThreshold = 20; // 두 손이 얼마나 가까워져야 원을 생성할지 기준값 (픽셀)
// let hands; // Hands 인스턴스
// let camera; // Camera 인스턴스
// const vWidth = 1280; // 정혜
// const vHeight = 720; // 정혜

// // 이 밑 let, const 변수들 김경린이 쓰고 있음
// // 두 손 -> 한 손 순차 진행 아래 t/f 변수로 핸들링 중
// let bothHandsInRange = false; // 두 손이 범위 안에 있는지를 체크하는 변수
// let bothHandsDetected = false; // 두 손이 보였는지 추적하는 변수
// let oneHandRemaining = false; // 한 손만 남았는지 추적하는 변수
// let currentStep = 1; // 현재 단계 추적
// const movementThreshold = 200;
// const apartThreshold = 50;
// //인식 범위(파란 박스 범위 여기서 수정)
// const handRange = {
//   // x 좌표 640 기준 200 넓이로 우선 해둠
//   xMin: 540, // 최소 X 좌표
//   xMax: 740, // 최대 X 좌표
//   yMin: 0, // 최소 Y 좌표
//   yMax: 720, // 최대 Y 좌표
// };

// function setup() {
//   const canvas = createCanvas(1280, 720); // 정혜
//   canvas.parent("container");

//   const videoConstraints = {
//     video: {
//       deviceId:
//         "de494e5691c2e9164904d248b9b1ef78570e775da86024713120887b610636da", // Brio 100의 deviceId
//     },
//   };

//   // 기존의 hands와 camera 인스턴스가 있으면 종료
//   if (hands) {
//     hands.close();
//     hands = null;
//   }

//   if (camera) {
//     camera.stop();
//     camera = null;
//   }

//   // 웹캠 비디오 설정
//   // if (video) {
//   //   video.remove();
//   //   video = null;
//   // }

//   // Mediapipe Hands 설정
//   hands = new Hands({
//     locateFile: (file) =>
//       `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
//   });

//   hands.setOptions({
//     maxNumHands: 2, // 두 손만 인식
//     modelComplexity: 1,
//     minDetectionConfidence: 0.5,
//     minTrackingConfidence: 0.5,
//   });

//   hands.onResults(onResults);

//   navigator.mediaDevices.enumerateDevices().then((devices) => {
//     devices.forEach((device) => {
//       if (device.kind === "videoinput") {
//         console.log("카메라 이름:", device.label);
//         console.log("카메라 ID:", device.deviceId);
//       }
//     });
//   });

//   myvideo = createCapture(videoConstraints, (stream) => {
//     myvideo.size(vWidth, vHeight); // 정혜 -> 여기서 카메라 사이즈 바꾸면 됨
//     // myvideo.hide();
//     videoReady = true;
//     console.log("비디오 준비 완료", stream);

//     // myvideo의 elt를 외장 웹캠으로 설정
//     const externalCamera = document.createElement("video");
//     externalCamera.srcObject = stream;
//     externalCamera.play();

//     myvideo.elt = externalCamera; // myvideo.elt를 외장 웹캠으로 업데이트
//     myvideo.srcObject = stream;

//     // 카메라 설정
//     camera = new Camera(myvideo.elt, {
//       width: vWidth,
//       height: vHeight,
//       onFrame: async () => {
//         await hands.send({ image: myvideo.elt });
//       },
//     });

//     camera.start();
//   });

//   myvideo.elt.addEventListener("error", (err) =>
//     console.error("Error capturing video:", err)
//   );

//   myvideo.parent("container"); // 정혜
//   // 비디오 로드 후 차원 설정
//   myvideo.elt.onloadedmetadata = function () {
//     console.log("비디오 차원 설정 중...");
//     console.log(
//       "비디오 차원:",
//       myvideo.elt.videoWidth,
//       myvideo.elt.videoHeight
//     );
//     // 여기에서 추가적인 차원 설정 코드가 필요한 경우 작성
//   };

//   // **변수 초기화 상태 확인**
//   // console.log("setup() 함수가 호출되었습니다.");
//   // console.log("Setup 단계에서 변수 초기화 확인");
//   // console.log("trajectory 초기화 상태:", trajectory);
//   // console.log("saveTriggered 초기화 상태:", saveTriggered);
//   // console.log("lastCircleTime 초기화 상태:", lastCircleTime);
// }

// function onResults(results) {
//   predictions = [];
//   boundingBoxes = [];
//   hand9Position = [];

//   //손 규칙 디버깅 ([9]위치 & 핸드박스)
//   if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
//     results.multiHandLandmarks.forEach((landmarks) => {
//       const hand9 = landmarks[9];
//       if (hand9) {
//         hand9Position.push(createVector(hand9.x * width, hand9.y * height));
//       }

//       let minX = Infinity,
//         minY = Infinity,
//         maxX = -Infinity,
//         maxY = -Infinity;

//       landmarks.forEach((landmark) => {
//         let x = landmark.x * width;
//         let y = landmark.y * height;

//         minX = min(minX, x);
//         minY = min(minY, y);
//         maxX = max(maxX, x);
//         maxY = max(maxY, y);
//       });
//       boundingBoxes.push({ minX, minY, maxX, maxY });
//     });
//   }

//   if (results.multiHandLandmarks) {
//     if (results.multiHandLandmarks.length === 2) {
//       let hand1 = results.multiHandLandmarks[0];
//       let hand2 = results.multiHandLandmarks[1];

//       const middleJoint1 = createVector(
//         hand1[9].x * width,
//         hand1[9].y * height
//       );
//       const middleJoint2 = createVector(
//         hand2[9].x * width,
//         hand2[9].y * height
//       );

//       if (isHandInRange(middleJoint1) && isHandInRange(middleJoint2)) {
//         console.log("범위 안에 두 손이 들어옴");
//         bothHandsInRange = true; // 두 손이 범위 안에 있다는 상태로 설정
//         predictions.push(hand1, hand2);
//         oneHandRemaining = false; // 한 손 남은 상태 리셋
//       }
//     }

//     if (bothHandsInRange && results.multiHandLandmarks.length === 1) {
//       let hand = results.multiHandLandmarks[0];
//       const currentPosition = createVector(
//         hand[9].x * width,
//         hand[9].y * height
//       );

//       if (!circlePosition) {
//         circlePosition = currentPosition.copy();
//       }

//       let distanceMoved = dist(
//         currentPosition.x,
//         currentPosition.y,
//         circlePosition.x,
//         circlePosition.y
//       );

//       if (
//         distanceMoved > movementThreshold &&
//         Date.now() - lastCircleTime > 500
//       ) {
//         console.log("원 생성됨");
//         trajectory.push({
//           position: currentPosition.copy(),
//           width: random(50, 100),
//           height: random(50, 100),
//           color: color(random(255), random(255), random(255)),
//         });

//         circlePosition = currentPosition.copy();
//         lastCircleTime = Date.now();
//         closeLogged = true;
//       }

//       oneHandRemaining = true; // 한 손만 남은 상태 표시
//       console.log("두 손이 보인 후 한 손만 인식됨");
//     }

//     if (
//       bothHandsInRange &&
//       results.multiHandLandmarks.length === 2 &&
//       oneHandRemaining
//     ) {
//       console.log("다시 두 손이 인식됨, 이미지 저장 흐름 시작");
//       closeLogged = false; // 원 생성 가능 상태로 리셋
//       oneHandRemaining = false; // 한 손만 남은 상태 리셋
//       saveImage(); // 이미지 저장 흐름 시작
//       bothHandsInRange = false; // 상태 초기화
//     }
//   }
// }

// // 손이 범위 안에 있는지 체크하는 함수
// function isHandInRange(handPosition) {
//   return (
//     handPosition.x >= handRange.xMin &&
//     handPosition.x <= handRange.xMax &&
//     handPosition.y >= handRange.yMin &&
//     handPosition.y <= handRange.yMax
//   );
// }

// function draw() {
//   background(255);

//   if (!videoReady) {
//     fill(0);
//     textSize(32);
//     textAlign(CENTER, CENTER);
//     text("로딩 중...", width / 2, height / 2);
//     return;
//   }

//   if (myvideo.width > 0 && myvideo.height > 0) {
//     image(myvideo, 0, 0, myvideo.width, myvideo.height);

//     // 인식 범위를 시각적으로 표시
//     noFill();
//     stroke(0, 0, 255); // 파란색 선으로 경계 표시
//     strokeWeight(2);
//     rect(
//       handRange.xMin,
//       handRange.yMin,
//       handRange.xMax - handRange.xMin,
//       handRange.yMax - handRange.yMin
//     );

//     // 저장된 원 그리기
//     trajectory.forEach((pos) => {
//       drawGlowingCircle(
//         pos.position.x,
//         pos.position.y,
//         pos.width,
//         pos.height,
//         pos.color
//       );
//     });
//   }

//   // 손 규칙 디버깅 [9]에 랜드마크 표시
//   hand9Position.forEach((pos) => {
//     fill(255, 0, 0); // 빨간색으로 표시
//     noStroke();
//     ellipse(pos.x, pos.y, 20, 20); // 원을 그린다
//   });
//   // 손 규칙 디버깅 손에 경계 상자 그리기
//   boundingBoxes.forEach((box) => {
//     stroke(0, 255, 0);
//     strokeWeight(2);
//     noFill();
//     rect(box.minX, box.minY, box.maxX - box.minX, box.maxY - box.minY);
//   });

//   // 5초 동안 원이 생성되지 않았으면 이미지를 저장
//   if (lastCircleTime && Date.now() - lastCircleTime > 5000 && !saveTriggered) {
//     console.log("saveImage() 함수 호출 조건 충족");
//     console.log("현재 시간:", Date.now());
//     console.log("마지막 원 생성 시간:", lastCircleTime);
//     console.log("시간 차이:", Date.now() - lastCircleTime);

//     saveImage(); // 이미지 저장
//     saveTriggered = true; // 이미지 저장이 한번만 일어나도록 플래그 설정
//   } else {
//     // console.log("saveImage() 함수 호출 조건 미충족");
//     // console.log("lastCircleTime:", lastCircleTime);
//     // console.log("Date.now() - lastCircleTime:", Date.now() - lastCircleTime);
//     // console.log("saveTriggered:", saveTriggered);
//   }
// }

// // 그라데이션 효과로 원을 그리는 함수
// function drawGlowingCircle(x, y, w, h, baseColor) {
//   colorMode(HSB, 360, 100, 100, 100);
//   noStroke();
//   push();
//   translate(x, y);

//   for (let i = 100; i > 0; i--) {
//     fill(
//       hue(baseColor),
//       saturation(baseColor),
//       brightness(baseColor),
//       (10 / i) * 10
//     );
//     ellipse(0, 0, w + i * 5, h + i * 5);
//   }

//   fill(hue(baseColor), saturation(baseColor), brightness(baseColor), 20);
//   ellipse(0, 0, w, h);

//   pop();
// }

// // 이미지를 저장하는 함수
// function saveImage() {
//   console.log("saveImage() 함수가 호출되었습니다.");
//   console.log("trajectory 배열 길이:", trajectory.length);

//   if (trajectory.length === 0) {
//     console.error("Trajectory is empty. No circles to save.");
//     return;
//   }

//   // 원본 크기 (1280x720)를 400x600 크기로 축소
//   let scaleX = 400 / 1280; // 가로 스케일링 비율
//   let scaleY = 600 / 720; // 세로 스케일링 비율

//   let pg = createGraphics(400, 600); // 이미지 크기를 400x600으로 설정
//   pg.background(255); // 배경을 흰색으로 설정

//   // trajectory 배열을 순회하면서 원을 그린다.
//   trajectory.forEach((pos) => {
//     let scaledX = pos.position.x * scaleX; // X 좌표 축소
//     let scaledY = pos.position.y * scaleY; // Y 좌표 축소
//     let scaledWidth = pos.width * scaleX; // 원의 가로 크기 축소
//     let scaledHeight = pos.height * scaleY; // 원의 세로 크기 축소

//     drawGlowingCircleOnGraphics(
//       pg, // 그래픽 객체에 원을 그림
//       scaledX,
//       scaledY,
//       scaledWidth,
//       scaledHeight,
//       pos.color
//     );
//   });

//   // 날짜와 시간 정보를 하단에 추가
//   pg.fill(0);
//   pg.textSize(20);
//   pg.textAlign(CENTER);
//   let now = new Date();
//   let dateString = `${now.getFullYear()}년 ${
//     now.getMonth() + 1
//   }월 ${now.getDate()}일 ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
//   pg.text(dateString, pg.width / 2, pg.height - 30);

//   // 캔버스를 이미지 데이터 URL로 변환
//   const dataUrl = pg.canvas.toDataURL("image/png");
//   console.log("이미지 데이터 URL 생성 완료");

//   // 이미지를 Cloudinary에 업로드
//   uploadImageToCloudinary(dataUrl);
// }

// function uploadImageToCloudinary(imageData) {
//   console.log("uploadImageToCloudinary() 함수가 호출되었습니다.");
//   fetch("/api/upload", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ image: imageData }),
//   })
//     .then((response) => {
//       if (!response.ok) {
//         // 서버에서 에러 응답을 보낸 경우
//         return response.json().then((data) => {
//           throw new Error(data.error || "Unknown server error");
//         });
//       }
//       return response.json();
//     })
//     .then((data) => {
//       if (data.imageUrl) {
//         console.log("이미지 업로드 성공, URL:", data.imageUrl);
//         // QR 코드 생성 및 이미지 페이지로 이동
//         const qrCodeUrl = data.qrCodeUrl;
//         window.location.href = `/image_page.html?imageUrl=${encodeURIComponent(
//           data.imageUrl
//         )}&qrCodeUrl=${encodeURIComponent(qrCodeUrl)}`;
//       } else {
//         console.error("이미지 업로드 실패");
//       }
//     })
//     .catch((error) => {
//       console.error("이미지 업로드 중 오류 발생:", error);
//     })
//     .finally(() => {
//       // 업로드 후 변수 초기화
//       trajectory = [];
//       saveTriggered = false;
//       lastCircleTime = null;

//       // 초기화 후 상태 확인
//       console.log("이미지 업로드 후 변수 초기화");
//       console.log("trajectory 초기화 상태:", trajectory);
//       console.log("saveTriggered 초기화 상태:", saveTriggered);
//       console.log("lastCircleTime 초기화 상태:", lastCircleTime);
//     });
// }

// // 그라데이션 원을 그래픽 객체에 그리는 함수
// function drawGlowingCircleOnGraphics(pg, x, y, w, h, baseColor) {
//   pg.colorMode(HSB, 360, 100, 100, 100);
//   pg.noStroke();
//   pg.push();
//   pg.translate(x, y);

//   for (let i = 100; i > 0; i--) {
//     pg.fill(
//       hue(baseColor),
//       saturation(baseColor),
//       brightness(baseColor),
//       (10 / i) * 10
//     );
//     pg.ellipse(0, 0, w + i * 5, h + i * 5);
//   }

//   pg.fill(hue(baseColor), saturation(baseColor), brightness(baseColor), 20);
//   pg.ellipse(0, 0, w, h);

//   pg.pop();
// }

// function checkVideoDimensions() {
//   console.log("Checking video dimensions:", myvideo.width, myvideo.height);
//   if (myvideo.width > 0 && myvideo.height > 0) {
//     console.log("Video dimensions set:", myvideo.width, myvideo.height);
//   } else {
//     console.log("Video dimensions not set yet.");
//     console.error("비디오 차원이 아직 설정되지 않았습니다.");
//   }
// }
