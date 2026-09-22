import { ArrayStrip } from "@/components/data-structure/array-strip";
import { ArraysAgentDemo } from "@/features/arrays-agent/components/arrays-agent-demo";

export default function Page() {
  const data = ["a", "b", "c", "d", "e"];

  return (
    <div className="flex flex-1 flex-col gap-2  px-8 py-4">
      
      <ArraysAgentDemo />

      {/* <ArrayStrip
        data={data}
        disabledElements={[0, 1, 3, 4]}
        name="Arr"
        showIndex
        activeIndex={2}
      />
      <div className="flex items-center gap-4">
        <div className="size-10 rounded-sm bg-primary"></div>
        <p>primary</p>
      </div>
      <div className="flex items-center gap-4">
      <div className="size-10 rounded-sm bg-accent"></div>
        <p>accent</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="size-10 rounded-sm bg-secondary"></div>
        <p>secondary</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="size-10 rounded-sm bg-destructive"></div>
        <p>destructive</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="size-10 rounded-sm bg-muted"></div>
        <p>muted</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="size-10 rounded-sm bg-muted-foreground"></div>
        <p>muted-foreground</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="size-10 rounded-sm bg-accent-foreground"></div>
        <p>accent-foreground</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="size-10 rounded-sm bg-card"></div>
        <p>card</p>
      </div> */}
    </div>
  );
}
