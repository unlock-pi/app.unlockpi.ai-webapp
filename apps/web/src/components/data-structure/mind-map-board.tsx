"use client";

type MindMapBoardProps = {
  center: string;
  branches: Array<{ label: string; detail: string }>;
};

export function MindMapBoard({ center, branches }: MindMapBoardProps) {
  return (
    <div className="grid gap-3 md:grid-cols-[180px_1fr] md:items-center">
      <div className="rounded-lg border border-primary/30 bg-primary/10 p-4 text-center font-semibold">
        {center}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {branches.map((branch, index) => (
          <div
            key={`${branch.label}-${index}`}
            className="rounded-lg border border-border bg-background/65 p-3 shadow-xs"
          >
            <p className="font-medium">{branch.label}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {branch.detail}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
