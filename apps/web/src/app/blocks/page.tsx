import Link from "next/link";

const BLOCKS = [
  { href: "/blocks/array", label: "Array", hint: "ArrayView demo" },
  { href: "/blocks/stack", label: "Stack", hint: "StackView demo" },
  { href: "/blocks/queues", label: "Queues", hint: "QueueView demo" },
  { href: "/blocks/linkedlist", label: "Linked List", hint: "LinkedListView demo" },
  { href: "/blocks/arrays-agent", label: "Arrays Agent", hint: "Voice-driven array agent" },
  { href: "/blocks/pn-junction", label: "PN Junction", hint: "Semiconductor junction demo" },
  { href: "/blocks/digital-circuits", label: "Digital Circuits", hint: "Logic gate circuits" },
  { href: "/blocks/amplitude-modulation", label: "Amplitude Modulation", hint: "AM waveform demo" },
];

export default function BlocksIndexPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-4 py-12 sm:px-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Blocks
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Internal playground for the teaching components in{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            @unlockpi/blocks
          </code>
          . Dev-only.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {BLOCKS.map((block) => (
          <Link
            key={block.href}
            href={block.href}
            className="group flex flex-col gap-1 rounded-2xl border border-border/60 bg-card/50 p-4 transition-all duration-200 hover:border-border hover:bg-accent/40"
          >
            <span className="text-sm font-semibold tracking-tight text-foreground">
              {block.label}
            </span>
            <span className="text-xs text-muted-foreground">{block.hint}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
