import type { AutomatonExecution } from "@/packages/blocks/automata/model";
import { ExecutionControls } from "@/components/toc/shared/execution-controls";
import { Button } from "@/components/ui/button";

type ExecutionPanelProps = {
  disabled?: boolean;
  execution: AutomatonExecution;
  onReset: () => void;
  onRun?: () => void;
  onStep: () => void;
};

/** Backward-compatible automata wrapper around shared TOC playback controls. */
export function ExecutionPanel({
  disabled = false,
  execution,
  onReset,
  onRun,
  onStep,
}: ExecutionPanelProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ExecutionControls
        ariaLabel="Automaton execution controls"
        className="automaton-control flex flex-wrap items-center gap-2"
        disabled={disabled}
        terminal={
          execution.status === "accepted" || execution.status === "rejected"
        }
        status={execution.status}
        onReset={onReset}
        onStep={onStep}
      />
      {onRun ? (
        <Button
          type="button"
          size="sm"
          disabled={
            disabled ||
            execution.status === "accepted" ||
            execution.status === "rejected"
          }
          onClick={(event) => {
            event.stopPropagation();
            onRun();
          }}
        >
          Run
        </Button>
      ) : null}
    </div>
  );
}
