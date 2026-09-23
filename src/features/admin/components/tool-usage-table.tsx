import {
  Card,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card";
import { formatCost, formatNumber } from "@/features/admin/lib/format";
import type { AdminToolRollup } from "@/features/admin/types/admin-types";

/**
 * One rollup, as a table — used for tools, tutors and teachers alike.
 *
 * Server-rendered on purpose: this is a read-only admin report, so there is
 * nothing to interact with and no reason to ship a table library to the
 * browser for it.
 */
export function ToolUsageTable({
  rows,
  title,
  label,
  emptyLabel,
  total,
}: {
  rows: AdminToolRollup[];
  title: string;
  /** Column heading for the grouping key: "Tool", "Tutor", "Teacher". */
  label: string;
  emptyLabel: string;
  /** Total attributed cost, for the share column. */
  total: number;
}) {
  return (
    <Card className="shadow-xs/5">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardPanel>
        {rows.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">{label}</th>
                  <th className="py-2 pr-3 text-right font-medium">Calls</th>
                  <th className="py-2 pr-3 text-right font-medium">Failed</th>
                  <th className="py-2 pr-3 text-right font-medium">Avg time</th>
                  <th className="py-2 pr-3 text-right font-medium">Tokens</th>
                  <th className="py-2 pr-3 text-right font-medium">Cost</th>
                  <th className="py-2 text-right font-medium">Share</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key} className="border-b border-border/50 last:border-0">
                    <td className="py-2 pr-3">
                      <span className="font-mono text-xs">{row.key}</span>
                      {row.unpriced > 0 ? (
                        <span
                          className="ml-2 text-xs text-muted-foreground"
                          title="These calls happened inside a response whose token usage was never recorded, so their cost is unknown — not zero."
                        >
                          {row.unpriced} unpriced
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {formatNumber(row.calls)}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {row.failures === 0 ? (
                        <span className="text-muted-foreground">0</span>
                      ) : (
                        <span className="text-warning">{formatNumber(row.failures)}</span>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">
                      {formatDuration(row.averageDurationMs)}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">
                      {row.unpriced === row.calls ? "—" : formatNumber(Math.round(row.tokens))}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {/*
                        Nothing in this group could be priced, so the money is
                        unknown. Showing $0.0000 here would read as "this tool
                        is free", which is the one wrong answer.
                      */}
                      {formatCost(row.unpriced === row.calls ? null : row.costUsd)}
                    </td>
                    <td className="py-2 text-right tabular-nums text-muted-foreground">
                      {total > 0 ? `${((row.costUsd / total) * 100).toFixed(1)}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardPanel>
    </Card>
  );
}

function formatDuration(ms: number) {
  if (ms < 1) return "0ms";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}
