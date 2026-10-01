"use client";

import { useEffect, useId, useRef, useState } from "react";
import { mermaid } from "@streamdown/mermaid";
import { useTheme } from "next-themes";

type MermaidPreviewProps = {
  code: string;
  /**
   * Fired when Mermaid rejects the code. The parent uses this to ask the API
   * to repair it — this is what keeps broken diagrams off the screen.
   */
  onInvalid?: (error: string) => void;
};

export function MermaidPreview({ code, onInvalid }: MermaidPreviewProps) {
  const reactId = useId();
  const renderId = `mermaid-${reactId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const { resolvedTheme } = useTheme();
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  // Keep the callback in a ref so re-renders don't retrigger the effect.
  const onInvalidRef = useRef(onInvalid);
  onInvalidRef.current = onInvalid;

  useEffect(() => {
    let cancelled = false;

    async function render() {
      setFailed(false);
      try {
        const instance = mermaid.getMermaid({
          startOnLoad: false,
          securityLevel: "strict",
          theme: resolvedTheme === "light" ? "default" : "dark",
        });
        // render() parses first and throws on bad syntax — that's our gate.
        const { svg: rendered } = await instance.render(renderId, code);
        if (!cancelled) {
          setSvg(rendered);
        }
      } catch (error) {
        if (cancelled) return;
        // Mermaid leaves a stray error node behind when it fails to parse.
        document.getElementById(renderId)?.remove();
        document.getElementById(`d${renderId}`)?.remove();
        setFailed(true);
        setSvg(null);
        onInvalidRef.current?.(
          error instanceof Error ? error.message : "Invalid diagram syntax.",
        );
      }
    }

    void render();
    return () => {
      cancelled = true;
    };
  }, [code, renderId, resolvedTheme]);

  if (failed) {
    return (
      <div className="grid place-items-center rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-muted-foreground">
        This diagram didn&apos;t render. Trying to repair it...
      </div>
    );
  }

  if (!svg) {
    return <div className="h-48 animate-pulse rounded-xl bg-muted" />;
  }

  return (
    <div
      className="flex justify-center overflow-x-auto rounded-xl border bg-card p-4 [&_svg]:h-auto [&_svg]:max-w-full"
      // Mermaid output is sanitised by its own strict security level.
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
