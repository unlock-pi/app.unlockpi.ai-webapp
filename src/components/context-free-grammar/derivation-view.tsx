import type { DerivationStep } from "@/components/context-free-grammar/types";
import { cn } from "@/lib/utils";

export function DerivationView({ steps, currentStep = 0, animationKey }: { steps: DerivationStep[]; currentStep?: number; animationKey?: string }) {
  const visible = steps.slice(0, Math.max(0, currentStep) + 1);
  return <ol className="cfg-derivation-list flex min-h-0 flex-col gap-3 overflow-auto pr-1" aria-label="Derivation">
    {visible.map((step, index) => <li key={step.id} style={index === currentStep && index > 0 ? { animation: "cfg-node-reveal 600ms ease-out 600ms both" } : undefined} data-animation-key={index === currentStep ? animationKey : undefined} aria-current={index === currentStep ? "step" : undefined} className="flex min-w-0 items-center gap-2">
      <span aria-hidden="true" className="w-4 shrink-0 text-center text-xs text-muted-foreground">{index ? "↓" : ""}</span>
      <span className={cn("min-w-0 rounded-md px-2 py-1 font-mono text-lg sm:text-xl", index === currentStep && "bg-primary/10 text-primary")}>
        {step.symbols.length ? step.symbols.map((symbol, symbolIndex) => <span key={symbolIndex} className={cn(step.highlightedRange && symbolIndex >= step.highlightedRange.start && symbolIndex < step.highlightedRange.end && "rounded bg-warning/20 text-warning")}>{symbol}</span>) : "ε"}
      </span>
    </li>)}
    {!steps.length ? <li className="px-2 py-2 text-xs text-muted-foreground">No derivation supplied</li> : null}
  </ol>;
}
