"use client";

import React, { useState, useEffect } from "react";
import { X, ZoomIn, ZoomOut, Printer, Download, RotateCw, RotateCcw, Trash2, LayoutGrid } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Document, Page, pdfjs } from "react-pdf";
import { PDFDocument, degrees } from "pdf-lib";

// Ensure worker matches version using jsdelivr
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

interface PDFViewerProps {
  pdf: Blob | null;
  onClose: () => void;
}

export default function PDFViewer({ pdf, onClose }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [zoom, setZoom] = useState(1.0);
  const [currentPdf, setCurrentPdf] = useState<Blob | null>(pdf);
  const [undoStack, setUndoStack] = useState<Blob[]>([]);

  useEffect(() => {
    setCurrentPdf(pdf);
    setUndoStack([]);
  }, [pdf]);

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
       if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { 
         e.preventDefault(); 
         e.stopPropagation();
         setUndoStack(prev => {
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
      setUndoStack(prev => [...prev].concat(currentPdf).slice(-20));
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
      setUndoStack(prev => [...prev].concat(currentPdf).slice(-20));
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
    if (w) w.onload = () => { w.print(); setTimeout(() => URL.revokeObjectURL(u), 1000); };
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-slate-100 flex flex-col overflow-hidden">
      {/* Professional Header */}
      <div className="h-16 flex items-center justify-between px-8 bg-white border-b border-slate-200 shadow-sm z-50">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-red-200 font-black">JH</div>
          <div className="flex flex-col">
            <span className="font-black text-slate-900 text-sm tracking-tight uppercase leading-none">Visor de Documentos</span>
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.4em] mt-1">JHEP Professional Suite</span>
          </div>
        </div>

        <div className="flex items-center bg-slate-50 p-1.5 rounded-xl border border-slate-100">
          <button onClick={() => setZoom(z => Math.max(0.1, z - 0.1))} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors"><ZoomOut size={16} /></button>
          <span className="text-[10px] font-black text-slate-900 min-w-[50px] text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(3, z + 0.1))} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors"><ZoomIn size={16} /></button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex gap-2 mr-4">
             <button 
               onClick={onClose} 
               className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white font-black text-[9px] uppercase rounded-xl hover:bg-slate-800 transition-all shadow-lg hover:translate-x-1"
             >
               <LayoutGrid size={16} strokeWidth={3} /> Ir a Mesa de Trabajo
             </button>
             <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 text-slate-700 font-black text-[9px] uppercase rounded-xl hover:bg-slate-200 transition-all border border-slate-200"><Printer size={16} /> Imprimir</button>
             <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white font-black text-[9px] uppercase rounded-xl hover:scale-105 active:scale-95 transition-all shadow-md shadow-emerald-200"><Download size={16} /> Descargar</button>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><X size={20} strokeWidth={3} /></button>
        </div>
      </div>

      {/* Workspace */}
      <div className="flex-1 bg-slate-50 flex flex-col overflow-auto custom-scrollbar relative">
        <Document 
          file={currentPdf} 
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          loading={<div className="mt-40 text-slate-300 font-black animate-pulse uppercase tracking-widest text-xs">CARGANDO VISOR JHEP...</div>}
          className={cn(
            "flex flex-col items-center",
            numPages > 1 && "w-full"
          )}
        >
          <div className={cn(
            "p-10 pb-64 w-full max-w-[1600px] mx-auto",
            (numPages > 1 && zoom <= 1.2)
              ? "grid grid-cols-1 xl:grid-cols-2 gap-x-14 gap-y-14 place-items-center xl:place-items-start xl:justify-center"
              : "flex flex-col items-center gap-14"
          )}>
            {Array.from({ length: numPages }, (_, i) => i + 1).map((pn) => (
              <div key={`page_${pn}_${Date.now()}`} className="relative bg-white shadow-2xl rounded-sm border border-slate-200 transition-transform hover:scale-[1.01] group/page">
                <div className="absolute top-4 right-4 opacity-0 group-hover/page:opacity-100 transition-opacity z-50 flex flex-col gap-2 bg-slate-100/80 backdrop-blur border border-slate-200 p-2 rounded-xl shadow-xl">
                   <button onClick={() => handleRotate(pn - 1, -90)} className="w-10 h-10 flex items-center justify-center bg-white text-slate-700 rounded-lg hover:bg-violet-50 hover:text-violet-600 shadow-sm border border-slate-200 transition-all"><RotateCcw size={18} strokeWidth={3} /></button>
                   <button onClick={() => handleRotate(pn - 1, 90)} className="w-10 h-10 flex items-center justify-center bg-white text-slate-700 rounded-lg hover:bg-violet-50 hover:text-violet-600 shadow-sm border border-slate-200 transition-all"><RotateCw size={18} strokeWidth={3} /></button>
                   <button onClick={() => handleDelete(pn - 1)} className="w-10 h-10 flex items-center justify-center bg-red-50 text-red-600 rounded-lg hover:bg-red-500 hover:text-white shadow-sm border border-red-100 transition-all mt-2"><Trash2 size={18} strokeWidth={3} /></button>
                </div>
                <Page 
                  pageNumber={pn} 
                  scale={zoom * ((numPages > 1 && zoom <= 1.2) ? 1.05 : 1.3)} 
                  loading={<div className="bg-slate-50 w-[500px] h-[700px] animate-pulse" />}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                />
              </div>
            ))}
          </div>
        </Document>

      </div>

      <style jsx global>{`
        .react-pdf__Page__textContent .endOfContent { display: none !important; }
      `}</style>
    </motion.div>
  );
}
