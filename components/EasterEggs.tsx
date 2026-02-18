"use client";

import { useEffect, useState, useCallback, useRef } from "react";

const KONAMI = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];

const CONSOLE_ART = `
%c
 ____             _       _  ___ _       _
| __ )  ___ _ __ ( )___  | |/ (_) |_ ___| |__   ___ _ __
|  _ \\ / _ \\ '_ \\|// __| | ' /| | __/ __| '_ \\ / _ \\ '_ \\
| |_) |  __/ | | | \\__ \\ | . \\| | || (__| | | |  __/ | | |
|____/ \\___|_| |_| |___/ |_|\\_\\_|\\__\\___|_| |_|\\___|_| |_|

%c🍗 210+ recipes crafted with obsessive attention to flavor
%c🔥 Built by Benjamin Larson in New Mexico
%c💛 If you're reading this, you're a real one.
`;

export default function EasterEggs() {
  const [konamiIndex, setKonamiIndex] = useState(0);
  const [showChicken, setShowChicken] = useState(false);
  const [showRapidClick, setShowRapidClick] = useState(false);
  const clickCountRef = useRef(0);

  // Konami code listener
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === KONAMI[konamiIndex]) {
        const next = konamiIndex + 1;
        if (next === KONAMI.length) {
          setShowChicken(true);
          setKonamiIndex(0);
          setTimeout(() => setShowChicken(false), 4000);
        } else {
          setKonamiIndex(next);
        }
      } else {
        setKonamiIndex(0);
      }
    },
    [konamiIndex]
  );

  // Console art on mount
  useEffect(() => {
    console.log(
      CONSOLE_ART,
      "color: #D4A574; font-size: 10px; font-family: monospace;",
      "color: #E8C9A0; font-size: 12px;",
      "color: #8B6F47; font-size: 12px;",
      "color: #D4A574; font-size: 12px;"
    );
  }, []);

  // Konami listener
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Rapid click easter egg on logo
  useEffect(() => {
    const logo = document.querySelector("nav a");
    if (!logo) return;

    let timeout: ReturnType<typeof setTimeout>;
    const handleClick = () => {
      clickCountRef.current += 1;
      if (clickCountRef.current >= 7) {
        setShowRapidClick(true);
        setTimeout(() => setShowRapidClick(false), 3000);
        clickCountRef.current = 0;
      }
      clearTimeout(timeout);
      timeout = setTimeout(() => { clickCountRef.current = 0; }, 1000);
    };

    logo.addEventListener("click", handleClick);
    return () => {
      logo.removeEventListener("click", handleClick);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <>
      {/* Konami code: floating chicken */}
      {showChicken && (
        <div
          className="fixed inset-0 z-[10000] pointer-events-none flex items-center justify-center"
          style={{ animation: "fadeInOut 4s ease-in-out" }}
        >
          <div className="text-center">
            <div
              className="text-[120px] leading-none"
              style={{ animation: "bounce 0.5s ease-in-out infinite" }}
            >
              🍗
            </div>
            <p className="text-accent text-xl font-[family-name:var(--font-display)] mt-4 animate-pulse">
              You found the secret chicken!
            </p>
          </div>
        </div>
      )}

      {/* Rapid click reaction */}
      {showRapidClick && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[10000] pointer-events-none">
          <div
            className="bg-accent text-bg px-6 py-3 rounded-full text-sm font-medium shadow-lg"
            style={{ animation: "slideDown 0.3s ease-out" }}
          >
            Hungry? Check out the recipes! 🔥
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeInOut {
          0% { opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        @keyframes slideDown {
          from { transform: translate(-50%, -20px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>
    </>
  );
}
