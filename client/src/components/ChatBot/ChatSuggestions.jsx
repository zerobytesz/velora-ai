const suggestions = [
  "I need help choosing the right hosting plan",
  "I want to create a website",
  "I want to migrate my website",
];

export default function ChatSuggestions() {
  return (
    <div className="space-y-3">
      {suggestions.map((text, i) => (
        <button
          key={i}
          className="
            w-full
            flex items-center gap-3
            px-4 py-3
            rounded-xl
            border border-neutral-200
            text-sm text-neutral-800
            hover:bg-neutral-100 transition
          "
        >
          <span className="text-lg">↗</span>
          {text}
        </button>
      ))}
    </div>
  );
}
