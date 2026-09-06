import { PDFDocument, rgb, degrees, StandardFonts } from "pdf-lib";
import { EditorElement } from "@/types/editor";

function hexToRgb(hex: string) {
  let cleanHex = hex.replace("#", "");
  if (cleanHex.length === 3) {
    cleanHex = cleanHex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const num = parseInt(cleanHex, 16);
  if (isNaN(num)) return rgb(0, 0, 0);
  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;
  return rgb(r, g, b);
}

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
  const pdfDoc = await PDFDocument.load(arrayBuffer);

  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const timesFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const courierFont = await pdfDoc.embedFont(StandardFonts.Courier);

  const getFont = (family: string) => {
    const lower = family.toLowerCase();
    if (lower.includes("times") || lower.includes("serif")) return timesFont;
    if (lower.includes("courier") || lower.includes("mono")) return courierFont;
    return helveticaFont;
  };

  const totalOriginalPages = pdfDoc.getPageCount();

  for (let pageNum = 1; pageNum <= totalOriginalPages; pageNum++) {
    if (deletedPages.includes(pageNum)) continue;

    const pageIndex = pageNum - 1;
    const pdfPage = pdfDoc.getPage(pageIndex);

    const rotationAngle = pageRotations[pageNum] || 0;
    if (rotationAngle !== 0) {
      const currentRot = pdfPage.getRotation().angle;
      pdfPage.setRotation(degrees((currentRot + rotationAngle) % 360));
    }

    const rendered = pageDimensions[pageNum] || {
      width: pdfPage.getWidth(),
      height: pdfPage.getHeight(),
    };

    const pdfWidth = pdfPage.getWidth();
    const pdfHeight = pdfPage.getHeight();

    const scaleX = pdfWidth / rendered.width;
    const scaleY = pdfHeight / rendered.height;

    const pageElements = elements.filter((el) => el.page === pageNum);

    for (const el of pageElements) {
      if (el.type === "text") {
        if (!el.text || !el.text.trim()) continue;

        // White out original text background if modified original text
        if (el.isOriginalPdfText && el.originalPosition && el.originalSize) {
          const origPdfX = el.originalPosition.x * scaleX;
          const origPdfW = el.originalSize.width * scaleX;
          const origPdfH = el.originalSize.height * scaleY;
          const origPdfY = pdfHeight - (el.originalPosition.y * scaleY) - origPdfH;

          pdfPage.drawRectangle({
            x: origPdfX,
            y: origPdfY,
            width: origPdfW,
            height: origPdfH,
            color: rgb(1, 1, 1),
          });
        }

        const font = getFont(el.fontFamily);
        const fontSize = el.fontSize * scaleY;
        const color = hexToRgb(el.color);

        const pdfX = el.position.x * scaleX;
        const pdfY = pdfHeight - (el.position.y * scaleY) - fontSize;

        const lines = el.text.split("\n");
        let currentY = pdfY;

        for (const line of lines) {
          pdfPage.drawText(line, {
            x: pdfX,
            y: currentY,
            size: fontSize,
            font,
            color,
          });
          currentY -= fontSize * 1.2;
        }
      } else if (el.type === "rectangle") {
        const pdfX = el.position.x * scaleX;
        const pdfWidthEl = el.size.width * scaleX;
        const pdfHeightEl = el.size.height * scaleY;
        const pdfY = pdfHeight - (el.position.y * scaleY) - pdfHeightEl;

        pdfPage.drawRectangle({
          x: pdfX,
          y: pdfY,
          width: pdfWidthEl,
          height: pdfHeightEl,
          borderColor: hexToRgb(el.strokeColor),
          borderWidth: el.strokeWidth * scaleX,
          color: el.fillColor ? hexToRgb(el.fillColor) : undefined,
        });
      } else if (el.type === "circle") {
        const pdfX = (el.position.x + el.size.width / 2) * scaleX;
        const pdfY = pdfHeight - ((el.position.y + el.size.height / 2) * scaleY);
        const rx = (el.size.width / 2) * scaleX;
        const ry = (el.size.height / 2) * scaleY;

        pdfPage.drawEllipse({
          x: pdfX,
          y: pdfY,
          xScale: rx,
          yScale: ry,
          borderColor: hexToRgb(el.strokeColor),
          borderWidth: el.strokeWidth * scaleX,
          color: el.fillColor ? hexToRgb(el.fillColor) : undefined,
        });
      } else if (el.type === "line") {
        const startX = el.position.x * scaleX;
        const startY = pdfHeight - (el.position.y * scaleY);
        const endX = (el.position.x + el.size.width) * scaleX;
        const endY = pdfHeight - ((el.position.y + el.size.height) * scaleY);

        pdfPage.drawLine({
          start: { x: startX, y: startY },
          end: { x: endX, y: endY },
          color: hexToRgb(el.strokeColor),
          thickness: el.strokeWidth * scaleX,
        });
      } else if (el.type === "highlight") {
        const pdfX = el.position.x * scaleX;
        const pdfWidthEl = el.size.width * scaleX;
        const pdfHeightEl = el.size.height * scaleY;
        const pdfY = pdfHeight - (el.position.y * scaleY) - pdfHeightEl;

        pdfPage.drawRectangle({
          x: pdfX,
          y: pdfY,
          width: pdfWidthEl,
          height: pdfHeightEl,
          color: hexToRgb(el.color),
          opacity: el.opacity || 0.35,
        });
      } else if (el.type === "draw") {
        if (!el.points || el.points.length < 2) continue;

        for (let i = 0; i < el.points.length - 1; i++) {
          const pt1 = el.points[i];
          const pt2 = el.points[i + 1];

          pdfPage.drawLine({
            start: {
              x: pt1.x * scaleX,
              y: pdfHeight - (pt1.y * scaleY),
            },
            end: {
              x: pt2.x * scaleX,
              y: pdfHeight - (pt2.y * scaleY),
            },
            color: hexToRgb(el.strokeColor),
            thickness: el.strokeWidth * scaleX,
          });
        }
      } else if (el.type === "image") {
        if (!el.src) continue;

        try {
          let embeddedImage;
          if (el.src.startsWith("data:image/png")) {
            embeddedImage = await pdfDoc.embedPng(el.src);
          } else if (el.src.startsWith("data:image/jpeg") || el.src.startsWith("data:image/jpg")) {
            embeddedImage = await pdfDoc.embedJpg(el.src);
          } else {
            const res = await fetch(el.src);
            const bytes = await res.arrayBuffer();
            embeddedImage = await pdfDoc.embedPng(bytes);
          }

          const pdfX = el.position.x * scaleX;
          const pdfWidthEl = el.size.width * scaleX;
          const pdfHeightEl = el.size.height * scaleY;
          const pdfY = pdfHeight - (el.position.y * scaleY) - pdfHeightEl;

          pdfPage.drawImage(embeddedImage, {
            x: pdfX,
            y: pdfY,
            width: pdfWidthEl,
            height: pdfHeightEl,
          });
        } catch (imgError) {
          console.error("Error embedding image into PDF:", imgError);
        }
      }
    }
  }

  const sortedDeleted = [...deletedPages].sort((a, b) => b - a);
  for (const pageNum of sortedDeleted) {
    if (pageNum >= 1 && pageNum <= pdfDoc.getPageCount()) {
      pdfDoc.removePage(pageNum - 1);
    }
  }

  return await pdfDoc.save();
}

export function downloadPdfBlob(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
