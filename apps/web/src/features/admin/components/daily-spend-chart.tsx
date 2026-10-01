"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  Card,
  CardDescription,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatCost } from "@/features/admin/lib/format";
import type { DailySpendPoint } from "@/features/admin/lib/spend-series";

const chartConfig = {
  realtimeCost: { label: "Realtime", color: "var(--chart-1)" },
  visualsCost: { label: "Visuals", color: "var(--chart-3)" },
} satisfies ChartConfig;

/** Stacked realtime + visuals daily spend — hover a bar to see that day's total. */
export function DailySpendChart({
  data,
  title = "Daily spend",
  description,
}: {
  data: DailySpendPoint[];
  title?: string;
  description?: string;
}) {
  const hasCost = data.some((point) => point.totalCost > 0);

  return (
    <Card className="shadow-xs/5">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardPanel className="px-2 pb-3 sm:px-4">
        {hasCost ? (
          <ChartContainer config={chartConfig} className="h-56 w-full">
            <BarChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value: string) =>
                  new Date(value).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })
                }
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={48}
                tickFormatter={(value: number) => formatCost(value)}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) =>
                      new Date(value as string).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })
                    }
                    formatter={(value, name) => (
                      <div className="flex w-full items-center justify-between gap-4">
                        <span className="text-muted-foreground">
                          {chartConfig[name as keyof typeof chartConfig]?.label ??
                            String(name)}
                        </span>
                        <span className="font-medium tabular-nums text-foreground">
                          {formatCost(Number(value))}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <Bar
                dataKey="realtimeCost"
                stackId="cost"
                fill="var(--color-realtimeCost)"
              />
              <Bar
                dataKey="visualsCost"
                stackId="cost"
                fill="var(--color-visualsCost)"
                radius={[3, 3, 0, 0]}
              />
              <ChartLegend content={<ChartLegendContent />} />
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="grid h-56 place-items-center text-center">
            <p className="text-sm text-muted-foreground">
              No spend recorded in this range.
            </p>
          </div>
        )}
      </CardPanel>
    </Card>
  );
}
