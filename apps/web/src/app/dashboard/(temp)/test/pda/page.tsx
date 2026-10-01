"use client";
import { useState } from "react";
import { PDABlock } from "@/components/pda";
import type { PDA } from "@/features/pda/model-agent";
const EXAMPLE: PDA = {
  id: "anbn",
  inputAlphabet: ["a", "b"],
  stackAlphabet: ["Z", "A"],
  startState: "q0",
  acceptStates: ["qAccept"],
  initialStackSymbol: "Z",
  acceptanceMode: "final_state",
  states: [
    { id: "q0", label: "q0", initial: true },
    { id: "q1", label: "q1" },
    { id: "qAccept", label: "qAccept", accepting: true },
  ],
  transitions: [
    {
      id: "push-a",
      from: "q0",
      to: "q0",
      inputSymbol: "a",
      stackTop: "Z",
      operation: "push",
      pushSymbols: ["A"],
    },
    {
      id: "push-more-a",
      from: "q0",
      to: "q0",
      inputSymbol: "a",
      stackTop: "A",
      operation: "push",
      pushSymbols: ["A"],
    },
    {
      id: "first-b",
      from: "q0",
      to: "q1",
      inputSymbol: "b",
      stackTop: "A",
      operation: "pop",
    },
    {
      id: "pop-b",
      from: "q1",
      to: "q1",
      inputSymbol: "b",
      stackTop: "A",
      operation: "pop",
    },
    {
      id: "accept",
      from: "q1",
      to: "qAccept",
      inputSymbol: "ε",
      stackTop: "Z",
      operation: "noop",
    },
  ],
};
export default function PDATestPage() {
  const [input, setInput] = useState("aabb");
  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-8">
      <div className="mx-auto max-w-6xl">
        <section className=" rounded-2xl border border-border bg-card p-4 sm:p-6">
          <PDABlock pda={EXAMPLE} input={input} />
        </section>
      </div>
    </main>
  );
}
