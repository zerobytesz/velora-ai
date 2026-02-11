import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ChatWindow from "./ChatWindow";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setOpen(true);
    window.addEventListener("open-chat", handleOpen);
    return () => window.removeEventListener("open-chat", handleOpen);
  }, []);

  return (
    <AnimatePresence>
      {!open && (
        <motion.button
          layoutId="chat-container"
          onClick={() => setOpen(true)}
          className="
            fixed bottom-6 right-6 z-[9999]
            bg-neutral-900 text-white
            px-6 py-3 rounded-full
            text-sm font-medium
            shadow-xl hover:bg-neutral-800 transition
          "
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2 }}
        >
          Chat
        </motion.button>
      )}

      {open && <ChatWindow onClose={() => setOpen(false)} />}
    </AnimatePresence>
  );
}
