"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { CardFrame, CardFrameFooter } from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type AdminDataTableProps<TData> = {
  columns: ColumnDef<TData>[];
  /** Only the current page's rows — the server already sliced them. */
  data: TData[];
  /** 1-based current page. */
  page: number;
  pageSize: number;
  /** Total row count across all pages (from a DB count, not data.length). */
  total: number;
  emptyLabel?: string;
  onRowClick?: (row: TData) => void;
  /** Query param this table paginates with, so two tables can coexist. */
  pageParam?: string;
};

/**
 * Server-paginated table. Unlike a client-paginated table, it only ever
 * receives one page of rows — page state lives in the URL, so navigating
 * refetches on the server instead of shipping every row to the browser.
 *
 * While a page change is in flight, only the tbody rows swap to skeletons.
 * The header and footer stay put so the layout never jumps.
 */
export function AdminDataTable<TData>({
  columns,
  data,
  page,
  pageSize,
  total,
  emptyLabel = "No results.",
  onRowClick,
  pageParam = "page",
}: AdminDataTableProps<TData>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const table = useReactTable({
    columns,
    data,
    getCoreRowModel: getCoreRowModel(),
    // Pagination is handled by the server; don't let the table re-slice rows.
    manualPagination: true,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  });

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  const goToPage = (next: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(pageParam, String(next));
    startTransition(() => router.push(`?${params.toString()}`));
  };

  return (
    <CardFrame className="w-full">
      <Table className="table-fixed">
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow className="hover:bg-transparent" key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const columnSize = header.column.getSize();
                return (
                  <TableHead
                    key={header.id}
                    style={columnSize ? { width: `${columnSize}px` } : undefined}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isPending ? (
            // Micro-level skeletons: only the rows, so the header and footer
            // never disappear while the next page loads.
            Array.from({ length: Math.max(data.length, 5) }).map((_, index) => (
              <TableRow key={`skeleton-${index}`} className="hover:bg-transparent">
                {columns.map((_column, columnIndex) => (
                  <TableCell key={columnIndex}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : table.getRowModel().rows.length ? (
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
                className="h-24 text-center text-muted-foreground"
                colSpan={columns.length}
              >
                {emptyLabel}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <CardFrameFooter className="p-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 whitespace-nowrap">
            <p className="text-muted-foreground text-sm">Viewing</p>
            <Select
              items={Array.from({ length: pageCount }, (_, index) => {
                const start = index * pageSize + 1;
                const end = Math.min((index + 1) * pageSize, total);
                return { label: `${start}-${end}`, value: index + 1 };
              })}
              onValueChange={(value) => goToPage(Number(value))}
              value={page}
            >
              <SelectTrigger
                aria-label="Select result range"
                className="w-fit min-w-none"
                size="sm"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectPopup>
                {Array.from({ length: pageCount }, (_, index) => {
                  const start = index * pageSize + 1;
                  const end = Math.min((index + 1) * pageSize, total);
                  return (
                    <SelectItem key={index + 1} value={index + 1}>
                      {`${start}-${end}`}
                    </SelectItem>
                  );
                })}
              </SelectPopup>
            </Select>
            <p className="text-muted-foreground text-sm">
              of{" "}
              <strong className="font-medium text-foreground tabular-nums">
                {total}
              </strong>{" "}
              results
            </p>
          </div>

          <Pagination className="justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  className="sm:*:[svg]:hidden"
                  render={
                    <Button
                      disabled={page <= 1 || isPending}
                      onClick={() => goToPage(page - 1)}
                      size="sm"
                      variant="outline"
                    />
                  }
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  className="sm:*:[svg]:hidden"
                  render={
                    <Button
                      disabled={page >= pageCount || isPending}
                      onClick={() => goToPage(page + 1)}
                      size="sm"
                      variant="outline"
                    />
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </CardFrameFooter>
    </CardFrame>
  );
}

/** Row-level skeleton for Suspense fallbacks — header/footer stay rendered. */
export function AdminTableSkeleton({
  columnCount,
  rowCount = 10,
}: {
  columnCount: number;
  rowCount?: number;
}) {
  return (
    <CardFrame className="w-full">
      <Table className="table-fixed">
        <TableBody>
          {Array.from({ length: rowCount }).map((_, rowIndex) => (
            <TableRow key={rowIndex} className="hover:bg-transparent">
              {Array.from({ length: columnCount }).map((_, columnIndex) => (
                <TableCell key={columnIndex}>
                  <Skeleton className="h-4 w-full" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardFrame>
  );
}

/** Shared avatar sizing/fallback so every admin table looks identical. */
export const ADMIN_AVATAR_FALLBACK_CLASS =
  "bg-primary/12 font-semibold text-primary";
