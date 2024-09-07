const express = require("express");
const router = express.Router();
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const path = require("path");

// Cloudinary 설정
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const statusFilePath = path.join(__dirname, "upload_status.txt");

// 업로드 상태 파일이 존재하는지 확인
let hasUploaded = fs.existsSync(statusFilePath);

// 업로드 상태를 확인하는 미들웨어
router.use((req, res, next) => {
  if (hasUploaded) {
    return res.status(403).json({ error: "이미지 업로드가 완료되었습니다." });
  }
  next();
});

// POST /api/upload 요청 처리
router.post("/upload", (req, res) => {
  const { image } = req.body;

  if (!image) {
    return res.status(400).json({ error: "이미지가 제공되지 않았습니다." });
  }

  const matches = image.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!matches) {
    return res.status(400).json({ error: "유효하지 않은 이미지 형식입니다." });
  }

  const mimeType = matches[1];
  const base64Data = matches[2];
  const fileExtension = mimeType.split("/")[1];
  const filePath = path.join(__dirname, `temp_image.${fileExtension}`);

  fs.writeFile(filePath, base64Data, "base64", (err) => {
    if (err) {
      return res.status(500).json({ error: "파일 저장 오류" });
    }

    cloudinary.uploader.upload(filePath, (error, result) => {
      fs.unlink(filePath, (err) => {
        if (err) {
          console.error("임시 파일 삭제 오류:", err);
        }
      });

      if (error) {
        return res.status(500).json({ error: "Cloudinary 업로드 실패" });
      }

      // 업로드 성공 시 상태 파일 생성
      fs.writeFileSync(statusFilePath, "uploaded");
      hasUploaded = true;

      res
        .status(200)
        .json({ message: "이미지 업로드 성공", url: result.secure_url });
    });
  });
});

module.exports = router;
