import type { AutomatonBlockProps } from "@/components/automata/automaton";

function unusedId(used: Set<string>, prefix: string, start: number) {
  let index = start;
  while (used.has(`${prefix}${index}`)) index++;
  return `${prefix}${index}`;
}

/** Puck adds array items by index, which can reuse an ID after deletion. */
export function nextAutomatonId(
  items: readonly { id: string }[],
  prefix: "q" | "t",
  index = items.length,
) {
  const used = new Set(items.map((item) => item.id.trim()).filter(Boolean));
  return unusedId(used, prefix, index);
}

/** Keep internal IDs unique and enforce one initial state across inspector edits. */
export function reconcileAutomatonProps(
  props: AutomatonBlockProps,
  previous?: AutomatonBlockProps | null,
): AutomatonBlockProps {
  const usedStates = new Set<string>();
  const states = (props.states ?? []).map((state, index) => {
    const requestedId = state.id.trim();
    const duplicate = usedStates.has(requestedId);
    const id = !requestedId || duplicate
      ? unusedId(usedStates, "q", index)
      : requestedId;
    usedStates.add(id);
    return {
      ...state,
      id,
      label: duplicate && state.label.trim() === requestedId ? id : state.label,
    };
  });

  const previousStates = previous?.states ?? [];
  const oldInitialId = previousStates.find((state) => state.initial)?.id;
  const toggledIndex = states.findIndex(
    (state, index) =>
      index < previousStates.length &&
      state.initial &&
      !previousStates[index]?.initial,
  );
  const previousIndex = states.findIndex((state) => state.id === oldInitialId);
  const clearedIndex = previousStates.findIndex(
    (state, index) => state.initial && states[index]?.id === state.id && !states[index].initial,
  );
  const initialIndex = toggledIndex >= 0
    ? toggledIndex
    : clearedIndex >= 0 && states.length > 1
      ? (clearedIndex + 1) % states.length
      : previousIndex >= 0
        ? previousIndex
        : Math.max(0, states.findIndex((state) => state.initial));
  const singleInitialStates = states.map((state, index) => ({
    ...state,
    initial: index === initialIndex,
  }));

  const usedTransitions = new Set<string>();
  const transitions = (props.transitions ?? []).map((transition, index) => {
    const requestedId = transition.id.trim();
    const id = !requestedId || usedTransitions.has(requestedId)
      ? unusedId(usedTransitions, "t", index)
      : requestedId;
    usedTransitions.add(id);
    return {
      ...transition,
      id,
      from: transition.from.trim(),
      to: transition.to.trim(),
    };
  });

  return { ...props, states: singleInitialStates, transitions };
}
