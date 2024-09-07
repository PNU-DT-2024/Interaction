import cloudinary from "cloudinary";
import { IncomingForm } from "formidable";
import fs from "fs";
import path from "path";

// Cloudinary 설정
cloudinary.config({
  cloud_name: "dsqw9jpzx",
  api_key: "148699952323388",
  api_secret: "BiZZPQczWJwH90VjuOVShPI4dZk",
});

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async (req, res) => {
  // CORS 설정
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const form = new IncomingForm();

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("파일 처리 중 오류 발생:", err);
      res.status(500).json({ error: "Error processing the file" });
      return;
    }

    const uploadedFile = files.file ? files.file[0] : null;
    if (!uploadedFile) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    try {
      const result = await cloudinary.uploader.upload(uploadedFile.filepath, {
        folder: "uploads",
        resource_type: "auto",
      });

      const imageUrl = result.secure_url;
      console.log("이미지 업로드 성공:", imageUrl);

      fs.readFile(
        path.join(process.cwd(), "public", "image_page.html"),
        "utf8",
        (err, html) => {
          if (err) {
            console.error("HTML 파일 읽기 중 오류 발생:", err);
            res.status(500).json({ error: "Error reading HTML file" });
            return;
          }

          const modifiedHtml = html.replace("{{ image_url }}", imageUrl);

          res.setHeader("Content-Type", "text/html");
          res.status(200).send(modifiedHtml);
        }
      );
    } catch (error) {
      console.error("Cloudinary 업로드 중 오류 발생:", error);
      res.status(500).json({ error: "Error uploading to Cloudinary" });
    }
  });
};
