import Link from "next/link";
import { CompassIcon } from "lucide-react";

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

export default function NotFound() {
  return (
    <div className="grid min-h-svh place-items-center bg-background px-6 text-foreground">
      <Empty>
        <EmptyHeader>
          <Logo isLink={false} width={40} height={40} className="mb-4" />
          <EmptyMedia variant="icon">
            <CompassIcon />
          </EmptyMedia>
          <EmptyTitle>Page not found</EmptyTitle>
          <EmptyDescription>
            The page you&apos;re looking for doesn&apos;t exist or may have
            moved.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button render={<Link href="/dashboard" />}>
            Back to dashboard
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}
