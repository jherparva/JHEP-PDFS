import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Layers, Zap, HelpCircle, Grid3X3, 
  MousePointerClick, ChevronDown, MousePointer2, 
  Trash2, RotateCw, Save, Scan, Command, Search, Archive, Eye, Download, Users, ShieldCheck, FolderPlus, Settings2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: {
    autoNumber: boolean;
    autoClear: boolean;
    highQuality: boolean;
    theme: 'classic' | 'modern';
  };
  setSettings: React.Dispatch<React.SetStateAction<{
    autoNumber: boolean;
    autoClear: boolean;
    highQuality: boolean;
    theme: 'classic' | 'modern';
  }>>;
  gridColumns: number;
  setGridColumns: (n: number) => void;
}

const helpSteps = [
  {
    title: "Biblioteca Inteligente",
    icon: Archive,
    color: "text-emerald-500",
    bg: "bg-emerald-50",
    desc: "Carga archivos y fotos sin saturar tu espacio.",
    details: "Doble clic carga el archivo completo a la mesa. Admite PDFs e imágenes (PNG/JPG) que se convierten en hojas automáticamente. Los archivos marcados en verde ya han sido usados."
  },
  {
    title: "Acciones Masivas de Mesa",
    icon: Grid3X3,
    color: "text-blue-500",
    bg: "bg-blue-50",
    desc: "Gestión avanzada de la mesa de trabajo.",
    details: "Usa 'Marcar Todo' o Ctrl+A para seleccionar todo el contenido de la mesa. Puedes rotar, duplicar o eliminar lotes completos de hojas. Ajusta el número de columnas (4-7) para ver más contenido sin scroll."
  },
  {
    title: "Secuencia Maestra (Ctrl+Clic)",
    icon: MousePointerClick,
    color: "text-amber-500",
    bg: "bg-amber-50",
    desc: "Define el orden exacto de salida (1, 2, 3...).",
    details: "Mantén presionado Ctrl y haz clic en las páginas según el orden que desees. El sistema marcará números de secuencia (1, 2, 3...). Pulsa el botón 'Confirmar Orden' en la Ribbon para reorganizar la mesa automáticamente según esa secuencia."
  },
  {
    title: "Bandeja Virtual y Salida",
    icon: FolderPlus,
    color: "text-violet-500",
    bg: "bg-violet-50",
    desc: "Exportación flexible de múltiples documentos.",
    details: "Guarda selecciones parciales en la 'Bandeja Virtual' para crear nuevos PDFs más tarde. Desde la bandeja puedes descargar todo en un ZIP empaquetado o intentar guardarlos directamente en una carpeta de tu sistema (según permisos del navegador)."
  },
  {
    title: "Seguridad y Multiusuario",
    icon: ShieldCheck,
    color: "text-slate-900",
    bg: "bg-slate-100",
    desc: "Privacidad absoluta y trabajo independiente.",
    details: "JHEP es lo que llamamos una 'Aplicación Client-Side'. Todo el procesamiento ocurre en la memoria RAM de tu propio navegador. Esto significa que si 100 personas entran a la vez, el trabajo de cada una es 100% independiente y nunca se mezclará con el de los demás. No enviamos tus archivos a ningún servidor."
  }
];

const shortcuts = [
  { keys: ["Ctrl", "S"], action: "Guardar PDF principal", icon: Save },
  { keys: ["Ctrl", "A"], action: "Seleccionar todas las hojas", icon: Command },
  { keys: ["Ctrl", "Z"], action: "Deshacer último cambio", icon: RotateCw },
  { keys: ["Ctrl", "P"], action: "Imprimir selección", icon: Zap },
  { keys: ["R"], action: "Rotar hojas seleccionadas", icon: RotateCw },
  { keys: ["V"], action: "Ver selección en el visor", icon: Eye },
  { keys: ["Supr"], action: "Eliminar hojas seleccionadas", icon: Trash2 },
  { keys: ["Esc"], action: "Limpiar toda la selección", icon: X },
];

