import { create } from "zustand";
import { PDFDocument } from "pdf-lib";

export interface PDFPage {
  id: string;
  sourcePdfId: string;
  pageNumber: number; // 1-indexed
  rotation: number;
  editedBlob?: Blob; // Local blob if the page was edited in the viewer
}

export interface SavedDocument {
  id: string;
  name: string;
  pageIds: string[];     // IDs de virtualPages en el orden guardado
  createdAt: number;
}

export interface PDFFile {
  id: string;
  name: string;
  blob: Blob;
  previewUrl: string;
  pageCount: number;
  isHidden?: boolean; // Para ocultar de la biblioteca sin borrar de la mesa
}

interface PDFState {
  files: PDFFile[];
  virtualPages: PDFPage[]; 
  savedDocuments: SavedDocument[];  // Bandeja virtual
  selectedDocIds: string[];         // Documentos marcados para el ZIP
  selectedFileIds: string[];
  selectedPageIds: string[];
  selectionSequence: string[]; // Order of selection for "Confirm Order"
  usedFileIds: string[]; // IDs of files already added to the organizer
  gridColumns: number; // For grid view resizing
  undoStack: PDFPage[][]; // History of virtualPages states
  conversionQueue: { id: string; name: string; progress: number; status: "pending" | "processing" | "completed" | "error" }[];
  
  // Actions
  addFile: (name: string, blob: Blob) => Promise<string | null>;
  updateConversionProgress: (id: string, progress: number, status?: "pending" | "processing" | "completed" | "error") => void;
  addToConversionQueue: (id: string, name: string) => void;
  removeFromConversionQueue: (id: string) => void;
  removeFile: (id: string) => void;
  selectFile: (id: string, multi?: boolean, forceSelect?: boolean) => void;
  removeSelectedFiles: () => void;
  clearAllFiles: () => void;
  
  // Bandeja virtual de documentos
  saveSelectionAsDocument: (name: string, pageIds: string[]) => void;
  removeSavedDocument: (id: string) => void;
  toggleDocSelection: (id: string) => void;
  clearDocSelection: () => void;
  clearSavedDocuments: () => void;
  addUploadedFileToTray: (name: string, blob: Blob) => Promise<void>;

  // Organization actions
  addPagesToEditor: (pdfId: string) => void;
  reorderPages: (activeId: string, overId: string) => void;
  rotateSelected: (degrees: number) => void;
  deleteSelectedPages: () => void;
  duplicatePage: (id: string) => void;
  duplicateSelectedPages: () => void;
  rotatePage: (id: string, degrees: number) => void;
  deletePage: (id: string) => void;
  updatePageBlob: (id: string, blob: Blob) => void; // Update the thumbnail/content for an edited page
  clearSelection: () => void;
  togglePageSelection: (pageId: string, options?: { multi?: boolean; range?: boolean; index?: number }) => void;
  setGridColumns: (cols: number) => void;
  selectAllPages: () => void;
  
  confirmOrderSelection: () => void;
  undoAction: () => void;
  clearAll: () => void;
  saveHistory: () => void;
}

