"use client";

import {
  ActivityIcon,
  ArrowUpDownIcon,
  AudioWaveformIcon,
  BotIcon,
  Clock3Icon,
  CoinsIcon,
  DownloadIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  SearchIcon,
  ShieldCheckIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import Logo from "@/components/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  AdminDashboardData,
  AdminRealtimeSession,
  AdminUser,
} from "@/features/admin/types/admin-types";
import { SessionDetailModal } from "./session-detail-modal";
import { TutorProfileDrawer } from "./tutor-profile-drawer";
import {
  exportSessionsToCSV,
  exportUsersToCSV,
  exportDashboardSnapshot,
} from "@/features/admin/lib/export-utils";

type SortField = "name" | "email" | "sessions" | "spend" | "joined" | "active";
type SortDirection = "asc" | "desc";
type StatusFilter = "all" | "active" | "inactive";

const rangeOptions = [
  { value: "1", label: "Today" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
] as const;

const chartConfig = {
  activeUsers: { label: "Active tutors", color: "var(--primary)" },
} satisfies ChartConfig;

export function AdminDashboard({ data }: { data: AdminDashboardData }) {
  const [rangeDays, setRangeDays] = useState("30");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [userSort, setUserSort] = useState<{ field: SortField; direction: SortDirection }>({
    field: "name",
    direction: "asc",
  });
  const [sessionSort, setSessionSort] = useState<{ field: "date" | "cost" | "duration"; direction: SortDirection }>({
    field: "date",
    direction: "desc",
  });
  const [selectedSession, setSelectedSession] = useState<AdminRealtimeSession | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const startDate = getRangeStart(Number(rangeDays));
  const filteredSessions = data.realtimeSessions.filter(
    (session) => new Date(session.startedAt) >= startDate,
  );
  const filteredActivity = data.activity.filter(
    (day) => new Date(`${day.date}T23:59:59`) >= startDate,
  );
  const activeUserIds = new Set(
    data.users
      .filter(
        (user) =>
          user.lastActiveAt && new Date(user.lastActiveAt) >= startDate,
      )
      .map((user) => user.id),
  );

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthSessions = data.realtimeSessions.filter(
    (session) => new Date(session.startedAt) >= monthStart,
  );

  // Users table sorting and filtering - use filtered sessions for accurate stats
  const userStats = new Map<string, { sessions: number; duration: number; cost: number }>();
  for (const session of filteredSessions) {
    const current = userStats.get(session.ownerId) ?? { sessions: 0, duration: 0, cost: 0 };
    current.sessions += 1;
    current.duration += session.durationSeconds;
    if (session.estimatedCostUsd !== null) {
      current.cost += session.estimatedCostUsd;
    }
    userStats.set(session.ownerId, current);
  }

  let visibleUsers = data.users.filter((user) =>
    `${user.name} ${user.email}`.toLowerCase().includes(deferredSearch),
  );

  if (statusFilter !== "all") {
    visibleUsers = visibleUsers.filter((user) => {
      const isActive = activeUserIds.has(user.id);
      return statusFilter === "active" ? isActive : !isActive;
    });
  }

  visibleUsers = sortUsers(visibleUsers, userStats, userSort.field, userSort.direction);

  // Sessions table sorting
  const sortedSessions = sortSessions([...filteredSessions], sessionSort.field, sessionSort.direction);

  const selectedSessionUser = selectedSession ? data.users.find(u => u.id === selectedSession.ownerId) : undefined;

  return (
    <div className="min-h-svh bg-background text-foreground max-w-7xl mx-auto">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Logo isLink={false} width={30} height={30} />
            <div className="h-5 w-px bg-border" />
            <div>
              <p className="text-sm font-semibold tracking-tight">UnlockPi Admin</p>
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Operations
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="hidden sm:inline-flex">
              Live data
            </Badge>
            <Button
              render={<Link href="/dashboard" />}
              variant="outline"
              size="sm"
              className="active:scale-[0.96] transition-transform"
            >
              <LogOutIcon /> Dashboard
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <ShieldCheckIcon className="size-4" /> Admin workspace
            </div>
            <h1 className="max-w-2xl text-balance font-[var(--font-canvas-heading)] text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
              Your tutoring platform, at a glance.
            </h1>
            <p className="mt-3 max-w-xl text-pretty text-sm leading-6 text-muted-foreground">
              Follow tutor activity, classroom AI usage, and Realtime spend from one quiet control room.
            </p>
          </div>
          <RangeSelect value={rangeDays} onChange={setRangeDays} />
        </div>

        <Tabs defaultValue="overview" className="gap-6">
          <TabsList className="w-full justify-start overflow-x-auto sm:w-fit">
            <TabsTrigger value="overview"><LayoutDashboardIcon /> Overview</TabsTrigger>
            <TabsTrigger value="users"><UsersIcon /> Users</TabsTrigger>
            <TabsTrigger value="sessions"><AudioWaveformIcon /> AI sessions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-5">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard icon={UsersIcon} label="Total tutors" value={formatNumber(data.users.length)} detail={`${activeUserIds.size} active in range`} />
              <MetricCard icon={ActivityIcon} label="Active tutors" value={formatNumber(activeUserIds.size)} detail={rangeOptions.find((option) => option.value === rangeDays)?.label ?? "Selected range"} />
              <MetricCard icon={BotIcon} label="AI sessions" value={formatNumber(filteredSessions.length)} detail={`${Math.round(sum(filteredSessions, "durationSeconds", 0, (value) => value) / 60)} classroom minutes`} />
              <MetricCard icon={CoinsIcon} label="Spend this month" value={formatCost(sumNullableCosts(monthSessions))} detail={`${monthSessions.length} tracked sessions`} />
            </section>

            <section className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.75fr)]">
              <ActivityChart data={filteredActivity} />
              <UsagePulse sessions={filteredSessions} users={data.users} />
            </section>

            <SessionTable sessions={sortedSessions.slice(0, 8)} users={data.users} compact onSelectSession={setSelectedSession} />
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tutors" className="pl-9" />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tutors</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportUsersToCSV(visibleUsers, filteredSessions)}
              >
                <DownloadIcon className="size-4" /> Export CSV
              </Button>
            </div>
            <UsersTable users={visibleUsers} sessions={filteredSessions} activeUserIds={activeUserIds} userSort={userSort} onSort={setUserSort} onSelectUser={setSelectedUser} />
          </TabsContent>

          <TabsContent value="sessions" className="space-y-4">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportSessionsToCSV(sortedSessions, new Map(data.users.map(u => [u.id, u])))}
              >
                <DownloadIcon className="size-4" /> Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportDashboardSnapshot(data.users, sortedSessions, rangeOptions.find(o => o.value === rangeDays)?.label ?? "Custom", activeUserIds.size)}
              >
                <DownloadIcon className="size-4" /> Snapshot
              </Button>
            </div>
            <SessionTable sessions={sortedSessions} users={data.users} sessionSort={sessionSort} onSort={setSessionSort} onSelectSession={setSelectedSession} />
          </TabsContent>
        </Tabs>
      </main>

      <SessionDetailModal
        session={selectedSession}
        user={selectedSessionUser}
        onClose={() => setSelectedSession(null)}
      />
      <TutorProfileDrawer
        user={selectedUser}
        sessions={data.realtimeSessions}
        activeUserIds={activeUserIds}
        onClose={() => setSelectedUser(null)}
      />
    </div>
  );
}

function RangeSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <Select value={value} onValueChange={(next) => next && onChange(next)}>
      <SelectTrigger className="w-44 bg-background/80 shadow-sm" aria-label="Analytics date range">
        <Clock3Icon className="size-4 text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {rangeOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function MetricCard({ icon: Icon, label, value, detail }: { icon: typeof UsersIcon; label: string; value: string; detail: string }) {
  return (
    <Card className="overflow-hidden">
      <CardPanel className="p-5">
        <div className="mb-7 grid size-10 place-items-center rounded-lg bg-muted text-muted-foreground"><Icon className="size-4.5" /></div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
        <p className="mt-2 font-[var(--font-canvas-heading)] text-3xl font-semibold tracking-[-0.04em] tabular-nums">{value}</p>
        <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
      </CardPanel>
    </Card>
  );
}

function ActivityChart({ data }: { data: AdminDashboardData["activity"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily active tutors</CardTitle>
        <CardDescription>Unique authenticated tutors who opened the product.</CardDescription>
      </CardHeader>
      <CardPanel className="px-3 pb-4 sm:px-5">
        <ChartContainer config={chartConfig} className="h-[290px] w-full">
          <AreaChart data={data} margin={{ left: -20, right: 8, top: 12 }}>
            <defs><linearGradient id="adminActiveFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--color-activeUsers)" stopOpacity={0.35} /><stop offset="95%" stopColor="var(--color-activeUsers)" stopOpacity={0.02} /></linearGradient></defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="date" axisLine={false} tickLine={false} minTickGap={30} tickFormatter={shortDate} />
            <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent labelFormatter={(value) => shortDate(String(value))} />} />
            <Area dataKey="activeUsers" type="monotone" fill="url(#adminActiveFill)" stroke="var(--color-activeUsers)" strokeWidth={2} />
          </AreaChart>
        </ChartContainer>
      </CardPanel>
    </Card>
  );
}

