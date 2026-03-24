"use client";

import React, { useRef, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Ribbon } from "@/components/Ribbon";
import { HelpModal } from "@/components/HelpModal";
import { PageContextMenu } from "@/components/PageContextMenu";
import { FolderOpen, FileUp, MoreVertical, X, CheckCircle2, LayoutGrid, Eye, Search, Maximize2, Columns, Printer, Type, FileSearch, Trash2, Save, Settings2, FileText, ZoomIn, ZoomOut, Download, Eraser, Layers, HelpCircle, RotateCw, RotateCcw, Copy, Archive, FolderPlus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { usePDFStore } from "@/store/pdf-store";
import { useOCR } from "@/hooks/useOCR";
import { toast, Toaster } from "sonner";
import { PDFDocument, degrees, rgb, StandardFonts } from "pdf-lib";
import { Document as Docx, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";
import JSZip from "jszip";

const PDFViewer = dynamic(() => import("../components/PDFViewer"), { 
  ssr: false,
  loading: () => <div className="text-slate-900 font-black animate-pulse uppercase tracking-[1em] text-[10px] text-center">Iniciando Motor JHEP...</div>
});

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { SortablePage } from "@/components/SortablePage";

export default function Home() {
  const { 
    files, virtualPages, savedDocuments, selectedDocIds,
    selectedFileIds, selectedPageIds, selectionSequence, usedFileIds, gridColumns,
    addFile, removeFile, selectFile, togglePageSelection, deleteSelectedPages, rotateSelected, rotatePage, deletePage, selectAllPages, duplicatePage, duplicateSelectedPages,
    reorderPages, addPagesToEditor, confirmOrderSelection, undoAction, clearAll, clearSelection, setGridColumns, undoStack, updatePageBlob,
    removeSelectedFiles, clearAllFiles, conversionQueue,
    saveSelectionAsDocument, removeSavedDocument, toggleDocSelection, clearDocSelection, clearSavedDocuments, addUploadedFileToTray
  } = usePDFStore();

  const { convertToWord, isProcessing } = useOCR();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const directMesaInputRef = useRef<HTMLInputElement>(null);
  const trayFileInputRef = useRef<HTMLInputElement>(null);
  const [viewerPdf, setViewerPdf] = useState<Blob | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    autoNumber: false,
    autoClear: false,
    highQuality: true,
    theme: 'classic' as 'classic' | 'modern'
  });
  const [showHelp, setShowHelp] = useState(false);
  const [showBandejaModal, setShowBandejaModal] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isFoliating, setIsFoliating] = useState(false);
  const [showSaveDoc, setShowSaveDoc] = useState(false);
  const [openedFromBandeja, setOpenedFromBandeja] = useState(false);
  const [saveDocName, setSaveDocName] = useState("");
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; pageId: string } | null>(null);
  const [showImageFormatModal, setShowImageFormatModal] = useState(false);
  const [selectedImageFormat, setSelectedImageFormat] = useState<"png" | "jpeg" | "webp">("png");
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    // 0. Registrar Service Worker para que PWA sea instalable
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW registration failed:', err));
    }

    // 1. PWA Installation Handler
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 2. File Handling API (recibe PDFs cuando le dan doble clic en el PC)
    if ('launchQueue' in window && (window as any).launchQueue) {
      (window as any).launchQueue.setConsumer(async (launchParams: any) => {
        if (!launchParams.files || !launchParams.files.length) return;
        const newSelectedIds = [];
        for (const fileHandle of launchParams.files) {
          const file = await fileHandle.getFile();
          if (file.type.startsWith("application/pdf") || file.name.endsWith(".pdf")) {
            const id = await addFile(file.name, file);
            if (id) newSelectedIds.push(id);
          }
        }
        if (newSelectedIds.length === 1 && launchParams.files.length === 1) {
          const firstFileHandle = launchParams.files[0];
          const file = await firstFileHandle.getFile();
          setViewerPdf(file);
          toast.success("Abierto en Visor (JHEP 🖥️)");
        } else if (newSelectedIds.length > 0) {
          newSelectedIds.forEach(id => addPagesToEditor(id));
          toast.success(`${newSelectedIds.length} archivos enviados a la mesa de trabajo.`);
        }
      });
    }

    const hk = (e: KeyboardEvent) => {
      // Ignorar cuando hay un input activo
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); undoAction(); toast.info("↩ Acción deshecha"); }
      else if ((e.ctrlKey || e.metaKey) && e.key === "a") { e.preventDefault(); selectAllPages(); toast.info("Todas las hojas seleccionadas"); }
      else if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); handleSave(selectedPageIds.length > 0); }
      else if ((e.ctrlKey || e.metaKey) && e.key === "p") { e.preventDefault(); handlePrint(); }
      else if (e.key === "r" || e.key === "R") { e.preventDefault(); if (selectedPageIds.length) { rotateSelected(90); toast.success("Rotadas 90°"); } }
      else if (e.key === "v" || e.key === "V") { e.preventDefault(); if (selectedPageIds.length) { handleOpenViewer(selectedPageIds[0]); } }
      else if (e.key === "Delete" || e.key === "Backspace") { if (selectedPageIds.length) { deleteSelectedPages(); toast.success("Hojas eliminadas"); } }
      else if (e.key === "Escape") { clearSelection(); toast.info("Selección limpiada"); }
    };
    window.addEventListener("keydown", hk);
    return () => {
      window.removeEventListener("keydown", hk);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [selectedPageIds, virtualPages, saveDocName]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
    } else {
      toast.info("Busca el ícono de una Pantallita 🖥️ arriba a la derecha en la barra de direcciones de Chrome Edge para Instalar.", { duration: 6000 });
    }
  };

  const handleAction = async (a: string) => {
    if (a === "organize") { if (selectedFileIds.length) { selectedFileIds.forEach(id => addPagesToEditor(id)); toast.success("Enviando a mesa..."); } else toast.error("Seleccione PDF"); }
    else if (a === "confirm") { if (selectionSequence.length) { confirmOrderSelection(); toast.success("Orden Confirmado"); } else toast.info("Use Ctrl+Clic para marcar orden"); }
    else if (a === "undo") { undoAction(); toast.info("Acción revertida"); }
    else if (a === "delete") { if (selectedPageIds.length) { deleteSelectedPages(); toast.success("Eliminadas"); } else toast.error("Sin selección"); }
    else if (a === "clear") {
      if (!virtualPages.length) {
        toast.error("📋 La mesa de trabajo ya está vacía");
        return;
      }
      clearAll();
      toast.success("Mesa de Trabajo Limpiada");
    }
    else if (a === "print") handlePrint();
    else if (a === "save") handleSave(selectedPageIds.length > 0);
    else if (a === "saveAsDocument") {
      const idsCount = selectionSequence.length || selectedPageIds.length;
      if (!idsCount) {
        toast.error("📂 Selecciona las hojas que deseas enviar a la bandeja");
        return;
      }
      setShowSaveDoc(true);
    }
    else if (a === "view" || a === "edit") handleOpenViewer();
    else if (a === "settings") setShowHelp(true);
    else if (a === "help") setShowHelp(true);
    else if (a === "image") setShowImageFormatModal(true);
    else if (a === "foliar") {
      if (!virtualPages.length) {
        toast.error("🚫 Mesa vacía — No hay hojas para activar la numeración");
        return;
      }
      const next = !isFoliating;
      setIsFoliating(next);
      toast.info(next
        ? "🔢 Numeración ON — imprimirá 'Pág. X de Y' abajo a la derecha de cada hoja al guardar"
        : "Numeración de hojas desactivada");
    }
  };

  const handleSave = async (selOnly: boolean, annos?: any[]) => {
    const pgs = selOnly ? virtualPages.filter(p => selectedPageIds.includes(p.id)) : virtualPages;
    if (!pgs.length) {
       toast.error("⚠️ No hay hojas para guardar. Añade PDFs a la mesa.");
       return;
    }

    if (annos) {
       // Called from Viewer "Apply" - Update each page blob in the organizer
       const task = async () => {
         for (let i = 0; i < pgs.length; i++) {
           const vp = pgs[i];
           const f = files.find(x => x.id === vp.sourcePdfId);
           if (!f) continue;
           
           const pageDoc = await PDFDocument.create();
           const fn = await pageDoc.embedFont(StandardFonts.HelveticaBold);
           const [cp] = await pageDoc.copyPages(await PDFDocument.load(await (vp.editedBlob || f.blob).arrayBuffer()), [vp.editedBlob ? 0 : vp.pageNumber - 1]);
           
           const pAn = annos.filter(an => an.pageIndex === i);
           if (pAn.length) {
             for (const an of pAn) {
               if (an.type === "whiteout") cp.drawRectangle({ x: an.x, y: an.y, width: an.width || 200, height: an.height || 40, color: rgb(1, 1, 1) });
               else if (an.type === "edit" || an.type === "text") {
                 if (an.type === "edit") cp.drawRectangle({ x: an.x, y: an.y, width: an.width || 0, height: an.height || 0, color: rgb(1, 1, 1) });
                 if (an.text) cp.drawText(an.text, { x: an.x, y: an.y, size: an.fontSize || 24, font: fn, color: rgb(0, 0, 0) });
               }
             }
             pageDoc.addPage(cp);
             const newBlob = new Blob([await pageDoc.save() as any], { type: "application/pdf" });
             updatePageBlob(vp.id, newBlob);
           }
         }
       };
       toast.promise(task(), { loading: "Sincronizando Cambios...", success: "Mesa Actualizada", error: "Error de Sincronización" });
       return;
    }

    const task = async () => {
      const doc = await PDFDocument.create();
      const fn = await doc.embedFont(StandardFonts.HelveticaBold);
      const totalPages = pgs.length;
      for (let i = 0; i < pgs.length; i++) {
        const vp = pgs[i];
        const f = files.find(x => x.id === vp.sourcePdfId);
        if (!f) continue;
        const [cp] = await doc.copyPages(await PDFDocument.load(await (vp.editedBlob || f.blob).arrayBuffer()), [vp.editedBlob ? 0 : vp.pageNumber - 1]);
        if (vp.rotation % 360 !== 0) cp.setRotation(degrees(vp.rotation % 360));
        doc.addPage(cp);

        // Foliación automática
        if (isFoliating) {
          const { width, height } = cp.getSize();
          const label = `Pág. ${i + 1} de ${totalPages}`;
          cp.drawText(label, {
            x: width - fn.widthOfTextAtSize(label, 9) - 18,
            y: 14,
            size: 9,
            font: fn,
            color: rgb(0.45, 0.45, 0.45),
          });
        }
      }
      const pdfBytes = await doc.save();
      const blob = new Blob([pdfBytes as any], { type: "application/pdf" });

      try {
        if ("showSaveFilePicker" in window) {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: `JHEP_Edicion_${Date.now()}.pdf`,
            types: [{ description: "Documento PDF", accept: { "application/pdf": [".pdf"] } }]
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
        } else {
          saveAs(blob, `JHEP_Editor_${Date.now()}.pdf`);
        }
        return "success";
      } catch (e: any) {
        if (e.name === "AbortError") return "cancelled";
        throw e;
      }
    };
    const saveToast = toast.loading("Preparando PDF...");
    task().then(res => {
      if (res === "cancelled") toast.dismiss(saveToast);
      else toast.success("PDF Guardado", { id: saveToast });
    }).catch(err => {
      console.error(err);
      toast.error("Error al guardar", { id: saveToast });
    });
  };

  const handlePrint = async () => {
    const pgs = selectedPageIds.length ? virtualPages.filter(p => selectedPageIds.includes(p.id)) : virtualPages;
    if (!pgs.length) {
       toast.error("📋 Selecciona hojas o añade contenido a la mesa para imprimir");
       return;
    }
    const task = async () => {
      const doc = await PDFDocument.create();
      for (const vp of pgs) {
        const f = files.find(x => x.id === vp.sourcePdfId);
        if (!f) continue;
        const [cp] = await doc.copyPages(await PDFDocument.load(await (vp.editedBlob || f.blob).arrayBuffer()), [vp.editedBlob ? 0 : vp.pageNumber - 1]);
        if (vp.rotation % 360 !== 0) cp.setRotation(degrees(vp.rotation % 360));
        doc.addPage(cp);
      }
      const u = URL.createObjectURL(new Blob([await doc.save() as any], { type: "application/pdf" }));
      const w = window.open(u, "_blank"); if (w) w.onload = () => w.print();
    };
    toast.promise(task(), { loading: "Imprimiendo Selección...", success: "Listo", error: "Error" });
  };

  const handleConvertToImages = async (format: "png" | "jpeg" | "webp") => {
    const list = selectedPageIds.length ? virtualPages.filter(p => selectedPageIds.includes(p.id)) : virtualPages;
    if (!list.length) {
      toast.error("Seleccione hojas para convertir a imagen");
      return;
    }

    const task = async () => {
      const temporaryDoc = await PDFDocument.create();
      for (const vp of list) {
        const f = files.find(x => x.id === vp.sourcePdfId);
        if (!f) continue;
        const [cp] = await temporaryDoc.copyPages(await PDFDocument.load(await (vp.editedBlob || f.blob).arrayBuffer()), [vp.editedBlob ? 0 : vp.pageNumber - 1]);
        if (vp.rotation % 360 !== 0) cp.setRotation(degrees(vp.rotation % 360));
        temporaryDoc.addPage(cp);
      }
      
      const pdfBytes = await temporaryDoc.save();
      const { pdfjs } = await import("react-pdf");
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
      const pdfjsDoc = await pdfjs.getDocument({ data: pdfBytes }).promise;
      
      // If there's multiple images, we create a ZIP
      if (pdfjsDoc.numPages > 1) {
        const zip = new JSZip();
        for (let i = 1; i <= pdfjsDoc.numPages; i++) {
          const page = await pdfjsDoc.getPage(i);
          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) continue;
          canvas.width = viewport.width; canvas.height = viewport.height;
          // @ts-ignore
          await page.render({ canvasContext: ctx, viewport }).promise;
          const mimeType = `image/${format}`;
          const extension = format === "jpeg" ? "jpg" : format;
          const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, mimeType, format === "jpeg" || format === "webp" ? 0.9 : 1.0));
          if (blob) zip.file(`Pagina_${i}.${extension}`, blob);
        }

        const zipContent = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
        try {
          if ("showSaveFilePicker" in window) {
            const handle = await (window as any).showSaveFilePicker({
              suggestedName: `JHEP_Imagenes_${Date.now()}.zip`,
              types: [{ description: "Archivo ZIP", accept: { "application/zip": [".zip"] } }]
            });
            const writable = await handle.createWritable();
            await writable.write(zipContent);
            await writable.close();
            return "success";
          }
        } catch (e: any) { 
          if (e.name === "AbortError") return "cancelled";
        }
        saveAs(zipContent, `JHEP_Imagenes_${Date.now()}.zip`);
        return "success";
      }

      // If single page, download directly
      const page = await pdfjsDoc.getPage(1);
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (ctx) {
        canvas.width = viewport.width; canvas.height = viewport.height;
        // @ts-ignore
        await page.render({ canvasContext: ctx, viewport }).promise;
        const mimeType = `image/${format}`;
        const extension = format === "jpeg" ? "jpg" : format;
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, mimeType, format === "jpeg" || format === "webp" ? 0.9 : 1.0));
        if (blob) {
          const filename = `JHEP_Imagen_${Date.now()}.${extension}`;
          try {
            if ("showSaveFilePicker" in window) {
              const handle = await (window as any).showSaveFilePicker({
                suggestedName: filename,
                types: [{ description: "Imagen", accept: { [mimeType]: [`.${extension}`] } }]
              });
              const writable = await handle.createWritable();
              await writable.write(blob);
              await writable.close();
              return "success";
            }
          } catch (e: any) { 
            if (e.name === "AbortError") return "cancelled";
          }
          saveAs(blob, filename);
        }
      }
      return "success";
    };

    const convertToast = toast.loading(`Convirtiendo a imágenes (${format.toUpperCase()})...`);
    task().then(res => {
      if (res === "cancelled") toast.dismiss(convertToast);
      else toast.success("Imágenes exportadas con éxito", { id: convertToast });
    }).catch(err => {
      console.error(err);
      toast.error("Error al convertir a imagen", { id: convertToast });
    });
  };

  const handleOpenViewer = async (pid?: string) => {
    const list = pid ? virtualPages.filter(p => p.id === pid || (selectedPageIds.includes(p.id) && selectedPageIds.length > 1)) : (selectedPageIds.length ? virtualPages.filter(p => selectedPageIds.includes(p.id)) : virtualPages);
    if (!list.length) return;
    const task = async () => {
      const doc = await PDFDocument.create();
      for (const vp of list) {
        const f = files.find(x => x.id === vp.sourcePdfId);
        if (!f) continue;
        const [cp] = await doc.copyPages(await PDFDocument.load(await (vp.editedBlob || f.blob).arrayBuffer()), [vp.editedBlob ? 0 : vp.pageNumber - 1]);
        if (vp.rotation % 360 !== 0) cp.setRotation(degrees(vp.rotation % 360));
        doc.addPage(cp);
      }
      setOpenedFromBandeja(false);
      setViewerPdf(new Blob([await doc.save() as any], { type: "application/pdf" }));
    };
    toast.promise(task(), { loading: "Abriendo Editor...", success: "Listo", error: "Error" });
  };

  const handleExportZip = async () => {
    const docsToZip = selectedDocIds.length > 0
      ? savedDocuments.filter(d => selectedDocIds.includes(d.id))
      : savedDocuments;

    if (!docsToZip.length) {
      toast.error("La bandeja está vacía");
      return;
    }

    const task = async () => {
      const zip = new JSZip();
      for (const doc of docsToZip) {
        const pdfDoc = await PDFDocument.create();
        const fn = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        // Resolve pages: use the doc.pages snapshot, or fall back to virtualPages for older saves
        const resolvedPages: { blob: Blob; pageNumber: number; rotation: number }[] = [];
        const pagesToProcess = doc.pages && doc.pages.length > 0 ? doc.pages : doc.pageIds.map(id => virtualPages.find(p => p.id === id)).filter(Boolean) as typeof virtualPages;
        
        for (const vp of pagesToProcess) {
          const f = files.find(x => x.id === vp.sourcePdfId);
          if (f) resolvedPages.push({ blob: vp.editedBlob || f.blob, pageNumber: vp.editedBlob ? 0 : vp.pageNumber - 1, rotation: vp.rotation });
          else {
            // Very old fallback when file might be partially matched
            const sourcePdfId = vp.id.split('-').slice(0, 2).join('-');
            const fObj = files.find(x => x.id === sourcePdfId) || files.find(x => vp.id.startsWith(x.id));
            if (fObj) {
              const parts = vp.id.replace(sourcePdfId + '-', '').split('-');
              const pageNum = parseInt(parts[0], 10);
              if (!isNaN(pageNum)) resolvedPages.push({ blob: fObj.blob, pageNumber: pageNum - 1, rotation: 0 });
            }
          }
        }
        if (resolvedPages.length === 0) continue;
        const totalPages = resolvedPages.length;
        for (let i = 0; i < resolvedPages.length; i++) {
          const { blob, pageNumber, rotation } = resolvedPages[i];
          const src = await PDFDocument.load(await blob.arrayBuffer());
          const safePageNum = Math.min(pageNumber, src.getPageCount() - 1);
          const [cp] = await pdfDoc.copyPages(src, [safePageNum]);
          if (rotation % 360 !== 0) cp.setRotation(degrees(rotation % 360));
          pdfDoc.addPage(cp);
          if (isFoliating) {
            const { width } = cp.getSize();
            const label = `Pág. ${i + 1} de ${totalPages}`;
            cp.drawText(label, { x: width - fn.widthOfTextAtSize(label, 9) - 18, y: 14, size: 9, font: fn, color: rgb(0.45, 0.45, 0.45) });
          }
        }
        const bytes = await pdfDoc.save();
        zip.file(`${doc.name}.pdf`, bytes);
      }
      const content = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });

      if ("showSaveFilePicker" in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: `JHEP_ZIP_${new Date().toISOString().slice(0,10)}.zip`,
            types: [{ description: "Archivo ZIP", accept: { "application/zip": [".zip"] } }]
          });
          const writable = await handle.createWritable();
          await writable.write(content);
          await writable.close();
          return "success";
        } catch (e: any) {
          if (e.name === "AbortError") return "cancelled";
          throw e;
        }
      } else {
        saveAs(content, `JHEP_ZIP_${Date.now()}.zip`);
        return "success";
      }
    };

    const zipToast = toast.loading(`Empaquetando ${docsToZip.length} documento(s)...`);
    task()
      .then((res) => {
        if (res === "cancelled") {
          toast.dismiss(zipToast);
        } else {
          toast.success(`¡ZIP listo — ${docsToZip.length} PDF(s) generados!`, { id: zipToast });
        }
      })
      .catch((err) => {
        console.error(err);
        toast.error("Error al generar ZIP", { id: zipToast });
      });
  };

  const handleSaveDocsIndividually = async () => {
    const docsToSave = selectedDocIds.length > 0
      ? savedDocuments.filter(d => selectedDocIds.includes(d.id))
      : savedDocuments;

    if (!docsToSave.length) {
      toast.error("Selecciona documentos para guardar");
      return;
    }

    const task = async () => {
      let directoryHandle = null;
      try {
        if ("showDirectoryPicker" in window) {
           directoryHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
        }
      } catch (e: any) { 
        if (e.name === "AbortError") return "cancelled";
        console.log("Directory picker fallback to legacy downloads"); 
      }

      for (const doc of docsToSave) {
        const pdfDoc = await PDFDocument.create();
        const fn = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        // Resolve pages: use the doc.pages snapshot, or fall back to virtualPages for older saves
        const resolvedPages: { blob: Blob; pageNumber: number; rotation: number }[] = [];
        const pagesToProcess = doc.pages && doc.pages.length > 0 ? doc.pages : doc.pageIds.map(id => virtualPages.find(p => p.id === id)).filter(Boolean) as typeof virtualPages;
        
        for (const vp of pagesToProcess) {
          const f = files.find(x => x.id === vp.sourcePdfId);
          if (f) resolvedPages.push({ blob: vp.editedBlob || f.blob, pageNumber: vp.editedBlob ? 0 : vp.pageNumber - 1, rotation: vp.rotation });
          else {
            // Very old fallback when file might be partially matched
            const sourcePdfId = vp.id.split('-').slice(0, 2).join('-');
            const fObj = files.find(x => x.id === sourcePdfId) || files.find(x => vp.id.startsWith(x.id));
            if (fObj) {
              const parts = vp.id.replace(sourcePdfId + '-', '').split('-');
              const pageNum = parseInt(parts[0], 10);
              if (!isNaN(pageNum)) resolvedPages.push({ blob: fObj.blob, pageNumber: pageNum - 1, rotation: 0 });
            }
          }
        }
        if (resolvedPages.length === 0) continue;
        const totalPages = resolvedPages.length;
        for (let i = 0; i < resolvedPages.length; i++) {
          const { blob: pageBlob, pageNumber, rotation } = resolvedPages[i];
          const src = await PDFDocument.load(await pageBlob.arrayBuffer());
          const safePageNum = Math.min(pageNumber, src.getPageCount() - 1);
          const [cp] = await pdfDoc.copyPages(src, [safePageNum]);
          if (rotation % 360 !== 0) cp.setRotation(degrees(rotation % 360));
          pdfDoc.addPage(cp);
          if (isFoliating) {
            const { width } = cp.getSize();
            const label = `Pág. ${i + 1} de ${totalPages}`;
            cp.drawText(label, { x: width - fn.widthOfTextAtSize(label, 9) - 18, y: 14, size: 9, font: fn, color: rgb(0.45, 0.45, 0.45) });
          }
        }
        const bytes = await pdfDoc.save();
        const blob = new Blob([bytes as any], { type: "application/pdf" });

        if (directoryHandle) {
          const fileHandle = await directoryHandle.getFileHandle(`${doc.name}.pdf`, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
        } else {
          saveAs(blob, `${doc.name}.pdf`);
          await new Promise(r => setTimeout(r, 400));
        }
      }
      return "success";
    };

    const saveToast = toast.loading(`Guardando ${docsToSave.length} documento(s)...`);
    task().then(res => {
      if (res === "cancelled") {
        toast.dismiss(saveToast);
      } else {
        toast.success(`¡${docsToSave.length} documentos guardados!`, { id: saveToast });
      }
    }).catch(err => {
      console.error(err);
      toast.error("Error al guardar", { id: saveToast });
    });
  };

  const handlePageContextMenu = (e: React.MouseEvent, pageId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedPageIds.includes(pageId)) {
      togglePageSelection(pageId);
    }
    setCtxMenu({ x: e.clientX, y: e.clientY, pageId });
  };

  const handlePreviewDocument = async (docId: string) => {
    const doc = savedDocuments.find(d => d.id === docId);
    if (!doc) return;
    const list = doc.pages && doc.pages.length > 0 ? doc.pages : virtualPages.filter(p => doc.pageIds.includes(p.id));
    if (!list.length) return;
    toast.promise(async () => {
      const pdfDoc = await PDFDocument.create();
      for (const vp of list) {
        const f = files.find(x => x.id === vp.sourcePdfId);
        if (!f) continue;
        const [cp] = await pdfDoc.copyPages(await PDFDocument.load(await (vp.editedBlob || f.blob).arrayBuffer()), [vp.editedBlob ? 0 : vp.pageNumber - 1]);
        if (vp.rotation % 360 !== 0) cp.setRotation(degrees(vp.rotation % 360));
        pdfDoc.addPage(cp);
      }
      setOpenedFromBandeja(true);
      setShowBandejaModal(false);
      setViewerPdf(new Blob([await pdfDoc.save() as any], { type: "application/pdf" }));
    }, { loading: "Generando Vista Previa...", success: "Visualizador Abierto", error: "Error" });
  };

  const getContextMenuActions = () => {
    const count = selectedPageIds.length;
    const single = count <= 1;
    return [
      { label: single ? "Ver / Editar" : `Ver ${count} Hojas`, icon: <Eye size={14} strokeWidth={3} />, onClick: () => handleOpenViewer(ctxMenu?.pageId), dividerAfter: false },
      { label: "Rotar 90° →", icon: <RotateCw size={14} strokeWidth={3} />, onClick: () => { if(single && ctxMenu) rotatePage(ctxMenu.pageId, 90); else rotateSelected(90); } },
      { label: "Rotar 90° ←", icon: <RotateCcw size={14} strokeWidth={3} />, onClick: () => { if(single && ctxMenu) rotatePage(ctxMenu.pageId, -90); else rotateSelected(-90); }, dividerAfter: true },
      { label: "Seleccionar Todas", icon: <CheckCircle2 size={14} strokeWidth={3} />, onClick: () => selectAllPages() },
      { label: single ? "Duplicar Hoja" : `Duplicar ${count} Hojas`, icon: <Copy size={14} strokeWidth={3} />, onClick: () => { if(single && ctxMenu) duplicatePage(ctxMenu.pageId); else duplicateSelectedPages(); toast.success("Duplicadas"); }, dividerAfter: true },
      { label: "Desmarcar Todo", icon: <X size={14} strokeWidth={3} />, onClick: () => clearSelection(), disabled: count === 0 },
      { label: "Convertir a Imagen...", icon: <Layers size={14} strokeWidth={3} />, onClick: () => setShowImageFormatModal(true), disabled: count === 0, dividerAfter: true },
      { label: "Guardar Selección (PDF)", icon: <Download size={14} strokeWidth={3} />, onClick: () => handleAction("save"), disabled: count === 0 },
      { label: "Imprimir Selección", icon: <Printer size={14} strokeWidth={3} />, onClick: () => handlePrint(), disabled: count === 0, dividerAfter: true },
      { label: single ? "Eliminar Hoja" : `Eliminar ${count} Hojas`, icon: <Trash2 size={14} strokeWidth={3} />, onClick: () => { deleteSelectedPages(); toast.success("Eliminadas"); }, danger: true, disabled: count === 0 },
    ];
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
       reorderPages(active.id as string, over.id as string);
    }
  };

  return (
    <main className="flex flex-col absolute inset-0 bg-slate-50 overflow-hidden font-sans">
      <Toaster position="bottom-right" richColors closeButton />
      <div className="flex flex-col h-full overflow-hidden bg-slate-50 relative z-0">
        <Ribbon 
           onAction={handleAction} 
           activeTab="mesa" 
           isFoliating={isFoliating} 
           canInstall={true}
           onInstall={handleInstallClick}
        />
        <section className="flex flex-1 overflow-hidden relative">
          
          {/* =========================================================================
               BIBLIOTECA MOVIL (DRAWER)
             ========================================================================= */}
          <AnimatePresence>
            {mobileSidebarOpen && (
              <>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileSidebarOpen(false)} className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[100] md:hidden" />
                <motion.div initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="fixed inset-y-0 left-0 w-[280px] bg-white z-[110] md:hidden shadow-2xl flex flex-col p-4 gap-3 overflow-hidden">
                   <div className="flex items-center justify-between mb-2">
                     <span className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em]">Biblioteca JHEP</span>
                     <button onClick={() => setMobileSidebarOpen(false)} className="w-8 h-8 flex items-center justify-center bg-slate-50 text-slate-400 rounded-lg"><X size={18} strokeWidth={3} /></button>
                   </div>
                   <div className="flex flex-col gap-2">
                      <button onClick={() => fileInputRef.current?.click()} className="w-full h-10 flex items-center justify-center gap-2 bg-emerald-600 text-white font-black rounded-xl shadow-md text-[9px] uppercase tracking-widest border-b-2 border-emerald-900"><FileUp size={16} strokeWidth={3} /> Subir PDF</button>
                      <div className="flex gap-2">
                         <button onClick={() => { if(selectedFileIds.length > 0) removeSelectedFiles(); else toast.error("Selecciona"); }} className="flex-1 py-2 text-[8px] bg-white text-slate-500 font-black rounded-lg border border-slate-200 uppercase tracking-widest">Quitar</button>
                         <button onClick={() => { clearAllFiles(); toast.success("Borrado"); }} className="flex-1 py-2 text-[8px] bg-red-50 text-red-600 font-black rounded-lg border border-red-200 uppercase tracking-widest">Limpiar</button>
                      </div>
                   </div>
                   <div className="relative mb-2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                      <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full h-9 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-lg text-[10px] uppercase font-black tracking-widest outline-none" />
                   </div>
                   <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar flex flex-col gap-1 pr-1">
                      {files.filter(f => !f.isHidden && f.name.toLowerCase().includes(searchTerm.toLowerCase())).map(f => (
                         <div key={f.id} onClick={() => { selectFile(f.id, true); }} onDoubleClick={() => { addPagesToEditor(f.id); setMobileSidebarOpen(false); }} className={cn("flex items-center p-2 rounded-lg border transition-all", selectedFileIds.includes(f.id) ? "bg-red-50 border-primary" : "bg-white border-slate-50")}>
                            <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center mr-2 shrink-0", selectedFileIds.includes(f.id) ? "bg-primary text-white" : "bg-slate-50 text-slate-300")}><FileSearch size={12} /></div>
                            <div className="flex-1 overflow-hidden pr-2"><p className="text-[8px] font-black uppercase truncate text-slate-900">{f.name}</p><p className="text-[8px] font-black text-primary/70">{f.pageCount} PÁG</p></div>
                         </div>
                      ))}
                   </div>
                   {savedDocuments.length > 0 && (
                     <button onClick={() => { setShowBandejaModal(true); setMobileSidebarOpen(false); }} className="mt-auto w-full flex items-center justify-between p-3 bg-violet-50 border border-violet-100 rounded-xl">
                       <div className="flex items-center gap-2"><Layers size={14} className="text-violet-600" /><span className="text-[8px] font-black text-violet-900 uppercase">Bandeja ({savedDocuments.length})</span></div>
                       <Maximize2 size={10} className="text-violet-400" />
                     </button>
                   )}
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* =========================================================================
               BIBLIOTECA DESKTOP (ORIGINAL VERCEL - NO TOCAR)
             ========================================================================= */}
          <aside className="hidden md:flex w-full md:w-[250px] lg:w-[300px] h-[300px] md:h-full shrink-0 bg-white border-b md:border-b-0 md:border-r border-slate-200 flex flex-col p-4 md:p-6 md:pb-8 gap-3 md:gap-5 shadow-xl z-30 overflow-hidden">
             <input type="file" ref={fileInputRef} onChange={async (e) => {
                const fs = e.target.files; if (!fs) return;
                for (let i = 0; i < fs.length; i++) { if (fs[i].type.startsWith("application/pdf") || fs[i].type.startsWith("image/")) { await addFile(fs[i].name, fs[i]); toast.success(`Cargado: ${fs[i].name}`); } }
                if (fileInputRef.current) fileInputRef.current.value = "";
             }} accept=".pdf,image/png,image/jpeg,image/jpg" multiple className="hidden" />
             <input type="file" ref={directMesaInputRef} onChange={async (e) => {
                const fs = e.target.files; if (!fs) return;
                for (let i = 0; i < fs.length; i++) { 
                  if (fs[i].type.startsWith("application/pdf") || fs[i].type.startsWith("image/")) { 
                    const id = await addFile(fs[i].name, fs[i]); 
                    if (id) addPagesToEditor(id);
                  } 
                }
                if (directMesaInputRef.current) directMesaInputRef.current.value = "";
             }} accept=".pdf,image/png,image/jpeg,image/jpg" multiple className="hidden" />
             <input type="file" ref={trayFileInputRef} onChange={async (e) => {
                const fs = e.target.files; if (!fs) return;
                for (let i = 0; i < fs.length; i++) { 
                  if (fs[i].type.startsWith("application/pdf") || fs[i].type.startsWith("image/")) { 
                    toast.promise(addUploadedFileToTray(fs[i].name, fs[i]), {
                      loading: `Preparando "${fs[i].name}"...`,
                      success: `"${fs[i].name}" listo en bandeja`,
                      error: "Error al cargar"
                    });
                  } 
                }
                if (trayFileInputRef.current) trayFileInputRef.current.value = "";
             }} accept=".pdf,image/png,image/jpeg,image/jpg" multiple className="hidden" />
             <div className="flex flex-col gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-12 flex items-center justify-center gap-2 bg-emerald-600 text-white font-black rounded-2xl shadow-md hover:translate-y-[-2px] hover:shadow-lg active:scale-95 transition-all text-[10px] uppercase tracking-widest border-b-4 border-emerald-900"
                >
                  <FileUp size={20} strokeWidth={4} />
                  Subir PDF / Imágenes
                </button>
                <div className="flex gap-2">
                   <button
                     onClick={() => { if(selectedFileIds.length > 0) removeSelectedFiles(); else toast.error("Selecciona PDFs primero"); }}
                     className="flex-1 py-2.5 text-[9px] bg-white text-slate-500 font-black hover:bg-slate-100 rounded-lg border border-slate-200 uppercase tracking-widest transition-all shadow-sm"
                   >
                     Quitar Selección
                   </button>
                   <button
                     onClick={() => { clearAllFiles(); toast.success("Biblioteca Ocultada"); }}
                     className="flex-1 py-2.5 text-[9px] bg-red-50 text-red-600 font-black hover:bg-red-500 hover:text-white rounded-lg border border-red-200 uppercase tracking-widest transition-all shadow-sm"
                   >
                     Limpiar Biblioteca
                   </button>
                </div>
             </div>

             <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                  type="text" 
                  placeholder="Buscar en biblioteca..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
                />
             </div>

             <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar flex flex-col gap-1 pr-1 select-none"
               onMouseLeave={() => setIsDraggingFile(false)}
               onMouseUp={() => setIsDraggingFile(false)}
               onMouseDown={(e) => {
                 if (!(e.target as HTMLElement).closest(".file-item")) setIsDraggingFile(true);
               }}
             >
               <AnimatePresence>
                  {files.filter(f => !f.isHidden && f.name.toLowerCase().includes(searchTerm.toLowerCase())).map(f => (
                     <motion.div key={f.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                        draggable={selectedFileIds.includes(f.id) || true}
                        onDragStart={(e: any) => {
                          e.dataTransfer.setData("application/pdf-id", f.id);
                          if (!selectedFileIds.includes(f.id)) selectFile(f.id, false);
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setIsDraggingFile(true);
                          if (!selectedFileIds.includes(f.id)) {
                            selectFile(f.id, e.ctrlKey || e.metaKey);
                          }
                        }}
                       onMouseEnter={() => { if (isDraggingFile) selectFile(f.id, true, true); }}
                       onMouseUp={() => setIsDraggingFile(false)}
                       onDoubleClick={() => { addPagesToEditor(f.id); toast.success(`Hojas de "${f.name}" añadidas`); }}
                       className={cn("file-item group flex items-center p-2 rounded-xl cursor-pointer transition-all border relative",
                          selectedFileIds.includes(f.id) ? (usedFileIds.includes(f.id) ? "bg-emerald-50 border-emerald-500" : "bg-red-50 border-primary") 
                          : (usedFileIds.includes(f.id) ? "bg-emerald-50/20 border-emerald-100" : "bg-white border-slate-50 hover:border-slate-200"))}>
                       <div className={cn("w-7 h-7 rounded-[10px] flex items-center justify-center mr-2 shrink-0", usedFileIds.includes(f.id) ? "bg-emerald-500 text-white" : (selectedFileIds.includes(f.id) ? "bg-primary text-white" : "bg-slate-50 text-slate-300"))}>
                          {usedFileIds.includes(f.id) ? <CheckCircle2 size={14} strokeWidth={3} /> : <FileSearch size={15} />}
                       </div>
                       <div className="flex-1 overflow-hidden pr-5 leading-tight">
                          <p className={cn("text-[9px] font-black uppercase tracking-tight truncate", usedFileIds.includes(f.id) ? "text-emerald-800" : "text-slate-900")}>{f.name}</p>
                          <p className="text-[10px] font-black text-primary/90">{f.pageCount} PÁG</p>
                       </div>
                       <button onClick={(e) => { e.stopPropagation(); removeFile(f.id); }} className="absolute right-2 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all"><X size={13} strokeWidth={3} /></button>
                     </motion.div>
                  ))}
               </AnimatePresence>
             </div>

             {savedDocuments.length > 0 && (
               <div className="mt-auto px-1 group/tray">
                 <button 
                  onClick={() => setShowBandejaModal(true)}
                  className="w-full flex items-center justify-between p-4 bg-violet-50 border border-violet-100 rounded-[22px] hover:bg-violet-100 transition-all hover:translate-y-[-2px] shadow-sm hover:shadow-md"
                 >
                   <div className="flex items-center gap-3">
                     <div className="relative">
                       <div className="w-1.5 h-1.5 bg-violet-600 rounded-full absolute -top-0.5 -right-0.5 animate-pulse" />
                       <Layers size={18} className="text-violet-600" strokeWidth={3} />
                     </div>
                     <div className="flex flex-col items-start leading-none">
                       <span className="text-[9px] font-black text-violet-900 uppercase tracking-wider">Documentos Listos</span>
                       <span className="text-[11px] font-black text-violet-600 uppercase mt-0.5">Bandeja Virtual ({savedDocuments.length})</span>
                     </div>
                   </div>
                   <Maximize2 size={12} className="text-violet-400 group-hover/tray:text-violet-600 transition-colors" />
                 </button>
               </div>
             )}
          </aside>

        <section 
          className="flex-1 bg-slate-50 flex flex-col p-3.5 overflow-hidden"
          onDragOver={(e) => e.preventDefault()}
           onDrop={(e) => {
              e.preventDefault();
              const droppedId = e.dataTransfer.getData("application/pdf-id");
              if (droppedId) {
                  const toAdd = selectedFileIds.includes(droppedId) && selectedFileIds.length > 1
                    ? selectedFileIds
                    : [droppedId];
                  toAdd.forEach(id => addPagesToEditor(id));
                  const count = toAdd.length;
                  toast.success(count > 1 ? `${count} archivos enviados a la mesa` : "Enviando a mesa...");
              }
           }}
        >
          <div className="flex flex-col flex-1 bg-white rounded-[32px] border border-slate-200 shadow-lg overflow-hidden relative">
             <div className="min-h-16 md:min-h-20 border-b border-slate-50 flex items-center justify-between px-3 md:px-8 py-2 md:py-4 bg-white/90 z-40 gap-2">
                 
                 {/* HEADER DESKTOP (ORIGINAL) */}
                 <div className="hidden md:flex items-center gap-4 flex-1">
                    <div className="bg-slate-950 p-3 rounded-[18px] text-white shadow-md"><LayoutGrid size={24} strokeWidth={4} /></div>
                    <div className="flex flex-col">
                       <span className="text-lg font-black text-slate-900 uppercase tracking-tighter leading-none">Mesa de Trabajo</span>
                       <span className="text-[8px] font-black text-primary uppercase tracking-widest mt-1">Professional Suite</span>
                    </div>
                    
                    {/* Columnas y Limpiar Selección inmediatamente después del título */}
                    <div className="flex items-center gap-2 ml-4">
                       <div className="flex items-center bg-slate-100 p-1 rounded-[18px] border border-slate-50 shrink-0">
                          {[4, 5, 6, 7].map(n => (
                            <button key={n} onClick={() => setGridColumns(n)} className={cn("px-4 py-2.5 rounded-[14px] text-[9px] font-black transition-all", gridColumns === n ? "bg-white text-slate-900 shadow-md scale-105" : "text-slate-400 hover:text-slate-600 font-bold")}>{n} COL</button>
                          ))}
                       </div>
                       <button onClick={clearSelection} className="h-12 px-5 rounded-[18px] text-[9px] font-black bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white transition-all uppercase tracking-widest">Limpiar Selección</button>
                    </div>
                 </div>

                 {/* HEADER MOBILE (NUEVO) */}
                 <div className="flex md:hidden items-center gap-2 flex-1 min-w-0">
                    <button onClick={() => setMobileSidebarOpen(true)} className="w-9 h-9 flex items-center justify-center bg-slate-50 text-slate-600 rounded-lg shrink-0"><FolderOpen size={18} /></button>
                    <div className="bg-slate-950 p-1.5 rounded-lg text-white shadow-sm shrink-0"><LayoutGrid size={16} strokeWidth={4} /></div>
                    <div className="flex flex-col min-w-0">
                       <span className="text-[10px] font-black text-slate-900 uppercase tracking-tighter leading-none truncate">Mesa</span>
                       <span className="text-[6px] font-black text-primary uppercase mt-0.5">Suite</span>
                    </div>
                    <div className="flex items-center gap-1 ml-1 overflow-x-auto no-scrollbar py-0.5">
                       {[4, 5, 6].map(n => (
                         <button key={n} onClick={() => setGridColumns(n)} className={cn("px-2 py-1 rounded-md text-[7px] font-black shrink-0", gridColumns === n ? "bg-slate-900 text-white" : "text-slate-400")}>{n} C</button>
                       ))}
                       <button onClick={clearSelection} className="px-2 py-1 rounded-md bg-amber-50 text-amber-600 text-[7px] font-black whitespace-nowrap">LIB.</button>
                    </div>
                 </div>

                 <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
                    {/* Botones Desktop */}
                    <div className="hidden md:flex items-center gap-3">
                       <button onClick={() => setShowBandejaModal(true)} className="h-12 px-5 rounded-[18px] text-[9px] font-black bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 transition-all uppercase tracking-widest flex items-center gap-2 shadow-sm">
                         <Layers size={14} /> Ver Bandeja ({savedDocuments.length})
                       </button>
                       <button 
                         onClick={() => { const ids = selectionSequence.length || selectedPageIds.length; if(!ids) { toast.error("Selecciona hojas"); return; } setShowSaveDoc(true); }} 
                         className="h-12 px-6 rounded-[18px] text-[9px] font-black bg-violet-600 text-white hover:bg-violet-700 shadow-lg shadow-violet-100 transition-all uppercase tracking-widest flex items-center gap-2"
                       >
                         <Archive size={16} /> Añadir a Bandeja
                       </button>
                    </div>

                    {/* Botones Mobile */}
                    <div className="flex md:hidden items-center gap-1.5">
                       <button onClick={() => setShowBandejaModal(true)} className="h-9 px-2.5 rounded-lg text-[7px] font-black bg-white text-slate-900 border border-slate-200 flex items-center gap-1 shadow-sm">
                         <Layers size={12} /> ({savedDocuments.length})
                       </button>
                       <button onClick={() => { const ids = selectionSequence.length || selectedPageIds.length; if(!ids) { toast.error("Hojas?"); return; } setShowSaveDoc(true); }} className="h-9 px-2.5 rounded-lg text-[7px] font-black bg-violet-600 text-white flex items-center gap-1 shadow-sm">
                         <Archive size={12} />+
                       </button>
                    </div>
                   
                   <div className="w-px h-8 bg-slate-100 mx-2 hidden md:block" />
                   
                   {/* Marcador de Hojas restaurado a la derecha */}
                   <div className="flex items-center gap-3 bg-white px-5 h-12 rounded-[18px] shadow-sm border border-slate-200 group/stats">
                      <div className="w-8 h-8 bg-slate-900 rounded-[10px] flex items-center justify-center text-white text-[11px] font-black shadow-lg">
                         {virtualPages.length}
                      </div>
                      <div className="flex flex-col">
                         <span className="text-[10px] font-black text-slate-900 uppercase tracking-tighter leading-none text-left">Hojas</span>
                      </div>
                   </div>
                   <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-sm" />
                </div>
             </div>

             <div className="flex-1 overflow-y-auto p-10 bg-[#FDFFFF] [background-image:radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:40px_40px] custom-scrollbar">
                {!virtualPages.length ? (
                   <div className="h-full flex flex-col items-center justify-center select-none">
                       <div className="bg-slate-50 p-10 rounded-[40px] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center group/empty hover:border-primary/30 transition-all duration-700 cursor-pointer" onClick={() => directMesaInputRef.current?.click()}>
                          <div className="relative mb-8">
                             <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full scale-150 animate-pulse" />
                             <LayoutGrid size={100} className="relative text-slate-200 group-hover/empty:text-primary/40 group-hover/empty:scale-110 transition-all duration-700" />
                          </div>
                          <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter text-center leading-none">Mesa de Trabajo</h2>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-3 bg-white px-5 py-2 rounded-full shadow-sm border border-slate-100 group-hover/empty:text-primary transition-colors">Haz Clic para Subir o Arrastra los PDFs aquí</p>
                       </div>
                    </div>
                ) : (
                   <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                       <SortableContext items={virtualPages.map(p => p.id)} strategy={rectSortingStrategy}>
                          <div className={cn("grid gap-4 md:gap-8 pb-10", gridColumns === 4 ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" : gridColumns === 5 ? "grid-cols-3 md:grid-cols-4 lg:grid-cols-5" : gridColumns === 6 ? "grid-cols-3 md:grid-cols-5 lg:grid-cols-6" : "grid-cols-3 md:grid-cols-5 lg:grid-cols-7")}>
                             {virtualPages.map((pg, idx) => {
                               const f = files.find(x => x.id === pg.sourcePdfId); if (!f) return null;
                               const sIdx = selectionSequence.indexOf(pg.id);
                               return (
                                 <div key={pg.id} className="relative group/card transform transition-all duration-300 hover:scale-[1.02]" onContextMenu={(e) => handlePageContextMenu(e, pg.id)}>
                                    <SortablePage id={pg.id} blob={f.blob} editedBlob={pg.editedBlob} pageNumber={pg.pageNumber} rotation={pg.rotation} selected={selectedPageIds.includes(pg.id)} onView={() => handleOpenViewer(pg.id)}
                                      onClick={(e: any) => togglePageSelection(pg.id, { multi: e.ctrlKey || e.metaKey, range: e.shiftKey, index: idx })} />
                                    {sIdx !== -1 && (
                                       <motion.div initial={{ scale: 0 }} animate={{ scale: 1.1 }} className="absolute -top-3 -right-3 w-9 h-9 bg-primary text-white text-[11px] font-black rounded-xl flex items-center justify-center shadow-xl border-3 border-white z-50">
                                          {sIdx + 1}
                                       </motion.div>
                                    )}
                                 </div>
                               );
                             })}
                          </div>
                       </SortableContext>
                   </DndContext>
                )}
             </div>
          </div>
          <footer className="h-6 flex items-center justify-between mt-2 px-2 opacity-40 hover:opacity-100 transition-opacity select-none border-t border-slate-100">
               <div className="flex items-center gap-2 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">
                  <span className="text-slate-900">JHEP</span>
                  <span className="text-slate-200">/</span>
                  <span>© {new Date().getFullYear()} Todos los derechos reservados</span>
               </div>
              <div className="flex gap-3">
                  <span className="text-[10px] font-black text-slate-900 uppercase tracking-tighter">John Hernando Parra Valderrama</span>
                  <span className="text-[10px] font-black text-slate-600 lowercase tracking-normal">jhonvalderrama1990@gmail.com</span>
               </div>
            </footer>
         </section>
        </section>
      </div>

      <PageContextMenu
        x={ctxMenu?.x ?? 0}
        y={ctxMenu?.y ?? 0}
        visible={!!ctxMenu}
        onClose={() => setCtxMenu(null)}
        actions={getContextMenuActions()}
        selectedCount={selectedPageIds.length}
      />

      <AnimatePresence mode="wait">
        {viewerPdf && (
          <PDFViewer 
            pdf={viewerPdf} 
            onClose={() => {
              setViewerPdf(null);
              if (openedFromBandeja) {
                setShowBandejaModal(true);
                setOpenedFromBandeja(false);
              }
            }} 
          />
        )}

        {showHelp && (
          <HelpModal 
            isOpen={showHelp} 
            onClose={() => setShowHelp(false)} 
            settings={settings}
            setSettings={setSettings}
            gridColumns={gridColumns}
            setGridColumns={setGridColumns}
          />
        )}
        {showSaveDoc && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[400] bg-slate-950/60 flex items-center justify-center p-6" onMouseDown={(e: any) => { if (e.target === e.currentTarget) setShowSaveDoc(false); }}>
            <motion.div initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-[32px] w-[380px] p-10 shadow-2xl flex flex-col gap-6 relative" onClick={e => e.stopPropagation()}>
              <div className="h-2 absolute top-0 left-0 right-0 bg-gradient-to-r from-violet-500 to-indigo-600 rounded-t-[32px]" />
              <div className="flex flex-col gap-1 mt-2">
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Guardar Selección</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{(selectionSequence.length > 0 ? selectionSequence : selectedPageIds).length} hoja(s) seleccionadas</p>
              </div>
              <input autoFocus type="text" placeholder="Nombre del documento..." value={saveDocName} onChange={e => setSaveDocName(e.target.value)} onKeyDown={e => { e.stopPropagation(); if (e.key === "Enter" && saveDocName.trim()) { const ids = selectionSequence.length > 0 ? selectionSequence : selectedPageIds; saveSelectionAsDocument(saveDocName.trim(), ids); toast.success(`"${saveDocName.trim()}" guardado`); setShowSaveDoc(false); } }} className="w-full h-14 px-5 bg-slate-50 border-2 border-slate-100 focus:border-violet-400 rounded-2xl text-sm font-black text-slate-900 outline-none transition-all tracking-tight" />
              <div className="flex gap-3">
                <button onClick={() => setShowSaveDoc(false)} className="flex-1 h-12 bg-slate-100 text-slate-500 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">Cancelar</button>
                <button onClick={() => { if (!saveDocName.trim()) { toast.error("Escribe un nombre"); return; } const ids = selectionSequence.length > 0 ? selectionSequence : selectedPageIds; saveSelectionAsDocument(saveDocName.trim(), ids); toast.success(`"${saveDocName.trim()}" guardado`); setShowSaveDoc(false); }} className="flex-1 h-12 bg-violet-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-violet-500 active:scale-95 transition-all shadow-lg shadow-violet-200">Guardar</button>
              </div>
            </motion.div>
          </motion.div>
        )}
        {showBandejaModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[500] bg-slate-950/80 backdrop-blur-2xl flex items-center justify-center p-4 md:p-10">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-[40px] w-full max-w-6xl h-full max-h-[90vh] shadow-4xl flex flex-col overflow-hidden relative" onClick={e => e.stopPropagation()}>
              <div className="p-4 md:p-5 border-b border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between bg-white/50 backdrop-blur-md gap-3">
                <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto">
                  <div className="w-8 h-8 md:w-11 md:h-11 bg-violet-600 rounded-lg md:rounded-xl flex items-center justify-center text-white shadow-lg shadow-violet-200 shrink-0"><Layers className="w-4 h-4 md:w-5 md:h-5" strokeWidth={3} /></div>
                  <div className="flex flex-col">
                    <h2 className="text-sm md:text-xl font-black text-slate-900 tracking-tighter leading-tight uppercase">Bandeja Virtual</h2>
                    <p className="hidden md:block text-[8px] font-black text-violet-500 uppercase tracking-[0.3em] mt-0.5">Gestión de Documentos</p>
                  </div>
                  <div className="flex-1 md:hidden" />
                  <button onClick={() => setShowBandejaModal(false)} className="md:hidden w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 rounded-lg border border-slate-100"><X size={20} strokeWidth={3} /></button>
                </div>

                <div className="flex items-center gap-1.5 md:gap-2 w-full md:w-auto overflow-hidden">
                  <div className="flex items-center bg-slate-50 p-1 rounded-xl border border-slate-100 mr-1">
                    <button onClick={() => { const allIds = savedDocuments.map(d => d.id); allIds.forEach(id => { if(!selectedDocIds.includes(id)) toggleDocSelection(id); }); }} className="whitespace-nowrap px-2 md:px-3 py-1.5 text-[7px] md:text-[9px] font-black uppercase tracking-widest text-slate-600 hover:bg-white hover:shadow-sm rounded-lg transition-all">Todos</button>
                    <button onClick={clearDocSelection} className="whitespace-nowrap px-2 md:px-3 py-1.5 text-[7px] md:text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600">Nada</button>
                  </div>
                  
                  <div className="flex items-center gap-1.5 md:gap-2">
                    <button onClick={() => trayFileInputRef.current?.click()} className="whitespace-nowrap h-10 md:h-11 px-3 md:px-4 rounded-lg md:rounded-xl text-[8px] md:text-[9px] font-black uppercase tracking-widest flex items-center gap-2 bg-emerald-600 text-white shadow-md transition-all hover:scale-105 active:scale-95">
                      <FileUp size={14} strokeWidth={3} /> <span className="hidden xl:inline">Subir PDF</span>
                    </button>
                    <button onClick={handleSaveDocsIndividually} disabled={selectedDocIds.length === 0} className={cn("whitespace-nowrap h-10 md:h-11 px-3 md:px-4 rounded-lg md:rounded-xl text-[8px] md:text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-md", selectedDocIds.length > 0 ? "bg-amber-600 text-white hover:scale-105 active:scale-95" : "bg-slate-100 text-slate-400 grayscale")}>
                      <FolderPlus size={14} strokeWidth={3} /> <span className="hidden xl:inline">Guardar</span><span className="xl:hidden">({selectedDocIds.length})</span>
                    </button>
                  </div>

                  <div className="hidden md:flex items-center gap-1.5 md:gap-2">
                    <button onClick={handleExportZip} disabled={selectedDocIds.length === 0} className={cn("h-11 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-md border", selectedDocIds.length > 0 ? "bg-white text-emerald-600 border-emerald-600 hover:bg-emerald-50 hover:scale-105 active:scale-95" : "bg-slate-50 text-slate-300 grayscale cursor-not-allowed border-slate-100 shadow-none")}>
                      <Download size={14} strokeWidth={3} /> <span className="hidden xl:inline">Exportar ZIP</span><span className="xl:hidden">ZIP</span>
                    </button>
                    <div className="w-px h-6 bg-slate-200 mx-0.5" />
                    <button onClick={() => { if(confirm("¿Estás seguro de vaciar toda la bandeja?")) { clearSavedDocuments(); toast.success("Bandeja vaciada"); } }} disabled={savedDocuments.length === 0} className="h-11 px-3 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed border border-red-100 hover:scale-105 active:scale-95">
                      <Trash2 size={14} strokeWidth={3} /> <span className="hidden xl:inline">Vaciar</span>
                    </button>
                    <button onClick={() => setShowBandejaModal(false)} className="w-11 h-11 flex items-center justify-center bg-slate-900 text-white hover:bg-red-600 rounded-xl transition-all shadow-lg hover:rotate-90">
                      <X size={18} strokeWidth={3} />
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-slate-50/30">
                {savedDocuments.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                    <Archive size={80} strokeWidth={1} className="text-slate-300 mb-6" />
                    <p className="text-xl font-black text-slate-400 uppercase tracking-tighter">La bandeja está vacía</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
                    {savedDocuments.map(doc => (
                      <motion.div key={doc.id} layout initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} onClick={() => toggleDocSelection(doc.id)} className={cn("group relative bg-white rounded-[24px] border-2 p-4 transition-all cursor-pointer shadow-sm hover:shadow-xl", selectedDocIds.includes(doc.id) ? "border-violet-500 ring-2 ring-violet-50" : "border-slate-50 hover:border-violet-100")}>
                        <div className={cn("absolute top-3 right-3 w-6 h-6 rounded-lg border flex items-center justify-center transition-all", selectedDocIds.includes(doc.id) ? "bg-violet-600 border-violet-600 text-white shadow-md" : "bg-slate-50 border-slate-200 text-transparent")}>
                          <CheckCircle2 size={12} strokeWidth={4} />
                        </div>
                        <div className="flex flex-col h-full text-left">
                          <div className="flex items-start gap-3 mb-4">
                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors", selectedDocIds.includes(doc.id) ? "bg-violet-100 text-violet-600 shadow-inner" : "bg-slate-50 text-slate-300")}><FileText size={20} strokeWidth={3} /></div>
                            <div className="flex flex-col min-w-0 pr-4 mt-0.5">
                              <h4 className="text-[11px] font-black text-slate-900 truncate leading-tight uppercase tracking-tight">{doc.name}</h4>
                              <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5 tracking-widest">{doc.pageIds.length} Hoja(s) • PDF</p>
                            </div>
                          </div>
                          <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
                            <div className="flex gap-2">
                               <button onClick={(e) => { e.stopPropagation(); handlePreviewDocument(doc.id); }} className="w-9 h-9 flex items-center justify-center bg-slate-50 text-slate-400 hover:bg-violet-600 hover:text-white rounded-lg transition-all"><Eye size={16} strokeWidth={3} /></button>
                               <button onClick={(e) => { e.stopPropagation(); removeSavedDocument(doc.id); toast.success("Documento eliminado"); }} className="w-9 h-9 flex items-center justify-center bg-white text-slate-200 hover:bg-red-50 hover:text-red-500 rounded-lg transition-all border border-slate-50 hover:border-red-100"><Trash2 size={16} strokeWidth={3} /></button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-6 bg-slate-900 flex items-center justify-between px-10">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">JHEP Secure Workspace v4.3</span>
                <div className="flex items-center gap-2 text-white/40"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /></div>
              </div>
            </motion.div>
          </motion.div>
        )}
        
        {showImageFormatModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[600] bg-slate-950/60 backdrop-blur-lg flex items-center justify-center p-6" onClick={() => setShowImageFormatModal(false)}>
            <motion.div initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-[32px] w-[380px] p-10 shadow-2xl flex flex-col gap-6 relative" onClick={e => e.stopPropagation()}>
              <div className="h-2 absolute top-0 left-0 right-0 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-t-[32px]" />
              <div className="flex flex-col gap-1 mt-2">
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Formato de Imagen</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Elige cómo exportar tus hojas</p>
              </div>
              <div className="flex flex-col gap-3">
                <button onClick={() => setSelectedImageFormat("png")} className={cn("p-4 rounded-2xl border-2 flex flex-col items-start transition-all", selectedImageFormat === "png" ? "border-emerald-500 bg-emerald-50" : "border-slate-100 bg-slate-50 hover:bg-slate-100")}>
                   <span className="font-black text-slate-900 uppercase tracking-tighter">PNG</span>
                   <span className="text-[10px] font-medium text-slate-500 mt-1">Alta calidad sin pérdida.</span>
                </button>
                <button onClick={() => setSelectedImageFormat("jpeg")} className={cn("p-4 rounded-2xl border-2 flex flex-col items-start transition-all", selectedImageFormat === "jpeg" ? "border-emerald-500 bg-emerald-50" : "border-slate-100 bg-slate-50 hover:bg-slate-100")}>
                   <span className="font-black text-slate-900 uppercase tracking-tighter">JPEG / JPG</span>
                   <span className="text-[10px] font-medium text-slate-500 mt-1">Tamaño reducido, ideal foto.</span>
                </button>
                <button onClick={() => setSelectedImageFormat("webp")} className={cn("p-4 rounded-2xl border-2 flex flex-col items-start transition-all", selectedImageFormat === "webp" ? "border-emerald-500 bg-emerald-50" : "border-slate-100 bg-slate-50 hover:bg-slate-100")}>
                   <span className="font-black text-slate-900 uppercase tracking-tighter">WebP</span>
                   <span className="text-[10px] font-medium text-slate-500 mt-1">Formato optimizado ligero.</span>
                </button>
              </div>
              <div className="flex gap-3 mt-2">
                <button onClick={() => setShowImageFormatModal(false)} className="flex-1 h-12 bg-slate-100 text-slate-500 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">Cancelar</button>
                <button onClick={() => { setShowImageFormatModal(false); handleConvertToImages(selectedImageFormat); }} className="flex-1 h-12 bg-emerald-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-emerald-500 active:scale-95 transition-all shadow-lg shadow-emerald-200">Empezar</button>
              </div>
            </motion.div>
          </motion.div>
        )}      </AnimatePresence>
    </main>
  );
}
