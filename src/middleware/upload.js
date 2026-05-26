import crypto from "crypto";
import multer from "multer";

import cloudinary from "../lib/cloudinary.js";
import { tr } from "../lib/i18n/index.js";
import { AppError } from "../utils/AppError.js";

const maxFileSize = Number(
  process.env.UPLOAD_MAX_FILE_SIZE_BYTES || 5 * 1024 * 1024,
);

const allowedImageMimes = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

function createCloudinaryStorage(folder) {
  return {
    _handleFile(_req, file, cb) {
      const publicId = generatePublicId();

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: publicId,
          resource_type: "image",
        },
        (error, result) => {
          if (error) {
            cb(error);
            return;
          }

          if (!result) {
            cb(new AppError(tr.INTERNAL_SERVER_ERROR, 500));
            return;
          }

          cb(null, {
            path: result.secure_url,
            url: result.secure_url,
            filename: result.public_id,
            public_id: result.public_id,
            resource_type: result.resource_type,
            format: result.format,
            size: result.bytes,
          });
        },
      );

      file.stream.on("error", (error) => {
        uploadStream.destroy(error);
        cb(error);
      });

      file.stream.pipe(uploadStream);
    },

    _removeFile(_req, file, cb) {
      if (!file?.public_id) {
        cb(null);
        return;
      }

      cloudinary.uploader.destroy(
        file.public_id,
        {
          resource_type: file.resource_type ?? "image",
        },
        (error) => {
          cb(error ?? null);
        },
      );
    },
  };
}

export const imageOnlyUpload = multer({
  storage: createCloudinaryStorage("booklyx/images"),

  limits: {
    fileSize: maxFileSize,
  },

  fileFilter: (_req, file, cb) => {
    if (!allowedImageMimes.includes(file.mimetype)) {
      return cb(new AppError(tr.INVALID_FILE_TYPE, 400));
    }

    cb(null, true);
  },
});

export const documentsUpload = multer({
  storage: createCloudinaryStorage("booklyx/documents"),

  limits: {
    fileSize: maxFileSize,
  },

  fileFilter: (_req, file, cb) => {
    if (!allowedImageMimes.includes(file.mimetype)) {
      return cb(new AppError(tr.INVALID_FILE_TYPE, 400));
    }

    cb(null, true);
  },
});

export function generatePublicId(prefix = "booklyx") {
  return `${prefix}/${Date.now()}-${crypto.randomBytes(8).toString("hex")}`;
}