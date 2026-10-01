"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

import { Card, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { formatCost } from "@/features/admin/lib/format";

export type SpendCategory = {
  label: string;
  group: "Realtime" | "Visuals";
  cost: number;
  count: number;
};

// Tokenized categorical palette — no hardcoded hex (see brand-guideline.md).
const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-3)",
  "var(--chart-2)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function SpendBreakdown({
  categories,
  title = "Spend breakdown",
  emptyLabel = "Costs appear once realtime sessions or visual generations accrue usage.",
}: {
  categories: SpendCategory[];
  title?: string;
  emptyLabel?: string;
}) {
  const withCost = categories.filter((category) => category.cost > 0);
  const total = withCost.reduce((sum, category) => sum + category.cost, 0);

  if (withCost.length === 0 || total === 0) {
    return (
      <Card className="shadow-xs/5">
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardPanel className="grid place-items-center py-14 text-center">
          <div>
            <p className="text-sm text-muted-foreground">No cost recorded yet.</p>
            <p className="mt-1 text-xs text-muted-foreground">{emptyLabel}</p>
          </div>
        </CardPanel>
      </Card>
    );
  }

  return (
    <Card className="shadow-xs/5">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardPanel className="flex flex-col gap-6 lg:flex-row lg:items-center">
        <div className="mx-auto w-full max-w-56 shrink-0">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={withCost}
                dataKey="cost"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={88}
                paddingAngle={2}
                strokeWidth={0}
              >
                {withCost.map((category, index) => (
                  <Cell
                    key={category.label}
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 space-y-2.5">
          {withCost.map((category, index) => (
            <div key={category.label} className="flex items-center gap-3">
              <span
                className="size-2.5 shrink-0 rounded-[3px]"
                style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{category.label}</p>
                <p className="text-xs text-muted-foreground">
                  {category.group} · {category.count} item
                  {category.count === 1 ? "" : "s"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold tabular-nums">
                  {formatCost(category.cost)}
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {((category.cost / total) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="text-sm font-semibold">Total</span>
            <span className="text-base font-bold tabular-nums">
              {formatCost(total)}
            </span>
          </div>
        </div>
      </CardPanel>
    </Card>
  );
}
