import { useState } from "react";

export default function ChatInput({ onSend, disabled }) {
  const [text, setText] = useState("");

  const submit = () => {
    if (!text.trim() || disabled) return;
    onSend(text);
    setText("");
  };

  return (
    <div className="border-t border-neutral-200 px-5 py-4 bg-white">
      <div
        className={`flex items-center gap-2 border border-neutral-300 rounded-xl px-4 py-3 bg-white transition
          ${disabled ? "opacity-50" : "focus-within:border-neutral-900"}`}
      >
        <input
          value={text}
          disabled={disabled}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={
            disabled ? "Waiting for response…" : "Type your message…"
          }
          className="flex-1 text-[14px] bg-transparent outline-none text-neutral-900 placeholder-neutral-400"
        />

        <button
          onClick={submit}
          disabled={disabled}
          className="text-neutral-400 hover:text-neutral-900 transition"
        >
          →
        </button>
      </div>
    </div>
  );
}
