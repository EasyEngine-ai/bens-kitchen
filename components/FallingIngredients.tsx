"use client";

import { useEffect, useRef } from "react";

const INGREDIENTS = [
  // Proteins
  "🍗", "🍖", "🥩", "🍤", "🥓",
  // Cheese & dairy
  "🧀", "🧈", "🥛",
  // Vegetables
  "🥬", "🍅", "🌶️", "🫑", "🌽", "🥕", "🥒", "🧅", "🧄", "🥦", "🍆",
  // Fruits
  "🥑", "🍋", "🍊", "🫐", "🍓", "🍑",
  // Herbs & spices
  "🌿", "🌱", "🍃",
  // Bread & grains
  "🍞", "🥐", "🥖", "🫓", "🌾",
  // Condiments & extras
  "🍯", "🫒", "🥚", "🥜", "🫘",
  // Cooked dishes
  "🍔", "🌮", "🌯", "🥗", "🍕",
];

interface Particle {
  x: number;
  y: number;
  emoji: string;
  size: number;
  speed: number;
  wobbleSpeed: number;
  wobbleAmount: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  phase: number;
}

export default function FallingIngredients() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // More particles, bigger, brighter — spread across screen immediately
    const count = Math.min(Math.floor(window.innerWidth / 45), 35);
    particlesRef.current = Array.from({ length: count }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      emoji: INGREDIENTS[Math.floor(Math.random() * INGREDIENTS.length)],
      size: 20 + Math.random() * 16,
      speed: 0.2 + Math.random() * 0.5,
      wobbleSpeed: 0.005 + Math.random() * 0.015,
      wobbleAmount: 25 + Math.random() * 50,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.02,
      opacity: 0.18 + Math.random() * 0.17,
      phase: Math.random() * Math.PI * 2,
    }));

    let time = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      time++;

      for (const p of particlesRef.current) {
        p.y += p.speed;
        p.rotation += p.rotationSpeed;
        const wobbleX = Math.sin(time * p.wobbleSpeed + p.phase) * p.wobbleAmount;

        // Reset when off screen
        if (p.y > canvas.height + 50) {
          p.y = -60;
          p.x = Math.random() * canvas.width;
          p.emoji = INGREDIENTS[Math.floor(Math.random() * INGREDIENTS.length)];
        }

        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x + wobbleX, p.y);
        ctx.rotate(p.rotation);
        ctx.font = `${p.size}px serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(p.emoji, 0, 0);
        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[1]"
      aria-hidden="true"
    />
  );
}
