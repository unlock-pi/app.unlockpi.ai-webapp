import type {
  ArrayBlockProps,
  CanvasDocument,
  CanvasTemplate,
  CanvasTemplateKey,
} from "@/features/canvas/types/canvas-types";
import { DEFAULT_CANVAS_THEME } from "@/features/canvas/lib/canvas-theme";

type CanvasContent = CanvasDocument["content"];
type CanvasContentItem = CanvasContent[number];

const templateImageMap: Record<CanvasTemplateKey, string> = {
  "array-intro": "/templates/image-Photoroom.png",
  "array-operations": "/templates/image-Photoroom (3).png",
  "linked-list-basics": "/templates/image-Photoroom (2).png",
  "complexity-basics": "/templates/image-removebg-preview (8).png",
  "recursion-basics": "/templates/image-Photoroom (4).png",
  empty: "/templates/image-Photoroom (5).png",
};

export function getCanvasTemplateImage(templateKey: CanvasTemplateKey) {
  return templateImageMap[templateKey];
}

export function createCanvasId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function values(items: string[]): ArrayBlockProps["values"] {
  return items.map((value) => ({ value }));
}

function createDocument(title: string, content: CanvasContent): CanvasDocument {
  return {
    root: {
      props: {
        title,
        subject: "computer_science",
        theme: DEFAULT_CANVAS_THEME,
        typographyScale: "base",
      },
    },
    content: content.map((item, index) =>
      item.type === "SlideBlock"
        ? {
            ...item,
            props: {
              ...item.props,
              frameLabel: `Frame ${index + 1}`,
            },
          }
        : item
    ),
  };
}

function frame(
  title: string,
  teachingBeat: "hook" | "explain" | "practice" | "recap",
  notes: string,
  content: CanvasContentItem[] = []
): CanvasContentItem {
  return {
    type: "SlideBlock",
    props: {
      id: createCanvasId("slide"),
      title,
      teachingBeat,
      notes,
      content,
    },
  };
}

function headingBlock(text: string): CanvasContentItem {
  return {
    type: "HeadingTextBlock",
    props: {
      id: createCanvasId("heading"),
      text,
    },
  };
}

function subheadingBlock(text: string): CanvasContentItem {
  return {
    type: "SubheadingTextBlock",
    props: {
      id: createCanvasId("subheading"),
      text,
    },
  };
}

function bodyTextBlock(text: string): CanvasContentItem {
  return {
    type: "BodyTextBlock",
    props: {
      id: createCanvasId("body"),
      text,
    },
  };
}

function arrayBlock(
  title: string,
  items: string[],
  highlightedIndex: number | undefined,
  caption: string
): CanvasContentItem {
  return {
    type: "ArrayBlock",
    props: {
      id: createCanvasId("array"),
      title,
      values: values(items),
      highlightedIndex,
      showIndices: true,
      caption,
    },
  };
}

function checkpointBlock(question: string, answer: string): CanvasContentItem {
  return {
    type: "CheckpointBlock",
    props: {
      id: createCanvasId("checkpoint"),
      question,
      answer,
    },
  };
}

function mermaidBlock(description: string, chart: string): CanvasContentItem {
  return {
    type: "MermaidBlock",
    props: {
      id: createCanvasId("mermaid"),
      chart,
      description,
    },
  };
}

