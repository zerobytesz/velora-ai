import { useState, useRef } from "react";

export default function ChatInput({ onSend, disabled }) {
  const [text, setText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  const submit = () => {
    if (!text.trim() || disabled) return;
    onSend(text);
    setText("");
  };

  const toggleListening = () => {
    if (disabled) return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;

    let finalTranscript = "";

    recognition.onresult = (event) => {
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
        } else {
          interimTranscript += transcript;
        }
      }

      setText(finalTranscript + interimTranscript);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.start();
    setIsListening(true);
  };

  return (
    <div className="border-t border-neutral-200 px-5 py-4 bg-white">
      <div
        className={`flex items-center gap-2 border border-neutral-300 rounded-xl px-4 py-3 bg-white transition
        ${disabled ? "opacity-50" : "focus-within:border-neutral-900"}`}
      >
        {/* Text Input */}
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

        {/* Mic Button */}
        <button
          type="button"
          onClick={toggleListening}
          disabled={disabled}
          className={`
            relative flex items-center justify-center
            w-9 h-9 rounded-lg transition
            ${
              isListening
                ? "bg-neutral-200 text-neutral-900"
                : "text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100"
            }
          `}
        >
          {isListening ? (
            <div className="flex gap-[3px] items-end h-4">
              <span className="w-[2px] bg-neutral-700 animate-wave1"></span>
              <span className="w-[2px] bg-neutral-700 animate-wave2"></span>
              <span className="w-[2px] bg-neutral-700 animate-wave3"></span>
            </div>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-4 h-4"
            >
              <path d="M12 14a3 3 0 003-3V5a3 3 0 10-6 0v6a3 3 0 003 3z" />
              <path d="M19 11a7 7 0 01-14 0H3a9 9 0 0018 0h-2z" />
            </svg>
          )}
        </button>

        {/* Send Button */}
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
