"use client";
import { useMemo, useState } from "react";
import type { AutomatonExecution } from "@/components/automata/model";
import { TransitionDiagram } from "@/components/automata/transition-diagram";
import { ExecutionControls } from "@/components/toc/shared/execution-controls";
import { Button } from "@/components/ui/button";
import {
  createTMExecution,
  simulateTM,
  stepTM,
  tmAsAutomaton,
  type TuringMachine,
  validateTM,
} from "@/features/tm/model-agent";
export function TapeView({
  tape,
  head,
  blank,
}: {
  tape: Record<number, string>;
  head: number;
  blank: string;
}) {
  const start = Math.min(-3, head - 4, ...Object.keys(tape).map(Number));
  const cells = Array.from({ length: 11 }, (_, index) => start + index);
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card p-3">
      <div className="flex min-w-max justify-center gap-1">
        {cells.map((index) => (
          <div key={index} className="relative pt-6">
            <span className="absolute left-1/2 top-0 -translate-x-1/2 text-primary">
              {index === head ? "▼" : ""}
            </span>
            <div
              className={`grid size-11 place-items-center border font-mono ${index === head ? "border-primary bg-primary/10 text-primary" : "border-border"}`}
            >
              {tape[index] ?? blank}
            </div>
            <span className="mt-1 block text-center text-[10px] text-muted-foreground">
              {index}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
export function TMTransitionTable({
  tm,
  active,
}: {
  tm: TuringMachine;
  active?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[36rem] text-left text-sm">
        <thead className="bg-muted/40">
          <tr>
            {["State", "Read", "Next", "Write", "Move"].map((item) => (
              <th key={item} className="px-3 py-2">
                {item}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tm.transitions.map((item) => (
            <tr
              key={item.id}
              className={
                active === item.id
                  ? "bg-primary/10 text-primary"
                  : "border-t border-border"
              }
            >
              <td className="px-3 py-2">{item.from}</td>
              <td>{item.read}</td>
              <td>{item.to}</td>
              <td>{item.write}</td>
              <td>{item.move}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function TMBlock({ tm, input }: { tm: TuringMachine; input: string }) {
  const [execution, setExecution] = useState(() =>
    createTMExecution(tm, input),
  );
  const graph = useMemo(() => tmAsAutomaton(tm), [tm]);
  const valid = validateTM(tm);
  const graphExecution: AutomatonExecution = {
    executionId: `tm-${execution.step}`,
    automatonId: tm.id,
    status: execution.status === "halted" ? "rejected" : execution.status,
    input: execution.input,
    inputIndex: execution.head,
    currentStates: [execution.state],
    activeTransitions: execution.activeTransitionId
      ? [execution.activeTransitionId]
      : [],
    visitedStates: execution.history.map((item) => item.state),
    visitedTransitions: execution.history.flatMap((item) =>
      item.transitionId ? [item.transitionId] : [],
    ),
    stepIndex: execution.step,
    result:
      execution.status === "accepted"
        ? "accepted"
        : execution.status === "rejected"
          ? "rejected"
          : "unknown",
    steps: [],
    transitionPhase: execution.activeTransitionId ? "traveling" : undefined,
  };
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <TransitionDiagram automaton={graph} execution={graphExecution} />
        <div className="flex flex-col justify-between gap-3">
          <TapeView
            tape={execution.tape}
            head={execution.head}
            blank={tm.blank}
          />
          <ExecutionControls
            ariaLabel="TM controls"
            disabled={!valid.valid}
            terminal={["accepted", "rejected", "halted", "error"].includes(
              execution.status,
            )}
            status={execution.status}
            onStep={() => setExecution((current) => stepTM(tm, current))}
            onReset={() => setExecution(createTMExecution(tm, input))}
          />
          <Button onClick={() => setExecution(simulateTM(tm, execution.input))}>
            Run
          </Button>
        </div>
      </div>
      <code className="rounded-md bg-muted px-3 py-2 text-xs">
        ({execution.state}, [
        {Object.entries(execution.tape)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([, value]) => value)
          .join("") || tm.blank}
        ], head {execution.head})
      </code>
      <TMTransitionTable tm={tm} active={execution.activeTransitionId} />
    </section>
  );
}
