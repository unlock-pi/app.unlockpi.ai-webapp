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
    <div className="grid min-h-svh relative place-items-center overflow-hidden bg-background px-6 text-foreground">
      <div className="absolute -z-0  top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ">
        <p className="text-[13rem] opacity-5 font-extrabold">404</p>
      </div>
      <Empty className="z-10 max-w-[420px] text-center">
        <EmptyHeader>
          <Logo  width={40} full height={40} textClassName="text-base! ml-1" className="hover:cursor-pointer! flex flex-row! items-center  mb-12" />
          {/* <EmptyMedia variant="icon">
            <CompassIcon />
          </EmptyMedia> */}
          <EmptyTitle>Page not found</EmptyTitle>
          <EmptyDescription className="text-muted-foreground">
            The page you&apos;re looking for doesn&apos;t exist or may have
            moved.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button className="hover:cursor-pointer!" render={<Link href="/dashboard" />}>
            Back to dashboard
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}
