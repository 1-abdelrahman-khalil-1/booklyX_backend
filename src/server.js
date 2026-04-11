process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION! 💥 Shutting down...");
  console.error(err.name, err.message);
  void gracefulShutdown("UNCAUGHT_EXCEPTION", 1);
});

import cookieParser from "cookie-parser";
import "dotenv/config";
import express from "express";
import prisma from "./lib/prisma.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { generalLimiter } from "./middleware/rateLimiter.js";
import routes from "./routes/index.js";

const app = express();
let server;

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

server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

let isShuttingDown = false;

async function gracefulShutdown(signal, exitCode = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`${signal} received. Shutting down gracefully...`);

  if (!server) {
    await prisma.$disconnect();
    process.exit(exitCode);
  }

  server.close(async () => {
    try {
      await prisma.$disconnect();
    } finally {
      process.exit(exitCode);
    }
  });
}

process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION! 💥 Shutting down...");
  console.error(err.name, err.message);
  void gracefulShutdown("UNHANDLED_REJECTION", 1);
});

process.on("SIGTERM", () => {
  void gracefulShutdown("SIGTERM", 0);
});

process.on("SIGINT", () => {
  void gracefulShutdown("SIGINT", 0);
});
