import { tool } from "ai";
import { z } from "zod";
import {
  createTMExecution,
  simulateTM,
  stepTM,
  type TuringMachine,
  validateTM,
} from "@/features/tm/model-agent";
export type TMState = {
  selectedId: string | null;
  machines: Record<string, TuringMachine>;
  executions: Record<string, ReturnType<typeof createTMExecution>>;
};
export const createInitialTMState = (): TMState => ({
  selectedId: null,
  machines: {},
  executions: {},
});
type Context = { get state(): TMState; commit(next: TMState): void };
const symbol = z.string().min(1);
const transition = z.object({
  id: symbol.optional(),
  from: symbol,
  to: symbol,
  read: symbol,
  write: symbol,
  move: z.enum(["L", "R", "S"]),
});
const get = (ctx: Context, id?: string) =>
  ctx.state.machines[id ?? ctx.state.selectedId ?? ""];
const update = (
  ctx: Context,
  tm: TuringMachine,
  execution = ctx.state.executions[tm.id] ?? createTMExecution(tm),
) =>
  ctx.commit({
    ...ctx.state,
    selectedId: tm.id,
    machines: { ...ctx.state.machines, [tm.id]: tm },
    executions: { ...ctx.state.executions, [tm.id]: execution },
  });
export function createTMTools(ctx: Context) {
  return {
    create_tm: tool({
      description: "Create a deterministic single-tape Turing machine.",
      inputSchema: z.object({
        tmId: symbol,
        states: z
          .array(z.object({ id: symbol, label: z.string().optional() }))
          .min(1),
        alphabet: z.array(symbol),
        tapeAlphabet: z.array(symbol),
        blank: symbol,
        startState: symbol,
        acceptState: symbol.optional(),
        rejectState: symbol.optional(),
        transitions: z.array(transition).default([]),
        input: z.string().default(""),
      }),
      execute: async (input) => {
        if (ctx.state.machines[input.tmId])
          return { ok: false, summary: "TM ID already exists." };
        const tm: TuringMachine = {
          ...input,
          id: input.tmId,
          states: input.states.map((state) => ({
            ...state,
            label: state.label ?? state.id,
          })),
          transitions: input.transitions.map((item, index) => ({
            ...item,
            id: item.id ?? `t${index}`,
          })),
        };
        const valid = validateTM(tm);
        if (!valid.valid) return { ok: false, summary: valid.issues.join(" ") };
        update(ctx, tm, createTMExecution(tm, input.input));
        return { ok: true, summary: "TM created.", data: tm };
      },
    }),
    inspect_tm: tool({
      description: "Inspect a Turing machine.",
      inputSchema: z.object({ tmId: symbol.optional() }),
      execute: async ({ tmId }) => {
        const tm = get(ctx, tmId);
        return tm
          ? { ok: true, summary: "TM inspected.", data: tm }
          : { ok: false, summary: "TM not found." };
      },
    }),
    validate_tm: tool({
      description: "Validate a Turing machine.",
      inputSchema: z.object({ tmId: symbol.optional() }),
      execute: async ({ tmId }) => {
        const tm = get(ctx, tmId);
        const valid = tm && validateTM(tm);
        return valid
          ? {
              ok: valid.valid,
              summary: valid.valid ? "TM is valid." : valid.issues.join(" "),
              data: valid,
            }
          : { ok: false, summary: "TM not found." };
      },
    }),
    step_tm: tool({
      description: "Execute one TM transition.",
      inputSchema: z.object({ tmId: symbol.optional() }),
      execute: async ({ tmId }) => {
        const tm = get(ctx, tmId);
        if (!tm) return { ok: false, summary: "TM not found." };
        const execution = stepTM(
          tm,
          ctx.state.executions[tm.id] ?? createTMExecution(tm),
        );
        update(ctx, tm, execution);
        return {
          ok: true,
          summary: `TM is ${execution.status}.`,
          data: execution,
        };
      },
    }),
    simulate_tm: tool({
      description: "Simulate a TM until it halts.",
      inputSchema: z.object({
        tmId: symbol.optional(),
        input: z.string().optional(),
      }),
      execute: async ({ tmId, input }) => {
        const tm = get(ctx, tmId);
        if (!tm) return { ok: false, summary: "TM not found." };
        const execution = simulateTM(
          tm,
          input ?? ctx.state.executions[tm.id]?.input ?? "",
        );
        update(ctx, tm, execution);
        return {
          ok: execution.status === "accepted",
          summary: `TM ${execution.status}.`,
          data: execution,
        };
      },
    }),
    reset_tm: tool({
      description: "Reset TM execution.",
      inputSchema: z.object({
        tmId: symbol.optional(),
        input: z.string().optional(),
      }),
      execute: async ({ tmId, input }) => {
        const tm = get(ctx, tmId);
        if (!tm) return { ok: false, summary: "TM not found." };
        update(ctx, tm, createTMExecution(tm, input ?? ""));
        return { ok: true, summary: "TM reset." };
      },
    }),
    get_tm_configuration: tool({
      description: "Read the current TM configuration.",
      inputSchema: z.object({ tmId: symbol.optional() }),
      execute: async ({ tmId }) => {
        const tm = get(ctx, tmId);
        return tm
          ? {
              ok: true,
              summary: "Configuration read.",
              data: ctx.state.executions[tm.id],
            }
          : { ok: false, summary: "TM not found." };
      },
    }),
  };
}
