import type { Automaton, AutomatonExecution } from "@/components/automata/model";
import { isEpsilon } from "@/components/automata/model";
import { cn } from "@/lib/utils";

export function TransitionTable({
  automaton,
  execution,
}: {
  automaton: Automaton;
  execution: AutomatonExecution;
}) {
  const symbols = [
    ...new Set([
      ...automaton.alphabet,
      ...automaton.transitions.flatMap((transition) => transition.symbols),
    ]),
  ];

  return (
    <div className="min-w-0 overflow-x-auto">
      <table className="w-full min-w-[18rem] border-collapse text-left text-sm">
        <thead className="bg-muted/40 text-muted-foreground">
          <tr>
            <th scope="col" className="border-b border-border px-3 py-2 text-xs font-semibold">
              State
            </th>
            {symbols.map((symbol) => (
              <th
                scope="col"
                key={symbol}
                className="border-b border-border px-3 py-2 font-mono text-xs font-semibold"
              >
                {symbol}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {automaton.states.map((state) => (
            <tr
              key={state.id}
              className={cn(
                "border-b border-border/60 last:border-b-0",
                execution.currentStates.includes(state.id) && "bg-primary/10",
              )}
            >
              <th
                scope="row"
                aria-label={`${state.label}${state.initial ? ", initial state" : ""}${state.accepting ? ", accepting state" : ""}`}
                className="whitespace-nowrap px-3 py-2 font-mono font-semibold text-foreground"
              >
                <span aria-hidden="true" className="mr-2 inline-block min-w-4 text-primary">
                  {state.initial ? "→" : ""}
                </span>
                {state.label}
                {state.accepting ? <span aria-hidden="true" className="ml-1 text-primary">◎</span> : null}
              </th>
              {symbols.map((symbol) => {
                const matching = automaton.transitions.filter(
                  (transition) =>
                    transition.from === state.id &&
                    transition.symbols.some((value) =>
                      symbol === "ε" ? isEpsilon(value) : value === symbol,
                    ),
                );
                const targets = [
                  ...new Set(
                    matching.map(
                      (transition) =>
                        automaton.states.find((candidate) => candidate.id === transition.to)
                          ?.label ?? transition.to,
                    ),
                  ),
                ];
                const isTraversed = matching.some((transition) =>
                  execution.activeTransitions.includes(transition.id),
                );
                return (
                  <td
                    key={symbol}
                    className={cn(
                      "px-3 py-2 font-mono text-foreground/80",
                      isTraversed && "bg-primary/10 font-semibold text-primary",
                    )}
                  >
                    {targets.length
                      ? automaton.type === "nfa"
                        ? `{${targets.join(", ")}}`
                        : targets.join(", ")
                      : "—"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
