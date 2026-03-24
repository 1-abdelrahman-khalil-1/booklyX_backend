import crypto from "crypto";
import fs from "fs";
import multer from "multer";
import path from "path";
import { tr } from "../lib/i18n/index.js";
import { AppError } from "../utils/AppError.js";

const uploadDir = path.resolve("uploads");
fs.mkdirSync(uploadDir, { recursive: true });

// Magic bytes (file signatures) for validation
const MAGIC_BYTES = {
  jpeg: [0xff, 0xd8, 0xff],
  png: [0x89, 0x50, 0x4e, 0x47],
  gif: [0x47, 0x49, 0x46],
  webp: [0x52, 0x49, 0x46, 0x46], // RIFF
  pdf: [0x25, 0x50, 0x44, 0x46], // %PDF
};

/**
 * Validate file content against known magic byte signatures.
 * Returns true if file matches one of the expected signatures.
 */
async function validateFileMagicBytes(filePath, allowedTypes) {
  return new Promise((resolve) => {
    const buffer = Buffer.alloc(8);
    const fd = fs.openSync(filePath, "r");
    try {
      fs.readSync(fd, buffer, 0, 8, 0);
      fs.closeSync(fd);

      for (const type of allowedTypes) {
        const magicBytes = MAGIC_BYTES[type];
        if (
          magicBytes &&
          buffer.slice(0, magicBytes.length).equals(Buffer.from(magicBytes))
        ) {
          resolve(true);
          return;
        }
      }
      resolve(false);
    } catch (_err) {
      fs.closeSync(fd);
      resolve(false);
    }
  });
}

const sharedStorageFactory = () =>
  multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
      const safeBaseName = path
        .parse(file.originalname)
        .name.replace(/[^a-zA-Z0-9_-]/g, "")
        .slice(0, 40);
      const ext = path.extname(file.originalname).toLowerCase();
      const unique = crypto.randomBytes(8).toString("hex");
      cb(null, `${Date.now()}-${unique}-${safeBaseName || "file"}${ext}`);
    },
  });

const maxFileSize = Number(
  process.env.UPLOAD_MAX_FILE_SIZE_BYTES || 5 * 1024 * 1024,
);

/**
 * Upload middleware for images only (service images, etc).
 * Strict validation: JPEG, PNG, GIF, WebP only.
 */
export const imageOnlyUpload = multer({
  storage: sharedStorageFactory(),
  limits: { fileSize: maxFileSize },
  fileFilter: (_req, file, cb) => {
    const allowedImageMimes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    if (!allowedImageMimes.includes(file.mimetype)) {
      cb(new AppError(tr.INVALID_FILE_TYPE, 400));
      return;
    }
    cb(null, true);
  },
});

/**
 * Upload middleware for documents (branch applications, KYC, etc).
 * Allows images and PDF only. Magic byte validation applied post-upload.
 */
export const documentsUpload = multer({
  storage: sharedStorageFactory(),
  limits: { fileSize: maxFileSize },
  fileFilter: async (_req, file, cb) => {
    const allowedDocMimes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
    ];
    if (!allowedDocMimes.includes(file.mimetype)) {
      cb(new AppError(tr.INVALID_FILE_TYPE, 400));
      return;
    }
    cb(null, true);
  },
});

/**
 * Middleware to validate magic bytes of uploaded files.
 * Must be called AFTER multer, on successful uploads.
 * Deletes file if validation fails.
 */
export const validateUploadedFilesmagicbytes =
  (allowedTypes) => (req, res, next) => {
    if (!req.files || Object.keys(req.files).length === 0) {
      return next();
    }

    const filesToValidate = [];
    for (const [fieldName, fileList] of Object.entries(req.files)) {
      if (Array.isArray(fileList)) {
        for (const file of fileList) {
          filesToValidate.push({ fieldName, file, types: allowedTypes });
        }
      }
    }

    Promise.all(
      filesToValidate.map(async ({ file, types }) => {
        const isValid = await validateFileMagicBytes(
          file.path,
          types || ["jpeg", "png", "gif", "webp", "pdf"],
        );
        if (!isValid) {
          fs.unlinkSync(file.path);
          throw new AppError(tr.INVALID_FILE_TYPE, 400);
        }
      }),
    )
      .then(() => next())
      .catch((err) => next(err));
  };

export function getUploadedFileUrl(req, file) {
  if (!file) return undefined;
  return `${req.protocol}://${req.get("host")}/uploads/${file.filename}`;
}
