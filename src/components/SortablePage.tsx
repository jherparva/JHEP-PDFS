"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PDFThumbnail } from "./PDFThumbnail";
import { Trash2, RotateCw, Eye } from "lucide-react";
import { usePDFStore } from "@/store/pdf-store";
import { cn } from "@/lib/utils";

interface SortablePageProps {
  id: string;
  blob: Blob; // Original blob
  editedBlob?: Blob; // Captured edit blob
  pageNumber: number;
  rotation?: number;
  selected?: boolean;
  selectionIndex?: number;
  onClick?: (e: any) => void;
  onView?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export const SortablePage = ({ id, blob, editedBlob, pageNumber, rotation = 0, selected, selectionIndex = -1, onClick, onView, onContextMenu }: SortablePageProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 0,
  };

  const deletePage = usePDFStore(s => s.deletePage);
  const rotatePage = usePDFStore(s => s.rotatePage);

  return (
    <div ref={setNodeRef} style={style} {...attributes}
      onDoubleClick={(e) => { e.stopPropagation(); onView?.(); }}
      onContextMenu={onContextMenu}
      className={cn("relative p-2 rounded-2xl group/card select-none", 
        selected ? "bg-red-50 ring-4 ring-primary shadow-2xl" : "bg-white hover:bg-slate-50")}>
      
      <div className="relative cursor-pointer overflow-hidden rounded-xl shadow-lg border border-slate-100 bg-slate-50 transform transition-transform duration-300 group-hover/card:scale-[1.02]" onClick={onClick}>
        <PDFThumbnail 
          blob={editedBlob || blob} 
          pageNumber={editedBlob ? 1 : pageNumber} 
          rotation={rotation} 
        />
        
        {/* Persistent Action Bar - Semi-transparent Glass */}
        <div className="absolute top-2 right-2 flex flex-col gap-1.5 z-30 transition-all">
           <button 
             onClick={(e) => { e.stopPropagation(); deletePage(id); }} 
             className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center bg-rose-600/90 text-white rounded-lg shadow-lg hover:bg-rose-600 hover:scale-110 active:scale-95 transition-all"
             title="Eliminar"
           >
             <Trash2 size={16} strokeWidth={3} />
           </button>
        </div>

        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 p-1 bg-white/60 backdrop-blur-md rounded-xl border border-white/40 shadow-xl z-30 group-hover:bg-white/90 transition-all">
           <button 
             onClick={(e) => { e.stopPropagation(); rotatePage(id, 90); }} 
             className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center hover:bg-slate-100 text-slate-700 rounded-lg transition-all active:scale-90"
             title="Rotar"
           >
             <RotateCw size={16} strokeWidth={3} />
           </button>
           <div className="w-px h-4 bg-slate-300/50" />
           <button 
             onClick={(e) => { e.stopPropagation(); onView?.(); }} 
             className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center hover:bg-slate-100 text-slate-700 rounded-lg transition-all active:scale-90"
             title="Ver / Editar"
           >
             <Eye size={16} strokeWidth={3} />
           </button>
        </div>

        {/* Interaction Grabber */}
        <div {...listeners} className="absolute inset-0 z-10 opacity-0 group-hover:opacity-10 bg-slate-900 cursor-grab active:cursor-grabbing" />
      </div>

      <div className="mt-3 flex items-center justify-between px-2">
         <span className={cn("text-[10px] font-black uppercase tracking-tight", selected ? "text-primary" : "text-slate-800")}>Hoja {pageNumber}</span>
         {selected && <div className="w-2.5 h-2.5 bg-primary rounded-full animate-pulse shadow-primary/50 shadow-md" />}
      </div>
      {selectionIndex !== -1 && (
         <div className="absolute -top-3 -right-3 w-9 h-9 bg-primary text-white text-[11px] font-black rounded-xl flex items-center justify-center shadow-xl border-3 border-white z-50 pointer-events-none transition-transform scale-110">
            {selectionIndex + 1}
         </div>
      )}
    </div>
  );
};
