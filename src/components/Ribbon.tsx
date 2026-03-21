import React from "react";
import { 
  Plus, Check, RotateCcw, Hash, Scissors, FolderPlus, 
  Trash2, Eye, Printer, Archive, Settings, HelpCircle, 
  LayoutGrid, Layers, Download, FileUp, Settings2, BookOpen, MonitorDown
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RibbonProps {
  onAction: (action: string) => void;
  activeTab?: string;
  isFoliating?: boolean;
  canInstall?: boolean;
  onInstall?: () => void;
}

const actionGroups = [
  {
    name: "ORGANIZACIÓN",
    tools: [
      { id: "organize", label: "Organizar", icon: Plus, color: "text-emerald-600", bg: "bg-emerald-50" },
      { id: "confirm", label: "Confirmar", icon: Check, color: "text-blue-600", bg: "bg-blue-50" },
      { id: "undo", label: "Deshacer", icon: RotateCcw, color: "text-slate-500", bg: "bg-slate-50" },
      { id: "foliar", label: "Numera Hojas", icon: Hash, color: "text-indigo-600", bg: "bg-indigo-50" },
      { id: "delete", label: "Eliminar", icon: Scissors, color: "text-rose-600", bg: "bg-rose-50" },
    ]
  },
  {
    name: "ACCIONES Y SALIDA",
    tools: [
      { id: "clear", label: "Limpiar Todo", icon: Trash2, color: "text-rose-600", bg: "bg-rose-50" },
      { id: "image", label: "A Imagen", icon: Layers, color: "text-amber-600", bg: "bg-amber-50" },
      { id: "view", label: "Vista", icon: Eye, color: "text-indigo-600", bg: "bg-indigo-50" },
      { id: "print", label: "Imprimir", icon: Printer, color: "text-slate-600", bg: "bg-slate-50" },
      { id: "help", label: "Manual", icon: BookOpen, color: "text-slate-500", bg: "bg-slate-50" },
    ]
  },
];

export const Ribbon = ({ onAction, activeTab, isFoliating, canInstall, onInstall }: RibbonProps) => {
  return (
    <>
      {/* =========================================================================
           VERSION DESKTOP (ORIGINAL VERCEL - NO TOCAR)
         ========================================================================= */}
      <div className="hidden md:flex h-32 bg-white border-b border-slate-200 items-center px-8 gap-10 shrink-0 shadow-sm z-50">
        <div className="flex items-center gap-4 pr-8 border-r border-slate-100">
          <div className="relative w-12 h-12 flex shrink-0 group">
             <div className="absolute inset-0 bg-gradient-to-b from-red-600 to-red-800 rounded-xl shadow-[0_2px_10px_rgba(220,38,38,0.4)] flex items-center justify-center p-[4px] transition-transform group-hover:scale-105">
                <div className="relative w-full h-full bg-slate-50 rounded-[4px] rounded-tr-[12px] flex flex-col items-center justify-center shadow-inner border border-slate-950 overflow-hidden">
                   <div className="absolute -top-1 -right-1 w-0 h-0 border-b-[14px] border-l-[14px] border-b-transparent border-l-red-700 rotate-180 scale-110" />
                   <div className="absolute -top-[1px] -right-[1px] w-0 h-0 border-b-[13px] border-l-[13px] border-b-slate-400 border-l-transparent drop-shadow-[-1px_1px_1px_rgba(0,0,0,0.5)] rounded-bl-[1px]" />
                   <div className="absolute -top-[1px] -right-[1px] w-0 h-0 border-b-[14px] border-l-[14px] border-b-slate-950 border-l-transparent -z-10" />
                   <span className="font-black text-red-700 text-[14px] tracking-tighter leading-none mt-1">JH</span>
                   <div className="bg-red-100/80 mt-0.5 px-[3px] py-[1px] rounded-[3px] text-[5px] font-black text-red-700 uppercase tracking-[0.2em] border border-red-200">PDF</div>
                </div>
             </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[22px] font-black text-slate-900 tracking-tighter leading-none">JHEP</span>
            <span className="text-[9px] font-black text-primary uppercase tracking-[0.3em] whitespace-nowrap">Editor Profesional</span>
          </div>
        </div>
        <div className="flex items-center h-full gap-10 flex-1">
          {actionGroups.map((group) => (
            <div key={group.name} className="flex flex-col h-full py-2.5 justify-between relative">
              <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 pl-1">{group.name}</span>
              <div className="flex items-center gap-1.5">
                {group.tools.map((tool) => {
                  const Icon = tool.icon;
                  const active = tool.id === "foliar" && isFoliating;
                  return (
                    <button key={tool.id} onClick={() => onAction(tool.id)} className={cn("group flex flex-col items-center justify-center p-1.5 rounded-[18px] transition-all relative min-w-[65px]", active ? "bg-indigo-600 text-white shadow-lg scale-105" : "hover:bg-slate-50 text-slate-600")}>
                      <div className={cn("p-3 rounded-[16px] mb-1.5 transition-all group-hover:scale-110", active ? "bg-white/20" : tool.bg)}><Icon size={18} strokeWidth={3} className={active ? "text-white" : tool.color} /></div>
                      <span className={cn("text-[9px] font-black uppercase tracking-tight leading-none", active ? "text-white" : "text-slate-500")}>{tool.label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="absolute top-[26px] left-0 right-0 h-px bg-slate-50 rounded-full" />
            </div>
          ))}
          <div className="flex-grow" />
          <div className="flex items-center">
             {canInstall && (
               <button onClick={onInstall} className="h-16 px-6 mr-3 bg-red-50 text-red-600 font-black rounded-[20px] flex items-center justify-center gap-2 transition-all hover:bg-red-600 hover:text-white border border-red-200 uppercase tracking-widest text-[9px]"><MonitorDown size={20} strokeWidth={3} /> Instalar PC</button>
             )}
             <button onClick={() => onAction("save")} className="h-16 px-10 bg-emerald-600 text-white font-black rounded-[20px] flex items-center justify-center gap-3 shadow-xl shadow-emerald-100 transition-all hover:translate-y-[-4px] active:scale-95 border-b-4 border-emerald-900 uppercase tracking-[0.2em] text-[10px] group"><Download size={22} strokeWidth={4} className="group-hover:scale-110 transition-transform" /> Guardar PDF</button>
          </div>
        </div>
      </div>

      {/* =========================================================================
           VERSION MOVIL (NUEVA - OPTIMIZADA)
         ========================================================================= */}
      <div className="flex md:hidden h-20 bg-white border-b border-slate-200 items-center px-4 gap-3 shrink-0 shadow-sm z-50 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 pr-3 border-r border-slate-100 shrink-0">
          <div className="relative w-8 h-8 flex shrink-0">
             <div className="absolute inset-0 bg-gradient-to-b from-red-600 to-red-800 rounded-lg shadow-md flex items-center justify-center p-[3px]">
                <div className="relative w-full h-full bg-slate-50 rounded-[3px] rounded-tr-[9px] flex flex-col items-center justify-center border border-slate-950 overflow-hidden">
                   <div className="absolute -top-1 -right-1 w-0 h-0 border-b-[10px] border-l-[10px] border-b-transparent border-l-red-700 rotate-180 scale-110" />
                   <span className="font-black text-red-700 text-[8px] tracking-tighter leading-none">JH</span>
                </div>
             </div>
          </div>
          <div className="flex flex-col">
            <span className="text-[14px] font-black text-slate-900 tracking-tighter leading-none">JHEP</span>
          </div>
        </div>

        <div className="flex items-center h-full gap-4 shrink-0">
          {/* BOTÓN GUARDAR PRIORITARIO AL INICIO EN MÓVIL */}
          <button onClick={() => onAction("save")} className="h-11 px-4 bg-emerald-600 text-white font-black rounded-xl flex items-center justify-center gap-2 shadow-lg border-b-2 border-emerald-900 uppercase tracking-widest text-[8px] shrink-0">
             <Download className="w-4 h-4" strokeWidth={4} /> Guardar
          </button>

          {actionGroups.map((group) => (
            <div key={group.name} className="flex flex-col h-full py-1.5 justify-between relative shrink-0">
              <span className="text-[7px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5 pl-1">{group.name}</span>
              <div className="flex items-center gap-1">
                {group.tools.map((tool) => {
                  const Icon = tool.icon;
                  const active = tool.id === "foliar" && isFoliating;
                  return (
                    <button key={tool.id} onClick={() => onAction(tool.id)} className={cn("group flex flex-col items-center justify-center p-1 rounded-[10px] min-w-[50px]", active ? "bg-indigo-600 text-white" : "text-slate-600")}>
                      <div className={cn("p-1.5 rounded-[8px] mb-0.5", active ? "bg-white/20" : tool.bg)}><Icon className={cn("w-3.5 h-3.5", active ? "text-white" : tool.color)} strokeWidth={3} /></div>
                      <span className={cn("text-[7px] font-black uppercase leading-none text-center", active ? "text-white" : "text-slate-500")}>{tool.label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="absolute top-[18px] left-0 right-0 h-px bg-slate-50 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
};
