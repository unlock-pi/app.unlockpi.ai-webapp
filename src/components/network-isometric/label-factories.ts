import { createId, type ComponentRole, type DiagramLabel, type Vec3 } from "./model";

export type LabelOptions = {
  id?: string;
  align?: "left" | "center" | "right";
};

/** The universal label — every other label helper below is a named preset over this one. */
export function NetworkLabel(text: string, position: Vec3, opts: LabelOptions = {}): DiagramLabel {
  return {
    id: opts.id ?? createId("label"),
    text,
    position,
    kind: "generic",
    align: opts.align ?? "center",
  };
}

export function RoleLabel(role: NonNullable<ComponentRole>, position: Vec3): DiagramLabel {
  return { ...NetworkLabel(role === "sender" ? "Sender" : "Receiver", position), kind: "role" };
}

export function TimeLabel(time: 1 | 2, position: Vec3): DiagramLabel {
  return { ...NetworkLabel(`Time ${time}`, position), kind: "time" };
}
