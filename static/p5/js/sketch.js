let predictions = [];
let boundingBoxes = [];
let circlePosition = null;
let touched = false;
let closeLogged = false;
let trajectory = []; // 궤적 데이터를 저장할 배열

// Socket.IO 클라이언트 라이브러리를 사용
const socket = io("http://localhost:5000");

socket.on("connect", () => {
  console.log("Socket.IO connection established");
  socket.send("클라이언트p5.js 입니다!");
});

socket.on("message", (data) => {
  console.log("Message from server:", data);
});

socket.on("disconnect", () => {
  console.log("Socket.IO connection closed. Reconnecting...");
  setTimeout(() => {
    socket.connect(); // 재연결 시도
  }, 1000);
});

function setup() {
  const canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent("canvas-container");
}

function draw() {
  background(255);

  let currentCirclePosition = null;

  if (boundingBoxes.length === 2) {
    const box1 = boundingBoxes[0];
    const box2 = boundingBoxes[1];

    if (boxesIntersect(box1, box2)) {
      if (!touched) {
        if (!closeLogged) {
          console.log("두 손을 마주 잡았다!");
          closeLogged = true;
        }

        const hand1 = predictions[0];
        const hand2 = predictions[1];

        const x1 = hand1[9].x * width;
        const y1 = hand1[9].y * height;
        const x2 = hand2[9].x * width;
        const y2 = hand2[9].y * height;

        const centerX = (x1 + x2) / 2;
        const centerY = (y1 + y2) / 2;

        circlePosition = { x: centerX, y: centerY };
        trajectory.push({ x: centerX, y: centerY }); // 궤적에 위치 추가
        touched = true;
      }
    } else {
      if (touched) {
        closeLogged = false;
        touched = false;
        sendTrajectoryToServer(); // 손이 떨어졌을 때 궤적을 서버로 전송
      }
    }
  }

  if (circlePosition) {
    fill(0, 0, 255, 150);
    noStroke();
    ellipse(circlePosition.x, circlePosition.y, 50, 50);
  }

  drawLandmarks();
}

function boxesIntersect(box1, box2) {
  return !(
    box1.x > box2.x + box2.width ||
    box1.x + box1.width < box2.x ||
    box1.y > box2.y + box2.height ||
    box1.y + box1.height < box2.y
  );
}

function drawLandmarks() {
  predictions.forEach((hand) => {
    hand.forEach((landmark) => {
      const x = landmark.x * width;
      const y = landmark.y * height;
      fill(255, 0, 0);
      noStroke();
      ellipse(x, y, 10, 10);
    });
  });
}

async function sendTrajectoryToServer() {
  try {
    const response = await fetch("http://localhost:5000/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ trajectory: trajectory }),
    });

    if (response.ok) {
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "trajectory.png";
      link.click();
    }
  } catch (error) {
    console.error("Error uploading trajectory:", error);
  }
}
