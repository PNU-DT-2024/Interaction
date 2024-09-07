import { IncomingForm } from "formidable";
import fs from "fs";
import path from "path";

/*서버리스 함수가 위치한 API 엔드포인트*/

const uploadDir = path.join(process.cwd(), "api/uploads");

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async (req, res) => {
  // CORS 헤더 추가
  res.setHeader("Access-Control-Allow-Origin", "http://127.0.0.1:5500"); // 필요에 따라 적절한 도메인으로 설정
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    // Preflight 요청에 응답
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const form = new IncomingForm();
  form.uploadDir = uploadDir;
  form.keepExtensions = true;

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  form.parse(req, (err, fields, files) => {
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

    const filePath = path.join(uploadDir, uploadedFile.newFilename);
    const imageUrl = `/uploads/${path.basename(filePath)}`;

    fs.readFile(
      path.join(process.cwd(), "templates", "image_page.html"),
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
  });
};
