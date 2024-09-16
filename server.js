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
app.use(bodyParser.json({ limit: "10mb" })); // 이미지 파일 크기에 맞게 설정
app.use("/api", uploadRouter);
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

// 이미지 업로드 처리 엔드포인트
app.post("/api/upload", (req, res) => {
  console.log("업로드 요청이 서버에 도달했습니다."); // 요청이 도달했는지 확인

  const image = req.body.image;

  if (!image) {
    console.error("이미지 데이터가 없습니다.");
    return res.status(400).json({ error: "이미지 데이터가 없습니다." });
  }

  console.log("받은 이미지 데이터 길이:", image.length); // 이미지 데이터를 확인

  cloudinary.uploader
    .upload(image, { folder: "hand-drawn-images" })
    .then((result) => {
      console.log("이미지 업로드 성공:", result.secure_url); // 성공 메시지
      console.log("전체 Cloudinary 응답:", result); // 전체 Cloudinary 응답 데이터 출력
      res.json({ imageUrl: result.secure_url });
    })
    .catch((error) => {
      console.error("Cloudinary 업로드 오류:", error); // 업로드 실패 시
      res.status(500).json({ error: "이미지 업로드 실패" });
    });
});

// 서버 시작
app.listen(port, () => {
  console.log(`서버가 포트 ${port}에서 실행 중입니다.`);
});
