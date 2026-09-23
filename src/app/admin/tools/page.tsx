import {
  AlertTriangleIcon,
  CoinsIcon,
  MessageSquareIcon,
  WrenchIcon,
  ZapIcon,
} from "lucide-react";

import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { MetricCard } from "@/features/admin/components/metric-card";
import { RangeFilter } from "@/features/admin/components/range-filter";
import { ToolUsageTable } from "@/features/admin/components/tool-usage-table";
import { getAgentToolUsage } from "@/features/admin/lib/agent-tool-data";
import { formatCost, formatDateTime, formatNumber } from "@/features/admin/lib/format";
import { resolveRangeStart } from "@/features/admin/lib/range";
import {
  attributeToolCosts,
  rollupToolCalls,
  summarizeToolUsage,
} from "@/features/admin/lib/tool-usage";

export const dynamic = "force-dynamic";

const AGENT_LABELS: Record<string, string> = {
  arrays: "Indexa (arrays)",
  stacks: "Pila (stacks)",
  "canvas-copilot": "Canvas co-teacher",
  "course-arrays": "Arrays course tutor",
};

export default async function AdminAgentToolsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range = "30" } = await searchParams;
  const start = resolveRangeStart(range);
  const usage = await getAgentToolUsage(start);

  const { attributed, conversationOnly, unpricedCalls } = attributeToolCosts(
    usage.calls,
    usage.responses,
  );
  const summary = summarizeToolUsage(attributed);

  const byTool = rollupToolCalls(attributed, (call) => call.toolName);
  const byAgent = rollupToolCalls(
    attributed,
    (call) => AGENT_LABELS[call.agent] ?? call.agent,
  );
  const byTeacher = rollupToolCalls(
    attributed,
    (call) => usage.ownerNames.get(call.ownerId) ?? `${call.ownerId.slice(0, 8)}…`,
  );

  const recent = attributed.slice(0, 25);
  const totalSpend = summary.costUsd + conversationOnly.costUsd;

  return (
    <>
      <AdminPageHeader
        title="Agent tools"
        icon={WrenchIcon}
        description="What the tutors spend credits on, call by call."
        action={<RangeFilter value={range} />}
      />

      {usage.tableMissing ? (
        <div className="mb-4 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3">
          <p className="text-sm font-medium text-warning">
            Tool-call tracking is not recording yet.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            The table does not exist in this database. Apply{" "}
            <span className="font-mono">
              supabase/migrations/20260919_agent_tool_calls.sql
            </span>
            , then reload. Nothing else on the admin panel is affected.
          </p>
        </div>
      ) : null}

      <div className="mb-4 rounded-xl border border-border bg-muted/30 px-4 py-3">
        <p className="text-xs text-muted-foreground">
          OpenAI bills per <span className="font-medium">response</span>, never per
          tool call. Each response&apos;s cost is therefore split evenly across the
          tool calls made inside it — these figures are an attribution, not a meter
          reading. A response with no tool calls is counted separately, as
          conversation.
        </p>
      </div>

      {unpricedCalls > 0 ? (
        <div className="mb-4 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3">
          <p className="text-sm font-medium text-warning">
            {formatNumber(unpricedCalls)} call
            {unpricedCalls === 1 ? "" : "s"} could not be priced — the totals below
            are understated.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Their response either recorded no token usage or ran on a model with no
            rate card. They are counted as calls, never as free ones.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={WrenchIcon}
          label="Tool calls"
          value={formatNumber(summary.calls)}
          detail={`${formatNumber(summary.pricedCalls)} of them priced`}
        />
        <MetricCard
          icon={CoinsIcon}
          label="Attributed to tools"
          value={formatCost(summary.costUsd)}
          detail={`${formatNumber(Math.round(summary.tokens))} tokens`}
        />
        <MetricCard
          icon={MessageSquareIcon}
          label="Conversation only"
          value={formatCost(conversationOnly.costUsd)}
          detail={`${formatNumber(conversationOnly.responses)} responses that called no tool`}
        />
        <MetricCard
          icon={ZapIcon}
          label="Average per call"
          value={summary.averageCostUsd === null ? "—" : formatCost(summary.averageCostUsd)}
          detail={`${formatCost(totalSpend)} across both`}
        />
      </div>

      {summary.failures > 0 ? (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm">
          <AlertTriangleIcon className="size-4 text-warning" aria-hidden="true" />
          <span className="text-muted-foreground">
            {formatNumber(summary.failures)} of {formatNumber(summary.calls)} calls
            were refused or failed — every one still cost credits.
          </span>
        </div>
      ) : null}

      <div className="mt-5 grid gap-4">
        <ToolUsageTable
          rows={byTool}
          title="By tool"
          label="Tool"
          total={summary.costUsd}
          emptyLabel="No tool calls recorded in this range."
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <ToolUsageTable
            rows={byAgent}
            title="By tutor"
            label="Tutor"
            total={summary.costUsd}
            emptyLabel="No tool calls recorded in this range."
          />
          <ToolUsageTable
            rows={byTeacher}
            title="By teacher"
            label="Teacher"
            total={summary.costUsd}
            emptyLabel="No tool calls recorded in this range."
          />
        </div>
      </div>

      {recent.length > 0 ? (
        <div className="mt-5 rounded-xl border border-border">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-base font-medium">Latest calls</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2 font-medium">When</th>
                  <th className="px-4 py-2 font-medium">Tool</th>
                  <th className="px-4 py-2 font-medium">Tutor</th>
                  <th className="px-4 py-2 font-medium">Lesson</th>
                  <th className="px-4 py-2 text-right font-medium">Took</th>
                  <th className="px-4 py-2 text-right font-medium">Cost</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((call) => {
                  const session = usage.sessions.get(call.usageSessionId);
                  return (
                    <tr key={call.id} className="border-b border-border/50 last:border-0">
                      <td className="px-4 py-2 whitespace-nowrap text-muted-foreground">
                        {formatDateTime(call.createdAt)}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs">
                        {call.toolName}
                        {call.ok ? null : (
                          <span className="ml-2 text-warning">refused</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {AGENT_LABELS[call.agent] ?? call.agent}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {session?.lessonTitle ?? "—"}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                        {Math.round(call.durationMs)}ms
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {formatCost(call.costUsd)}
                        {call.sharedWith > 0 ? (
                          <span
                            className="ml-1 text-xs text-muted-foreground"
                            title={`This response carried ${call.sharedWith + 1} tool calls; its cost is split between them.`}
                          >
                            ÷{call.sharedWith + 1}
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </>
  );
}
