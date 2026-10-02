import { describe, expect, test } from "bun:test";
import type { CanvasDocument } from "@/features/canvas/types/canvas-types";
import {
  describeHiddenAiContext,
  getCanvasPresentationFrames,
  getHiddenAiContextFrames,
  toggleFramePresentationVisibility,
} from "./canvas-presentation";

const document = {
  root: { props: { title: "Lesson", subject: "computer_science", theme: "default", typographyScale: "base", fontFamily: "modern" } },
  content: ["one", "two", "three"].map((id) => ({
    type: "SlideBlock",
    props: { id, title: id, teachingBeat: "explain", content: [] },
  })),
} as unknown as CanvasDocument;

describe("frame presentation visibility", () => {
  test("hidden frames remain editable but are skipped and renumbered in presentation", () => {
    const hidden = toggleFramePresentationVisibility(document, "two");

    expect(getCanvasPresentationFrames(hidden).map((frame) => frame.id)).toEqual(["one", "three"]);
    expect(getCanvasPresentationFrames(hidden).map((frame) => {
      const slide = frame.document.content[0];
      return slide?.type === "SlideBlock" ? slide.props.frameLabel : null;
    })).toEqual(["Frame 1", "Frame 2"]);
    expect(getCanvasPresentationFrames(hidden, { includeHidden: true }).map((frame) => frame.hiddenInPresentation)).toEqual([false, true, false]);
    expect(getCanvasPresentationFrames(document).map((frame) => frame.id)).toEqual(["one", "two", "three"]);
    expect(getCanvasPresentationFrames(toggleFramePresentationVisibility(hidden, "two"))).toHaveLength(3);
  });

  test("all frames can be hidden without changing the saved content", () => {
    const hidden = ["one", "two", "three"].reduce(toggleFramePresentationVisibility, document);
    expect(getCanvasPresentationFrames(hidden)).toEqual([]);
    expect(getCanvasPresentationFrames(hidden, { includeHidden: true })).toHaveLength(3);
  });

  test("only explicitly shared hidden frames enter AI background context", () => {
    const withContent = {
      ...document,
      content: document.content.map((item) => item.type === "SlideBlock" ? {
        ...item,
        props: {
          ...item.props,
          content: [{ type: "BodyTextBlock", props: { id: `${item.props.id}-body`, text: `${item.props.id} secret` } }],
        },
      } : item),
    } as CanvasDocument;
    const hidden = ["two", "three"].reduce(toggleFramePresentationVisibility, withContent);
    const shared = {
      ...hidden,
      content: hidden.content.map((item) => item.type === "SlideBlock" && item.props.id === "two"
        ? { ...item, props: { ...item.props, shareHiddenContextWithAi: true } }
        : item),
    } as CanvasDocument;

    expect(getCanvasPresentationFrames(shared).map((frame) => frame.id)).toEqual(["one"]);
    expect(getHiddenAiContextFrames(shared).map((frame) => frame.id)).toEqual(["two"]);
    expect(describeHiddenAiContext(shared).includes("two secret")).toEqual(true);
    expect(describeHiddenAiContext(shared).includes("three secret")).toEqual(false);
    expect(describeHiddenAiContext(shared).includes("one secret")).toEqual(false);
    const shownAgain = toggleFramePresentationVisibility(shared, "two");
    const hiddenAgain = toggleFramePresentationVisibility(shownAgain, "two");
    expect(getHiddenAiContextFrames(hiddenAgain)).toEqual([]);
  });
});
