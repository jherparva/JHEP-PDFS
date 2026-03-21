"use client";

import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye, RotateCw, RotateCcw, Trash2, CheckSquare, XSquare,
  Copy, Scissors, Printer, Download, Layers, ArrowUpToLine, ArrowDownToLine
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ContextMenuAction {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  dividerAfter?: boolean;
}

interface PageContextMenuProps {
  x: number;
  y: number;
  visible: boolean;
  onClose: () => void;
  actions: ContextMenuAction[];
  selectedCount: number;
}

export const PageContextMenu = ({ x, y, visible, onClose, actions, selectedCount }: PageContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (visible) {
      document.addEventListener("mousedown", handleClick);
      document.addEventListener("keydown", handleKey);
    }
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [visible, onClose]);

  // Adjust position to keep menu within viewport
  useEffect(() => {
    if (visible && menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      if (rect.right > vw) menuRef.current.style.left = `${x - rect.width}px`;
      if (rect.bottom > vh) menuRef.current.style.top = `${y - rect.height}px`;
    }
  }, [visible, x, y]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.85, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -5 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="fixed z-[500] min-w-[220px] max-w-[280px] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden"
          style={{ left: x, top: y }}
        >
          {/* Header */}
          {selectedCount > 0 && (
            <div className="px-4 py-2.5 bg-gradient-to-r from-slate-900 to-slate-800 flex items-center gap-2">
              <Layers size={13} className="text-slate-400" strokeWidth={3} />
              <span className="text-[9px] font-black text-white uppercase tracking-widest">
                {selectedCount} {selectedCount === 1 ? "hoja" : "hojas"} seleccionada{selectedCount !== 1 ? "s" : ""}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="py-1.5">
            {actions.map((action, i) => (
              <React.Fragment key={i}>
                <button
                  onClick={() => { action.onClick(); onClose(); }}
                  disabled={action.disabled}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all group/item",
                    action.danger
                      ? "text-red-500 hover:bg-red-50 hover:text-red-600"
                      : "text-slate-700 hover:bg-slate-50 hover:text-slate-900",
                    action.disabled && "opacity-30 cursor-not-allowed pointer-events-none"
                  )}
                >
                  <div className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all",
                    action.danger
                      ? "bg-red-50 text-red-400 group-hover/item:bg-red-100 group-hover/item:text-red-500"
                      : "bg-slate-100 text-slate-400 group-hover/item:bg-primary/10 group-hover/item:text-primary"
                  )}>
                    {action.icon}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider">{action.label}</span>
                </button>
                {action.dividerAfter && (
                  <div className="mx-4 my-1 h-px bg-slate-100" />
                )}
              </React.Fragment>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
