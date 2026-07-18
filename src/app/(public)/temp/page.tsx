import { ArrayStrip } from "@/components/data-structure/array-strip";

export default function Page() {
  const data = ["a", "b", "c", "d", "e"];

  return (
    <div className="flex flex-1 flex-col gap-2  px-8 py-12">
      <ArrayStrip
        data={data}
        disabledElements={[0, 1, 3, 4]}
        name="Arr"
        showIndex
        activeIndex={2}
      />
      <div className="size-10 rounded-sm bg-primary"></div>
      <div className="size-10 rounded-sm bg-accent"></div>
      <div className="size-10 rounded-sm bg-accent-foreground"></div>
      <div className="size-10 rounded-sm bg-card"></div>
      <div className="size-10 rounded-sm bg-muted"></div>
      <div className="size-10 rounded-sm bg-muted-foreground"></div>
    </div>
  );
}
