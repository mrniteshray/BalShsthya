import multer from 'multer';
import path from 'path';
import fs from 'fs';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // ensure upload directory exists (create if missing)
    const uploadDir = path.join(process.cwd(), 'uploads', 'documents');
    try {
      fs.mkdirSync(uploadDir, { recursive: true });
    } catch (err) {
      // ignore if it already exists or can't be created; multer will error later
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Optional: 5MB limit
});

export default upload;