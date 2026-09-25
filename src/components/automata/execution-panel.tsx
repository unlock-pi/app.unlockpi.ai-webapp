import { PlayIcon, RotateCcwIcon } from "lucide-react";

import type { AutomatonExecution } from "@/components/automata/model";
import { Button } from "@/components/ui/button";

type ExecutionPanelProps = {
  disabled?: boolean;
  execution: AutomatonExecution;
  onReset: () => void;
  onStep: () => void;
};

export function ExecutionPanel({
  disabled = false,
  execution,
  onReset,
  onStep,
}: ExecutionPanelProps) {
  const terminal = execution.status === "accepted" || execution.status === "rejected";

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Automaton execution controls">
      <Button
        type="button"
        size="sm"
        disabled={disabled || terminal}
        onClick={(event) => { event.stopPropagation(); onStep(); }}
        className="automaton-control"
      >
        <PlayIcon className="size-3.5" />
        Step
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={(event) => { event.stopPropagation(); onReset(); }}
        className="automaton-control"
      >
        <RotateCcwIcon className="size-3.5" />
        Reset
      </Button>
      <span
        role="status"
        className="min-w-16 text-xs font-semibold capitalize text-muted-foreground"
      >
        {execution.status}
      </span>
    </div>
  );
}
