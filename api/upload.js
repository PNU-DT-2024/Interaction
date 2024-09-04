import { IncomingForm } from "formidable";
import fs from "fs";
import path from "path";

const uploadDir = path.join(process.cwd(), "public/uploads");

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async (req, res) => {
  // CORS 헤더 추가
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    // CORS Preflight 요청에 대한 응답
    res.status(200).end();
    return;
  }

  const form = new IncomingForm();
  form.uploadDir = uploadDir;
  form.keepExtensions = true;

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log("업로드 디렉토리 생성됨");
  }

  form.parse(req, (err, fields, files) => {
    if (err) {
      console.error("파일 처리 중 오류 발생:", err);
      res.status(500).json({ error: "Error processing the file" });
      return;
    }

    console.log("파일 업로드됨:", files.file[0].newFilename);

    const filePath = path.join(uploadDir, files.file[0].newFilename);
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
        console.log("HTML 페이지 반환됨:", imageUrl);

        res.setHeader("Content-Type", "text/html");
        res.status(200).send(modifiedHtml);
      }
    );
  });
};
