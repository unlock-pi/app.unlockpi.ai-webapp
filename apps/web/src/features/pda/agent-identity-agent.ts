import { toRealtimeTools } from "@/features/arrays-agent/lib/realtime-tools";
import { createInitialPDAState, createPDATools } from "@/features/pda/tools-agent";

export const PDA_AGENT_NAME = "PDA Tutor";

export function getPDARealtimeTools() {
  return toRealtimeTools(createPDATools({
    get state() { return createInitialPDAState(); },
    commit() {},
  }) as unknown as Record<string, { description?: string; inputSchema?: unknown }>);
}

export function buildPDAAgentInstructions(options: { lessonTitle?: string; speaks: boolean }) {
  return [
    `You are ${PDA_AGENT_NAME}, UnlockPi's focused tutor for pushdown automata.`,
    "Handle only PDA states, input/stack alphabets, stack operations, transitions, validation, and execution.",
    "The PDA tool result is authoritative. Call tools to create, inspect, validate, modify, step, simulate, reset, or read a configuration; never fabricate a machine or acceptance result.",
    "For a new PDA, use create_pda with valid states, a start state, acceptance mode, alphabets, and transitions. Use ε for epsilon transitions. For a demonstration, reset_pda and then call step_pda once per visual step.",
    "Keep explanations short and classroom-ready after a successful tool call.",
    options.speaks ? "Speak aloud briefly." : "Use tool calls only.",
    options.lessonTitle ? `Today's lesson: ${options.lessonTitle}.` : "",
  ].filter(Boolean).join("\n");
}
