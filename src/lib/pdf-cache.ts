import { PDFDocument } from "pdf-lib";

// Maps to store cached PDF objects and rendered thumbnails
const pdfjsDocCache = new Map<Blob | string, Promise<any>>();
const pdfLibDocCache = new Map<Blob | string, Promise<PDFDocument>>();
const thumbnailImageCache = new Map<string, string>(); // key -> dataUrl

/**
 * Gets a cached pdfjs Document object for a given Blob (Browser-only)
 */
export async function getPDFJSDocument(blob: Blob): Promise<any> {
  if (typeof window === "undefined") return null;

  if (pdfjsDocCache.has(blob)) {
    return pdfjsDocCache.get(blob)!;
  }

  const promise = (async () => {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
    const data = await blob.arrayBuffer();
    return await pdfjsLib.getDocument({ data }).promise;
  })();

  pdfjsDocCache.set(blob, promise);
  return promise;
}

/**
 * Gets a cached pdf-lib PDFDocument object for a given Blob
 */
export async function getPDFLibDocument(blob: Blob): Promise<PDFDocument> {
  if (pdfLibDocCache.has(blob)) {
    return pdfLibDocCache.get(blob)!;
  }

  const promise = (async () => {
    const data = await blob.arrayBuffer();
    return await PDFDocument.load(data);
  })();

  pdfLibDocCache.set(blob, promise);
  return promise;
}

/**
 * Renders a PDF page to a Data URL string with caching
 */
export async function renderPageToDataUrl(
  blob: Blob,
  pageNumber: number,
  rotation: number = 0,
  scale: number = 0.4
): Promise<string> {
  if (typeof window === "undefined") return "";

  // Unique cache key
  const blobId = (blob as any)._id || blob.size + "_" + blob.type;
  const cacheKey = `${blobId}_p${pageNumber}_r${rotation}_s${scale}`;

  if (thumbnailImageCache.has(cacheKey)) {
    return thumbnailImageCache.get(cacheKey)!;
  }

  try {
    const pdfDoc = await getPDFJSDocument(blob);
    if (!pdfDoc) return "";
    
    const safePageNum = Math.min(Math.max(1, pageNumber), pdfDoc.numPages);
    const page = await pdfDoc.getPage(safePageNum);

    const viewport = page.getViewport({ scale, rotation });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const context = canvas.getContext("2d");
    if (context) {
      // @ts-ignore
      await page.render({ canvasContext: context, viewport }).promise;
      const dataUrl = canvas.toDataURL("image/webp", 0.85);
      
      // Limit cache size to 500 thumbnails to avoid RAM bloat
      if (thumbnailImageCache.size > 500) {
        const firstKey = thumbnailImageCache.keys().next().value;
        if (firstKey) thumbnailImageCache.delete(firstKey);
      }

      thumbnailImageCache.set(cacheKey, dataUrl);
      return dataUrl;
    }
  } catch (err) {
    console.error("Error rendering thumbnail data URL:", err);
  }

  return "";
}

/**
 * Clear cache when files are removed or updated
 */
export function clearPDFCache() {
  pdfjsDocCache.clear();
  pdfLibDocCache.clear();
  thumbnailImageCache.clear();
}