export const usePDFStore = create<PDFState>()((set, get) => ({
  files: [],
  virtualPages: [],
  savedDocuments: [],
  selectedDocIds: [],
  selectedFileIds: [],
  selectedPageIds: [],
  selectionSequence: [],
  usedFileIds: [],
  gridColumns: 5,
  undoStack: [],
  conversionQueue: [],

  updateConversionProgress: (id, progress, status) => set((state) => ({
    conversionQueue: state.conversionQueue.map(item => 
      item.id === id ? { ...item, progress, ...(status ? { status } : {}) } : item
    )
  })),

  addToConversionQueue: (id, name) => set((state) => ({
    conversionQueue: [...state.conversionQueue, { id, name, progress: 0, status: "processing" }]
  })),

  removeFromConversionQueue: (id) => set((state) => ({
    conversionQueue: state.conversionQueue.filter(item => item.id !== id)
  })),

  saveHistory: () => {
    const { virtualPages, undoStack } = get();
    // Use a manual copy instead of JSON.stringify to preserve Blobs (editedBlob)
    const historyCopy = virtualPages.map(p => ({ ...p }));
    const newStack = [...undoStack, historyCopy].slice(-20);
    set({ undoStack: newStack });
  },

  addFile: async (name: string, blob: Blob) => {
    try {
      const id = Math.random().toString(36).substring(7);
      let finalBlob = blob;
      let pageCount = 0;

      if (blob.type.startsWith("image/")) {
        const pdfDoc = await PDFDocument.create();
        const imgBytes = await blob.arrayBuffer();
        let img;
        try {
          if (blob.type === "image/png") img = await pdfDoc.embedPng(imgBytes);
          else img = await pdfDoc.embedJpg(imgBytes);
          
          const page = pdfDoc.addPage([img.width, img.height]);
          page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
          const pdfBytes = await pdfDoc.save();
          finalBlob = new Blob([pdfBytes as any], { type: "application/pdf" });
          pageCount = 1;
        } catch (e) {
          console.error("Image embed error", e);
          return null;
        }
      } else {
        const arrayBuffer = await blob.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        pageCount = pdf.getPageCount();
      }

      const previewUrl = URL.createObjectURL(finalBlob);
      const newFile: PDFFile = { id, name: name.replace(/\.(png|jpg|jpeg)$/i, ".pdf"), blob: finalBlob, previewUrl, pageCount, isHidden: false };
      
      set((state) => ({ 
        files: [...state.files, newFile],
        selectedFileIds: state.selectedFileIds 
      }));
      return id;
    } catch (error) {
      console.error("Error adding PDF file:", error);
      return null;
    }
  },

  removeFile: (id) => {
    set((state) => {
      const isUsed = state.usedFileIds.includes(id) || state.virtualPages.some(p => p.sourcePdfId === id);
      if (isUsed) {
        return {
          files: state.files.map(f => f.id === id ? { ...f, isHidden: true } : f),
          selectedFileIds: state.selectedFileIds.filter(fid => fid !== id)
        };
      }
      return {
        files: state.files.filter((f: PDFFile) => f.id !== id),
        usedFileIds: state.usedFileIds.filter((fid: string) => fid !== id),
        selectedFileIds: state.selectedFileIds.filter((fid: string) => fid !== id)
      };
    });
  },

  selectFile: (id, multi, forceSelect) => set((state) => {
      const isSelected = state.selectedFileIds.includes(id);
      if (forceSelect && isSelected) return state;
      return {
        selectedFileIds: multi 
          ? (isSelected ? state.selectedFileIds.filter(fid => fid !== id) : [...state.selectedFileIds, id])
          : [id]
      };
  }),

  removeSelectedFiles: () => {
    set((state) => ({
      files: state.files.map(f => state.selectedFileIds.includes(f.id) ? { ...f, isHidden: true } : f),
      selectedFileIds: []
    }));
  },

  clearAllFiles: () => set((state) => ({ 
    files: state.files.map(f => ({ ...f, isHidden: true })),
    selectedFileIds: [] 
  })),

  saveSelectionAsDocument: (name, pageIds) => set((state) => ({
    savedDocuments: [
      ...state.savedDocuments,
      { id: Math.random().toString(36).substring(7), name, pageIds, createdAt: Date.now() }
    ]
  })),

  removeSavedDocument: (id) => set((state) => ({
    savedDocuments: state.savedDocuments.filter(d => d.id !== id),
    selectedDocIds: state.selectedDocIds.filter(did => did !== id)
  })),

  toggleDocSelection: (id) => set((state) => ({
    selectedDocIds: state.selectedDocIds.includes(id)
      ? state.selectedDocIds.filter(did => did !== id)
      : [...state.selectedDocIds, id]
  })),

  clearDocSelection: () => set({ selectedDocIds: [] }),

  clearSavedDocuments: () => set({ savedDocuments: [], selectedDocIds: [] }),

  addUploadedFileToTray: async (name, blob) => {
    const fileId = await get().addFile(name, blob);
    if (!fileId) return;

    const file = get().files.find(f => f.id === fileId);
    if (!file) return;

    const newPages: PDFPage[] = Array.from({ length: file.pageCount }, (_, i) => ({
      id: `${fileId}-${i + 1}-${Math.random().toString(36).substring(7)}`,
      sourcePdfId: fileId,
      pageNumber: i + 1,
      rotation: 0
    }));

    set((state) => ({
      virtualPages: [...state.virtualPages, ...newPages],
      usedFileIds: [...new Set([...state.usedFileIds, fileId])],
      savedDocuments: [
        ...state.savedDocuments,
        { 
          id: Math.random().toString(36).substring(7), 
          name: name.replace(/\.(pdf|png|jpg|jpeg)$/i, ""), 
          pageIds: newPages.map(p => p.id), 
          createdAt: Date.now() 
        }
      ]
    }));
  },

  addPagesToEditor: (pdfId) => {
    get().saveHistory();
    const file = get().files.find((f: PDFFile) => f.id === pdfId);
    if (!file) return;

    const newPages: PDFPage[] = Array.from({ length: file.pageCount }, (_, i) => ({
      id: `${pdfId}-${i + 1}-${Math.random().toString(36).substring(7)}`,
      sourcePdfId: pdfId,
      pageNumber: i + 1,
      rotation: 0
    }));

    set((state) => ({ 
      virtualPages: [...state.virtualPages, ...newPages],
      usedFileIds: [...new Set([...state.usedFileIds, pdfId])]
    }));
  },

  setGridColumns: (cols) => set({ gridColumns: cols }),

  reorderPages: (activeId: string, overId: string) => {
    get().saveHistory();
    const { virtualPages, selectionSequence } = get();
    
    const activeIndex = virtualPages.findIndex(p => p.id === activeId);
    const overIndex = virtualPages.findIndex(p => p.id === overId);
    if (activeIndex === -1 || overIndex === -1) return;

    if (!selectionSequence.includes(activeId) || selectionSequence.length <= 1) {
       const pages = [...virtualPages];
       const [removed] = pages.splice(activeIndex, 1);
       pages.splice(overIndex, 0, removed);
       set({ virtualPages: pages });
       return;
    }

    // MULTI-DRAG LOGIC
    const itemsToMove = selectionSequence.map(id => virtualPages.find(p => p.id === id)).filter(Boolean) as PDFPage[];
    const remainingPages = virtualPages.filter(p => !selectionSequence.includes(p.id));
    
    let insertIndex = remainingPages.findIndex(p => p.id === overId);
    if (insertIndex === -1) {
        insertIndex = Math.min(activeIndex, remainingPages.length);
    } else if (overIndex > activeIndex) {
        insertIndex += 1;
    }
    
    remainingPages.splice(insertIndex, 0, ...itemsToMove);
    set({ virtualPages: remainingPages });
  },

  rotateSelected: (degrees: number) => {
    get().saveHistory();
    set((state) => ({
      virtualPages: state.virtualPages.map((p: PDFPage) => 
        state.selectedPageIds.includes(p.id) 
          ? { ...p, rotation: (p.rotation + degrees) % 360 } 
          : p
      )
    }));
  },

  rotatePage: (id: string, degrees: number) => {
    get().saveHistory();
    set((state) => ({
      virtualPages: state.virtualPages.map((p) =>
        p.id === id ? { ...p, rotation: (p.rotation + degrees) % 360 } : p
      ),
    }));
  },

  deletePage: (id: string) => {
    get().saveHistory();
    set((state) => ({
      virtualPages: state.virtualPages.filter((p) => p.id !== id),
      selectedPageIds: state.selectedPageIds.filter((pid) => pid !== id),
      selectionSequence: state.selectionSequence.filter((pid) => pid !== id),
    }));
  },

  updatePageBlob: (id: string, blob: Blob) => {
    set((state) => ({
      virtualPages: state.virtualPages.map((p) =>
        p.id === id ? { ...p, editedBlob: blob } : p
      ),
    }));
  },

  duplicatePage: (id: string) => {
    get().saveHistory();
    set((state) => {
      const idx = state.virtualPages.findIndex(p => p.id === id);
      if (idx === -1) return state;
      const original = state.virtualPages[idx];
      const clone = { 
        ...original, 
        id: `${original.sourcePdfId}-dup-${Math.random().toString(36).substring(7)}`,
      };
      const newPages = [...state.virtualPages];
      newPages.splice(idx + 1, 0, clone);
      return { virtualPages: newPages };
    });
  },

  duplicateSelectedPages: () => {
    get().saveHistory();
    set((state) => {
      const newPages = [...state.virtualPages];
      const selected = state.virtualPages.filter(p => state.selectedPageIds.includes(p.id));
      
      selected.forEach(original => {
        const idx = newPages.findIndex(p => p.id === original.id);
        const clone = { 
          ...original, 
          id: `${original.sourcePdfId}-dup-${Math.random().toString(36).substring(7)}`,
        };
        newPages.splice(idx + 1, 0, clone);
      });
      
      return { virtualPages: newPages };
    });
  },

  deleteSelectedPages: () => {
    get().saveHistory();
    set((state) => ({
      virtualPages: state.virtualPages.filter((p: PDFPage) => !state.selectedPageIds.includes(p.id)),
      selectedPageIds: [],
      selectionSequence: []
    }));
  },

  clearSelection: () => set({ selectedPageIds: [], selectionSequence: [] }),

  togglePageSelection: (pageId, options) => {
    const { multi, range, index } = options || {};
    set((state) => {
      const { selectedPageIds, virtualPages, selectionSequence } = state;
      const isSelected = selectedPageIds.includes(pageId);
      
      let newSelection = [...selectedPageIds];
      let newSequence = [...selectionSequence];

      if (range && index !== undefined && selectedPageIds.length > 0) {
        const lastSelectedId = selectedPageIds[selectedPageIds.length - 1];
        const lastIndex = virtualPages.findIndex((p: PDFPage) => p.id === lastSelectedId);
        if (lastIndex !== -1) {
          const start = Math.min(lastIndex, index);
          const end = Math.max(lastIndex, index);
          const rangeIds = virtualPages.slice(start, end + 1).map((p: PDFPage) => p.id);
          newSelection = Array.from(new Set([...selectedPageIds, ...rangeIds]));
          newSequence = [...newSelection];
          return { selectedPageIds: newSelection, selectionSequence: newSequence };
        }
      }

      if (multi) {
        if (isSelected) {
          newSelection = selectedPageIds.filter((id: string) => id !== pageId);
          newSequence = selectionSequence.filter((id: string) => id !== pageId);
        } else {
          newSelection = [...selectedPageIds, pageId];
          newSequence = [...selectionSequence, pageId];
        }
      } else {
        newSelection = [pageId];
        newSequence = [pageId];
      }
      
      return { selectedPageIds: newSelection, selectionSequence: newSequence };
    });
  },

  selectAllPages: () => set((state) => ({
    selectedPageIds: state.virtualPages.map(p => p.id),
    selectionSequence: state.virtualPages.map(p => p.id)
  })),

  confirmOrderSelection: () => {
    const { virtualPages, selectionSequence } = get();
    if (selectionSequence.length === 0) return;
    
    get().saveHistory();
    const selectedPages = selectionSequence.map(id => virtualPages.find((p: PDFPage) => p.id === id)).filter(Boolean) as PDFPage[];
    set({ virtualPages: selectedPages });
  },

  undoAction: () => {
    const { undoStack } = get();
    if (undoStack.length === 0) return;
    
    const previousState = undoStack[undoStack.length - 1];
    const newStack = undoStack.slice(0, -1);
    
    set({
      virtualPages: previousState,
      undoStack: newStack,
      selectedPageIds: [],
      selectionSequence: []
    });
  },

  clearAll: () => {
    get().saveHistory();
    set({ virtualPages: [], selectedPageIds: [], selectionSequence: [], usedFileIds: [] });
  }
}));
