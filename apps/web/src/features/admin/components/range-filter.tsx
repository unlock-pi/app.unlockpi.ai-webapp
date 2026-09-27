"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { CalendarIcon } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RANGE_OPTIONS } from "@/features/admin/lib/range";

/**
 * Writes the selected range to the `?range=` query param so the server
 * component re-fetches and the link stays shareable. A full custom date-range
 * calendar is the next phase — this establishes the URL-driven pattern.
 */
export function RangeFilter({ value }: { value: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const onChange = (next: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", next);
    params.delete("page");
    router.push(`?${params.toString()}`);
  };

  return (
    // `items` is what lets SelectValue render the LABEL ("Last 30 days")
    // instead of the raw stored value ("30").
    <Select
      items={RANGE_OPTIONS as unknown as { label: string; value: string }[]}
      value={value}
      onValueChange={(next) => onChange(String(next))}
    >
      <SelectTrigger size="sm" className="w-40">
        <CalendarIcon className="size-4 text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {RANGE_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