export const HelpModal = ({ isOpen, onClose, settings, setSettings, gridColumns, setGridColumns }: HelpModalProps) => {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          className="fixed inset-0 z-[600] bg-slate-950/40 backdrop-blur-xl flex items-center justify-center p-4 md:p-6"
          onClick={onClose}
        >
          <motion.div 
            initial={{ scale: 0.9, y: 50, opacity: 0 }} 
            animate={{ scale: 1, y: 0, opacity: 1 }} 
            exit={{ scale: 0.9, y: 50, opacity: 0 }}
            className="bg-white rounded-[40px] w-full max-w-6xl h-[90vh] overflow-hidden shadow-4xl flex flex-col relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-2 w-full bg-slate-900" />
            
            <div className="p-8 md:p-12 flex flex-col h-full overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-5">
                   <div className="w-16 h-16 bg-slate-900 rounded-[24px] flex items-center justify-center text-white shadow-xl">
                      <HelpCircle size={32} strokeWidth={2.5} />
                   </div>
                   <div className="flex flex-col">
                      <h2 className="text-4xl font-black text-slate-900 leading-none tracking-tighter uppercase italic">Manual JHEP</h2>
                      <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] mt-3">Elite Professional Suite v5.1</span>
                   </div>
                </div>
                <button 
                  onClick={onClose}
                  className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all flex items-center justify-center border border-slate-100"
                >
                  <X size={24} strokeWidth={3} />
                </button>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">
                <div className="xl:col-span-2 flex flex-col gap-8">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between pl-2 mb-4">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Indice de Funciones y Capacidades</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {helpSteps.map((step, idx) => {
                        const Icon = step.icon;
                        const isExpanded = expandedIdx === idx;
                        return (
                          <div 
                            key={step.title}
                            className={cn(
                              "group rounded-[32px] border transition-all duration-500 overflow-hidden cursor-pointer",
                              isExpanded ? "bg-white border-slate-200 shadow-xl ring-8 ring-slate-50 relative z-10" : "bg-slate-50/50 border-transparent hover:border-slate-100"
                            )}
                            onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                          >
                            <div className="p-6 flex items-center gap-5">
                              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all", step.bg, step.color, isExpanded && "scale-110 shadow-lg shadow-slate-200")}>
                                 <Icon size={28} strokeWidth={2.5} />
                              </div>
                              <div className="flex-1 flex flex-col justify-center text-left leading-tight">
                                 <span className="text-[13px] font-black text-slate-900 uppercase tracking-tight">{step.title}</span>
                                 <p className="text-[10px] font-bold text-slate-400 leading-tight mt-1 truncate group-hover:whitespace-normal">{step.desc}</p>
                              </div>
                              <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} className="text-slate-200 group-hover:text-slate-400">
                                 <ChevronDown size={20} />
                              </motion.div>
                            </div>
                            
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-6 pb-8">
                                  <div className="pt-4 border-t border-slate-50">
                                    <p className="text-[11px] font-bold text-slate-600 leading-relaxed bg-slate-50 p-5 rounded-2xl border border-slate-100 italic transition-colors">
                                      {step.details}
                                    </p>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-8 bg-slate-50 rounded-[40px] border border-slate-100">
                     <div className="flex items-center gap-4 mb-8">
                       <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white"><Settings2 size={24} strokeWidth={2.5} /></div>
                       <div className="flex flex-col text-left">
                          <span className="text-[11px] font-black text-slate-900 uppercase tracking-tighter">Preferencias del Espacio</span>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Configuración Temporal de Sesión</span>
                       </div>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="flex items-center justify-between md:flex-col md:items-start md:gap-4">
                           <div className="flex flex-col text-left">
                              <span className="text-[10px] font-black text-slate-800 uppercase">Numeración Automática</span>
                              <span className="text-[8px] font-bold text-slate-400 uppercase mt-1">Foliar al cargar</span>
                           </div>
                           <button onClick={() => toggleSetting('autoNumber')} className={cn("w-12 h-6 rounded-full transition-all relative flex items-center px-1", settings.autoNumber ? "bg-emerald-500" : "bg-slate-300")}>
                             <motion.div animate={{ x: settings.autoNumber ? 24 : 0 }} className="w-4 h-4 bg-white rounded-full shadow-sm" />
                           </button>
                        </div>
                        <div className="flex items-center justify-between md:flex-col md:items-start md:gap-4">
                           <div className="flex flex-col text-left">
                              <span className="text-[10px] font-black text-slate-800 uppercase">Limpieza de Biblioteca</span>
                              <span className="text-[8px] font-bold text-slate-400 uppercase mt-1">Vaciar tras carga</span>
                           </div>
                           <button onClick={() => toggleSetting('autoClear')} className={cn("w-12 h-6 rounded-full transition-all relative flex items-center px-1", settings.autoClear ? "bg-emerald-500" : "bg-slate-300")}>
                             <motion.div animate={{ x: settings.autoClear ? 24 : 0 }} className="w-4 h-4 bg-white rounded-full shadow-sm" />
                           </button>
                        </div>
                        <div className="flex items-center justify-between md:flex-col md:items-start md:gap-4">
                           <div className="flex flex-col text-left">
                              <span className="text-[10px] font-black text-slate-800 uppercase">Columnas en Mesa</span>
                              <span className="text-[8px] font-bold text-slate-400 uppercase mt-1">Vista predeterminada</span>
                           </div>
                           <div className="flex gap-1">
                              {[4, 5, 6, 7].map(c => (
                                <button key={c} onClick={() => setGridColumns(c)} className={cn("w-8 h-8 rounded-lg text-[9px] font-black transition-all", gridColumns === c ? "bg-slate-900 text-white shadow-lg" : "bg-white text-slate-400 hover:bg-slate-100")}>{c}</button>
                              ))}
                           </div>
                        </div>
                     </div>
                  </div>
                </div>

                <div className="flex flex-col">
                   <div className="flex items-center justify-between pl-2 mb-6">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Protocolo de Comandos</span>
                     <div className="flex items-center gap-2 px-3 py-1 bg-slate-900 text-[8px] font-black text-white rounded-full uppercase tracking-widest shadow-lg shadow-slate-100"><Zap size={10} className="text-emerald-400" /> Experto</div>
                   </div>
                   <div className="bg-slate-950 rounded-[40px] p-8 shadow-4xl relative overflow-hidden border-2 border-slate-900">
                      <div className="grid gap-5 relative z-10">
                        {shortcuts.map((sh, idx) => (
                          <div key={idx} className="flex items-center justify-between group/sh border-b border-white/5 pb-3 last:border-0 last:pb-0">
                             <div className="flex items-center gap-3">
                               <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 group-hover/sh:text-white transition-colors">
                                 <sh.icon size={16} />
                               </div>
                               <span className="text-[10px] font-black text-slate-500 group-hover/sh:text-slate-200 transition-colors uppercase tracking-tight text-left">{sh.action}</span>
                             </div>
                             <div className="flex gap-1.5 shrink-0">
                               {sh.keys.map(key => (
                                 <kbd key={key} className="px-2 py-1 bg-slate-800 text-white text-[9px] font-black rounded-md border-b-2 border-slate-700 shadow-sm min-w-[30px] text-center">{key}</kbd>
                               ))}
                             </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-8 pt-8 border-t border-white/5 flex flex-col gap-6">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500"><Users size={20} /></div>
                           <p className="text-[10px] font-black text-slate-400 uppercase leading-snug text-left tracking-wide">
                              <span className="text-white">Multiusuario:</span> Sesiones 100% aisladas. Varias personas trabajando no cruzan datos.
                           </p>
                        </div>
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500"><ShieldCheck size={20} /></div>
                           <p className="text-[10px] font-black text-slate-400 uppercase leading-snug text-left tracking-wide">
                              <span className="text-white">Seguridad:</span> Tu trabajo vive en RAM local. Nada se envía al servidor.
                           </p>
                        </div>
                      </div>
                   </div>

                   <button 
                     onClick={onClose}
                     className="mt-8 w-full h-16 bg-slate-900 text-white font-black rounded-[28px] uppercase tracking-[0.2em] text-[11px] shadow-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-4 group"
                   >
                     Entendido, empezar
                     <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
                   </button>
                </div>
              </div>

              <div className="mt-16 flex flex-col items-center gap-6 opacity-20 hover:opacity-100 transition-opacity">
                 <div className="flex items-center gap-10 grayscale">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.6em]">Secure Protocol v5</span>
                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.6em]">CloudSync Enabled</span>
                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.6em]">Memory Processing</span>
                 </div>
                 <span className="text-[11px] font-black text-slate-900 uppercase tracking-tighter opacity-40">JHEP TECH ELITE EDITION &copy; 2026</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const ArrowRight = ({ size, className }: { size: number, className: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
  </svg>
);
