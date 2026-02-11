import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import OpenAI from "openai";

import User from "./models/User.js";
import { authMiddleware } from "./middleware/auth.js";

dotenv.config();

const app = express();
app.use(
  cors({
    origin: "https://velora-ai-zeta.vercel.app",
  }),
);

app.use(express.json());

// Connect MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.log(err));

// OpenRouter setup
const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

// 🔐 REGISTER
app.post("/api/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    const hashed = await bcrypt.hash(password, 10);

    const user = new User({ email, password: hashed });
    await user.save();

    res.json({ message: "User created" });
  } catch {
    res.status(400).json({ message: "User already exists" });
  }
});

// 🔐 LOGIN
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ message: "Invalid credentials" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ message: "Invalid credentials" });

  const token = jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );

  res.json({ token });
});

// 🔒 PROTECTED CHAT ROUTE (Streaming)
app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body;

    const stream = await openai.chat.completions.create({
      model: "meta-llama/llama-3-8b-instruct",
      messages,
      stream: true,
    });

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) res.write(content);
    }

    res.end();
  } catch (error) {
    console.error(error);
    res.status(500).end("Error");
  }
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
