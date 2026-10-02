"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ContextFreeGrammar } from "@/components/context-free-grammar/types";

/** Inspector-only editing; the teaching block itself stays visual and compact. */
export function GrammarEditor({ value, onChange, readOnly = false }: {
  value: ContextFreeGrammar;
  onChange: (value: ContextFreeGrammar) => void;
  readOnly?: boolean;
}) {
  const grammar = value ?? { variables: [], terminals: [], startSymbol: "", productions: [] };
  const update = (patch: Partial<ContextFreeGrammar>) => onChange({ ...grammar, ...patch });
  return <div className="grid gap-3 text-xs">
    <label className="grid gap-1">Variables
      <Input disabled={readOnly} value={grammar.variables.join(" ")} onChange={(event) => update({ variables: event.target.value.split(/\s+/).filter(Boolean) })} />
    </label>
    <label className="grid gap-1">Terminals
      <Input disabled={readOnly} value={grammar.terminals.join(" ")} onChange={(event) => update({ terminals: event.target.value.split(/\s+/).filter(Boolean) })} />
    </label>
    <label className="grid gap-1">Start symbol
      <Input disabled={readOnly} value={grammar.startSymbol} onChange={(event) => update({ startSymbol: event.target.value })} />
    </label>
    <div className="grid gap-2">
      <span className="font-semibold">Productions</span>
      {grammar.productions.map((production, index) => <div key={production.id} className="flex items-center gap-1">
        <Input disabled={readOnly} aria-label={"Left side " + (index + 1)} className="w-14 shrink-0" value={production.lhs} onChange={(event) => update({ productions: grammar.productions.map((item, itemIndex) => itemIndex === index ? { ...item, lhs: event.target.value } : item) })} />
        <span>→</span>
        <Input disabled={readOnly} aria-label={"Right side " + (index + 1)} className="min-w-0 flex-1" placeholder="ε (leave blank)" value={production.rhs.join(" ")} onChange={(event) => update({ productions: grammar.productions.map((item, itemIndex) => itemIndex === index ? { ...item, rhs: event.target.value.trim().split(/\s+/).filter(Boolean) } : item) })} />
        <Button type="button" size="sm" variant="ghost" disabled={readOnly} aria-label={"Remove production " + (index + 1)} onClick={() => update({ productions: grammar.productions.filter((_, itemIndex) => itemIndex !== index) })}>×</Button>
      </div>)}
      <Button type="button" size="sm" variant="outline" disabled={readOnly} onClick={() => {
        const used = new Set(grammar.productions.map((production) => production.id));
        let next = 0;
        while (used.has("p" + next)) next++;
        update({ productions: [...grammar.productions, { id: "p" + next, lhs: grammar.startSymbol, rhs: [] }] });
      }}>Add production</Button>
    </div>
  </div>;
}
