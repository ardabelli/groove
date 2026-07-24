import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { authRouter } from "./routes/auth";
import { curateRouter } from "./routes/curate";
import { playlistRouter } from "./routes/playlist";
import { socialRouter } from "./routes/social";

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/curate", curateRouter);
app.use("/api/playlist", playlistRouter);
app.use("/api/social", socialRouter);

const port = Number(process.env.PORT ?? 8000);
app.listen(port, () => {
  console.log(`Groove backend listening on http://127.0.0.1:${port}`);
});
