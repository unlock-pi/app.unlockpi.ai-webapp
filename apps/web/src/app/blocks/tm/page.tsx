"use client";

import { useState } from "react";
import { TMBlock } from "@/components/tm";
import type { TuringMachine } from "@/features/tm/model-agent";

type Command = { label: string; input: string; tm: TuringMachine };
const machine = (
  id: string,
  states: TuringMachine["states"],
  transitions: TuringMachine["transitions"],
  acceptState = "qAccept",
  rejectState?: string,
): TuringMachine => ({
  id,
  alphabet: ["0", "1", "a", "b"],
  tapeAlphabet: ["0", "1", "a", "b", "□"],
  blank: "□",
  startState: "q0",
  acceptState,
  rejectState,
  states,
  transitions,
});
const COMMANDS: Command[] = [
  {
    label:
      "Create a Turing Machine over {0,1} that accepts strings ending in 01.",
    input: "1101",
    tm: machine(
      "scan-right",
      [
        { id: "q0", label: "q0" },
        { id: "qAccept", label: "qAccept", accepting: true },
      ],
      [
        { id: "zero", from: "q0", to: "q0", read: "0", write: "0", move: "R" },
        { id: "one", from: "q0", to: "q0", read: "1", write: "1", move: "R" },
        {
          id: "accept",
          from: "q0",
          to: "qAccept",
          read: "□",
          write: "□",
          move: "S",
        },
      ],
    ),
  },
  {
    label: "Create a Turing Machine over {0,1} that accepts 0011.",
    input: "0011",
    tm: machine(
      "replace-zero",
      [
        { id: "q0", label: "q0" },
        { id: "qAccept", label: "qAccept", accepting: true },
      ],
      [
        {
          id: "replace",
          from: "q0",
          to: "q0",
          read: "0",
          write: "1",
          move: "R",
        },
        { id: "keep", from: "q0", to: "q0", read: "1", write: "1", move: "R" },
        {
          id: "accept",
          from: "q0",
          to: "qAccept",
          read: "□",
          write: "□",
          move: "S",
        },
      ],
    ),
  },
  {
    label:
      "Create a Turing Machine that accepts strings with equal numbers of 0s and 1s.",
    input: "0011",
    tm: machine(
      "erase-tape",
      [
        { id: "q0", label: "q0" },
        { id: "qAccept", label: "qAccept", accepting: true },
      ],
      [
        {
          id: "erase-zero",
          from: "q0",
          to: "q0",
          read: "0",
          write: "□",
          move: "R",
        },
        {
          id: "erase-one",
          from: "q0",
          to: "q0",
          read: "1",
          write: "□",
          move: "R",
        },
        {
          id: "accept",
          from: "q0",
          to: "qAccept",
          read: "□",
          write: "□",
          move: "S",
        },
      ],
    ),
  },
  {
    label: "Create a Turing Machine that accepts palindromes over {0,1}.",
    input: "0110",
    tm: machine(
      "move-left",
      [
        { id: "q0", label: "q0" },
        { id: "qAccept", label: "qAccept", accepting: true },
      ],
      [
        {
          id: "left-zero",
          from: "q0",
          to: "q0",
          read: "0",
          write: "0",
          move: "L",
        },
        {
          id: "left-one",
          from: "q0",
          to: "q0",
          read: "1",
          write: "1",
          move: "L",
        },
        {
          id: "accept",
          from: "q0",
          to: "qAccept",
          read: "□",
          write: "□",
          move: "S",
        },
      ],
    ),
  },
  {
    label: "Create a Turing Machine for aⁿbⁿ, and test it with aaabbb.",
    input: "aaabbb",
    tm: machine(
      "reject-one",
      [
        { id: "q0", label: "q0" },
        { id: "qAccept", label: "qAccept", accepting: true },
        { id: "qReject", label: "qReject", rejecting: true },
      ],
      [
        { id: "zero", from: "q0", to: "q0", read: "0", write: "0", move: "R" },
        {
          id: "reject",
          from: "q0",
          to: "qReject",
          read: "1",
          write: "1",
          move: "S",
        },
        {
          id: "accept",
          from: "q0",
          to: "qAccept",
          read: "□",
          write: "□",
          move: "S",
        },
      ],
      "qAccept",
      "qReject",
    ),
  },
];
export default function TMTestPage() {
  const [command, setCommand] = useState(COMMANDS[0]);
  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-8">
      <section className="mx-auto max-w-6xl space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-6">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {COMMANDS.map((item) => (
            <button
              key={item.tm.id}
              type="button"
              onClick={() => setCommand(item)}
              className="rounded-xl border border-border bg-background/60 p-3 text-left text-sm transition hover:border-primary/60 hover:bg-primary/5"
            >
              {item.label}
            </button>
          ))}
        </div>
        <TMBlock key={command.tm.id} tm={command.tm} input={command.input} />
      </section>
    </main>
  );
}
