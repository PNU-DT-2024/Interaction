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
  res.setHeader("Access-Control-Allow-Methods", "POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    // CORS Preflight 요청에 대한 응답
    res.status(200).end();
    return;
  }

  const form = new IncomingForm();
  form.uploadDir = uploadDir; // 업로드 디렉토리
  form.keepExtensions = true;

  // 업로드 디렉토리가 없는 경우 생성합니다.
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  form.parse(req, (err, fields, files) => {
    if (err) {
      console.error("파일 처리 중 오류 발생:", err);
      res.status(500).json({ error: "Error processing the file" });
      return;
    }

    console.log("파일 업로드됨:", files.file[0].newFilename);

    const filePath = path.join(uploadDir, files.file[0].newFilename);
    res.status(200).json({ filePath: `/uploads/${path.basename(filePath)}` });
  });
};
