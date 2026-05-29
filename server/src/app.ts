import "dotenv/config"
import express from "express";
import cors from "cors";
import authenticationRouter from "./routes/authentication";
import gameRouter from "./routes/game";
import sessionRouter from "./routes/session";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/authentication", authenticationRouter);
app.use("/api/session", sessionRouter);
app.use("/api/game", gameRouter);

app.get("/", (_req, res) => {
  res.json({ message: "API is running" });
});

export default app;