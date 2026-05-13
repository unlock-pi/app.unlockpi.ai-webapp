"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import katex from "katex";
import "katex/dist/katex.min.css";

interface FormulaBlockProps {
  formula: string;
}

export function FormulaBlock({ formula }: FormulaBlockProps) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(formula, {
        displayMode: true,
        throwOnError: false,
        output: "htmlAndMathml",
      });
    } catch {
      return null;
    }
  }, [formula]);

  if (!html) {
    return (
      <div className="my-4 p-3 bg-red-900/20 border border-red-700/30 rounded-lg text-red-300 text-sm font-mono">
        Invalid formula: {formula}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="my-2 flex justify-center [&_.katex]:text-white [&_.katex-html]:text-white"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
