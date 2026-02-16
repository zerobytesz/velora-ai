import { useState, useEffect } from "react";
import { useAuth } from "./context/AuthContext";
import ChatWidget from "./components/ChatBot/ChatWidget";

export default function App() {
  const { token, login, logout } = useAuth();

  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [showAuth, setShowAuth] = useState(false);

  // DARK MODE STATE
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  const handleSubmit = async () => {
    const endpoint = isRegister ? "register" : "login";

    const res = await fetch(`http://localhost:5001/api/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();

    if (data.token) {
      login(data.token);
      setShowAuth(false);
    } else if (data.message === "User created") {
      alert("Registered successfully. Please login.");
      setIsRegister(false);
    } else {
      alert(data.message);
    }
  };

  return (
    <div
      className="
      relative
      min-h-screen
      bg-white
      dark:bg-gradient-to-b
      dark:from-neutral-900
      dark:via-neutral-900
      dark:to-black
      text-neutral-900
      dark:text-neutral-100
      transition-colors duration-500
      overflow-hidden
    "
    >
      {/* Subtle Dark Glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 dark:bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.06),_transparent_60%)]" />

      {/* NAVBAR */}

      <nav
        className="
flex items-center justify-between px-8 py-6
backdrop-blur-md
bg-white/70 dark:bg-neutral-900/60
border-b border-neutral-200 dark:border-neutral-800
sticky top-0 z-50
transition-colors duration-300
"
      >
        <h1 className="text-xl font-semibold tracking-tight">Velora AI</h1>

        <div className="flex items-center gap-4">
          {/* DARK MODE TOGGLE */}
          <button
            onClick={() => setDark(!dark)}
            className="relative w-14 h-7 flex items-center bg-neutral-300 dark:bg-neutral-700 rounded-full p-1 transition-colors duration-300"
          >
            <div
              className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ${
                dark ? "translate-x-7" : ""
              }`}
            />
          </button>

          {token ? (
            <button
              onClick={logout}
              className="text-sm text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white transition"
            >
              Logout
            </button>
          ) : (
            <button
              onClick={() => setShowAuth(!showAuth)}
              className="text-sm font-medium hover:text-neutral-600 dark:hover:text-neutral-300 transition"
            >
              Login
            </button>
          )}
        </div>
      </nav>

      {/* HERO */}
      <section className="px-8 pt-28 pb-20 text-center max-w-4xl mx-auto">
        <h2 className="text-5xl font-semibold leading-tight tracking-tight mb-6">
          Intelligent conversations,
          <br />
          built for modern teams.
        </h2>

        <p className="text-neutral-600 dark:text-neutral-400 text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
          A real-time AI assistant with streaming responses, session memory, and
          a refined interface designed for productivity.
        </p>

        <div className="flex justify-center gap-4">
          <button
            onClick={() => window.dispatchEvent(new Event("open-chat"))}
            className="px-6 py-3 bg-black text-white rounded-full text-sm font-medium hover:bg-neutral-800 transition"
          >
            Try the Assistant
          </button>

          <button
            onClick={() => setShowAuth(true)}
            className="px-6 py-3 border border-neutral-300 dark:border-neutral-600 rounded-full text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          >
            Create Account
          </button>
        </div>
      </section>

      {/* AUTH SECTION */}
      {showAuth && !token && (
        <section className="max-w-md mx-auto px-8 pb-20">
          <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-8 shadow-sm transition">
            <h3 className="text-lg font-medium mb-6 text-center">
              {isRegister ? "Create your account" : "Welcome back"}
            </h3>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
              className="space-y-4"
            >
              <input
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                required
              />

              <input
                type="password"
                placeholder="Password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                required
              />

              <button
                type="submit"
                className="w-full bg-black text-white py-3 rounded-xl hover:bg-neutral-800 transition"
              >
                {isRegister ? "Register" : "Login"}
              </button>
            </form>

            <p
              onClick={() => setIsRegister(!isRegister)}
              className="mt-6 text-sm text-neutral-500 dark:text-neutral-400 cursor-pointer text-center hover:text-neutral-800 dark:hover:text-neutral-200 transition"
            >
              {isRegister
                ? "Already have an account? Login"
                : "New here? Create an account"}
            </p>
          </div>
        </section>
      )}

      {/* CREATORS SECTION */}
      <section className="px-8 py-24 bg-white dark:bg-neutral-950 transition-colors">
        <div className="max-w-5xl mx-auto text-center mb-16">
          <h2 className="text-3xl font-semibold mb-4 tracking-tight">
            Built by the Creator
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400 text-lg max-w-2xl mx-auto">
            Velora AI was designed and developed with a focus on performance,
            elegance, and modern AI integration.
          </p>
        </div>

        {/* CENTER WRAPPER */}
        <div className="flex justify-center items-center">
          <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-10 w-full max-w-sm text-center shadow-sm">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full bg-black text-white flex items-center justify-center text-2xl font-semibold mx-auto mb-6">
              RT
            </div>

            {/* Name */}
            <h3 className="text-xl font-semibold tracking-tight">
              Raghav Tyagi
            </h3>

            <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-2">
              Creator of Velora AI
            </p>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="px-8 py-24 bg-neutral-50 dark:bg-neutral-800 transition-colors">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-16 text-left">
          <div>
            <h3 className="text-lg font-semibold mb-3">Real-time Streaming</h3>
            <p className="text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed">
              Responses render progressively for a natural conversational flow.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">Persistent Sessions</h3>
            <p className="text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed">
              Conversations remain available throughout your browsing session.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">Minimal Interface</h3>
            <p className="text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed">
              Clean design with intentional spacing and refined typography.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-8 py-12 text-center text-sm text-neutral-500 dark:text-neutral-400 border-t border-neutral-200 dark:border-neutral-700">
        © 2026 Velora AI
      </footer>

      <ChatWidget />
    </div>
  );
}
