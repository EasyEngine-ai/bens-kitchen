"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface RecipeKnowledge {
  t: string; // title
  s: string; // slug
  c: string; // category
  src: string; // source
  d: string; // description
  i: string[]; // ingredients
  dir: string[]; // directions
}

export default function CookingAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [catalog, setCatalog] = useState("");
  const [recipes, setRecipes] = useState<RecipeKnowledge[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Load catalog and recipe knowledge
  useEffect(() => {
    fetch("/recipe-catalog.txt")
      .then((r) => r.text())
      .then(setCatalog)
      .catch(() => {});
    fetch("/recipe-knowledge.json")
      .then((r) => r.json())
      .then(setRecipes)
      .catch(() => {});
  }, []);

  // Check speech support
  useEffect(() => {
    const SR =
      typeof window !== "undefined"
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;
    setSpeechSupported(!!SR);
  }, []);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  // Find relevant recipes by keyword matching against the user message
  const findRelevantRecipes = useCallback(
    (text: string): string => {
      if (!recipes.length) return "";
      const words = text.toLowerCase().split(/\s+/);
      const scored = recipes
        .map((r) => {
          const titleLower = r.t.toLowerCase();
          let score = 0;
          for (const w of words) {
            if (w.length < 3) continue;
            if (titleLower.includes(w)) score += 3;
            if (r.c.toLowerCase().includes(w)) score += 1;
            if (r.d.toLowerCase().includes(w)) score += 1;
          }
          return { recipe: r, score };
        })
        .filter((r) => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      if (scored.length === 0) return "";

      return scored
        .map(({ recipe: r }) => {
          const lines = [
            `**${r.t}** [${r.c}] (${r.src})`,
            `Slug: ${r.s}`,
            `Description: ${r.d}`,
            `Ingredients: ${r.i.join("; ")}`,
          ];
          if (r.dir.length > 0) {
            lines.push(
              `Directions: ${r.dir.map((d, i) => `${i + 1}. ${d}`).join(" ")}`
            );
          }
          return lines.join("\n");
        })
        .join("\n\n");
    },
    [recipes]
  );

  // Speak text aloud
  const speak = useCallback(
    (text: string) => {
      if (!ttsEnabled || typeof window === "undefined" || !window.speechSynthesis)
        return;
      // Strip markdown formatting for cleaner speech
      const clean = text
        .replace(/\*\*/g, "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/[#*_~`]/g, "")
        .replace(/\n+/g, ". ");
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.rate = 1.05;
      utterance.pitch = 1;
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    },
    [ttsEnabled]
  );

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    }
  }, []);

  // Send message to AI
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;

      const userMessage: Message = { role: "user", content: text.trim() };
      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setInput("");
      setLoading(true);

      try {
        // Find relevant recipe context for this message
        const recipeContext = findRelevantRecipes(text);

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: updatedMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            catalog,
            recipeContext: recipeContext || undefined,
          }),
        });

        if (!res.ok) throw new Error("API error");

        const data = await res.json();
        const assistantMessage: Message = {
          role: "assistant",
          content: data.reply,
        };
        setMessages((prev) => [...prev, assistantMessage]);

        // Speak the response
        speak(data.reply);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "Sorry, I'm having trouble connecting right now. Try again in a moment!",
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [messages, loading, catalog, findRelevantRecipes, speak]
  );

  // Voice input
  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    stopSpeaking();

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    let finalTranscript = "";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += t;
        } else {
          interim = t;
        }
      }
      setInput(finalTranscript + interim);
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
      if (finalTranscript.trim()) {
        sendMessage(finalTranscript.trim());
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [sendMessage, stopSpeaking]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage(input.trim());
    }
  };

  return (
    <>
      {/* Floating button */}
      <motion.button
        onClick={() => setOpen(!open)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${
          open
            ? "bg-bg-surface border border-border text-text-muted"
            : "bg-accent text-bg hover:shadow-xl hover:scale-105"
        }`}
        whileTap={{ scale: 0.95 }}
        aria-label={open ? "Close assistant" : "Open cooking assistant"}
      >
        {open ? (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
            />
          </svg>
        )}
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-48px)] h-[540px] max-h-[calc(100vh-140px)] bg-bg border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-surface">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                  <span className="text-sm">🍗</span>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-text leading-none">
                    Kitchen Assistant
                  </h3>
                  <p className="text-[10px] text-text-dim mt-0.5">
                    Ask about any recipe or cooking question
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {/* TTS toggle */}
                <button
                  onClick={() => {
                    stopSpeaking();
                    setTtsEnabled(!ttsEnabled);
                  }}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    ttsEnabled
                      ? "text-accent hover:bg-accent/10"
                      : "text-text-dim hover:bg-bg-elevated"
                  }`}
                  title={ttsEnabled ? "Voice on" : "Voice off"}
                >
                  {ttsEnabled ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.531V19.94a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.506-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                    </svg>
                  )}
                </button>
                {speaking && (
                  <button
                    onClick={stopSpeaking}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-400/10 transition-colors"
                    title="Stop speaking"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="6" width="12" height="12" rx="2" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">👨‍🍳</div>
                  <p className="text-sm text-text-muted mb-4">
                    Hey! I know all 210+ recipes in Ben&apos;s Kitchen. Ask me
                    anything — recipes, cooking tips, substitutions, or just
                    chat about food.
                  </p>
                  <div className="space-y-2">
                    {[
                      "What's a good spicy chicken sandwich?",
                      "How do I make buffalo sauce?",
                      "What can I make with bacon and cheese?",
                    ].map((q) => (
                      <button
                        key={q}
                        onClick={() => sendMessage(q)}
                        className="block w-full text-left text-xs text-text-dim bg-bg-surface border border-border rounded-lg px-3 py-2 hover:border-accent/30 hover:text-accent transition-all"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-accent text-bg rounded-br-md"
                        : "bg-bg-surface border border-border text-text rounded-bl-md"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <AssistantMessage content={msg.content} />
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-bg-surface border border-border rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex gap-1.5">
                      <span className="w-2 h-2 bg-text-dim rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-text-dim rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-text-dim rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-border px-3 py-3 bg-bg-surface">
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                {/* Mic button */}
                {speechSupported && (
                  <button
                    type="button"
                    onClick={listening ? stopListening : startListening}
                    className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                      listening
                        ? "bg-red-500 text-white animate-pulse"
                        : "bg-bg-elevated text-text-muted hover:text-accent hover:bg-accent/10"
                    }`}
                    aria-label={listening ? "Stop" : "Speak"}
                  >
                    {listening ? (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="6" width="12" height="12" rx="2" />
                      </svg>
                    ) : (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
                        />
                      </svg>
                    )}
                  </button>
                )}

                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    listening ? "Listening..." : "Ask about a recipe..."
                  }
                  disabled={loading || listening}
                  className="flex-1 bg-bg border border-border rounded-full px-4 py-2 text-sm text-text placeholder:text-text-dim outline-none focus:border-accent/50 transition-colors disabled:opacity-50"
                />

                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="flex-shrink-0 w-9 h-9 rounded-full bg-accent text-bg flex items-center justify-center disabled:opacity-30 hover:bg-accent-light transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18"
                    />
                  </svg>
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/** Render assistant message with basic markdown-like formatting */
function AssistantMessage({ content }: { content: string }) {
  // Split into paragraphs, handle bold, links, and bullet points
  const parts = content.split("\n");

  return (
    <div className="space-y-2">
      {parts.map((line, i) => {
        if (!line.trim()) return null;

        const isBullet = /^\s*[-•*]\s/.test(line);
        const cleanLine = isBullet ? line.replace(/^\s*[-•*]\s/, "") : line;

        // Process bold and links
        const processed = cleanLine
          .replace(
            /\*\*(.+?)\*\*/g,
            '<strong class="font-semibold">$1</strong>'
          )
          .replace(
            /\[([^\]]+)\]\(([^)]+)\)/g,
            '<a href="$2" class="text-accent underline underline-offset-2 hover:text-accent-light">$1</a>'
          );

        return (
          <div
            key={i}
            className={isBullet ? "flex gap-1.5 items-start" : ""}
          >
            {isBullet && (
              <span className="text-accent mt-0.5 flex-shrink-0">
                &bull;
              </span>
            )}
            <span dangerouslySetInnerHTML={{ __html: processed }} />
          </div>
        );
      })}
    </div>
  );
}