export function createCanvasTemplate(key: CanvasTemplateKey): CanvasTemplate {
  if (key === "empty") {
    return {
      key,
      title: "Empty CS canvas",
      description: "Start with one blank teaching frame and add blocks as you go.",
      image: getCanvasTemplateImage(key),
      document: createDocument("Untitled CS canvas", [
        frame("Frame 1", "hook", "Set the context for the class."),
      ]),
    };
  }

  if (key === "linked-list-basics") {
    return {
      key,
      title: "Linked list basics",
      description: "A ready-made frame set for nodes, pointers, and traversal.",
      image: getCanvasTemplateImage(key),
      document: createDocument("Linked list basics", [
        frame("Hook: train carriages", "hook", "Compare each node to one connected carriage.", [
          headingBlock("A linked list is a chain of nodes"),
          bodyTextBlock("Each node stores a value and a reference to the next node."),
        ]),
        frame("Explain: head, node, tail", "explain", "Show students what each pointer is doing.", [
          arrayBlock("Values to compare", ["7", "3", "9"], 0, "Use this row to compare with linked storage."),
          {
            type: "LinkedListBlock",
            props: {
              id: createCanvasId("list"),
              title: "Linked list",
              nodes: values(["head", "node", "tail"]),
              caption: "The head starts the chain and the tail ends it.",
            },
          },
        ]),
      ]),
    };
  }

  if (key === "complexity-basics") {
    return {
      key,
      title: "Time complexity basics",
      description: "Frames for big-O intuition, tradeoffs, and examples.",
      image: getCanvasTemplateImage(key),
      document: createDocument("Time complexity basics", [
        frame("Hook: which grows faster?", "hook", "Let the room compare small input growth first.", [
          headingBlock("Time complexity compares growth"),
          subheadingBlock("We care about how work scales as input grows."),
        ]),
        frame("Explain: common classes", "explain", "Contrast constant, linear, and quadratic examples.", [
          {
            type: "MindMapBlock",
            props: {
              id: createCanvasId("mindmap"),
              title: "Common complexity classes",
              center: "Big O",
              branches: [
                { label: "O(1)", detail: "Constant work" },
                { label: "O(n)", detail: "Linear growth" },
                { label: "O(n^2)", detail: "Nested loops" },
                { label: "O(log n)", detail: "Divide and narrow" },
              ],
            },
          },
          mermaidBlock(
            "Use a quick diagram to compare how common growth rates relate.",
            "flowchart LR\n  O1[O(1)] --> On[O(n)] --> On2[O(n^2)]\n  O1 --> Olog[O(log n)]",
          ),
        ]),
      ]),
    };
  }

  if (key === "recursion-basics") {
    return {
      key,
      title: "Recursion basics",
      description: "Use frames for base case, recursive case, and call-stack thinking.",
      image: getCanvasTemplateImage(key),
      document: createDocument("Recursion basics", [
        frame("Hook: mirrors inside mirrors", "hook", "Connect recursion to a repeated self-pattern.", [
          headingBlock("Recursion solves a problem with a smaller version of itself"),
          bodyTextBlock("Every recursive solution needs a base case and a recursive case."),
        ]),
        frame("Explain: factorial", "explain", "Walk the class through the stopping rule first.", [
          {
            type: "CodeBlock",
            props: {
              id: createCanvasId("code"),
              title: "Factorial",
              language: "javascript",
              code: "function fact(n) {\n  if (n <= 1) return 1;\n  return n * fact(n - 1);\n}",
              explanation: "The base case stops the recursion. The recursive case reduces the problem.",
            },
          },
          checkpointBlock(
            "What happens first in a recursive function?",
            "The function must check whether it has reached the base case."
          ),
        ]),
      ]),
    };
  }

  if (key === "array-operations") {
    return {
      key,
      title: "Array operations lab",
      description: "Explain indexing, update, insert, and delete with editable arrays.",
      image: getCanvasTemplateImage(key),
      document: createDocument("Array operations lab", [
        frame("Warm up: arrays are indexed slots", "hook", "Ask students where the first item lives.", [
          headingBlock("Every slot has an address"),
          bodyTextBlock("Before touching code, make the class name the first and last index."),
          arrayBlock(
            "Array A",
            ["8", "5", "0", "1", "4"],
            0,
            "A[0] is the first visible slot."
          ),
        ]),
        frame("Mutation: update one slot", "explain", "Change a value and keep the index fixed.", [
          arrayBlock(
            "Update A[2]",
            ["8", "5", "9", "1", "4"],
            2,
            "Only the value changed. The positions stayed the same."
          ),
          checkpointBlock(
            "If A[2] changes from 0 to 9, which index moved?",
            "No index moved. Only the value at index 2 changed."
          ),
        ]),
      ]),
    };
  }

  return {
    key,
    title: "What is an array?",
    description: "A three-frame intro lesson for first-time array learners.",
    image: getCanvasTemplateImage(key),
    document: createDocument("What is an array?", [
      frame(
        "Hook: a row of lockers",
        "hook",
        "Connect arrays to a physical row where every position has an address.",
        [
          headingBlock("An array is positions plus values"),
          subheadingBlock("The position is the index."),
          bodyTextBlock("The thing stored there is the element."),
        ]
      ),
      frame("Explain: index and element", "explain", "Show that indexes count positions, not values.", [
        arrayBlock(
          "Array A",
          ["8", "5", "0", "1", "4", "9"],
          2,
          "Index 2 points to the value 0 in this example."
        ),
      ]),
      frame("Practice: ask the room", "practice", "Ask students to identify A[4], then change values live.", [
        checkpointBlock(
          "What is the value at A[4]?",
          "A[4] is 4 because the first slot starts at index 0."
        ),
      ]),
    ]),
  };
}

export const canvasTemplateOptions: Array<
  Pick<CanvasTemplate, "description" | "image" | "key" | "title">
> = [
  {
    key: "array-intro",
    title: "What is an array?",
    description: "Frames for hook, explanation, and first student check.",
    image: getCanvasTemplateImage("array-intro"),
  },
  {
    key: "array-operations",
    title: "Array operations lab",
    description: "A more interactive template for updates and index changes.",
    image: getCanvasTemplateImage("array-operations"),
  },
  {
    key: "linked-list-basics",
    title: "Linked list basics",
    description: "A structure-first lesson on head, nodes, and traversal.",
    image: getCanvasTemplateImage("linked-list-basics"),
  },
  {
    key: "complexity-basics",
    title: "Time complexity basics",
    description: "A theory-first lesson for O(1), O(n), O(log n), and O(n^2).",
    image: getCanvasTemplateImage("complexity-basics"),
  },
  {
    key: "recursion-basics",
    title: "Recursion basics",
    description: "A direct theory template for base case and recursive case thinking.",
    image: getCanvasTemplateImage("recursion-basics"),
  },
  {
    key: "empty",
    title: "Start empty",
    description: "One blank CS frame with no prebuilt blocks.",
    image: getCanvasTemplateImage("empty"),
  },
];
