"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, ZoomIn, ZoomOut, Printer, Download, RotateCw, RotateCcw, Trash2, LayoutGrid, Search, ChevronUp, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Document, Page, pdfjs } from "react-pdf";
import { PDFDocument, degrees } from "pdf-lib";

if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

interface PDFViewerProps {
  pdf: Blob | null;
  onClose: () => void;
}

// Lazy page container component to avoid rendering off-screen page canvases
const LazyPageCard = ({
  pageNumber,
  zoom,
  numPages,
  onRotate,
  onDelete
}: {
  pageNumber: number;
  zoom: number;
  numPages: number;
  onRotate: (pageIndex: number, deg: number) => void;
  onDelete: (pageIndex: number) => void;
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
        } else {
          // Unmount off-screen pages if numPages is very high
          if (numPages > 30) {
            setIsVisible(false);
          }
        }
      },
      { rootMargin: "400px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [numPages]);

  const computedScale = zoom * ((numPages > 1 && zoom <= 1.2) ? 1.05 : 1.3);

  return (
    <div
      ref={cardRef}
      id={`page-card-${pageNumber}`}
      className="relative bg-white shadow-2xl rounded-sm border border-slate-200 transition-transform hover:scale-[1.01] group/page min-h-[500px] flex flex-col items-center justify-center"
      style={{
        width: Math.min(800, Math.max(300, 600 * zoom)) + "px",
        minHeight: Math.min(1000, Math.max(400, 800 * zoom)) + "px"
      }}
    >
      <div className="absolute top-4 right-4 opacity-0 group-hover/page:opacity-100 transition-opacity z-50 flex flex-col gap-2 bg-slate-100/90 backdrop-blur border border-slate-200 p-2 rounded-xl shadow-xl">
        <button
          onClick={() => onRotate(pageNumber - 1, -90)}
          className="w-10 h-10 flex items-center justify-center bg-white text-slate-700 rounded-lg hover:bg-violet-50 hover:text-violet-600 shadow-sm border border-slate-200 transition-all"
          title="Rotar a la izquierda"
        >
          <RotateCcw size={18} strokeWidth={3} />
        </button>
        <button
          onClick={() => onRotate(pageNumber - 1, 90)}
          className="w-10 h-10 flex items-center justify-center bg-white text-slate-700 rounded-lg hover:bg-violet-50 hover:text-violet-600 shadow-sm border border-slate-200 transition-all"
          title="Rotar a la derecha"
        >
          <RotateCw size={18} strokeWidth={3} />
        </button>
        <button
          onClick={() => onDelete(pageNumber - 1)}
          className="w-10 h-10 flex items-center justify-center bg-red-50 text-red-600 rounded-lg hover:bg-red-500 hover:text-white shadow-sm border border-red-100 transition-all mt-2"
          title="Eliminar esta hoja"
        >
          <Trash2 size={18} strokeWidth={3} />
        </button>
      </div>

      <div className="absolute bottom-2 left-3 bg-slate-900/80 text-white font-black text-[9px] px-2.5 py-1 rounded-md z-40 backdrop-blur-sm tracking-wider uppercase">
        Pág {pageNumber} de {numPages}
      </div>

      {isVisible ? (
        <Page
          pageNumber={pageNumber}
          scale={computedScale}
          loading={
            <div className="bg-slate-50 w-full h-full flex flex-col items-center justify-center gap-3 animate-pulse p-10">
              <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Cargando Pág. {pageNumber}...
              </span>
            </div>
          }
          renderTextLayer={true}
          renderAnnotationLayer={true}
        />
      ) : (
        <div className="bg-slate-50/50 w-full h-full flex flex-col items-center justify-center gap-2 p-10">
          <div className="w-10 h-10 rounded-xl bg-slate-200/50 flex items-center justify-center text-slate-400 font-black text-sm">
            {pageNumber}
          </div>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
            Página {pageNumber}
          </span>
        </div>
      )}
    </div>
  );
};

