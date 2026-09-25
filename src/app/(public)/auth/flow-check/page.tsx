"use client";

import { useEffect, useState } from "react";

import { AutomatonNetwork } from "@/components/automata/automaton-network";
import { createAutomatonExecution, stepAutomaton, type Automaton } from "@/components/automata/model";

const automaton: Automaton = {
  id: "flow-check",
  type: "dfa",
  alphabet: ["a"],
  states: [{ id: "left", label: "start" }, { id: "right", label: "end", accepting: true }],
  transitions: [{ id: "move", from: "left", to: "right", symbols: ["a"] }],
  startState: "left",
  acceptStates: ["right"],
};
const initial = createAutomatonExecution(automaton, "a");
const completed = stepAutomaton(automaton, initial);
const traveling = {
  ...completed,
  currentStates: initial.currentStates,
  inputIndex: 0,
  status: "running" as const,
  transitionPhase: "traveling" as const,
};

export default function FlowCheckPage() {
  const [tick, setTick] = useState(0);
  const [offset, setOffset] = useState("waiting");
  useEffect(() => {
    const timer = setInterval(() => setTick((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const path = document.querySelector("svg path[pathLength]");
    if (path) setOffset(getComputedStyle(path).strokeDashoffset);
  }, [tick]);

  return (
    <main style={{ padding: 30 }}>
      <AutomatonNetwork automaton={automaton} execution={{ ...traveling }} />
      <output id="flow-offset">{tick}: {offset}</output>
    </main>
  );
}
