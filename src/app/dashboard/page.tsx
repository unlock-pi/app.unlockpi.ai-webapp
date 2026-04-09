import dynamic from "next/dynamic"

import { SectionCards } from "@/components/section-cards"

import data from "./data.json"

const ChartAreaInteractive = dynamic(
  () =>
    import("@/components/chart-area-interactive").then(
      (module) => module.ChartAreaInteractive
    ),
  {
    loading: () => (
      <div className="h-62.5 w-full animate-pulse rounded-xl border border-(--color-darker-gray) bg-(--color-darkest-gray)/60" />
    ),
  }
)

const DataTable = dynamic<{ data: typeof data }>(
  () => import("@/components/data-table").then((module) => module.DataTable),
  {
    loading: () => (
      <div className="h-105 w-full animate-pulse rounded-xl border border-(--color-darker-gray) bg-(--color-darkest-gray)/60" />
    ),
  }
)

export default function Page() {
  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <SectionCards />
        <div className="px-4 lg:px-6">
          <ChartAreaInteractive />
        </div>
        <DataTable data={data} />
      </div>
    </div>
  )
}
