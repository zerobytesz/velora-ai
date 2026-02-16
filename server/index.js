import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import OpenAI from "openai";

import User from "./models/User.js";
import Conversation from "./models/Conversation.js";
import Message from "./models/Message.js";
import { authMiddleware } from "./middleware/auth.js";

dotenv.config();

const app = express();

/* ===============================
   MIDDLEWARE
================================ */

app.use(
  cors({
    origin: ["http://localhost:5173", "https://velora-ai-zeta.vercel.app"],
  }),
);

app.use(express.json());

/* ===============================
   DATABASE
================================ */

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("Mongo error:", err));

/* ===============================
   OPENROUTER SETUP
================================ */

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

/* ===============================
   HEALTH ROUTE
================================ */

app.get("/", (req, res) => {
  res.send("Velora AI Backend Running 🚀");
});

/* ===============================
   AUTH ROUTES
================================ */

// REGISTER
app.post("/api/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ message: "User already exists" });

    const hashed = await bcrypt.hash(password, 10);

    await User.create({
      email,
      password: hashed,
    });

    res.json({ message: "User created" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// LOGIN
app.post("/api/login", async (req, res) => {
  try {
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ===============================
   CONVERSATIONS
================================ */

// CREATE NEW CONVERSATION
app.post("/api/conversations", authMiddleware, async (req, res) => {
  try {
    const conversation = await Conversation.create({
      userId: req.user.id,
      title: "New Chat",
    });

    res.json(conversation);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET USER CONVERSATIONS
app.get("/api/conversations", authMiddleware, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      userId: req.user.id,
    }).sort({ updatedAt: -1 });

    res.json(conversations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// RENAME CONVERSATION
app.put("/api/conversations/:id", authMiddleware, async (req, res) => {
  try {
    const { title } = req.body;

    const updated = await Conversation.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { title },
      { new: true },
    );

    if (!updated)
      return res.status(404).json({ message: "Conversation not found" });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE CONVERSATION
app.delete("/api/conversations/:id", authMiddleware, async (req, res) => {
  try {
    await Conversation.deleteOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    await Message.deleteMany({
      conversationId: req.params.id,
    });

    res.json({ message: "Conversation deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ===============================
   MESSAGES
================================ */

// GET MESSAGES
app.get("/api/messages/:conversationId", authMiddleware, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.conversationId,
      userId: req.user.id,
    });

    if (!conversation)
      return res.status(404).json({ message: "Conversation not found" });

    const messages = await Message.find({
      conversationId: req.params.conversationId,
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// CLEAR ALL MESSAGES OF A CONVERSATION
app.delete(
  "/api/messages/:conversationId",
  authMiddleware,
  async (req, res) => {
    try {
      await Message.deleteMany({
        conversationId: req.params.conversationId,
      });

      res.json({ message: "Messages cleared" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  },
);
/* ===============================
   CHAT (STREAMING + OPTIONAL SAVE)
================================ */
app.post("/api/chat/:conversationId?", async (req, res) => {
  try {
    const { messages } = req.body;
    const { conversationId } = req.params;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ message: "Invalid messages format" });
    }

    let userId = null;

    /* -----------------------------
       VERIFY TOKEN IF PRESENT
    ----------------------------- */
    const authHeader = req.headers.authorization;

    if (authHeader?.startsWith("Bearer ")) {
      try {
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;
      } catch (err) {
        userId = null; // invalid token → treat as guest
      }
    }

    const lastUserMessage = messages[messages.length - 1];

    /* -----------------------------
       SAVE USER MESSAGE (if logged in)
    ----------------------------- */
    if (userId && conversationId) {
      const conversation = await Conversation.findOne({
        _id: conversationId,
        userId,
      });

      if (conversation) {
        await Message.create({
          conversationId,
          role: "user",
          content: lastUserMessage.content,
        });
      }
    }

    /* -----------------------------
       STREAM FROM OPENROUTER
    ----------------------------- */
    const stream = await openai.chat.completions.create({
      model: "meta-llama/llama-3-8b-instruct",
      messages,
      stream: true,
    });

    res.setHeader("Content-Type", "text/plain; charset=utf-8");

    let assistantMessage = "";

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        assistantMessage += content;
        res.write(content);
      }
    }

    /* -----------------------------
   SAVE ASSISTANT MESSAGE (if logged in)
----------------------------- */
    if (userId && conversationId) {
      const conversation = await Conversation.findOne({
        _id: conversationId,
        userId,
      });

      if (conversation) {
        // Save assistant message
        await Message.create({
          conversationId,
          role: "assistant",
          content: assistantMessage,
        });

        /* ----------------------------------
   AUTO GENERATE TITLE (Free Logic-Based)
---------------------------------- */
        if (conversation.title === "New Chat") {
          try {
            let title = lastUserMessage.content
              .replace(/[^a-zA-Z0-9\s]/g, "")
              .trim()
              .split(" ")
              .slice(0, 5)
              .join(" ");

            title = title.charAt(0).toUpperCase() + title.slice(1);

            conversation.title = title || "New Chat";
            await conversation.save();

            console.log("✅ Title updated:", conversation.title);
          } catch (err) {
            console.error("Title logic error:", err);
          }
        }

        await Conversation.findByIdAndUpdate(conversationId, {
          updatedAt: new Date(),
        });
      }
    }

    res.end();
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).end("Error");
  }
});

/* ===============================
   START SERVER
================================ */

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
