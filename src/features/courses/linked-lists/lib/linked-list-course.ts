export type LLNodeTone = "default" | "active" | "muted" | "success" | "warning" | "dim";

export type LLStepType = "visual" | "text" | "checkpoint";
export type LLCheckpointType = "multiple-choice" | "drag-order" | "multi-select";

export interface LLCheckpointOption {
  id: string;
  label: string;
}

export interface LLCheckpoint {
  type: LLCheckpointType;
  prompt: string;
  options: LLCheckpointOption[];
  /** For multiple-choice: single correct id. For multi-select: comma-joined ids. For drag-order: ids in correct order. */
  correctAnswer: string;
  explanation: string;
}

export interface LLStep {
  id: string;
  /** Short caption shown above the visual */
  eyebrow: string;
  /** Headline for this step */
  title: string;
  /** Body text shown below the visual */
  body: string;
  /** Which visual variant to animate for this step */
  visual: LLVisualVariant;
  checkpoint?: LLCheckpoint;
}

/**
 * Describes what the SVG visualizer should render for a given step.
 * The component reads `variant` to select the scene and `phase` to
 * select which animation state within that scene to show.
 */
export interface LLVisualVariant {
  scene:
    | "single-node"
    | "node-with-pointer"
    | "chain-building"
    | "chain-with-head"
    | "chain-with-null"
    | "chain-contrast"
    | "traversal-idle"
    | "traversal-moving"
    | "traversal-found"
    | "traversal-cost"
    | "traversal-race"
    | "insertion-list"
    | "insertion-animate"
    | "deletion-animate"
    | "pointer-cost";
  /** Drives animation phase within a scene */
  phase?: number;
}

export interface LLLessonDefinition {
  segment: string;
  order: number;
  title: string;
  shortTitle: string;
  overview: string;
  lessonGoal: string;
  learningFocus: string[];
  voiceSeedPrompt: string;
  steps: LLStep[];
}

