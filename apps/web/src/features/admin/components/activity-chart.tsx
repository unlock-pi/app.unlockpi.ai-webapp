"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  Card,
  CardDescription,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { AdminActivityDay } from "@/features/admin/types/admin-types";

const chartConfig = {
  activeUsers: { label: "Active tutors", color: "var(--primary)" },
} satisfies ChartConfig;

export function ActivityChart({ data }: { data: AdminActivityDay[] }) {
  return (
    <Card className="shadow-xs/5">
      <CardHeader>
        <CardTitle className="text-base">Daily active tutors</CardTitle>
        <CardDescription>Unique tutors who opened the product.</CardDescription>
      </CardHeader>
      <CardPanel className="px-2 pb-3 sm:px-4">
        <ChartContainer config={chartConfig} className="h-56 w-full">
          <AreaChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
            <defs>
              <linearGradient id="activeFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
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
              width={28}
              allowDecimals={false}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              dataKey="activeUsers"
              type="monotone"
              stroke="var(--primary)"
              strokeWidth={2}
              fill="url(#activeFill)"
            />
          </AreaChart>
        </ChartContainer>
      </CardPanel>
    </Card>
  );
}
