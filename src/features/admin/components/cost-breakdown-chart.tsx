"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import {
  Card,
  CardDescription,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card";
import type { AdminRealtimeSession } from "@/features/admin/types/admin-types";

interface CostBreakdownChartProps {
  sessions: AdminRealtimeSession[];
  title?: string;
  breakdownBy?: "model" | "source";
}

export function CostBreakdownChart({
  sessions,
  title = "Cost Breakdown",
  breakdownBy = "model",
}: CostBreakdownChartProps) {
  const data = breakdownBy === "model"
    ? getModelBreakdown(sessions)
    : getSourceBreakdown(sessions);

  const totalCost = data.reduce((sum, item) => sum + item.cost, 0);
  const colors = [
    "var(--primary)",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#ec4899",
    "#14b8a6",
    "#6366f1",
  ];

  if (data.length === 0 || totalCost === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            Spend distribution by {breakdownBy === "model" ? "model" : "source"}
          </CardDescription>
        </CardHeader>
        <CardPanel className="flex items-center justify-center py-16 text-center">
          <div>
            <p className="text-sm text-muted-foreground mb-2">No cost data available</p>
            <p className="text-xs text-muted-foreground">
              Sessions may not have cost tracking enabled or estimated costs configured.
            </p>
          </div>
        </CardPanel>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          Spend distribution by {breakdownBy === "model" ? "model" : "source"}
        </CardDescription>
      </CardHeader>
      <CardPanel className="flex flex-col gap-8 lg:flex-row">
        <div className="flex-1">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ percent = 0 }) => `${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="cost"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 space-y-2">
          {data.map((item, index) => (
            <div key={item.name} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="size-3 rounded-full"
                    style={{ backgroundColor: colors[index % colors.length] }}
                  />
                  <span className="text-sm font-medium">{item.name}</span>
                </div>
                <span className="text-sm font-semibold tabular-nums">
                  {formatCost(item.cost)}
                </span>
              </div>
              <div className="ml-5 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {item.sessions} session{item.sessions !== 1 ? "s" : ""}
                </span>
                <span className="text-xs text-muted-foreground">
                  {((item.cost / totalCost) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          ))}

          <div className="border-t pt-3 mt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Total Cost</span>
              <span className="text-base font-bold tabular-nums">
                {formatCost(totalCost)}
              </span>
            </div>
          </div>
        </div>
      </CardPanel>
    </Card>
  );
}

function getModelBreakdown(sessions: AdminRealtimeSession[]) {
  const breakdown = new Map<
    string,
    { cost: number; sessions: number }
  >();

  for (const session of sessions) {
    if (session.estimatedCostUsd === null) continue;
    const current = breakdown.get(session.model) ?? {
      cost: 0,
      sessions: 0,
    };
    current.cost += session.estimatedCostUsd;
    current.sessions += 1;
    breakdown.set(session.model, current);
  }

  // If no cost data, return empty array (empty state will be shown)
  if (breakdown.size === 0) {
    return [];
  }

  return Array.from(breakdown.entries())
    .map(([name, data]) => ({
      name,
      cost: data.cost,
      sessions: data.sessions,
    }))
    .sort((a, b) => b.cost - a.cost);
}

function getSourceBreakdown(sessions: AdminRealtimeSession[]) {
  const breakdown = new Map<
    string,
    { cost: number; sessions: number }
  >();

  for (const session of sessions) {
    if (session.estimatedCostUsd === null) continue;
    const source = session.source;
    const current = breakdown.get(source) ?? {
      cost: 0,
      sessions: 0,
    };
    current.cost += session.estimatedCostUsd;
    current.sessions += 1;
    breakdown.set(source, current);
  }

  return Array.from(breakdown.entries())
    .map(([name, data]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      cost: data.cost,
      sessions: data.sessions,
    }))
    .sort((a, b) => b.cost - a.cost);
}

function formatCost(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value < 1 ? 4 : 2,
    maximumFractionDigits: value < 1 ? 4 : 2,
  }).format(value);
}
