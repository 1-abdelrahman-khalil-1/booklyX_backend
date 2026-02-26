import "dotenv/config";
import express from "express";
import { errorHandler } from "./middleware/errorHandler.js";
import routes from "./routes/index.js";

const app = express();

app.use(express.json());

app.use("/", routes);

/**
 * Global error middleware — catches any unhandled errors thrown inside
 * route handlers. Express identifies this as an error handler because it
 * has 4 parameters (err, req, res, next).
 */
app.use(errorHandler);

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
