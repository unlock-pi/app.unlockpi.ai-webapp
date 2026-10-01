"use client";

import { useState } from "react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type PaginationState,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { CardFrame, CardFrameFooter } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type DataTableProps<TData> = {
  columns: ColumnDef<TData>[];
  data: TData[];
  pageSize?: number;
  emptyLabel?: string;
  /** Row click → detail. Makes rows look and behave clickable. */
  onRowClick?: (row: TData) => void;
};

/**
 * One TanStack table for the whole admin panel — sorting + client pagination +
 * coss card-table styling + optional clickable rows. Views just supply columns.
 */
export function DataTable<TData>({
  columns,
  data,
  pageSize = 10,
  emptyLabel = "No results.",
  onRowClick,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  });

  const table = useReactTable({
    columns,
    data,
    enableSortingRemoval: false,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    state: { pagination, sorting },
  });

  const { pageIndex } = table.getState().pagination;
  const total = table.getRowCount();
  const first = total === 0 ? 0 : pageIndex * pagination.pageSize + 1;
  const last = Math.min((pageIndex + 1) * pagination.pageSize, total);

  return (
    <CardFrame className="w-full">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const sorted = header.column.getIsSorted();
                return (
                  <TableHead
                    key={header.id}
                    style={
                      header.column.getSize()
                        ? { width: `${header.column.getSize()}px` }
                        : undefined
                    }
                  >
                    {header.isPlaceholder ? null : canSort ? (
                      <button
                        type="button"
                        className="flex h-full cursor-pointer select-none items-center gap-1.5 text-left"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {sorted === "asc" ? (
                          <ChevronUpIcon className="size-3.5 shrink-0 opacity-70" />
                        ) : sorted === "desc" ? (
                          <ChevronDownIcon className="size-3.5 shrink-0 opacity-70" />
                        ) : (
                          <ChevronsUpDownFaint />
                        )}
                      </button>
                    ) : (
                      flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className={cn(onRowClick && "cursor-pointer")}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center text-muted-foreground"
              >
                {emptyLabel}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {total > pagination.pageSize ? (
        <CardFrameFooter className="flex items-center justify-between gap-2 p-2">
          <p className="pl-2 text-xs text-muted-foreground tabular-nums">
            {first}–{last} of {total}
          </p>
          <div className="flex items-center gap-1">
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Previous page"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
            >
              <ChevronLeftIcon className="size-4" />
            </Button>
            <span className="px-1 text-xs text-muted-foreground tabular-nums">
              {pageIndex + 1} / {table.getPageCount()}
            </span>
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Next page"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
            >
              <ChevronRightIcon className="size-4" />
            </Button>
          </div>
        </CardFrameFooter>
      ) : null}
    </CardFrame>
  );
}

function ChevronsUpDownFaint() {
  return (
    <span className="flex shrink-0 flex-col opacity-30">
      <ChevronUpIcon className="size-3 -mb-1" />
      <ChevronDownIcon className="size-3" />
    </span>
  );
}
