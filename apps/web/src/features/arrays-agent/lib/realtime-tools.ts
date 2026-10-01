import { z } from "zod";

/**
 * Turns the AI SDK tool set into OpenAI Realtime function definitions.
 *
 * This is the single point where the two worlds meet: tools are authored once
 * with Zod, the Realtime session gets the JSON Schema derived from that Zod,
 * and the executor runs the very same `execute`. There is no second copy of a
 * parameter list anywhere to drift out of sync.
 */
export type RealtimeFunctionDef = {
  type: "function";
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

type ToolLike = { description?: string; inputSchema?: unknown };

/**
 * OpenAI rejects `$schema` and ignores `$ref`/`definitions` in function
 * parameters, and non-strict mode still wants a plain closed object. This
 * normalizes Zod's output to what the API actually accepts.
 */
function normalize(schema: Record<string, unknown>): Record<string, unknown> {
  const rest = { ...schema };
  delete rest.$schema;

  const properties = (rest.properties ?? {}) as Record<string, unknown>;
  return {
    ...rest,
    type: "object",
    properties,
    required: Array.isArray(rest.required) ? rest.required : [],
    additionalProperties: false,
  };
}

export function toRealtimeTools(
  tools: Record<string, ToolLike>,
): RealtimeFunctionDef[] {
  return Object.entries(tools).map(([name, definition]) => {
    const schema = definition.inputSchema;
    const json =
      schema instanceof z.ZodType
        ? (z.toJSONSchema(schema, { io: "input" }) as Record<string, unknown>)
        : { type: "object", properties: {} };

    return {
      type: "function" as const,
      name,
      description: definition.description ?? "",
      parameters: normalize(json),
    };
  });
}
