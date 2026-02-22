"use client";

import { useCallback, useState, type ImgHTMLAttributes } from "react";
import placeholders from "@/public/image-placeholders.json";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "onLoad"> & {
  srcSet?: string;
  sizes?: string;
};

const map = placeholders as Record<string, string>;

export default function BlurImage({ src, className, style, ...rest }: Props) {
  const [loaded, setLoaded] = useState(false);
  const blur = typeof src === "string" ? map[src] : undefined;

  const imgRef = useCallback((el: HTMLImageElement | null) => {
    if (el?.complete && el.naturalWidth > 0) setLoaded(true);
  }, []);

  return (
    <img
      ref={imgRef}
      src={src}
      className={className}
      style={{
        ...style,
        backgroundImage: blur && !loaded ? `url(${blur})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
      onLoad={() => setLoaded(true)}
      {...rest}
    />
  );
}
