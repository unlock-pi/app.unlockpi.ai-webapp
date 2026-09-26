import type { GrammarTransformationStep } from "@/components/context-free-grammar/types";
import { ProductionTable } from "@/components/context-free-grammar/production-table";

/** Optional visual contract for future transformations; no transformation logic. */
export function GrammarTransformation({ step }: { step: GrammarTransformationStep | null }) {
  if (!step) return null;
  return <section aria-label="Grammar transformation" className="grid gap-3 sm:grid-cols-[1fr_auto_1fr]">
    <div><h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Original</h3><ProductionTable grammar={step.before} /></div>
    <span className="self-center text-center text-primary" aria-label={step.label}>→</span>
    <div><h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Result</h3><ProductionTable grammar={step.after} highlightedProductionIds={step.highlightedProductionIds} /></div>
  </section>;
}
