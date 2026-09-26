// Highlighting elements demo with a human touch.

import { Highlighter } from "@/components/ui/highlighter";

export default function Page() {
  return (
    <div className="flex flex-1 flex-col gap-2 px-8 py-4">
      <h1 className="text-2xl font-bold">Highlighting Elements Demo</h1>
      <p className="text-lg text-gray-600">
        <Highlighter>Highlighter</Highlighter> Highlighting elements with a
        human touch.
      </p>
    </div>
  );
}
