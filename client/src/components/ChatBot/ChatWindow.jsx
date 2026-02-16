const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import ChatHeader from "./ChatHeader";
import ChatInput from "./ChatInput";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function ChatWindow({ onClose }) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);

  const [search, setSearch] = useState(""); // ✅ Search
  const [editingIndex, setEditingIndex] = useState(null); // ✅ Edit
  const [editedText, setEditedText] = useState(""); // ✅ Edit
  const [speakingIndex, setSpeakingIndex] = useState(null);

  const bottomRef = useRef(null);

  /* ===============================
     LOAD CONVERSATIONS
  ============================== */
  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await fetch(`${API_URL}/api/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      setConversations(data);

      if (data.length > 0) {
        setActiveConversation(data[0]._id);
      }
    };

    load();
  }, []);

  /* ===============================
     LOAD MESSAGES
  ============================== */
  useEffect(() => {
    if (!activeConversation) return;

    const loadMessages = async () => {
      const token = localStorage.getItem("token");

      const res = await fetch(`${API_URL}/api/messages/${activeConversation}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      setMessages(data);
    };

    loadMessages();
  }, [activeConversation]);

  /* ===============================
     AUTO SCROLL
  ============================== */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  /* ===============================
     CREATE CONVERSATION
  ============================== */
  const createConversation = async () => {
    const token = localStorage.getItem("token");

    const res = await fetch(`${API_URL}/api/conversations`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();

    setConversations((prev) => [data, ...prev]);
    setActiveConversation(data._id);
    setMessages([]);
  };

  /* ===============================
     RENAME CONVERSATION
  ============================== */
  const renameConversation = async (id, currentTitle) => {
    const newTitle = prompt("Rename conversation:", currentTitle);
    if (!newTitle) return;

    const token = localStorage.getItem("token");

    const res = await fetch(`${API_URL}/api/conversations/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title: newTitle }),
    });

    const updated = await res.json();

    setConversations((prev) => prev.map((c) => (c._id === id ? updated : c)));
  };

  /* ===============================
     DELETE CONVERSATION
  ============================== */
  const deleteConversation = async (id) => {
    if (!window.confirm("Delete this conversation?")) return;

    const token = localStorage.getItem("token");

    await fetch(`${API_URL}/api/conversations/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    setConversations((prev) => prev.filter((c) => c._id !== id));

    if (activeConversation === id) {
      setActiveConversation(null);
      setMessages([]);
    }
  };

  /* ===============================
   SEND MESSAGE (Hybrid Mode)
================================ */
  const sendMessage = async (text) => {
    const userMessage = {
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsTyping(true);

    try {
      const token = localStorage.getItem("token");

      // Decide endpoint dynamically
      let endpoint = `${API_URL}/api/chat`;

      if (token && activeConversation) {
        endpoint = `${API_URL}/api/chat/${activeConversation}`;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      if (!response.ok) throw new Error("Server error");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      let assistantText = "";

      // Temporary assistant bubble
      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content: "",
          timestamp: new Date().toISOString(),
        },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        assistantText += decoder.decode(value);

        setMessages([
          ...updatedMessages,
          {
            role: "assistant",
            content: assistantText,
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch (err) {
      console.error(err);

      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content: "Server connection failed.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsTyping(false);
      // Refresh conversations to get updated title
      const token = localStorage.getItem("token");

      if (token) {
        const res = await fetch(`${API_URL}/api/conversations`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        setConversations(data);
      }
    }
  };
  const regenerateResponse = async (assistantIndex) => {
    const previousMessages = messages.slice(0, assistantIndex);
    const lastUserMessage = previousMessages[previousMessages.length - 1];

    if (!lastUserMessage || lastUserMessage.role !== "user") return;

    setIsTyping(true);

    try {
      const token = localStorage.getItem("token");

      let endpoint = `${API_URL}/api/chat`;
      if (token && activeConversation) {
        endpoint = `${API_URL}/api/chat/${activeConversation}`;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ messages: previousMessages }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      let assistantText = "";

      const baseMessages = [...previousMessages];

      setMessages([
        ...baseMessages,
        {
          role: "assistant",
          content: "",
          timestamp: new Date().toISOString(),
        },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        assistantText += decoder.decode(value);

        setMessages([
          ...baseMessages,
          {
            role: "assistant",
            content: assistantText,
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsTyping(false);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  const clearChat = async () => {
    const token = localStorage.getItem("token");

    // Guest mode
    if (!token || !activeConversation) {
      setMessages([
        {
          role: "assistant",
          content: "How can I help you today?",
          timestamp: new Date().toISOString(),
        },
      ]);
      return;
    }

    // Logged in mode
    if (!window.confirm("Clear all messages in this chat?")) return;

    await fetch(`${API_URL}/api/messages/${activeConversation}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    setMessages([]);
  };
  /* ===============================
   TEXT TO SPEECH
================================ */
  const speakMessage = (text, index) => {
    if (!window.speechSynthesis) return;

    // If clicking same message → stop
    if (speakingIndex === index) {
      window.speechSynthesis.cancel();
      setSpeakingIndex(null);
      return;
    }

    // Stop any existing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find((v) => v.lang.includes("en"));
    if (preferred) utterance.voice = preferred;

    utterance.onend = () => {
      setSpeakingIndex(null);
    };

    setSpeakingIndex(index);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <motion.div
      initial={false}
      animate={{
        width: isMaximized ? "100vw" : 600,
        height: isMaximized ? "100vh" : 650,
        bottom: isMaximized ? 0 : 24,
        right: isMaximized ? 0 : 24,
        borderRadius: isMaximized ? 0 : 16,
      }}
      transition={{ duration: 0.3 }}
      className="
    fixed z-[9999]
    bg-white border border-neutral-200 shadow-2xl
    flex flex-col
    overflow-hidden
  "
    >
      {/* HEADER — fixed height */}
      <div className="shrink-0">
        <ChatHeader
          onClose={onClose}
          onClear={clearChat}
          onMaximize={() => setIsMaximized(!isMaximized)}
          isMaximized={isMaximized}
        />
      </div>

      {/* BODY */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* SIDEBAR */}
        <div className="w-48 flex-shrink-0 border-r border-neutral-200 bg-white flex flex-col overflow-hidden">
          <div className="p-4 shrink-0">
            <button
              onClick={createConversation}
              className="w-full py-2 px-3 text-sm bg-neutral-900 text-white rounded-md hover:bg-neutral-800 transition"
            >
              + New Chat
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1 min-w-0">
            {/* Search */}
            <div className="pb-3">
              <input
                type="text"
                placeholder="Search chats"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-2 text-sm
               bg-neutral-100
               text-neutral-800
               placeholder:text-neutral-400
               rounded-lg
               focus:outline-none
               focus:ring-2 focus:ring-black/10
               transition"
              />
            </div>

            {conversations
              .filter(
                (c) =>
                  !search ||
                  c.title?.toLowerCase().includes(search.toLowerCase()),
              )

              .map((c) => (
                <div key={c._id} className="relative group">
                  {activeConversation === c._id && (
                    <div className="absolute left-0 top-1 bottom-1 w-[3px] bg-black rounded-r-full" />
                  )}

                  <div
                    onClick={() => setActiveConversation(c._id)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition cursor-pointer ${
                      activeConversation === c._id
                        ? "bg-neutral-100 text-black"
                        : "text-neutral-600 hover:bg-neutral-100"
                    }`}
                  >
                    <span className="truncate block w-full max-w-[160px]">
                      {c.title || "Untitled Chat"}
                    </span>

                    {/* 3-dot menu */}
                    <div className="relative opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          document
                            .getElementById(`menu-${c._id}`)
                            ?.classList.toggle("hidden");
                        }}
                        className="p-1 text-neutral-500 hover:text-black"
                      >
                        ⋮
                      </button>

                      <div
                        id={`menu-${c._id}`}
                        className="hidden absolute right-0 top-8 w-32 bg-white border border-neutral-200 rounded-md shadow-lg z-50 py-1"
                      >
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            const newTitle = prompt("Rename chat:", c.title);
                            if (!newTitle) return;

                            const token = localStorage.getItem("token");

                            const res = await fetch(
                              `${API_URL}/api/conversations/${c._id}`,
                              {
                                method: "PUT",
                                headers: {
                                  "Content-Type": "application/json",
                                  Authorization: `Bearer ${token}`,
                                },
                                body: JSON.stringify({ title: newTitle }),
                              },
                            );

                            const updated = await res.json();

                            setConversations((prev) =>
                              prev.map((conv) =>
                                conv._id === c._id ? updated : conv,
                              ),
                            );
                          }}
                          className="block w-full text-left px-3 py-2 text-sm hover:bg-neutral-100"
                        >
                          Rename
                        </button>

                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!confirm("Delete this conversation?")) return;

                            const token = localStorage.getItem("token");

                            await fetch(
                              `${API_URL}/api/conversations/${c._id}`,
                              {
                                method: "DELETE",
                                headers: {
                                  Authorization: `Bearer ${token}`,
                                },
                              },
                            );

                            setConversations((prev) =>
                              prev.filter((conv) => conv._id !== c._id),
                            );

                            if (activeConversation === c._id) {
                              setActiveConversation(null);
                              setMessages([]);
                              setSearch(""); // 🔥 add this
                            }
                          }}
                          className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-neutral-100"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* CHAT AREA */}
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5 bg-neutral-50/40">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[80%] flex flex-col ${
                  m.role === "user" ? "items-end ml-auto" : "items-start"
                }`}
              >
                <div
                  className={`relative group px-4 py-3 text-sm rounded-xl shadow-sm ${
                    m.role === "user"
                      ? "bg-neutral-900 text-white rounded-br-sm"
                      : "bg-neutral-100 text-neutral-800 rounded-bl-sm"
                  }`}
                >
                  {/* ✏️ Edit Mode */}
                  {editingIndex === i ? (
                    <div className="w-full space-y-2">
                      <textarea
                        value={editedText}
                        onChange={(e) => setEditedText(e.target.value)}
                        rows={3}
                        className="
        w-full
        px-3 py-2
        text-sm
        bg-neutral-50
        text-neutral-800
        border border-neutral-200
        rounded-xl
        resize-none
        focus:outline-none
        focus:ring-2 focus:ring-neutral-300
        transition
      "
                      />

                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingIndex(null)}
                          className="
          px-3 py-1.5
          text-xs
          rounded-lg
          bg-neutral-200
          text-neutral-700
          hover:bg-neutral-300
          transition
        "
                        >
                          Cancel
                        </button>

                        <button
                          onClick={async () => {
                            const updated = [...messages];
                            updated[i].content = editedText;

                            setMessages(updated);
                            setEditingIndex(null);

                            await regenerateResponse(i + 1);
                          }}
                          className="
          px-3 py-1.5
          text-xs
          rounded-lg
          bg-neutral-900
          text-white
          hover:bg-neutral-800
          transition
        "
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : m.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {m.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    m.content
                  )}
                  {/* Edit Button (User Only) */}
                  {m.role === "user" && editingIndex !== i && (
                    <button
                      onClick={() => {
                        setEditingIndex(i);
                        setEditedText(m.content);
                      }}
                      className="
      absolute top-2 right-10
      opacity-0 group-hover:opacity-100
      text-[11px]
      font-medium
      px-2 py-1
      rounded-md
      bg-white/80
      backdrop-blur-sm
      border border-neutral-200
      text-neutral-600
      hover:bg-neutral-100
      hover:text-black
      transition
    "
                    >
                      Edit
                    </button>
                  )}

                  {/* Copy button */}
                  {m.role === "assistant" && (
                    <button
                      onClick={() => navigator.clipboard.writeText(m.content)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-xs bg-white border border-neutral-300 px-2 py-1 rounded transition"
                    >
                      Copy
                    </button>
                  )}
                  {/* Speak button */}
                  <div
                    className={`
    mt-2 flex items-center gap-2 text-[11px]
    ${
      m.role === "user"
        ? "text-neutral-400 justify-end"
        : "text-neutral-500 justify-start"
    }
  `}
                  >
                    <span>{formatTime(m.timestamp)}</span>

                    {m.role === "assistant" && (
                      <button
                        onClick={() => speakMessage(m.content, i)}
                        className="
        px-2 py-0.5
        rounded-md
        bg-neutral-200
        hover:bg-neutral-300
        text-neutral-700
        transition
      "
                      >
                        {speakingIndex === i ? "Stop" : "Listen"}
                      </button>
                    )}
                  </div>

                  {/* Regenerate button */}
                  {m.role === "assistant" && (
                    <button
                      onClick={() => regenerateResponse(i)}
                      className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 text-xs text-neutral-500 hover:text-black transition"
                    >
                      ↻
                    </button>
                  )}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <span>Assistant is typing</span>
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce [animation-delay:0ms]"></span>
                  <span className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce [animation-delay:150ms]"></span>
                  <span className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce [animation-delay:300ms]"></span>
                </span>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          <div className="shrink-0 border-t border-neutral-200 bg-white">
            <ChatInput onSend={sendMessage} disabled={isTyping} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
