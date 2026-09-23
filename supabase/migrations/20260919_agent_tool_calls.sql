-- Per-tool-call record for every agent interaction.
--
-- WHY THIS EXISTS: OpenAI reports token usage per RESPONSE, never per tool
-- call, so `ai_realtime_responses` can answer "what did this session cost"
-- but not "what is the agent spending its credits ON". This table records
-- the tool calls themselves and which response each one happened inside;
-- the admin panel joins the two and splits a response's cost across the
-- calls it contains. That split is an attribution, not a measurement, and
-- the admin view says so.
--
-- Deliberately additive: no existing table, trigger, policy or view is
-- touched, so nothing already in the admin panel can change behaviour.
-- Safe to re-run.

create table if not exists public.ai_agent_tool_calls (
  id uuid primary key default gen_random_uuid(),
  usage_session_id uuid not null references public.ai_realtime_sessions(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  -- The response this call was made inside. Null when the surface could not
  -- tell us — the row still counts as a call, it just cannot be priced.
  response_id text,
  -- OpenAI's function call id, so a retried post cannot double-count.
  call_id text not null,
  -- Which tutor or surface made the call: arrays, stacks, canvas-copilot,
  -- course-arrays.
  agent text not null,
  tool_name text not null,
  ok boolean not null default true,
  duration_ms integer not null default 0,
  created_at timestamptz not null default now(),
  unique (usage_session_id, call_id)
);

create index if not exists ai_agent_tool_calls_owner_created_idx
  on public.ai_agent_tool_calls (owner_id, created_at desc);
create index if not exists ai_agent_tool_calls_session_idx
  on public.ai_agent_tool_calls (usage_session_id);
create index if not exists ai_agent_tool_calls_tool_idx
  on public.ai_agent_tool_calls (tool_name);
create index if not exists ai_agent_tool_calls_created_idx
  on public.ai_agent_tool_calls (created_at desc);

alter table public.ai_agent_tool_calls enable row level security;

-- Same shape as the policies on ai_realtime_responses: a user may write and
-- read their own rows, and only against a session they own. The admin panel
-- reads with the service-role key, which bypasses RLS.
drop policy if exists "agent_tool_calls_insert_own" on public.ai_agent_tool_calls;
create policy "agent_tool_calls_insert_own" on public.ai_agent_tool_calls
  for insert with check (
    auth.uid() = owner_id
    and exists (
      select 1
      from public.ai_realtime_sessions session
      where session.id = usage_session_id
        and session.owner_id = auth.uid()
    )
  );

drop policy if exists "agent_tool_calls_select_own" on public.ai_agent_tool_calls;
create policy "agent_tool_calls_select_own" on public.ai_agent_tool_calls
  for select using (auth.uid() = owner_id);
