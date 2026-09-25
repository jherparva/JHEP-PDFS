"use client";

import React, { useState } from "react";
import { X, Search, Download, Layers, CheckCircle2, FileSearch, Trash2, ArrowRight, Loader2, Filter } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { PDFPage, PDFFile, usePDFStore } from "@/store/pdf-store";
import { getPDFJSDocument, getPDFLibDocument } from "@/lib/pdf-cache";
import { PDFThumbnail } from "./PDFThumbnail";
import { PDFDocument } from "pdf-lib";
import { saveAs } from "file-saver";
import { toast } from "sonner";

interface SearchMatch {
  page: PDFPage;
  file: PDFFile;
  pageIndex: number; // 0-indexed page in original pdf
  snippet: string;
  matchedText: string;
}

interface SearchNumberModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchNumberModal({ isOpen, onClose }: SearchNumberModalProps) {
  const { virtualPages, files, togglePageSelection, saveSelectionAsDocument, deletePage } = usePDFStore();

  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [progress, setProgress] = useState(0);
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [selectedMatchIds, setSelectedMatchIds] = useState<string[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      toast.error("Ingresa un número o texto a buscar");
      return;
    }

    if (virtualPages.length === 0) {
      toast.error("La mesa de trabajo está vacía. Añade PDFs primero.");
      return;
    }

    setIsSearching(true);
    setProgress(0);
    setMatches([]);
    setHasSearched(true);

    const found: SearchMatch[] = [];
    const totalPages = virtualPages.length;

