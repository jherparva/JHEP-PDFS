// import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';
// import { createWorker } from 'tesseract.js';
import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";

/**
 * PDF Engine para manipular archivos en el navegador
 */
export class PDFEngine {
  /**
   * Une múltiples PDFs en uno solo
   */
  static async mergePDFs(pdfBlobs: Blob[]): Promise<Blob> {
    const mergedPdf = await PDFDocument.create();
    for (const blob of pdfBlobs) {
      const pdfBytes = await blob.arrayBuffer();
      const pdf = await PDFDocument.load(pdfBytes);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }
    const mergedPdfBytes = await mergedPdf.save();
    return new Blob([mergedPdfBytes as any], { type: "application/pdf" });
  }

  /**
   * Extrae páginas específicas de un PDF
   */
  static async splitPDF(pdfBlob: Blob, pageIndices: number[]): Promise<Blob> {
    const pdfBytes = await pdfBlob.arrayBuffer();
    const pdf = await PDFDocument.load(pdfBytes);
    const newPdf = await PDFDocument.create();
    const copiedPages = await newPdf.copyPages(pdf, pageIndices);
    copiedPages.forEach((page) => newPdf.addPage(page));
    const newPdfBytes = await newPdf.save();
    return new Blob([newPdfBytes as any], { type: "application/pdf" });
  }

  /**
   * Rotar una página específica
   */
  static async rotatePage(pdfBlob: Blob, pageIndex: number, degreesNum: number): Promise<Blob> {
    const pdfBytes = await pdfBlob.arrayBuffer();
    const pdf = await PDFDocument.load(pdfBytes);
    const page = pdf.getPage(pageIndex);
    const currentRotation = page.getRotation().angle;
    page.setRotation(degrees((currentRotation + degreesNum) % 360));
    const modifiedBytes = await pdf.save();
    return new Blob([modifiedBytes as any], { type: "application/pdf" });
  }

  /**
   * Conversión de PDF a Word (DESHABILITADO POR AHORA)
   * El código completo se encuentra en CONVERSION_LOGIC_FINAL.md
   */
  static async convertPdfToDocxClient(
    pdfBlob: Blob,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    throw new Error("Módulo de conversión deshabilitado temporalmente. Ver CONVERSION_LOGIC_FINAL.md");
  }
}
