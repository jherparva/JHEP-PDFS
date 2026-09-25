import { useState } from 'react';
import { usePDFStore } from '@/store/pdf-store';
import { toast } from 'sonner';
import { PDFEngine } from '@/lib/pdf-engine';

/**
 * Hook para procesar OCR y Conversión a Word
 */
export const useOCR = () => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const { addToConversionQueue, updateConversionProgress, removeFromConversionQueue } = usePDFStore();

    /**
     * Convierte un PDF a Word directamente en el cliente con OCR (DESHABILITADO)
     */
    const convertToWord = async (pdfBlob: Blob, fileName: string) => {
        toast.info("Función de conversión en mantenimiento.");
        return null;
        /*
        setIsProcessing(true);
        setProgress(0);
        const jobId = Math.random().toString(36).substring(7);
        addToConversionQueue(jobId, fileName);

        try {
            const docxBlob = await PDFEngine.convertPdfToDocxClient(pdfBlob, (p) => {
                setProgress(p);
                updateConversionProgress(jobId, p);
            });
            // ... resto del código ...
        } catch (error) {
            toast.error(`Error convirtiendo ${fileName}`);
            return null;
        } finally {
            setIsProcessing(false);
            setProgress(0);
        }
        */
    };

    return { convertToWord, isProcessing, progress };
};
