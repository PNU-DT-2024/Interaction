require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const uploadRouter = require("./routes/upload");

const app = express();
const port = 5500;

// 업로드 상태를 추적하는 변수
let hasUploaded = false;

// 미들웨어 설정
app.use(bodyParser.json({ limit: "10mb" })); // 이미지 파일 크기에 맞게 설정, 뭐 안되면 이거 문제일 수도 있음
app.use("/api", uploadRouter);
app.use(express.static("public"));

// 업로드 라우터
app.use("/api", uploadRouter);

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

app.listen(port, () => {
  console.log(`서버가 포트 ${port}에서 실행 중입니다.`);
});
