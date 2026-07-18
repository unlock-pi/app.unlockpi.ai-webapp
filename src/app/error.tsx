"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangleIcon } from "lucide-react";

import Logo from "@/components/logo";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[App error boundary]", error);
  }, [error]);

  return (
    <div className="grid min-h-svh place-items-center bg-background px-6 text-foreground">
      <Empty>
        <EmptyHeader>
          <Logo isLink={false} width={40} height={40} className="mb-4" />
          <EmptyMedia variant="icon">
            <AlertTriangleIcon />
          </EmptyMedia>
          <EmptyTitle>Something went wrong</EmptyTitle>
          <EmptyDescription>
            An unexpected error occurred. You can try again, or head back to
            the dashboard.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <div className="flex gap-2">
            <Button variant="outline" render={<Link href="/dashboard" />}>
              Back to dashboard
            </Button>
            <Button onClick={() => reset()}>Try again</Button>
          </div>
        </EmptyContent>
      </Empty>
    </div>
  );
}
