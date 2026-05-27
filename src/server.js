process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION! 💥 Shutting down...");
  console.error(err.name, err.message);
  void gracefulShutdown("UNCAUGHT_EXCEPTION", 1);
});

import cookieParser from "cookie-parser";
import cors from "cors";
import "dotenv/config";
import express from "express";
import prisma from "./lib/prisma.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { generalLimiter } from "./middleware/rateLimiter.js";
import routes from "./routes/index.js";

const app = express();
let server;

const frontendUrl = process.env.FRONTEND_URL;

const allowedOrigins = new Set([frontendUrl].filter(Boolean));

if (process.env.NODE_ENV !== "production") {
  allowedOrigins.add("http://localhost:3000");
  allowedOrigins.add("http://127.0.0.1:3000");
  allowedOrigins.add("http://localhost:5173");
  allowedOrigins.add("http://127.0.0.1:5173");
  allowedOrigins.add("https://unfilial-vernie-vortiginous.ngrok-free.dev");
}

function isAllowedOrigin(origin) {
  if (!origin) {
    return true;
  }

  try {
    const parsedOrigin = new URL(origin);

    // Allow any Vercel deployment
    if (parsedOrigin.hostname.endsWith(".vercel.app")) {
      return true;
    }

    // Allow manually added origins
    if (allowedOrigins.has(origin)) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

const corsOptions = {
  origin(origin, callback) {
    const allowed = isAllowedOrigin(origin);

    if (allowed) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};

app.use(express.json());
app.use(cookieParser());
app.set("trust proxy", 1);
app.use(cors(corsOptions));
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

  if (err instanceof Error) {
    console.error(err.name, err.message);
  } else {
    console.error(err);
  }

  void gracefulShutdown("UNHANDLED_REJECTION", 1);
});

process.on("SIGTERM", () => {
  void gracefulShutdown("SIGTERM", 0);
});

process.on("SIGINT", () => {
  void gracefulShutdown("SIGINT", 0);
});  console.error("UNHANDLED REJECTION! 💥 Shutting down...");
  if (err instanceof Error) {
    console.error(err.name, err.message);
  } else {
    console.error(err);
  }
  void gracefulShutdown("UNHANDLED_REJECTION", 1);
});

process.on("SIGTERM", () => {
  void gracefulShutdown("SIGTERM", 0);
});

process.on("SIGINT", () => {
  void gracefulShutdown("SIGINT", 0);
});
