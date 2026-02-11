export default function ChatHeader({
  onClose,
  onClear,
  onMaximize,
  isMaximized,
}) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-white">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-neutral-900">
          Assistant
        </span>

        <span className="flex items-center gap-1 text-xs text-green-600">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          Online
        </span>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={onClear}
          className="text-xs text-neutral-500 hover:text-neutral-900 transition"
        >
          Clear
        </button>

        <button
          onClick={onMaximize}
          className="text-neutral-500 hover:text-neutral-900 transition text-sm"
        >
          {isMaximized ? "🗗" : "🗖"}
        </button>

        <button
          onClick={onClose}
          className="text-neutral-400 hover:text-neutral-700 transition text-lg"
        >
          ×
        </button>
      </div>
    </div>
  );
}
