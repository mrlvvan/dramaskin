import { randomBytes } from "crypto";
import fs from "fs";
import multer from "multer";
import path from "path";

const productsDir = path.join(process.cwd(), "uploads", "products");

export function ensureProductUploadsDir() {
  fs.mkdirSync(productsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureProductUploadsDir();
    cb(null, productsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const allowed = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
    const safeExt = allowed.includes(ext) ? ext : ".jpg";
    cb(null, `${randomBytes(16).toString("hex")}${safeExt}`);
  },
});

function fileFilter(_req, file, cb) {
  if (!file.mimetype || !file.mimetype.startsWith("image/")) {
    cb(new Error("Допустимы только файлы изображений"));
    return;
  }
  cb(null, true);
}

export const uploadProductImage = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter,
});
