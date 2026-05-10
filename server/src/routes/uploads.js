import { Router } from 'express';
import path from 'path';
import multer from 'multer';
import { randomUUID } from 'crypto';
import fs from 'fs';
import { authenticate } from '../middleware/auth.js';

const router = Router();

const uploadRoot = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadRoot)) {
  fs.mkdirSync(uploadRoot, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadRoot,
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname) || '';
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 12 * 1024 * 1024 },
});

router.post('/', authenticate, upload.single('file'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file' });
    return;
  }
  const publicPath = `/uploads/${req.file.filename}`;
  res.json({
    url: publicPath,
    name: req.file.originalname || req.file.filename,
    mimeType: req.file.mimetype,
    size: req.file.size,
  });
});

export default router;
