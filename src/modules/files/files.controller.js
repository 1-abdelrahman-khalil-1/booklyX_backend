import fs from "fs";
import path from "path";
import { AppError } from "../../utils/AppError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const uploadDir = path.resolve("uploads");
const MAX_FILENAME_LENGTH = 100;

/**
 * Download an uploaded file with security checks.
 * - Prevents path traversal attacks by validating filename
 * - Only serves files from uploads directory
 * - User must be authenticated
 */
export const downloadFileHandler = asyncHandler(async (req, res) => {
  const { filename } = req.params;

  // Prevent path traversal: reject any filename with path separators
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    throw new AppError("Invalid filename", 400);
  }

  // Validate filename length
  if (filename.length > MAX_FILENAME_LENGTH || filename.length === 0) {
    throw new AppError("Invalid filename", 400);
  }

  const filePath = path.join(uploadDir, filename);

  // Ensure resolved path is still within uploads directory (prevent directory escape)
  const resolvedPath = path.resolve(filePath);
  if (!resolvedPath.startsWith(path.resolve(uploadDir))) {
    throw new AppError("Invalid filename", 400);
  }

  // Check if file exists
  if (!fs.existsSync(resolvedPath)) {
    throw new AppError("File not found", 404);
  }

  // Serve the file with proper headers
  res.download(resolvedPath, filename, (err) => {
    if (err && err.code !== "ERR_HTTP_HEADERS_SENT") {
      console.error("Download error:", err);
    }
  });
});
