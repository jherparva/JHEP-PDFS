"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface PDFThumbnailProps {
  blob: Blob;
  pageNumber: number;
  rotation?: number;
  className?: string;
}

export const PDFThumbnail = ({ blob, pageNumber, rotation = 0, className }: PDFThumbnailProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    
    const render = async () => {
      try {
        const pdfjsLib: any = await import("pdfjs-dist");
        // Configuramos el worker desde jsdelivr con la versión exacta
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
        
        const data = await blob.arrayBuffer();
        // @ts-ignore
        const pdf = await pdfjsLib.getDocument(data).promise;
        const page = await pdf.getPage(pageNumber);
        
        if (!active || !canvasRef.current) return;
        
        const viewport = page.getViewport({ scale: 0.4, rotation });
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        
        if (context) {
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          // @ts-ignore
          await page.render({ canvasContext: context, viewport }).promise;
        }
        setLoading(false);
      } catch (err) {
        console.error("Error visualizando miniatura:", err);
      }
    };

    render();
    return () => { active = false; };
  }, [blob, pageNumber, rotation]);

  return (
    <div className={cn("relative bg-slate-100 rounded-lg overflow-hidden border border-slate-200 aspect-[3/4] flex items-center justify-center shadow-inner", className)}>
      {loading && <div className="absolute inset-0 bg-slate-50 animate-pulse flex items-center justify-center"><div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>}
      <canvas ref={canvasRef} className="max-w-full max-h-full object-contain shadow-2xl" />
    </div>
  );
};
