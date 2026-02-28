process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION! 💥 Shutting down...");
  console.error(err.name, err.message);
  process.exit(1);
});

import cookieParser from "cookie-parser";
import "dotenv/config";
import express from "express";
import { errorHandler } from "./middleware/errorHandler.js";
import { generalLimiter } from "./middleware/rateLimiter.js";
import routes from "./routes/index.js";

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(generalLimiter);

app.use("/", routes);

/**
 * Global error middleware — catches any unhandled errors thrown inside
 * route handlers. Express identifies this as an error handler because it
 * has 4 parameters (err, req, res, next).
 */
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION! 💥 Shutting down...");
  console.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
