import type { AutomatonExecution } from "@/components/automata/model";
import { ExecutionControls } from "@/components/toc/shared/execution-controls";

type ExecutionPanelProps = {
  disabled?: boolean;
  execution: AutomatonExecution;
  onReset: () => void;
  onStep: () => void;
};

/** Backward-compatible automata wrapper around shared TOC playback controls. */
export function ExecutionPanel({ disabled = false, execution, onReset, onStep }: ExecutionPanelProps) {
  return (
    <ExecutionControls
      ariaLabel="Automaton execution controls"
      className="automaton-control flex flex-wrap items-center gap-2"
      disabled={disabled}
      terminal={execution.status === "accepted" || execution.status === "rejected"}
      status={execution.status}
      onReset={onReset}
      onStep={onStep}
    />
  );
}
