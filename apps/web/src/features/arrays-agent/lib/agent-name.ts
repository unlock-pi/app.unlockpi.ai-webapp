/**
 * The agent's name, on its own so that UI which only wants to label a button
 * does not pull in the tool set (and the AI SDK with it) to read a string.
 *
 * Deliberately its own identity rather than the canvas's generic
 * "Copilot"/"Co-teacher": this one only knows arrays, and saying so up front
 * is what stops a teacher asking it about linked lists.
 */
export const ARRAYS_AGENT_NAME = "Indexa";