function UsagePulse({ sessions, users }: { sessions: AdminRealtimeSession[]; users: AdminUser[] }) {
  const minutes = Math.round(sum(sessions, "durationSeconds", 0, (value) => value) / 60);
  const responses = sum(sessions, "responseCount", 0, (value) => value);
  const topUser = getTopUser(sessions, users);
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="mb-4 grid size-11 place-items-center rounded-lg bg-muted text-muted-foreground"><AudioWaveformIcon className="size-5" /></div>
        <CardTitle>Realtime pulse</CardTitle>
        <CardDescription>The live classroom footprint for this range.</CardDescription>
      </CardHeader>
      <CardPanel className="space-y-1 pb-5">
        <PulseRow label="Classroom time" value={`${formatNumber(minutes)} min`} />
        <PulseRow label="AI responses" value={formatNumber(responses)} />
        <PulseRow label="Estimated spend" value={formatCost(sumNullableCosts(sessions))} />
        <PulseRow label="Most active" value={topUser?.name ?? "No activity"} />
      </CardPanel>
    </Card>
  );
}

function PulseRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between border-b py-3 last:border-0"><span className="text-sm text-muted-foreground">{label}</span><span className="max-w-[55%] truncate text-sm font-semibold tabular-nums">{value}</span></div>;
}

