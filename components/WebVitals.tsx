"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export default function WebVitals() {
  useEffect(() => {
    import("web-vitals").then(({ onCLS, onINP, onLCP, onFCP, onTTFB }) => {
      const send = (metric: { name: string; value: number; delta: number; id: string }) => {
        window.gtag?.("event", metric.name, {
          event_category: "Web Vitals",
          value: Math.round(metric.name === "CLS" ? metric.delta * 1000 : metric.delta),
          event_label: metric.id,
          non_interaction: true,
        });
      };
      onCLS(send);
      onINP(send);
      onLCP(send);
      onFCP(send);
      onTTFB(send);
    });
  }, []);

  return null;
}
