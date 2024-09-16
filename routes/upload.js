const express = require("express");
const router = express.Router();
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");

// Cloudinary 설정
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 메모리 내에서 업로드 상태 유지
let hasUploaded = false;
let imageUrl = null; // 업로드된 이미지 URL을 저장

// POST /api/upload 요청 처리
router.post("/upload", (req, res) => {
  if (hasUploaded) {
    // 이미 업로드된 이미지 URL로 QR 코드를 생성 후 JSON 응답
    QRCode.toDataURL(imageUrl, (err, qrCodeUrl) => {
      if (err) {
        return res.status(500).json({ error: "QR 코드 생성 실패" });
      }
      return res.json({
        imageUrl: imageUrl,
        qrCodeUrl: qrCodeUrl,
      });
    });
    return;
  }

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

      imageUrl = result.secure_url;
      hasUploaded = true;

      // QR 코드 생성 후 JSON 응답
      QRCode.toDataURL(imageUrl, (err, qrCodeUrl) => {
        if (err) {
          return res.status(500).json({ error: "QR 코드 생성 실패" });
        }

        res.json({
          imageUrl: imageUrl,
          qrCodeUrl: qrCodeUrl,
        });
      });
    });
  });
});

module.exports = router;
