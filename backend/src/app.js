import cors from "cors";
import express from "express";
import morgan from "morgan";
import path from "path";
import { env } from "./config/env.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { ensureProductUploadsDir } from "./middlewares/uploadProductImage.js";
import { notFoundMiddleware } from "./middlewares/notFound.js";
import { apiRouter } from "./routes/index.js";

export const app = express();

ensureProductUploadsDir();

app.set("trust proxy", 1);

app.use(
  cors({
    origin: env.clientOrigin,
    credentials: true,
  }),
);
app.use(express.json());
app.use(morgan("dev"));

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use("/api", apiRouter);

app.use(notFoundMiddleware);
app.use(errorHandler);
