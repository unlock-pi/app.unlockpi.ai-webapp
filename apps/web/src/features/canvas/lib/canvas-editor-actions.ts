import type { CanvasDocument, CanvasTemplateKey } from "@/features/canvas/types/canvas-types";

type SaveCanvasDraftArgs = {
  activeCanvasId: string;
  activeFrameId: string | null;
  document: CanvasDocument;
  templateKey: CanvasTemplateKey | null;
  title: string;
  topic: string | null;
};

export async function saveCanvasDraft({
  activeCanvasId,
  activeFrameId,
  document,
  templateKey,
  title,
  topic,
}: SaveCanvasDraftArgs) {
  const response = await fetch(`/api/canvas/${activeCanvasId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      activeFrameId,
      document,
      templateKey,
      title,
      topic,
    }),
  });

  const result = (await response.json().catch(() => null)) as {
    canvas?: {
      id: string;
      is_public?: boolean | null;
      project_id?: string | null;
      share_slug?: string | null;
      status?: string | null;
      subject?: string | null;
      template_key?: string | null;
      title: string;
      topic?: string | null;
      updated_at?: string | null;
    };
    error?: string;
  } | null;

  return { response, result };
}

export async function createPublicCanvasLink(activeCanvasId: string) {
  const response = await fetch(`/api/canvas/${activeCanvasId}`, {
    method: "POST",
  });
  const result = (await response.json().catch(() => null)) as {
    canvas?: { is_public: boolean; share_slug: string };
    error?: string;
  } | null;

  return { response, result };
}

export async function copyTextToClipboard(value: string) {
  await navigator.clipboard.writeText(value);
}

function getSafePdfFilename(title: string) {
  return `${title
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase() || "canvas-export"}.pdf`;
}

function getCanvasBackground(element: HTMLElement, fallback: string) {
  const background = window.getComputedStyle(element).backgroundColor;

  return background && background !== "rgba(0, 0, 0, 0)"
    ? background
    : fallback;
}

export async function downloadCanvasPreviewAsPdf({
  bodyBackground = "#edf0f5",
  frameSelector = ".canvas-preview-pane [id^='canvas-slide-'] > section",
  previewSelector,
  title,
}: {
  bodyBackground?: string;
  frameSelector?: string;
  previewSelector: string;
  title: string;
}) {
  const previewElement = window.document.querySelector(
    previewSelector,
  ) as HTMLElement | null;

  if (!previewElement) {
    return;
  }

  const frameElements = Array.from(
    window.document.querySelectorAll(frameSelector),
  ).filter((element): element is HTMLElement => element instanceof HTMLElement);
  const exportElements = frameElements.length ? frameElements : [previewElement];
  const [{ toPng }, { jsPDF }] = await Promise.all([
    import("html-to-image"),
    import("jspdf"),
  ]);
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "a4",
  });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const scale = Math.min(Math.max(window.devicePixelRatio || 1, 1.5), 2);

  for (const [index, element] of exportElements.entries()) {
    const imageData = await toPng(element, {
      backgroundColor: getCanvasBackground(element, bodyBackground),
      cacheBust: true,
      height: element.scrollHeight,
      pixelRatio: scale,
      skipAutoScale: true,
      style: {
        transform: "none",
        transformOrigin: "top left",
      },
      width: element.scrollWidth,
    });
    const imageRatio = element.scrollWidth / element.scrollHeight;
    const pageRatio = pageWidth / pageHeight;
    const imageWidth =
      imageRatio > pageRatio ? pageWidth : pageHeight * imageRatio;
    const imageHeight =
      imageRatio > pageRatio ? pageWidth / imageRatio : pageHeight;
    const offsetX = (pageWidth - imageWidth) / 2;
    const offsetY = (pageHeight - imageHeight) / 2;

    if (index > 0) {
      pdf.addPage("a4", "landscape");
    }

    pdf.addImage(imageData, "PNG", offsetX, offsetY, imageWidth, imageHeight);
  }

  pdf.save(getSafePdfFilename(title));
}