export default function PDFViewer({ pdf, onClose }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [zoom, setZoom] = useState(1.0);
  const [currentPdf, setCurrentPdf] = useState<Blob | null>(pdf);
  const [undoStack, setUndoStack] = useState<Blob[]>([]);
  const [jumpPage, setJumpPage] = useState<string>("");

  useEffect(() => {
    setCurrentPdf(pdf);
    setUndoStack([]);
  }, [pdf]);

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.stopPropagation();
        setUndoStack((prev) => {
          if (prev.length === 0) return prev;
          const newStack = [...prev];
          const previousPdf = newStack.pop();
          if (previousPdf) setCurrentPdf(previousPdf);
          return newStack;
        });
      }
    };
    window.addEventListener("keydown", handleKeydown, true);
    return () => window.removeEventListener("keydown", handleKeydown, true);
  }, []);

  const handleDownload = async () => {
    if (!currentPdf) return;
    try {
      if ("showSaveFilePicker" in window) {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: `JHEP_Vista_${Date.now()}.pdf`,
          types: [{ description: "Documento PDF", accept: { "application/pdf": [".pdf"] } }]
        });
        const writable = await handle.createWritable();
        await writable.write(currentPdf);
        await writable.close();
      } else {
        const url = URL.createObjectURL(currentPdf);
        const a = document.createElement("a");
        a.href = url;
        a.download = `JHEP_Vista_${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (e: any) {
      if (e.name === "AbortError") return;
      console.error(e);
    }
  };

  const handleRotate = async (pageIndex: number, degreesToRotate: number) => {
    if (!currentPdf) return;
    try {
      setUndoStack((prev) => [...prev].concat(currentPdf).slice(-20));
      const pdfBytes = await currentPdf.arrayBuffer();
      const doc = await PDFDocument.load(pdfBytes);
      const page = doc.getPage(pageIndex);
      page.setRotation(degrees(page.getRotation().angle + degreesToRotate));
      const newPdfBytes = await doc.save();
      setCurrentPdf(new Blob([newPdfBytes as any], { type: "application/pdf" }));
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (pageIndex: number) => {
    if (!currentPdf) return;
    try {
      setUndoStack((prev) => [...prev].concat(currentPdf).slice(-20));
      const pdfBytes = await currentPdf.arrayBuffer();
      const doc = await PDFDocument.load(pdfBytes);
      doc.removePage(pageIndex);
      const newPdfBytes = await doc.save();
      setCurrentPdf(new Blob([newPdfBytes as any], { type: "application/pdf" }));
    } catch (error) {
      console.error(error);
    }
  };

  const handlePrint = () => {
    if (!currentPdf) return;
    const u = URL.createObjectURL(currentPdf);
    const w = window.open(u, "_blank");
    if (w)
      w.onload = () => {
        w.print();
        setTimeout(() => URL.revokeObjectURL(u), 1000);
      };
  };

  const handleJumpToPage = (e: React.FormEvent) => {
    e.preventDefault();
    const pNum = parseInt(jumpPage, 10);
    if (!isNaN(pNum) && pNum >= 1 && pNum <= numPages) {
      const el = document.getElementById(`page-card-${pNum}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-slate-100 flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-6 bg-white border-b border-slate-200 shadow-sm z-50 gap-4 flex-wrap md:flex-nowrap">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-red-200 font-black">
            JH
          </div>
          <div className="flex flex-col">
            <span className="font-black text-slate-900 text-sm tracking-tight uppercase leading-none">
              Visor de Documentos
            </span>
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.4em] mt-1">
              JHEP Professional Suite ({numPages} Pág)
            </span>
          </div>
        </div>

        {/* Quick Page Jump */}
        {numPages > 1 && (
          <form onSubmit={handleJumpToPage} className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider pl-2">Ir a pág:</span>
            <input
              type="number"
              min={1}
              max={numPages}
              value={jumpPage}
              onChange={(e) => setJumpPage(e.target.value)}
              placeholder="1"
              className="w-12 h-7 bg-white border border-slate-200 rounded-lg text-center text-[10px] font-black text-slate-900 outline-none"
            />
            <button type="submit" className="px-2.5 h-7 bg-slate-900 text-white rounded-lg text-[8px] font-black uppercase tracking-wider hover:bg-slate-800">
              Ir
            </button>
          </form>
        )}

        <div className="flex items-center bg-slate-50 p-1.5 rounded-xl border border-slate-100">
          <button
            onClick={() => setZoom((z) => Math.max(0.1, z - 0.1))}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors"
          >
            <ZoomOut size={16} />
          </button>
          <span className="text-[10px] font-black text-slate-900 min-w-[50px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(3, z + 0.1))}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors"
          >
            <ZoomIn size={16} />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white font-black text-[9px] uppercase rounded-xl hover:bg-slate-800 transition-all shadow-lg hover:translate-x-1"
          >
            <LayoutGrid size={16} strokeWidth={3} /> Ir a Mesa de Trabajo
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 text-slate-700 font-black text-[9px] uppercase rounded-xl hover:bg-slate-200 transition-all border border-slate-200"
          >
            <Printer size={16} /> Imprimir
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white font-black text-[9px] uppercase rounded-xl hover:scale-105 active:scale-95 transition-all shadow-md shadow-emerald-200"
          >
            <Download size={16} /> Descargar
          </button>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
          >
            <X size={20} strokeWidth={3} />
          </button>
        </div>
      </div>

      {/* Workspace Area */}
      <div className="flex-1 bg-slate-50 flex flex-col overflow-auto custom-scrollbar relative">
        <Document
          file={currentPdf}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          loading={
            <div className="mt-40 text-slate-400 font-black animate-pulse uppercase tracking-widest text-xs text-center flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              CARGANDO VISOR JHEP...
            </div>
          }
          className={cn("flex flex-col items-center", numPages > 1 && "w-full")}
        >
          <div
            className={cn(
              "p-10 pb-64 w-full max-w-[1600px] mx-auto",
              numPages > 1 && zoom <= 1.2
                ? "grid grid-cols-1 xl:grid-cols-2 gap-x-14 gap-y-14 place-items-center xl:place-items-start xl:justify-center"
                : "flex flex-col items-center gap-14"
            )}
          >
            {Array.from({ length: numPages }, (_, i) => i + 1).map((pn) => (
              <LazyPageCard
                key={`page_${pn}`}
                pageNumber={pn}
                zoom={zoom}
                numPages={numPages}
                onRotate={handleRotate}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </Document>
      </div>

      <style jsx global>{`
        .react-pdf__Page__textContent .endOfContent {
          display: none !important;
        }
      `}</style>
    </motion.div>
  );
}
