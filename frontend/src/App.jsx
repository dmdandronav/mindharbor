import React, { useState, useRef, useEffect } from "react";

const APP_NAME = "MindHarbor";
const TAGLINE = "Two minutes a day. Patterns over panic.";

const MOOD_TAGS = [
  { emoji: "😊", label: "Happy" },
  { emoji: "😐", label: "Neutral" },
  { emoji: "😟", label: "Worried" },
  { emoji: "😡", label: "Angry" },
  { emoji: "😴", label: "Tired" },
];

function loadMoodHistory() {
  try {
    return JSON.parse(localStorage.getItem("mindharbor_moods") || "[]");
  } catch {
    return [];
  }
}

function saveMoodEntry(emoji) {
  const history = loadMoodHistory();
  const entry = { date: new Date().toISOString(), mood: emoji };
  localStorage.setItem("mindharbor_moods", JSON.stringify([...history, entry]));
}

export default function App() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi — I'm MindHarbor, your daily check-in companion. How are you feeling today? Pick a mood above or just type.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState([]);
  const [selectedMood, setSelectedMood] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  function handleMoodTag(tag) {
    setSelectedMood(tag.emoji);
    saveMoodEntry(tag.emoji);
  }

  async function sendMessage(e) {
    e.preventDefault();
    const rawText = input.trim();
    if (!rawText || loading) return;

    const text = selectedMood ? `[Mood: ${selectedMood}] ${rawText}` : rawText;

    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setSelectedMood(null);
    setLoading(true);
    setSources([]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMessages([...next, { role: "assistant", content: data.reply }]);
      setSources(data.sources || []);
    } catch (err) {
      setMessages([
        ...next,
        {
          role: "assistant",
          content:
            "Hmm, I couldn't reach the backend. Make sure the Flask server is running on port 5000 and your API key is set in backend/.env.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-[var(--color-line)] px-6 py-5">
        <h1 className="font-[var(--font-display)] text-2xl text-[var(--color-accent)]">
          {APP_NAME}
        </h1>
        <p className="text-sm text-[var(--color-ink)]/60">{TAGLINE}</p>
      </header>

      <main
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 py-6 space-y-4 max-w-2xl w-full mx-auto"
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-[var(--color-accent)] text-white"
                  : "bg-white border border-[var(--color-line)]"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-[var(--color-accent)]/70 text-sm pl-1">
            <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] pulse-soft" />
            thinking…
          </div>
        )}

        {sources.length > 0 && (
          <div className="text-xs text-[var(--color-ink)]/50 pl-1">
            Sources: {sources.join(", ")}
          </div>
        )}
      </main>

      <div className="border-t border-[var(--color-line)] px-6 pt-3 pb-1 max-w-2xl w-full mx-auto">
        <div className="flex gap-2 mb-2">
          {MOOD_TAGS.map((tag) => (
            <button
              key={tag.emoji}
              type="button"
              onClick={() => handleMoodTag(tag)}
              title={tag.label}
              className={`text-xl px-2 py-1 rounded-xl transition-all ${
                selectedMood === tag.emoji
                  ? "bg-[var(--color-accent)] scale-110 shadow"
                  : "bg-[var(--color-muted)] hover:bg-[var(--color-line)]"
              }`}
            >
              {tag.emoji}
            </button>
          ))}
          {selectedMood && (
            <span className="text-xs text-[var(--color-ink)]/50 self-center ml-1">
              Mood tagged — type your message and send
            </span>
          )}
        </div>

        <form
          onSubmit={sendMessage}
          className="flex gap-3 pb-4"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message…"
            className="flex-1 rounded-xl border border-[var(--color-line)] bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-[var(--color-accent)] text-white px-5 py-2 text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
