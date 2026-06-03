import "dotenv/config";
import { createServer } from "http";
import express from "express";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import helmet from "helmet";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB } from "./config/db.js";
import { initSocket } from "./socket/index.js";
import userRoutes from "./routes/userRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import searchRoutes from "./routes/searchRoutes.js";
import portfolioRoutes from "./routes/portfolioRoutes.js";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";
import fileRoutes from "./routes/fileRoutes.js";
import feedRoutes from "./routes/feedRoutes.js";
import photoRoutes from "./routes/photoRoutes.js";
import inspirationRoutes from "./routes/inspirationRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import dealRoutes from "./routes/dealRoutes.js";
import supportRoutes from "./routes/supportRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "127.0.0.1";

app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3001",
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(morgan("dev"));
app.use(express.json());

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/portfolio", portfolioRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/feed", feedRoutes);
app.use("/api/photos", photoRoutes);
app.use("/api/inspiration", inspirationRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/deals", dealRoutes);
app.use("/api/support", supportRoutes);

app.get("/health", (_req, res) => res.json({ status: "ok" }));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error("[Express error]", err);
  if (res.headersSent) return;
  res.status(err.status || 500).json({
    status: "error",
    message: err.message || "Внутренняя ошибка сервера",
  });
});

connectDB()
  .then(() => {
    console.log("PostgreSQL connected");
    initSocket(httpServer);
    httpServer.listen(PORT, HOST, () => {
      console.log(`Server running on http://${HOST}:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Database connection failed:", err.message);
    process.exit(1);
  });

export default app;
