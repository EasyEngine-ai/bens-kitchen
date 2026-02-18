"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const TTS_URL =
  "https://n8n-main-instance-production-c69d.up.railway.app/webhook/tts";
const CHAT_URL =
  "https://n8n-main-instance-production-c69d.up.railway.app/webhook/chat";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface RecipeKnowledge {
  t: string; s: string; c: string; src: string; d: string; i: string[]; dir: string[];
}

type LiveState = "idle" | "listening" | "thinking" | "speaking";

export default function CookingAssistant() {
  const [open, setOpen] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const [liveState, setLiveState] = useState<LiveState>("idle");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [catalog, setCatalog] = useState("");
  const [recipes, setRecipes] = useState<RecipeKnowledge[]>([]);
  const [showLabel, setShowLabel] = useState(true);
  const [liveTranscript, setLiveTranscript] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const liveModeRef = useRef(false);
  const messagesRef = useRef<Message[]>([]);
  const catalogRef = useRef("");
  const recipesRef = useRef<RecipeKnowledge[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const isSpeakingRef = useRef(false);

  // Keep refs in sync
  useEffect(() => { liveModeRef.current = liveMode; }, [liveMode]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { catalogRef.current = catalog; }, [catalog]);
  useEffect(() => { recipesRef.current = recipes; }, [recipes]);

  // Load data
  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
    fetch(`${base}/recipe-catalog.txt`).then((r) => r.text()).then(setCatalog).catch(() => {});
    fetch(`${base}/recipe-knowledge.json`).then((r) => r.json()).then(setRecipes).catch(() => {});
  }, []);

  useEffect(() => {
    const SR = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
    setSpeechSupported(!!SR);
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);
  useEffect(() => { if (open && !liveMode) setTimeout(() => inputRef.current?.focus(), 300); }, [open, liveMode]);

  const findRelevantRecipes = useCallback((text: string): string => {
    const r = recipesRef.current;
    if (!r.length) return "";
    const words = text.toLowerCase().split(/\s+/);
    const scored = r.map((rec) => {
      let score = 0;
      const tl = rec.t.toLowerCase();
      for (const w of words) { if (w.length < 3) continue; if (tl.includes(w)) score += 3; if (rec.c.toLowerCase().includes(w)) score += 1; if (rec.d.toLowerCase().includes(w)) score += 1; }
      return { recipe: rec, score };
    }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 5);
    if (!scored.length) return "";
    return scored.map(({ recipe: rec }) => {
      const lines = [`**${rec.t}** [${rec.c}] (${rec.src})`, `Description: ${rec.d}`, `Ingredients: ${rec.i.join("; ")}`];
      if (rec.dir.length) lines.push(`Directions: ${rec.dir.map((d, i) => `${i + 1}. ${d}`).join(" ")}`);
      return lines.join("\n");
    }).join("\n\n");
  }, []);

  // Stop any audio immediately
  const stopAudio = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; audioRef.current = null; }
    setSpeaking(false);
    isSpeakingRef.current = false;
  }, []);

  // Cancel any in-flight requests
  const cancelPending = useCallback(() => {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
  }, []);

  // Kill recognition
  const killRecognition = useCallback(() => {
    if (recognitionRef.current) { try { recognitionRef.current.abort(); } catch {} recognitionRef.current = null; }
    setListening(false);
  }, []);

  // Barge-in: stop everything and process new input
  const bargeIn = useCallback(() => {
    stopAudio();
    cancelPending();
    setLoading(false);
    setLiveState("listening");
  }, [stopAudio, cancelPending]);

  // Direct OpenAI chat call (no n8n middleman)
  const doChat = useCallback(async (text: string, onReply: (reply: string) => void, onError: () => void) => {
    const msgs = [...messagesRef.current, { role: "user" as const, content: text }];
    setMessages(msgs);
    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const recipeContext = findRelevantRecipes(text);
      const res = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: msgs.slice(-10).map((m) => ({ role: m.role, content: m.content })),
          catalog: catalogRef.current,
          recipeContext: recipeContext || undefined,
        }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      const reply = data.reply || "Hmm, I'm drawing a blank. Try asking again!";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      abortRef.current = null;
      onReply(reply);
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") return;
      setMessages((prev) => [...prev, { role: "assistant", content: "Whoops! My brain had a hiccup. Give it another shot!" }]);
      onError();
    } finally {
      setLoading(false);
    }
  }, [findRelevantRecipes]);

  // Direct OpenAI TTS call (no n8n middleman)
  const playTTS = useCallback(async (text: string): Promise<void> => {
    setSpeaking(true);
    isSpeakingRef.current = true;

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(TTS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error("TTS error");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      return new Promise<void>((resolve) => {
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          setSpeaking(false);
          isSpeakingRef.current = false;
          URL.revokeObjectURL(url);
          audioRef.current = null;
          abortRef.current = null;
          resolve();
        };
        audio.onerror = () => {
          setSpeaking(false);
          isSpeakingRef.current = false;
          URL.revokeObjectURL(url);
          audioRef.current = null;
          abortRef.current = null;
          resolve();
        };
        audio.play().catch(() => { setSpeaking(false); isSpeakingRef.current = false; resolve(); });
      });
    } catch (e: unknown) {
      setSpeaking(false);
      isSpeakingRef.current = false;
      if (e instanceof Error && e.name === "AbortError") return;
    }
  }, []);

  // Live mode: always-on listening with barge-in
  const startLiveListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    killRecognition();

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    let fullTranscript = "";
    let silenceTimer: ReturnType<typeof setTimeout> | null = null;
    let hasSpeech = false;

    const clearSilence = () => { if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; } };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let final = "";
      let interim = "";
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript;
        else interim += event.results[i][0].transcript;
      }
      fullTranscript = final;
      const display = (final + " " + interim).trim();
      setLiveTranscript(display);
      if (display) hasSpeech = true;

      // BARGE-IN: if AI is speaking/thinking and user starts talking, interrupt immediately
      if (hasSpeech && isSpeakingRef.current) {
        bargeIn();
      }

      clearSilence();
      if (hasSpeech) {
        silenceTimer = setTimeout(() => {
          const text = (fullTranscript || display).trim();
          if (text && liveModeRef.current) {
            clearSilence();
            hasSpeech = false;
            fullTranscript = "";
            setLiveTranscript("");
            setLiveState("thinking");

            doChat(text, async (reply) => {
              if (!liveModeRef.current) return;
              setLiveState("speaking");
              await playTTS(reply);
              if (liveModeRef.current) {
                setLiveState("listening");
              }
            }, () => {
              if (liveModeRef.current) {
                setLiveState("listening");
              }
            });
          }
        }, 1200); // Faster silence detection
      }
    };

    recognition.onerror = (e: Event & { error?: string }) => {
      clearSilence();
      if (e.error === "no-speech" || e.error === "aborted") {
        if (liveModeRef.current) {
          setTimeout(() => { if (liveModeRef.current) startLiveListening(); }, 300);
        }
        return;
      }
    };

    recognition.onend = () => {
      clearSilence();
      // Always restart in live mode — recognition stays on even during AI speech
      if (liveModeRef.current) {
        setTimeout(() => { if (liveModeRef.current) startLiveListening(); }, 200);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
    setLiveState("listening");
  }, [killRecognition, doChat, playTTS, bargeIn]);

  // Enter live mode
  const enterLiveMode = useCallback(() => {
    setLiveMode(true);
    liveModeRef.current = true;
    setOpen(false);
    stopAudio();
    setLiveTranscript("");
    setLiveState("listening");
    setTimeout(() => startLiveListening(), 200);
  }, [stopAudio, startLiveListening]);

  // Exit live mode
  const exitLiveMode = useCallback(() => {
    setLiveMode(false);
    liveModeRef.current = false;
    killRecognition();
    stopAudio();
    cancelPending();
    setLiveState("idle");
    setLiveTranscript("");
    setListening(false);
    setLoading(false);
  }, [killRecognition, stopAudio, cancelPending]);

  // Text chat: manual mic
  const toggleManualListen = useCallback(() => {
    if (listening) {
      killRecognition();
    } else {
      stopAudio();
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) return;
      const recognition = new SR();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      let finalT = "";
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) finalT += event.results[i][0].transcript;
          else interim = event.results[i][0].transcript;
        }
        setInput(finalT + interim);
      };
      recognition.onerror = () => setListening(false);
      recognition.onend = () => {
        setListening(false);
        if (finalT.trim()) handleSendText(finalT.trim());
      };
      recognitionRef.current = recognition;
      recognition.start();
      setListening(true);
    }
  }, [listening, killRecognition, stopAudio]);

  // Text chat: send
  const handleSendText = useCallback((text: string) => {
    if (!text.trim() || loading) return;
    setInput("");
    doChat(text.trim(), (reply) => {
      if (ttsEnabled) playTTS(reply);
    }, () => {});
  }, [loading, doChat, ttsEnabled, playTTS]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) handleSendText(input.trim());
  };

  return (
    <>
      {/* Live Voice Mode — compact floating pill */}
      <AnimatePresence>
        {liveMode && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3"
          >
            <div className="bg-bg border border-border rounded-2xl shadow-2xl px-5 py-4 flex items-center gap-4 min-w-[280px]">
              {/* State indicator */}
              <div className="flex items-center gap-3 flex-1">
                {liveState === "listening" && (
                  <>
                    <div className="flex items-center gap-1">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <motion.div
                          key={i}
                          className="w-1 bg-green-400 rounded-full"
                          animate={{ height: [8, 20, 8] }}
                          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                        />
                      ))}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-green-400">Listening...</p>
                      {liveTranscript && (
                        <p className="text-[11px] text-text-muted truncate mt-0.5">{liveTranscript}</p>
                      )}
                    </div>
                  </>
                )}
                {liveState === "thinking" && (
                  <>
                    <div className="flex items-center gap-1.5">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-2 h-2 bg-accent rounded-full"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                        />
                      ))}
                    </div>
                    <p className="text-xs font-medium text-accent">Thinking...</p>
                  </>
                )}
                {liveState === "speaking" && (
                  <>
                    <div className="flex items-center gap-0.5">
                      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                        <motion.div
                          key={i}
                          className="w-1 bg-accent rounded-full"
                          animate={{ height: [4, 16, 4] }}
                          transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.07 }}
                        />
                      ))}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-accent">Speaking...</p>
                      <p className="text-[10px] text-text-dim mt-0.5">Just start talking to interrupt me!</p>
                    </div>
                  </>
                )}
              </div>

              {/* View chat button */}
              <button
                onClick={() => { setOpen(true); }}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text hover:bg-bg-elevated transition-colors"
                title="View conversation"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
              </button>

              {/* End live mode */}
              <button
                onClick={exitLiveMode}
                className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors"
                title="End live chat"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main floating button (hidden in live mode) */}
      {!liveMode && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
          <AnimatePresence>
            {showLabel && !open && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.3 }}
                className="bg-bg border border-border rounded-full px-4 py-2 shadow-lg whitespace-nowrap"
              >
                <span className="text-sm font-medium text-text">
                  Try Me! I&apos;m an AI Cooking Buddy
                </span>
              </motion.div>
            )}
          </AnimatePresence>
          <motion.button
            onClick={() => setOpen(!open)}
            className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${
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
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
            )}
          </motion.button>
        </div>
      )}

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`fixed z-50 w-[380px] max-w-[calc(100vw-48px)] h-[540px] max-h-[calc(100vh-140px)] bg-bg border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden ${
              liveMode ? "bottom-24 right-6" : "bottom-24 right-6"
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-surface">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                  <span className="text-sm">{"\u{1F357}"}</span>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-text leading-none">AI Cooking Buddy</h3>
                  <p className="text-[10px] text-text-dim mt-0.5">Ask about any recipe or cooking question</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { stopAudio(); setTtsEnabled(!ttsEnabled); }}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${ttsEnabled ? "text-accent hover:bg-accent/10" : "text-text-dim hover:bg-bg-elevated"}`}
                  title={ttsEnabled ? "Voice on" : "Voice off"}
                >
                  {ttsEnabled ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" /></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.531V19.94a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.506-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" /></svg>
                  )}
                </button>
                {speaking && (
                  <button onClick={stopAudio} className="w-8 h-8 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-400/10 transition-colors" title="Stop speaking">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                  </button>
                )}
                {!liveMode && (
                  <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text hover:bg-bg-elevated transition-colors" title="Close">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">{"\u{1F468}\u{200D}\u{1F373}"}</div>
                  <p className="text-sm text-text-muted mb-4">
                    Hey! I know all 210+ recipes in Ben&apos;s Kitchen. Ask me anything — recipes, cooking tips, substitutions, or just chat about food.
                  </p>
                  <div className="space-y-2">
                    {["What's a good spicy chicken sandwich?", "How do I make buffalo sauce?", "What can I make with bacon and cheese?"].map((q) => (
                      <button key={q} onClick={() => handleSendText(q)} className="block w-full text-left text-xs text-text-dim bg-bg-surface border border-border rounded-lg px-3 py-2 hover:border-accent/30 hover:text-accent transition-all">{q}</button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${msg.role === "user" ? "bg-accent text-bg rounded-br-md" : "bg-bg-surface border border-border text-text rounded-bl-md"}`}>
                    {msg.role === "assistant" ? <AssistantMessage content={msg.content} /> : msg.content}
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

            {/* Input area */}
            <div className="border-t border-border px-3 py-3 bg-bg-surface">
              {/* Live Chat button */}
              {speechSupported && !liveMode && (
                <button
                  onClick={enterLiveMode}
                  className="w-full mb-2 flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                  </svg>
                  Live Voice Chat — Talk while you cook
                </button>
              )}
              {liveMode && (
                <button
                  onClick={() => { exitLiveMode(); setOpen(false); }}
                  className="w-full mb-2 flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                  End Live Chat
                </button>
              )}
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                {speechSupported && !liveMode && (
                  <button type="button" onClick={toggleManualListen} className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${listening ? "bg-red-500 text-white animate-pulse" : "bg-bg-elevated text-text-muted hover:text-accent hover:bg-accent/10"}`} aria-label={listening ? "Stop" : "Speak"}>
                    {listening ? (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" /></svg>
                    )}
                  </button>
                )}
                <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about a recipe..." disabled={loading} className="flex-1 bg-bg border border-border rounded-full px-4 py-2 text-sm text-text placeholder:text-text-dim outline-none focus:border-accent/50 transition-colors disabled:opacity-50" />
                <button type="submit" disabled={!input.trim() || loading} className="flex-shrink-0 w-9 h-9 rounded-full bg-accent text-bg flex items-center justify-center disabled:opacity-30 hover:bg-accent-light transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" /></svg>
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function AssistantMessage({ content }: { content: string }) {
  const parts = content.split("\n");
  return (
    <div className="space-y-2">
      {parts.map((line, i) => {
        if (!line.trim()) return null;
        const isBullet = /^\s*[-\u2022*]\s/.test(line);
        const cleanLine = isBullet ? line.replace(/^\s*[-\u2022*]\s/, "") : line;
        const processed = cleanLine
          .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
          .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-accent underline underline-offset-2 hover:text-accent-light">$1</a>');
        return (
          <div key={i} className={isBullet ? "flex gap-1.5 items-start" : ""}>
            {isBullet && <span className="text-accent mt-0.5 flex-shrink-0">&bull;</span>}
            <span dangerouslySetInnerHTML={{ __html: processed }} />
          </div>
        );
      })}
    </div>
  );
}
