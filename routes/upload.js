const express = require("express");
const router = express.Router();
const cloudinary = require("cloudinary").v2;
const QRCode = require("qrcode");

// Cloudinary 설정
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// POST /api/upload 요청 처리
router.post("/upload", (req, res) => {
  const { image } = req.body;

  if (!image) {
    return res.status(400).json({ error: "이미지가 제공되지 않았습니다." });
  }

  // 이미지 데이터 유효성 검사 (선택 사항)
  if (!image.startsWith("data:image/")) {
    return res.status(400).json({ error: "유효하지 않은 이미지 형식입니다." });
  }

  // Cloudinary에 이미지 업로드
  cloudinary.uploader.upload(
    image,
    { folder: "hand-drawn-images" },
    (error, result) => {
      if (error) {
        console.error("Cloudinary 업로드 오류:", error);
        return res.status(500).json({ error: "Cloudinary 업로드 실패" });
      }

      const imageUrl = result.secure_url;

      // QR 코드 생성 후 JSON 응답
      QRCode.toDataURL(imageUrl, (err, qrCodeUrl) => {
        if (err) {
          console.error("QR 코드 생성 오류:", err);
          return res.status(500).json({ error: "QR 코드 생성 실패" });
        }

        res.json({
          imageUrl: imageUrl,
          qrCodeUrl: qrCodeUrl,
        });
      });
    }
  );
});

module.exports = router;
