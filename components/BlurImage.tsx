"use client";

import { useState, type ImgHTMLAttributes } from "react";
import placeholders from "@/public/image-placeholders.json";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "onLoad"> & {
  srcSet?: string;
  sizes?: string;
};

const map = placeholders as Record<string, string>;

export default function BlurImage({ src, className, style, ...rest }: Props) {
  const [loaded, setLoaded] = useState(false);
  const blur = typeof src === "string" ? map[src] : undefined;

  return (
    <span
      className="inline-block w-full h-full"
      style={{
        backgroundImage: blur && !loaded ? `url(${blur})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <img
        src={src}
        className={className}
        style={{ ...style, opacity: loaded ? 1 : 0, transition: "opacity 0.3s ease" }}
        onLoad={() => setLoaded(true)}
        {...rest}
      />
    </span>
  );
}
