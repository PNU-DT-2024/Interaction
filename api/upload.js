import { IncomingForm } from "formidable";
import fs from "fs";
import path from "path";

// Vercel에서는 /public 디렉토리에 접근할 수 없으므로, 임시 디렉토리를 사용합니다.
// const uploadDir = "/tmp/uploads";
const uploadDir = path.join(process.cwd(), "public/uploads");

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async (req, res) => {
  const form = new IncomingForm();
  form.uploadDir = uploadDir; // 업로드 디렉토리
  form.keepExtensions = true;

  // 업로드 디렉토리가 없는 경우 생성합니다.
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  form.parse(req, (err, fields, files) => {
    if (err) {
      res.status(500).json({ error: "Error processing the file" });
      return;
    }

    const filePath = path.join(uploadDir, files.file[0].newFilename);
    res.status(200).json({ filePath: `/uploads/${path.basename(filePath)}` });
  });
};
