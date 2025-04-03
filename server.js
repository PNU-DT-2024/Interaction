require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cloudinary = require("cloudinary").v2;
const uploadRouter = require("./routes/upload");

const app = express();
const port = 5500;

// Cloudinary 설정
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 미들웨어 설정
app.use(bodyParser.json({ limit: "50mb" })); // 이미지 크기에 따라 제한 증가
app.use("/api", uploadRouter);
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

// 에러 핸들링 (예기치 못한 에러로 서버가 중단되지 않도록)
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection:", reason);
});

// 서버 시작
app.listen(port, () => {
  console.log(`서버가 포트 ${port}에서 실행 중입니다.`);
});
