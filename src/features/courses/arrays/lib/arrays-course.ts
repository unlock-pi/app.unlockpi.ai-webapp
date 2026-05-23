export type ArrayLessonTone = "default" | "active" | "muted" | "success" | "warning";

export interface ArrayLessonCell {
  id: string;
  value: string;
  tag: string;
  detail: string;
  tone?: ArrayLessonTone;
}

export interface ArrayLessonCheckpointOption {
  id: string;
  label: string;
}

export interface ArrayLessonCheckpoint {
  prompt: string;
  options: ArrayLessonCheckpointOption[];
  correctOptionId: string;
  explanation: string;
}

export interface ArrayLessonDefinition {
  segment: string;
  order: number;
  title: string;
  shortTitle: string;
  overview: string;
  lessonGoal: string;
  learningFocus: string[];
  voiceSeedPrompt: string;
  visualTitle: string;
  visualHint: string;
  cells: ArrayLessonCell[];
  activeIndex: number;
  checkpoint?: ArrayLessonCheckpoint;
}

export const arraysCourse = {
  coursePath: "/dashboard/courses/array",
  title: "Arrays",
  description:
    "A focused visual course about how arrays store values, how indexing works, and why shifting makes some operations slower than others.",
  lessons: [
    {
      segment: "what-is-an-array",
      order: 1,
      title: "What is an array?",
      shortTitle: "",
      overview:
        "An array is a sequence of slots placed in order. Each slot stores one value, and the order makes the structure useful.",
      lessonGoal:
        "Build the first mental model: arrays are not just data, they are positions plus values.",
      learningFocus: [
        "Every value sits in a numbered slot.",
        "The order matters because each slot has meaning.",
        "You can think of the whole structure as one line, not scattered variables.",
      ],
      voiceSeedPrompt:
        "Walk the learner across the row of boxes and explain that each position is part of the meaning, not just decoration.",
      visualTitle: "A row of boxes",
      visualHint:
        "Hover or click any slot. The detail changes, which makes the array feel like a structure instead of random numbers.",
      cells: [
        {
          id: "intro-0",
          value: "14",
          tag: "index 0",
          detail: "This is the first slot. In arrays, the first index is usually 0.",
        },
        {
          id: "intro-1",
          value: "18",
          tag: "index 1",
          detail: "This slot is next to index 0, so its position is part of the data story.",
          tone: "active",
        },
        {
          id: "intro-2",
          value: "11",
          tag: "index 2",
          detail: "Even when the value changes, the slot keeps its identity.",
        },
        {
          id: "intro-3",
          value: "20",
          tag: "index 3",
          detail: "Arrays group values into one ordered line that we can inspect or traverse.",
        },
      ],
      activeIndex: 1,
      checkpoint: {
        prompt: "Which description best matches an array?",
        options: [
          { id: "line", label: "A line of values you can access by index" },
          { id: "tree", label: "A branching structure with many levels" },
          { id: "bag", label: "A random bag of unrelated values" },
        ],
        correctOptionId: "line",
        explanation:
          "An array is an ordered line of values, and the index tells you which slot to read or update.",
      },
    },
    {
      segment: "indexing",
      order: 2,
      title: "Indexing lets you jump directly",
      shortTitle: "Indexing",
      overview:
        "The biggest power of an array is that if you know the index, you can jump straight to that value.",
      lessonGoal:
        "Understand why reading `arr[2]` is different from scanning a list one item at a time.",
      learningFocus: [
        "Index 0 is the first position.",
        "Index 2 is the third position.",
        "Direct index access is usually the fast move.",
      ],
      voiceSeedPrompt:
        "Ask the learner to predict which slot lights up when you say index 2, then explain why the answer is the third box.",
      visualTitle: "Jump to a position",
      visualHint:
        "Select a box and imagine the code saying `array[index]`. The position is the address, the value is what lives there.",
      cells: [
        {
          id: "index-0",
          value: "red",
          tag: "index 0",
          detail: "Index 0 returns the first value immediately.",
        },
        {
          id: "index-1",
          value: "blue",
          tag: "index 1",
          detail: "Index 1 returns the second value.",
        },
        {
          id: "index-2",
          value: "green",
          tag: "index 2",
          detail: "Index 2 returns `green`. We jumped straight to the third slot.",
          tone: "success",
        },
        {
          id: "index-3",
          value: "amber",
          tag: "index 3",
          detail: "Index 3 returns the fourth value in the line.",
        },
      ],
      activeIndex: 2,
      checkpoint: {
        prompt: "If an array is `[10, 20, 30, 40]`, what does index `2` point to?",
        options: [
          { id: "twenty", label: "20" },
          { id: "thirty", label: "30" },
          { id: "forty", label: "40" },
        ],
        correctOptionId: "thirty",
        explanation:
          "Arrays usually start at 0, so index 2 means the third slot, which stores `30`.",
      },
    },
    {
      segment: "updating",
      order: 3,
      title: "Updating changes the value, not the slot",
      shortTitle: "Updating",
      overview:
        "When you update an array element, the position stays the same. Only the value inside that slot changes.",
      lessonGoal:
        "Separate the idea of position from the idea of value so updates feel predictable.",
      learningFocus: [
        "The slot identity stays fixed.",
        "The value can be replaced.",
        "An update is not an insertion.",
      ],
      voiceSeedPrompt:
        "Narrate this as rewriting a label on one box rather than rebuilding the whole row.",
      visualTitle: "Rewrite one slot",
      visualHint:
        "Notice how the highlighted slot is still in the same place. The change is inside the slot, not in the structure around it.",
      cells: [
        {
          id: "update-0",
          value: "A",
          tag: "index 0",
          detail: "The first slot stays exactly where it is.",
        },
        {
          id: "update-1",
          value: "B",
          tag: "index 1",
          detail: "Nearby slots are unaffected by a direct update.",
        },
        {
          id: "update-2",
          value: "Z",
          tag: "index 2",
          detail: "This slot used to store something else. The slot remains, only the stored value changed.",
          tone: "warning",
        },
        {
          id: "update-3",
          value: "D",
          tag: "index 3",
          detail: "The array length did not change at all.",
        },
      ],
      activeIndex: 2,
    },
    {
      segment: "insert-delete",
      order: 4,
      title: "Insertions and deletions can cause shifting",
      shortTitle: "Shifting",
      overview:
        "When you insert or delete in the middle, later values may need to shift left or right to keep the sequence intact.",
      lessonGoal:
        "See why array access feels cheap but reshaping the middle of the line can feel expensive.",
      learningFocus: [
        "Insert near the front and later slots move right.",
        "Delete near the front and later slots move left.",
        "The closer to the middle, the more shifting you often cause.",
      ],
      voiceSeedPrompt:
        "Turn this into a spatial explanation: which boxes physically move if a new value appears at index 1?",
      visualTitle: "A shift in the line",
      visualHint:
        "The active slot marks the insertion point. The quieter slots show the chain reaction after that point.",
      cells: [
        {
          id: "shift-0",
          value: "8",
          tag: "stays",
          detail: "Values before the insertion point often stay where they are.",
        },
        {
          id: "shift-1",
          value: "13",
          tag: "insert here",
          detail: "A new value arriving here forces everything after it to make room.",
          tone: "active",
        },
        {
          id: "shift-2",
          value: "21",
          tag: "shift",
          detail: "This value may slide to the right when the row makes space.",
          tone: "muted",
        },
        {
          id: "shift-3",
          value: "34",
          tag: "shift",
          detail: "The further the line continues, the more slots may be affected.",
          tone: "muted",
        },
      ],
      activeIndex: 1,
      checkpoint: {
        prompt: "Which operation is usually the cheapest in an array?",
        options: [
          { id: "read", label: "Reading `arr[4]` when index 4 exists" },
          { id: "insert-front", label: "Inserting at index 0" },
          { id: "delete-middle", label: "Deleting from index 1" },
        ],
        correctOptionId: "read",
        explanation:
          "Reading by index is usually cheapest because no other slots need to move.",
      },
    },
    {
      segment: "traversal",
      order: 5,
      title: "Traversal is where arrays become useful",
      shortTitle: "Traversal",
      overview:
        "Real problems often use arrays by walking across them in order to sum, search, or transform values.",
      lessonGoal:
        "Understand the difference between touching one slot and visiting the whole structure.",
      learningFocus: [
        "Traversal means moving slot by slot.",
        "You can search, total, or transform values during the walk.",
        "This is the bridge to algorithms you will build later.",
      ],
      voiceSeedPrompt:
        "Guide the learner from left to right and explain that traversal means asking every slot a question in order.",
      visualTitle: "Walking the array",
      visualHint:
        "The active slot behaves like a pointer in motion. Imagine it sweeping left to right until every box has been visited.",
      cells: [
        {
          id: "walk-0",
          value: "2",
          tag: "visit",
          detail: "Traversal begins at the start of the array.",
        },
        {
          id: "walk-1",
          value: "4",
          tag: "visit",
          detail: "Then it continues one slot at a time.",
        },
        {
          id: "walk-2",
          value: "6",
          tag: "pointer",
          detail: "The active pointer is here right now, but eventually every slot gets a turn.",
          tone: "active",
        },
        {
          id: "walk-3",
          value: "8",
          tag: "visit",
          detail: "Traversal keeps the order stable while you process values.",
        },
        {
          id: "walk-4",
          value: "10",
          tag: "finish",
          detail: "When the pointer reaches the end, the full array has been processed.",
        },
      ],
      activeIndex: 2,
    },
  ] satisfies ArrayLessonDefinition[],
};

export function getArrayLesson(segment: string): ArrayLessonDefinition | undefined {
  return arraysCourse.lessons.find((lesson) => lesson.segment === segment);
}

export function getArrayLessonIndex(segment: string): number {
  return arraysCourse.lessons.findIndex((lesson) => lesson.segment === segment);
}

export function getAdjacentArrayLessons(segment: string): {
  previousLesson?: ArrayLessonDefinition;
  nextLesson?: ArrayLessonDefinition;
} {
  const index = getArrayLessonIndex(segment);

  if (index === -1) {
    return {};
  }

  return {
    previousLesson: arraysCourse.lessons[index - 1],
    nextLesson: arraysCourse.lessons[index + 1],
  };
}
