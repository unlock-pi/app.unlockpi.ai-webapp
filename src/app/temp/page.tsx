import { ArrayStrip } from "@/features/courses/arrays/components/array-strip";

export default function Page() {
  const data = ["a", "b", "c", "d", "e"];

  return (
    <div className="flex flex-1 flex-col gap-2 bg-[#cfcfcf] px-8 py-12">
      <ArrayStrip
        data={data}
        disabledElements={[0, 1, 3, 4]}
        name="Arr"
        showIndex
        activeIndex={2}
      />
    </div>
  );
}
