import type { ContextFreeGrammar } from "./types";
import { cn } from "@unlockpi/ui";

export function ProductionTable({ grammar, selectedProductionId, highlightedProductionIds = [] }: {
  grammar: ContextFreeGrammar;
  selectedProductionId?: string | null;
  highlightedProductionIds?: string[];
}) {
  return <div className="min-w-0 overflow-x-auto" aria-label="Productions">
    <table className="w-full border-collapse text-left font-mono text-sm">
      <tbody>
        {grammar.productions.map((production) => {
          const selected = selectedProductionId === production.id;
          const highlighted = highlightedProductionIds.includes(production.id);
          return <tr key={production.id} data-production-id={production.id} className={cn("border-b border-border/50 last:border-0", selected && "bg-primary/12 text-primary", highlighted && !selected && "bg-warning/10 text-warning")}>
            <th scope="row" className="w-10 px-2 py-2 font-semibold">{production.lhs}</th>
            <td className="w-6 px-1 py-2 text-muted-foreground">→</td>
            <td className="px-2 py-2">{production.rhs.length ? production.rhs.join(" ") : "ε"}</td>
          </tr>;
        })}
        {!grammar.productions.length ? <tr><td colSpan={3} className="px-2 py-3 text-sm text-muted-foreground">No productions</td></tr> : null}
      </tbody>
    </table>
  </div>;
}
