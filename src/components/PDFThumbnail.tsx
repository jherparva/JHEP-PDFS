"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { renderPageToDataUrl } from "@/lib/pdf-cache";

interface PDFThumbnailProps {
  blob: Blob;
  pageNumber: number;
  rotation?: number;
  className?: string;
}

export const PDFThumbnail = ({ blob, pageNumber, rotation = 0, className }: PDFThumbnailProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dataUrl, setDataUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);

  // Lazy render using Intersection Observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [blob, pageNumber]);

  useEffect(() => {
    if (!isVisible) return;
    let active = true;

    const loadThumbnail = async () => {
      setLoading(true);
      try {
        const url = await renderPageToDataUrl(blob, pageNumber, rotation, 0.4);
        if (active) {
          setDataUrl(url);
          setLoading(false);
        }
      } catch (err) {
        console.error("Thumbnail load error:", err);
        if (active) setLoading(false);
      }
    };

    loadThumbnail();
    return () => {
      active = false;
    };
  }, [isVisible, blob, pageNumber, rotation]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative bg-slate-100 rounded-lg overflow-hidden border border-slate-200 aspect-[3/4] flex items-center justify-center shadow-inner select-none",
        className
      )}
    >
      {loading && !dataUrl && (
        <div className="absolute inset-0 bg-slate-50 animate-pulse flex flex-col items-center justify-center gap-2">
          <div className="w-6 h-6 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Hoja {pageNumber}</span>
        </div>
      )}
      {dataUrl && (
        <img
          src={dataUrl}
          alt={`Página ${pageNumber}`}
          className="max-w-full max-h-full object-contain shadow-2xl transition-opacity duration-300"
          loading="lazy"
        />
      )}
    </div>
  );
};
