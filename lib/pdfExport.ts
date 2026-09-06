import { PDFDocument, rgb, degrees, StandardFonts } from "pdf-lib";
import { EditorElement } from "@/types/editor";

// ── Helpers ────────────────────────────────────────────────────────────────

function hexToRgb(hex: string) {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  if (isNaN(n)) return rgb(0, 0, 0);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

function dataUriToBytes(dataUri: string): Uint8Array {
  const base64 = dataUri.split(",")[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// ── Main export ────────────────────────────────────────────────────────────

export async function exportPdf({
  file,
  elements,
  pageRotations,
  deletedPages,
  pageDimensions,
}: {
  file: File;
  elements: EditorElement[];
  pageRotations: Record<number, number>;
  deletedPages: number[];
  pageDimensions: Record<number, { width: number; height: number }>;
}): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();

  let pdfDoc: PDFDocument;
  try {
    pdfDoc = await PDFDocument.load(arrayBuffer, {
      // Allow loading of PDFs with minor errors
      ignoreEncryption: true,
    });
  } catch (err) {
    throw new Error(
      `Could not open PDF for editing: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const timesFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const courierFont = await pdfDoc.embedFont(StandardFonts.Courier);

  const getFont = (family: string) => {
    const l = (family || "").toLowerCase();
    if (l.includes("times") || l.includes("serif")) return timesFont;
    if (l.includes("courier") || l.includes("mono")) return courierFont;
    return helveticaFont;
  };

  const totalPages = pdfDoc.getPageCount();

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    if (deletedPages.includes(pageNum)) continue;

    const pageIndex = pageNum - 1;
    const pdfPage = pdfDoc.getPage(pageIndex);

    // Apply rotation
    const rotationAngle = pageRotations[pageNum] ?? 0;
    if (rotationAngle !== 0) {
      const current = pdfPage.getRotation().angle;
      pdfPage.setRotation(degrees((current + rotationAngle) % 360));
    }

    // Raw PDF page dimensions (in PDF points)
    const pdfW = pdfPage.getWidth();
    const pdfH = pdfPage.getHeight();

    // Rendered canvas dimensions (in CSS pixels at zoom level)
    // If pageDimensions is not available (page not yet scrolled into view),
    // fall back to PDF native size — coordinates will still be correct
    // because text extraction also used scale from the same viewport.
    const rendered = pageDimensions[pageNum];
    const scaleX = rendered ? pdfW / rendered.width : 1;
    const scaleY = rendered ? pdfH / rendered.height : 1;

    const pageElems = elements.filter((el) => el.page === pageNum);

    for (const el of pageElems) {
      try {
        await drawElement(el, pdfPage, pdfW, pdfH, scaleX, scaleY, pdfDoc, getFont);
      } catch (elErr) {
        console.warn(`Skipping element ${el.id} on page ${pageNum}:`, elErr);
      }
    }
  }

  // Remove deleted pages in reverse order to keep indices stable
  const sortedDeleted = [...deletedPages].sort((a, b) => b - a);
  for (const pageNum of sortedDeleted) {
    if (pageNum >= 1 && pageNum <= pdfDoc.getPageCount()) {
      pdfDoc.removePage(pageNum - 1);
    }
  }

  return pdfDoc.save();
}

async function drawElement(
  el: EditorElement,
  pdfPage: ReturnType<PDFDocument["getPage"]>,
  pdfW: number,
  pdfH: number,
  scaleX: number,
  scaleY: number,
  pdfDoc: PDFDocument,
  getFont: (family: string) => ReturnType<PDFDocument["embedFont"]> extends Promise<infer F> ? F : never
) {
  // Convert screen coords → PDF coords
  // Screen: top-left origin, Y grows downward
  // PDF:    bottom-left origin, Y grows upward
  const sx = (v: number) => v * scaleX;
  const sy = (v: number) => v * scaleY;
  const toPdfY = (screenY: number, elH: number) => pdfH - sy(screenY) - sy(elH);

  switch (el.type) {
    case "text": {
      if (!el.text?.trim()) return;

      const font = getFont(el.fontFamily);
      const fontSize = Math.max(4, sy(el.fontSize));
      const color = hexToRgb(el.color);

      // Erase original text area if this is a modified original element
      if (el.isOriginalPdfText && el.originalPosition && el.originalSize) {
        // Only whiteout if text was changed
        if (el.text !== el.originalText) {
          const ox = sx(el.originalPosition.x);
          const ow = sx(el.originalSize.width) + 2;
          const oh = sy(el.originalSize.height) + 2;
          const oy = pdfH - sy(el.originalPosition.y) - oh;

          pdfPage.drawRectangle({
            x: Math.max(0, ox - 1),
            y: Math.max(0, oy - 1),
            width: ow,
            height: oh,
            color: rgb(1, 1, 1),
            opacity: 1,
          });
        }
      }

      const pdfX = sx(el.position.x);
      const lines = el.text.split("\n");
      const lineHeight = fontSize * 1.25;
      // Start Y: top of element
      let currentY = toPdfY(el.position.y, 0) - fontSize;

      for (const line of lines) {
        if (line.trim()) {
          // Clip text to page bounds
          const clampedX = Math.max(0, Math.min(pdfW - 4, pdfX));
          const clampedY = Math.max(0, Math.min(pdfH - fontSize, currentY));
          pdfPage.drawText(line, { x: clampedX, y: clampedY, size: fontSize, font, color });
        }
        currentY -= lineHeight;
      }
      break;
    }

    case "rectangle": {
      pdfPage.drawRectangle({
        x: sx(el.position.x),
        y: toPdfY(el.position.y, el.size.height),
        width: sx(el.size.width),
        height: sy(el.size.height),
        borderColor: hexToRgb(el.strokeColor),
        borderWidth: Math.max(0.5, sx(el.strokeWidth)),
        color: el.fillColor ? hexToRgb(el.fillColor) : undefined,
        opacity: el.fillColor ? 1 : undefined,
      });
      break;
    }

    case "circle": {
      pdfPage.drawEllipse({
        x: sx(el.position.x + el.size.width / 2),
        y: pdfH - sy(el.position.y + el.size.height / 2),
        xScale: sx(el.size.width / 2),
        yScale: sy(el.size.height / 2),
        borderColor: hexToRgb(el.strokeColor),
        borderWidth: Math.max(0.5, sx(el.strokeWidth)),
        color: el.fillColor ? hexToRgb(el.fillColor) : undefined,
      });
      break;
    }

    case "line": {
      pdfPage.drawLine({
        start: { x: sx(el.position.x), y: pdfH - sy(el.position.y) },
        end: {
          x: sx(el.position.x + el.size.width),
          y: pdfH - sy(el.position.y + el.size.height),
        },
        color: hexToRgb(el.strokeColor),
        thickness: Math.max(0.5, sx(el.strokeWidth)),
      });
      break;
    }

    case "highlight": {
      pdfPage.drawRectangle({
        x: sx(el.position.x),
        y: toPdfY(el.position.y, el.size.height),
        width: sx(el.size.width),
        height: sy(el.size.height),
        color: hexToRgb(el.color),
        opacity: el.opacity ?? 0.4,
      });
      break;
    }

    case "draw": {
      const pts = el.points;
      if (!pts || pts.length < 2) return;

      for (let i = 0; i < pts.length - 1; i++) {
        pdfPage.drawLine({
          start: { x: sx(pts[i].x), y: pdfH - sy(pts[i].y) },
          end: { x: sx(pts[i + 1].x), y: pdfH - sy(pts[i + 1].y) },
          color: hexToRgb(el.strokeColor),
          thickness: Math.max(0.5, sx(el.strokeWidth)),
          lineCap: "Round" as any,
        });
      }
      break;
    }

    case "image": {
      if (!el.src) return;

      let embeddedImage;
      const src = el.src;

      if (src.startsWith("data:image/png")) {
        embeddedImage = await pdfDoc.embedPng(dataUriToBytes(src));
      } else if (
        src.startsWith("data:image/jpeg") ||
        src.startsWith("data:image/jpg")
      ) {
        embeddedImage = await pdfDoc.embedJpg(dataUriToBytes(src));
      } else if (src.startsWith("data:image/webp") || src.startsWith("data:image/gif")) {
        // Convert via canvas to PNG
        const img = await new Promise<HTMLImageElement>((res, rej) => {
          const i = new Image();
          i.onload = () => res(i);
          i.onerror = rej;
          i.src = src;
        });
        const cvs = document.createElement("canvas");
        cvs.width = img.naturalWidth;
        cvs.height = img.naturalHeight;
        cvs.getContext("2d")!.drawImage(img, 0, 0);
        const pngDataUrl = cvs.toDataURL("image/png");
        embeddedImage = await pdfDoc.embedPng(dataUriToBytes(pngDataUrl));
      } else {
        // URL — fetch and embed
        const res = await fetch(src);
        const bytes = new Uint8Array(await res.arrayBuffer());
        embeddedImage = await pdfDoc.embedPng(bytes);
      }

      pdfPage.drawImage(embeddedImage, {
        x: sx(el.position.x),
        y: toPdfY(el.position.y, el.size.height),
        width: sx(el.size.width),
        height: sy(el.size.height),
      });
      break;
    }
  }
}

// ── Download helper ────────────────────────────────────────────────────────

export function downloadPdfBlob(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  // Small delay before cleanup so the browser registers the download
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}