    try {
      for (let i = 0; i < totalPages; i++) {
        const vp = virtualPages[i];
        const file = files.find((f) => f.id === vp.sourcePdfId);
        if (!file) continue;

        setProgress(Math.round(((i + 1) / totalPages) * 100));

        try {
          const pdfjsDoc = await getPDFJSDocument(vp.editedBlob || file.blob);
          const targetPageNum = vp.editedBlob ? 1 : vp.pageNumber;
          const page = await pdfjsDoc.getPage(targetPageNum);
          const textContent = await page.getTextContent();
          
          // Combine all text items into one string
          const pageText = textContent.items
            .map((item: any) => item.str || "")
            .join(" ");

          // Case-insensitive regex or index check
          const lowerText = pageText.toLowerCase();
          const lowerQuery = cleanQuery.toLowerCase();

          if (lowerText.includes(lowerQuery)) {
            const matchIndex = lowerText.indexOf(lowerQuery);
            const start = Math.max(0, matchIndex - 30);
            const end = Math.min(pageText.length, matchIndex + cleanQuery.length + 40);
            const snippet = "..." + pageText.substring(start, end).replace(/\s+/g, " ") + "...";

            found.push({
              page: vp,
              file,
              pageIndex: targetPageNum - 1,
              snippet,
              matchedText: cleanQuery,
            });
          }
        } catch (pageErr) {
          console.error(`Error reading page ${vp.pageNumber} of ${file.name}:`, pageErr);
        }
      }

      setMatches(found);
      setSelectedMatchIds(found.map((m) => m.page.id));
      if (found.length === 0) {
        toast.info(`No se encontraron coincidencias para "${cleanQuery}"`);
      } else {
        toast.success(`¡Se encontraron ${found.length} página(s) con "${cleanQuery}"!`);
      }
    } catch (err) {
      console.error("Search error:", err);
      toast.error("Error al buscar en el documento");
    } finally {
      setIsSearching(false);
    }
  };

  const toggleSelectMatch = (pageId: string) => {
    setSelectedMatchIds((prev) =>
      prev.includes(pageId) ? prev.filter((id) => id !== pageId) : [...prev, pageId]
    );
  };

  const selectAllMatches = () => {
    setSelectedMatchIds(matches.map((m) => m.page.id));
  };

  const deselectAllMatches = () => {
    setSelectedMatchIds([]);
  };

  // Action 1: Select in Mesa de Trabajo
  const handleMarkInWorkspace = () => {
    if (selectedMatchIds.length === 0) {
      toast.error("Selecciona al menos una coincidencia");
      return;
    }

    // Toggle pages so only these are marked in workspace
    selectedMatchIds.forEach((id) => {
      togglePageSelection(id, { multi: true });
    });
    toast.success(`${selectedMatchIds.length} hojas marcadas en la Mesa de Trabajo`);
    onClose();
  };

  // Action 2: Save Matching Pages to PDF
  const handleSaveMatchingPDF = async () => {
    if (selectedMatchIds.length === 0) {
      toast.error("Selecciona al menos una coincidencia para guardar");
      return;
    }

    const selectedMatches = matches.filter((m) => selectedMatchIds.includes(m.page.id));
    const saveToast = toast.loading("Generando PDF con coincidencias...");

    try {
      const mergedPdf = await PDFDocument.create();

      for (const m of selectedMatches) {
        const sourceDoc = await getPDFLibDocument(m.page.editedBlob || m.file.blob);
        const pageIdx = m.page.editedBlob ? 0 : m.page.pageNumber - 1;
        const [copiedPage] = await mergedPdf.copyPages(sourceDoc, [pageIdx]);
        if (m.page.rotation % 360 !== 0) {
          copiedPage.setRotation((m.page.rotation % 360) as any);
        }
        mergedPdf.addPage(copiedPage);
      }

      const pdfBytes = await mergedPdf.save();
      const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
      const filename = `Coincidencias_${query.trim().replace(/[^a-zA-Z0-9_-]/g, "_")}_${Date.now()}.pdf`;

      if ("showSaveFilePicker" in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: filename,
            types: [{ description: "Documento PDF", accept: { "application/pdf": [".pdf"] } }]
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          toast.success("PDF guardado correctamente", { id: saveToast });
          return;
        } catch (e: any) {
          if (e.name === "AbortError") {
            toast.dismiss(saveToast);
            return;
          }
        }
      }

      saveAs(blob, filename);
      toast.success("PDF guardado correctamente", { id: saveToast });
    } catch (err) {
      console.error("Save match error:", err);
      toast.error("Error al generar el PDF de coincidencias", { id: saveToast });
    }
  };

  // Action 3: Add Matching Pages to Virtual Tray
  const handleSendToTray = () => {
    if (selectedMatchIds.length === 0) {
      toast.error("Selecciona al menos una coincidencia");
      return;
    }
    const docName = `Filtro_${query.trim()}`;
    saveSelectionAsDocument(docName, selectedMatchIds);
    toast.success(`"${docName}" añadido a la Bandeja Virtual`);
    onClose();
  };

  // Action 4: Delete Matching Pages from Mesa
  const handleDeleteMatches = () => {
    if (selectedMatchIds.length === 0) return;
    if (confirm(`¿Estás seguro de eliminar las ${selectedMatchIds.length} hojas coincidentes de la Mesa?`)) {
      selectedMatchIds.forEach((id) => deletePage(id));
      toast.success("Hojas eliminadas de la Mesa");
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[600] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 md:p-8"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          className="bg-white rounded-[36px] w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden relative border border-slate-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 md:p-8 border-b border-slate-100 bg-white flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                  <FileSearch size={24} strokeWidth={3} />
                </div>
                <div className="flex flex-col">
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-none">
                    Buscador de Números / Documentos
                  </h2>
                  <span className="text-[9px] font-black text-indigo-600 uppercase tracking-[0.3em] mt-1">
                    Escaneo inteligente en {virtualPages.length} hoja(s) de la Mesa
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-rose-50 hover:text-rose-600 rounded-xl text-slate-400 transition-all"
              >
                <X size={20} strokeWidth={3} />
              </button>
            </div>

            {/* Input Form */}
            <form onSubmit={handleSearch} className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  autoFocus
                  placeholder="Ingresa un número (ej. 103274, CAQ065, N° de Factura / Cedula / Folio)..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full h-14 pl-12 pr-4 bg-slate-50 border-2 border-slate-200 focus:border-indigo-600 focus:bg-white rounded-2xl text-sm font-black text-slate-900 uppercase tracking-wide outline-none transition-all shadow-inner"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching || !query.trim()}
                className="h-14 px-8 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all disabled:opacity-50 disabled:grayscale"
              >
                {isSearching ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Buscando...
                  </>
                ) : (
                  <>
                    <Search size={18} strokeWidth={3} /> Buscar Coincidencias
                  </>
                )}
              </button>
            </form>

            {/* Progress Bar */}
            {isSearching && (
              <div className="w-full flex flex-col gap-1.5 mt-2">
                <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-indigo-600">
                  <span>Escaneando páginas del PDF...</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 transition-all duration-300 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Results Workspace */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50/50 custom-scrollbar">
            {!hasSearched ? (
              <div className="h-full py-16 flex flex-col items-center justify-center text-center opacity-50">
                <Search size={64} strokeWidth={1} className="text-slate-300 mb-4" />
                <p className="text-sm font-black text-slate-500 uppercase tracking-wider">
                  Escribe un número arriba para buscar en todas las hojas
                </p>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                  Encontrará radicados, facturas, folios y cualquier texto interno en los PDFs.
                </p>
              </div>
            ) : matches.length === 0 ? (
              <div className="h-full py-16 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-4">
                  <X size={32} strokeWidth={3} />
                </div>
                <p className="text-lg font-black text-slate-800 uppercase tracking-tight">
                  No se encontraron coincidencias para "{query}"
                </p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                  Verifica si el número está escrito correctamente o si el PDF contiene texto seleccionable.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {/* Result Controls Header */}
                <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black text-slate-900 uppercase">
                      Coincidencias Encontradas: <span className="text-indigo-600">{matches.length}</span>
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      ({selectedMatchIds.length} Seleccionadas)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={selectAllMatches}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[9px] uppercase tracking-wider rounded-xl transition-all"
                    >
                      Marcar Todas
                    </button>
                    <button
                      onClick={deselectAllMatches}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[9px] uppercase tracking-wider rounded-xl transition-all"
                    >
                      Desmarcar
                    </button>
                  </div>
                </div>

                {/* Match Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {matches.map((m) => {
                    const isSelected = selectedMatchIds.includes(m.page.id);
                    return (
                      <div
                        key={m.page.id}
                        onClick={() => toggleSelectMatch(m.page.id)}
                        className={cn(
                          "group relative bg-white p-4 rounded-2xl border-2 transition-all cursor-pointer shadow-sm hover:shadow-lg flex flex-col gap-3",
                          isSelected ? "border-indigo-600 ring-2 ring-indigo-50" : "border-slate-200 hover:border-slate-300"
                        )}
                      >
                        <div className="flex gap-3 items-center">
                          <div className="w-16 shrink-0">
                            <PDFThumbnail
                              blob={m.page.editedBlob || m.file.blob}
                              pageNumber={m.page.editedBlob ? 1 : m.page.pageNumber}
                              rotation={m.page.rotation}
                            />
                          </div>
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-[10px] font-black text-slate-900 truncate uppercase">
                              {m.file.name}
                            </span>
                            <span className="text-[9px] font-black text-indigo-600 uppercase mt-0.5">
                              Hoja {m.page.pageNumber} de {m.file.pageCount}
                            </span>
                            <div className="mt-2 p-1.5 bg-slate-50 rounded-lg border border-slate-100">
                              <p className="text-[8px] font-mono text-slate-600 line-clamp-2 leading-tight">
                                {m.snippet}
                              </p>
                            </div>
                          </div>
                          <div
                            className={cn(
                              "w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition-all",
                              isSelected
                                ? "bg-indigo-600 border-indigo-600 text-white shadow-md"
                                : "bg-slate-50 border-slate-200 text-transparent"
                            )}
                          >
                            <CheckCircle2 size={14} strokeWidth={4} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Action Bar Footer */}
          {matches.length > 0 && (
            <div className="p-6 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-4 flex-wrap">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Opciones para coincidencias seleccionadas ({selectedMatchIds.length})
              </span>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleMarkInWorkspace}
                  disabled={selectedMatchIds.length === 0}
                  className="h-11 px-4 bg-slate-800 hover:bg-slate-700 text-white font-black text-[9px] uppercase tracking-wider rounded-xl transition-all border border-slate-700 flex items-center gap-2"
                >
                  <Filter size={14} /> Marcar en Mesa
                </button>
                <button
                  onClick={handleSendToTray}
                  disabled={selectedMatchIds.length === 0}
                  className="h-11 px-4 bg-violet-600 hover:bg-violet-500 text-white font-black text-[9px] uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-violet-950"
                >
                  <Layers size={14} /> Añadir a Bandeja
                </button>
                <button
                  onClick={handleSaveMatchingPDF}
                  disabled={selectedMatchIds.length === 0}
                  className="h-11 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[9px] uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-emerald-950 border-b-2 border-emerald-900"
                >
                  <Download size={14} strokeWidth={3} /> Guardar PDF Seleccionados
                </button>
                <button
                  onClick={handleDeleteMatches}
                  disabled={selectedMatchIds.length === 0}
                  className="h-11 px-3 bg-red-950/60 text-red-400 hover:bg-red-600 hover:text-white font-black text-[9px] uppercase tracking-wider rounded-xl transition-all border border-red-900/40"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
