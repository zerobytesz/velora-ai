import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

export default function ConversationItem({
  conversation,
  activeConversation,
  setActiveConversation,
  setConversations,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(conversation.title);

  const saveTitle = async () => {
    const token = localStorage.getItem("token");

    const res = await fetch(
      `${API_URL}/api/conversations/${conversation._id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title }),
      },
    );

    const updated = await res.json();

    setConversations((prev) =>
      prev.map((c) => (c._id === updated._id ? updated : c)),
    );

    setIsEditing(false);
  };

  return (
    <div
      onClick={() => setActiveConversation(conversation._id)}
      className={`p-3 rounded-lg text-sm cursor-pointer transition font-medium
        ${
          activeConversation === conversation._id
            ? "bg-neutral-900 text-white"
            : "text-neutral-700 hover:bg-neutral-100"
        }
      `}
    >
      {isEditing ? (
        <input
          value={title}
          autoFocus
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveTitle();
          }}
          className="w-full bg-transparent outline-none text-sm"
        />
      ) : (
        <div onDoubleClick={() => setIsEditing(true)}>
          {conversation.title || "Untitled Chat"}
        </div>
      )}
    </div>
  );
}
