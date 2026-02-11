import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import ChatHeader from "./ChatHeader";
import ChatInput from "./ChatInput";

export default function ChatWindow({ onClose }) {
  const [isMaximized, setIsMaximized] = useState(false);

  const [messages, setMessages] = useState(() => {
    const saved = sessionStorage.getItem("chat_messages");
    return saved ? JSON.parse(saved) : [];
  });

  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef(null);

  // Save chat per session
  useEffect(() => {
    sessionStorage.setItem("chat_messages", JSON.stringify(messages));
  }, [messages]);

  // Show greeting once
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        { role: "assistant", content: "How can I help you today?" },
      ]);
    }
  }, []);

  // Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // ESC to exit maximize
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") setIsMaximized(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  const sendMessage = async (text) => {
    const newMessages = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setIsTyping(true);

    try {
      const token = localStorage.getItem("token");

      const response = await fetch("http://localhost:5001/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!response.ok) {
        throw new Error("Unauthorized or server error");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      let assistantMessage = "";

      // Add empty assistant bubble
      setMessages([...newMessages, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        assistantMessage += chunk;

        setMessages([
          ...newMessages,
          { role: "assistant", content: assistantMessage },
        ]);
      }
    } catch (error) {
      console.error(error);
      setMessages([
        ...newMessages,
        { role: "assistant", content: "Authentication error or server issue." },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <motion.div
      layout
      animate={{
        width: isMaximized ? "100vw" : "400px",
        height: isMaximized ? "100vh" : "600px",
        bottom: isMaximized ? 0 : 24,
        right: isMaximized ? 0 : 24,
        borderRadius: isMaximized ? 0 : 16,
      }}
      transition={{ duration: 0.35, ease: "easeInOut" }}
      className="
        fixed z-[9999]
        bg-white
        border border-neutral-200
        shadow-[0_20px_60px_rgba(0,0,0,0.12)]
        flex flex-col
        overflow-hidden
      "
    >
      <ChatHeader
        onClose={onClose}
        onClear={() => {
          sessionStorage.removeItem("chat_messages");
          setMessages([
            { role: "assistant", content: "How can I help you today?" },
          ]);
        }}
        onMaximize={() => setIsMaximized(!isMaximized)}
        isMaximized={isMaximized}
      />

      <div className="flex-1 px-6 py-6 space-y-5 overflow-y-auto bg-neutral-50/40">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[80%] px-4 py-3 text-[14px] leading-relaxed rounded-xl shadow-sm
              ${
                m.role === "user"
                  ? "bg-neutral-900 text-white ml-auto rounded-br-sm"
                  : "bg-neutral-100 text-neutral-800 rounded-bl-sm"
              }`}
          >
            {m.content}
          </div>
        ))}

        {isTyping && (
          <div className="bg-neutral-100 text-neutral-500 px-4 py-2 rounded-xl text-sm italic w-fit">
            Assistant is typing…
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <ChatInput onSend={sendMessage} disabled={isTyping} />
    </motion.div>
  );
}