function UsersTable({
  users,
  sessions,
  activeUserIds,
  userSort,
  onSort,
  onSelectUser,
}: {
  users: AdminUser[];
  sessions: AdminRealtimeSession[];
  activeUserIds: Set<string>;
  userSort?: { field: SortField; direction: SortDirection };
  onSort?: (sort: { field: SortField; direction: SortDirection }) => void;
  onSelectUser?: (user: AdminUser) => void;
}) {
  const usageByUser = groupUsageByUser(sessions);

  const handleSort = (field: SortField) => {
    if (!onSort || !userSort) return;
    const newDirection =
      userSort.field === field && userSort.direction === "asc" ? "desc" : "asc";
    onSort({ field, direction: newDirection });
  };

  const renderSortableHeader = (field: SortField, label: string) => {
    const isActive = userSort?.field === field;
    return (
      <TableHead
        key={field}
        className="cursor-pointer hover:bg-muted/50"
        onClick={() => handleSort(field)}
      >
        <div className="flex items-center gap-2">
          {label}
          {isActive && (
            <ArrowUpDownIcon
              className={`size-4 transition-transform ${userSort?.direction === "desc" ? "rotate-180" : ""}`}
            />
          )}
        </div>
      </TableHead>
    );
  };

  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            {renderSortableHeader("name", "Tutor")}
            <TableHead>Status</TableHead>
            {renderSortableHeader("joined", "Joined")}
            {renderSortableHeader("sessions", "AI sessions")}
            {renderSortableHeader("active", "Classroom time")}
            <TableHead
              className="text-right cursor-pointer hover:bg-muted/50"
              onClick={() => handleSort("spend")}
            >
              <div className="flex items-center justify-end gap-2">
                Spend
                {userSort?.field === "spend" && (
                  <ArrowUpDownIcon
                    className={`size-4 transition-transform ${
                      userSort?.direction === "desc" ? "rotate-180" : ""
                    }`}
                  />
                )}
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => {
            const usage = usageByUser.get(user.id);
            return (
              <TableRow
                key={user.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onSelectUser?.(user)}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="grid size-9 shrink-0 place-items-center rounded-full bg-foreground text-xs font-bold text-background">
                      {initials(user.name)}
                    </div>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={activeUserIds.has(user.id) ? "secondary" : "outline"}>
                    {activeUserIds.has(user.id) ? "Active" : "Quiet"}
                  </Badge>
                  {user.isAdmin ? (
                    <Badge variant="outline" className="ml-1.5">
                      Admin
                    </Badge>
                  ) : null}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(user.createdAt)}
                </TableCell>
                <TableCell className="tabular-nums">{usage?.count ?? 0}</TableCell>
                <TableCell className="tabular-nums">
                  {formatDuration(usage?.duration ?? 0)}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {formatCost(usage?.cost ?? null)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {users.length === 0 ? (
        <div className="p-10 text-center text-sm text-muted-foreground">
          No tutors match this search.
        </div>
      ) : null}
    </Card>
  );
}

function SessionTable({
  sessions,
  users,
  compact = false,
  sessionSort,
  onSort,
  onSelectSession,
}: {
  sessions: AdminRealtimeSession[];
  users: AdminUser[];
  compact?: boolean;
  sessionSort?: { field: "date" | "cost" | "duration"; direction: SortDirection };
  onSort?: (sort: { field: "date" | "cost" | "duration"; direction: SortDirection }) => void;
  onSelectSession?: (session: AdminRealtimeSession) => void;
}) {
  const userById = new Map(users.map((user) => [user.id, user]));

  const handleSort = (field: "date" | "cost" | "duration") => {
    if (!onSort || !sessionSort) return;
    const newDirection =
      sessionSort.field === field && sessionSort.direction === "asc" ? "desc" : "asc";
    onSort({ field, direction: newDirection });
  };

  const renderSessionSortableHeader = (field: "date" | "cost" | "duration", label: string) => {
    const isActive = sessionSort?.field === field;
    return (
      <TableHead
        key={field}
        className="cursor-pointer hover:bg-muted/50"
        onClick={() => handleSort(field)}
      >
        <div className="flex items-center gap-2">
          {label}
          {isActive && (
            <ArrowUpDownIcon
              className={`size-4 transition-transform ${
                sessionSort?.direction === "desc" ? "rotate-180" : ""
              }`}
            />
          )}
        </div>
      </TableHead>
    );
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>{compact ? "Recent AI sessions" : "AI session ledger"}</CardTitle>
        <CardDescription>
          {compact
            ? "Latest classroom connections in the selected range."
            : "Per-session duration, token volume, and estimated spend."}
        </CardDescription>
        {compact ? (
          <CardAction>
            <Badge variant="outline">{sessions.length} shown</Badge>
          </CardAction>
        ) : null}
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Lesson</TableHead>
            <TableHead>Tutor</TableHead>
            <TableHead>Mode</TableHead>
            {renderSessionSortableHeader("date", "Started")}
            {renderSessionSortableHeader("duration", "Duration")}
            <TableHead>Tokens</TableHead>
            <TableHead className="text-right">
              <div className="flex items-center justify-end gap-2">
                Cost
                {sessionSort?.field === "cost" && (
                  <ArrowUpDownIcon
                    className={`size-4 transition-transform ${
                      sessionSort?.direction === "desc" ? "rotate-180" : ""
                    }`}
                  />
                )}
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.map((session) => {
            const user = userById.get(session.ownerId);
            return (
              <TableRow
                key={session.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onSelectSession?.(session)}
              >
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-8 place-items-center rounded-lg bg-muted text-muted-foreground">
                      <BotIcon className="size-4" />
                    </span>
                    <div>
                      <p className="max-w-64 truncate font-medium">
                        {session.lessonTitle}
                      </p>
                      <p className="mt-1 text-xs capitalize text-muted-foreground">
                        {session.source} · {session.model}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{user?.name ?? "Unknown tutor"}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="capitalize">
                    {session.mode.replaceAll("_", " ")}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDateTime(session.startedAt)}
                </TableCell>
                <TableCell className="tabular-nums">
                  {formatDuration(session.durationSeconds)}
                </TableCell>
                <TableCell className="tabular-nums">
                  {formatNumber(session.inputTokens + session.outputTokens)}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {formatCost(session.estimatedCostUsd)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {sessions.length === 0 ? (
        <div className="p-12 text-center">
          <BotIcon className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">No AI sessions in this range</p>
          <p className="mt-1 text-xs text-muted-foreground">
            New Realtime classes will appear here automatically.
          </p>
        </div>
      ) : null}
    </Card>
  );
}

function getRangeStart(days: number) { const date = new Date(); date.setHours(0, 0, 0, 0); if (days > 1) date.setDate(date.getDate() - (days - 1)); return date; }
function shortDate(value: string) { return new Date(`${value}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
function formatDate(value: string) { return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
function formatDateTime(value: string) { return new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); }
function formatNumber(value: number) { return new Intl.NumberFormat("en-US").format(value); }
function formatCost(value: number | null) { return value === null ? "Not configured" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: value < 1 ? 4 : 2, maximumFractionDigits: value < 1 ? 4 : 2 }).format(value); }
function formatDuration(seconds: number) { if (seconds < 60) return `${seconds}s`; const minutes = Math.round(seconds / 60); return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`; }
function initials(name: string) { return name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join(""); }
function sum<T>(items: T[], key: keyof T, initial: number, pick: (value: number) => number) { return items.reduce((total, item) => total + pick(Number(item[key]) || 0), initial); }
function sumNullableCosts(sessions: AdminRealtimeSession[]) { const values = sessions.map((session) => session.estimatedCostUsd).filter((value): value is number => value !== null); return values.length ? values.reduce((total, value) => total + value, 0) : null; }
function groupUsageByUser(sessions: AdminRealtimeSession[]) { const map = new Map<string, { count: number; duration: number; cost: number | null }>(); for (const session of sessions) { const current = map.get(session.ownerId) ?? { count: 0, duration: 0, cost: null }; current.count += 1; current.duration += session.durationSeconds; if (session.estimatedCostUsd !== null) current.cost = (current.cost ?? 0) + session.estimatedCostUsd; map.set(session.ownerId, current); } return map; }
function getTopUser(sessions: AdminRealtimeSession[], users: AdminUser[]) { if (sessions.length === 0) return undefined; const usage = groupUsageByUser(sessions); return users.toSorted((left, right) => (usage.get(right.id)?.duration ?? 0) - (usage.get(left.id)?.duration ?? 0))[0]; }

function sortUsers(
  users: AdminUser[],
  userStats: Map<string, { sessions: number; duration: number; cost: number }>,
  field: SortField,
  direction: SortDirection
): AdminUser[] {
  const sorted = [...users].sort((a, b) => {
    let aValue: number | string = 0;
    let bValue: number | string = 0;

    switch (field) {
      case "name":
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case "email":
        aValue = a.email.toLowerCase();
        bValue = b.email.toLowerCase();
        break;
      case "joined":
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
        break;
      case "sessions":
        aValue = userStats.get(a.id)?.sessions ?? 0;
        bValue = userStats.get(b.id)?.sessions ?? 0;
        break;
      case "spend":
        aValue = userStats.get(a.id)?.cost ?? 0;
        bValue = userStats.get(b.id)?.cost ?? 0;
        break;
      case "active":
        aValue = userStats.get(a.id)?.duration ?? 0;
        bValue = userStats.get(b.id)?.duration ?? 0;
        break;
    }

    if (typeof aValue === "string" && typeof bValue === "string") {
      return direction === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return direction === "asc"
      ? (aValue as number) - (bValue as number)
      : (bValue as number) - (aValue as number);
  });

  return sorted;
}

function sortSessions(
  sessions: AdminRealtimeSession[],
  field: "date" | "cost" | "duration",
  direction: SortDirection
): AdminRealtimeSession[] {
  return [...sessions].sort((a, b) => {
    let aValue: number;
    let bValue: number;

    switch (field) {
      case "date":
        aValue = new Date(a.startedAt).getTime();
        bValue = new Date(b.startedAt).getTime();
        break;
      case "duration":
        aValue = a.durationSeconds;
        bValue = b.durationSeconds;
        break;
      case "cost":
        aValue = a.estimatedCostUsd ?? 0;
        bValue = b.estimatedCostUsd ?? 0;
        break;
    }

    return direction === "asc" ? aValue - bValue : bValue - aValue;
  });
}