export const linkedListCourse = {
  coursePath: "/dashboard/courses/linked-lists",
  title: "Linked Lists",
  description:
    "A visual-first course on how linked lists store data through nodes and pointers, how traversal works, and why insertion and deletion behave differently from arrays.",
  lessons: [
    {
      segment: "what-is-a-linked-list",
      order: 1,
      title: "What is a Linked List?",
      shortTitle: "What is it?",
      overview:
        "A linked list is a chain of nodes. Each node holds a value and a pointer to the next node. Unlike arrays, the nodes can live anywhere in memory.",
      lessonGoal:
        "Build the mental model: a linked list is not a row of boxes — it is a chain where each link knows only the next one.",
      learningFocus: [
        "A node holds a value plus a next pointer.",
        "HEAD is your only entry point into the list.",
        "The last node points to null — that is how you know you have reached the end.",
      ],
      voiceSeedPrompt:
        "Start with a single box and gradually connect more, making the pointer arrows feel like roads between cities — you can only travel in one direction.",
      steps: [
        {
          id: "ll1-s1",
          eyebrow: "Step 1 of 6",
          title: "This is a node",
          body: "Every linked list is made of nodes. A node is simply a container that holds one value. On its own it looks a lot like an array slot — but it behaves very differently.",
          visual: { scene: "single-node" },
        },
        {
          id: "ll1-s2",
          eyebrow: "Step 2 of 6",
          title: "Each node points to the next",
          body: "Nodes have two parts: a value box and a next-pointer box. The pointer is an arrow that leads to whichever node comes after. Without the pointer the node is isolated.",
          visual: { scene: "node-with-pointer" },
        },
        {
          id: "ll1-s3",
          eyebrow: "Step 3 of 6",
          title: "Chain the nodes together",
          body: "As we connect nodes one by one we get a chain. Notice how each arrow draws on — the list grows from left to right as each node's pointer aims at the next.",
          visual: { scene: "chain-building", phase: 0 },
        },
        {
          id: "ll1-s4",
          eyebrow: "Step 4 of 6",
          title: "HEAD is your entry point",
          body: "We always start at a special reference called HEAD. HEAD points to the first node. Without HEAD you cannot find the list at all — there is no index to jump to.",
          visual: { scene: "chain-with-head" },
        },
        {
          id: "ll1-s5",
          eyebrow: "Step 5 of 6",
          title: "The last node points to null",
          body: "The tail node's pointer doesn't lead anywhere — it points to null (or None). This is how you know traversal is finished. Null is the stop sign at the end of the road.",
          visual: { scene: "chain-with-null" },
          checkpoint: {
            type: "multiple-choice",
            prompt: "What does the HEAD pointer tell you?",
            options: [
              { id: "a", label: "The middle node" },
              { id: "b", label: "The first node" },
              { id: "c", label: "The last node" },
              { id: "d", label: "The longest path" },
            ],
            correctAnswer: "b",
            explanation:
              "HEAD always points to the first node. It is your only guaranteed entry point into the list — without it you cannot access any node.",
          },
        },
        {
          id: "ll1-s6",
          eyebrow: "Step 6 of 6",
          title: "Arrays vs Linked Lists",
          body: "Arrays are contiguous — all slots live next to each other in memory and share one address block. Linked list nodes are scattered; each one lives wherever memory had space. Pointers stitch them together.",
          visual: { scene: "chain-contrast" },
        },
      ],
    },
    {
      segment: "traversal-and-search",
      order: 2,
      title: "Traversal & Search",
      shortTitle: "Traversal",
      overview:
        "To find any value you must walk the chain from HEAD, checking one node at a time. There is no shortcut — no index jump.",
      lessonGoal:
        "Understand why linked list search costs O(n) steps and feel the difference from constant-time array access.",
      learningFocus: [
        "Traversal always starts at HEAD.",
        "You check one node at a time — there is no jump.",
        "Finding the nth item costs n steps, so the cost is O(n).",
      ],
      voiceSeedPrompt:
        "Walk the learner along the chain node by node, making the cursor feel like a person who can only see the next door — never the whole street at once.",
      steps: [
        {
          id: "ll2-s1",
          eyebrow: "Step 1 of 6",
          title: "Start with a full list, all dim",
          body: "We have a five-node list. Right now every node is waiting — none has been visited. We are searching for the value 37.",
          visual: { scene: "traversal-idle" },
        },
        {
          id: "ll2-s2",
          eyebrow: "Step 2 of 6",
          title: "The cursor moves node by node",
          body: "We set a pointer to HEAD and start moving. At each step we can only see the current node and the arrow to the next. Watch the glowing ring travel across the chain.",
          visual: { scene: "traversal-moving", phase: 0 },
        },
        {
          id: "ll2-s3",
          eyebrow: "Step 3 of 6",
          title: "Checking each node",
          body: "At every stop the algorithm asks: is this node's value equal to 37? If yes — done. If no — follow the pointer and move on. There is no peeking ahead.",
          visual: { scene: "traversal-moving", phase: 1 },
        },
        {
          id: "ll2-s4",
          eyebrow: "Step 4 of 6",
          title: "Found — node 4 lights up",
          body: "Node 4 holds 37. The cursor stops, the node turns green. We needed four hops to get here. If the list had 1000 nodes and 37 was last, we'd need 1000 hops.",
          visual: { scene: "traversal-found" },
        },
        {
          id: "ll2-s5",
          eyebrow: "Step 5 of 6",
          title: "The cost grows with the list",
          body: "Watch the step counter tick up as the cursor moves. Every extra node in the list is a potential extra step. This is what O(n) means — the cost scales with the length n.",
          visual: { scene: "traversal-cost" },
          checkpoint: {
            type: "drag-order",
            prompt: "Put these traversal steps in the correct order.",
            options: [
              { id: "check", label: "Check current node" },
              { id: "move", label: "Move to next" },
              { id: "start", label: "Start at HEAD" },
              { id: "result", label: "Return result" },
            ],
            correctAnswer: "start,check,move,result",
            explanation:
              "You always begin at HEAD, then check the current node's value, follow the pointer to the next, and finally return when found (or null when exhausted).",
          },
        },
        {
          id: "ll2-s6",
          eyebrow: "Step 6 of 6",
          title: "Linked list vs array lookup",
          body: "An array lets you jump directly: arr[3] is instant — O(1). A linked list must walk: 1 hop, 2 hops, 3 hops… O(n). Both store data. The structure determines the cost.",
          visual: { scene: "traversal-race" },
        },
      ],
    },
    {
      segment: "insertion-and-deletion",
      order: 3,
      title: "Insertion & Deletion",
      shortTitle: "Insert / Delete",
      overview:
        "Once you hold a pointer to the right node, inserting or deleting costs only a pointer swap — no shifting required.",
      lessonGoal:
        "See why pointer rewiring makes insertion and deletion O(1) at a known position, and contrast this with the array's shifting cost.",
      learningFocus: [
        "Insert by rewiring two pointers — no nodes move.",
        "Delete by skipping the target node in the pointer chain.",
        "O(1) at a known position, but finding that position is still O(n).",
      ],
      voiceSeedPrompt:
        "Frame insertion as threading a bead onto a necklace: you only need to unhook one clasp and reattach two — the rest of the chain stays still.",
      steps: [
        {
          id: "ll3-s1",
          eyebrow: "Step 1 of 4",
          title: "Start with four nodes: A → B → C → D",
          body: "We have a chain: A points to B, B points to C, C points to D, D points to null. We want to insert a new node X between B and C.",
          visual: { scene: "insertion-list" },
        },
        {
          id: "ll3-s2",
          eyebrow: "Step 2 of 4",
          title: "Insert X between B and C",
          body: "X appears above the list. First, X's pointer is aimed at C. Then B's pointer is redirected from C to X. X slides into place. Two pointer changes — every other node stays exactly where it was.",
          visual: { scene: "insertion-animate" },
          checkpoint: {
            type: "multi-select",
            prompt: "Which pointers need to change when inserting X between B and C?",
            options: [
              { id: "ab", label: "A → B" },
              { id: "bx", label: "B → X" },
              { id: "xc", label: "X → C" },
              { id: "cd", label: "C → D" },
            ],
            correctAnswer: "bx,xc",
            explanation:
              "Only two pointers change: B must now point to X (instead of C), and X must point to C. A→B and C→D are untouched.",
          },
        },
        {
          id: "ll3-s3",
          eyebrow: "Step 3 of 4",
          title: "Delete node B",
          body: "To remove B, A's pointer is redirected from B straight to C. B fades out and disappears. No nodes shifted — we simply skipped B in the chain. The garbage collector reclaims B later.",
          visual: { scene: "deletion-animate" },
        },
        {
          id: "ll3-s4",
          eyebrow: "Step 4 of 4",
          title: "O(1) at the pointer, O(n) to find it",
          body: "The pointer swap itself is O(1) — two assignments, done. But finding the correct position first requires traversal, which is O(n). Linked lists trade memory layout for cheap structural edits.",
          visual: { scene: "pointer-cost" },
        },
      ],
    },
  ] satisfies LLLessonDefinition[],
};

export function getLinkedListLesson(segment: string): LLLessonDefinition | undefined {
  return linkedListCourse.lessons.find((l) => l.segment === segment);
}

export function getLinkedListLessonIndex(segment: string): number {
  return linkedListCourse.lessons.findIndex((l) => l.segment === segment);
}

export function getAdjacentLinkedListLessons(segment: string): {
  previousLesson?: LLLessonDefinition;
  nextLesson?: LLLessonDefinition;
} {
  const index = getLinkedListLessonIndex(segment);
  if (index === -1) return {};
  return {
    previousLesson: linkedListCourse.lessons[index - 1],
    nextLesson: linkedListCourse.lessons[index + 1],
  };
}
