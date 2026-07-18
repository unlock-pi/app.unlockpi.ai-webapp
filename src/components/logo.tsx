import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "./ui/badge";

const Logo = ({
  full = false,
  width = 100,
  height = 100,
  isLink = true,
  href = "/dashboard",
  className,
  textClassName,
  isBeta = false,
}: {
  full?: boolean;
  isLink?: boolean;
  href?: string;
  isBeta?: boolean;
  width?: number;
  height?: number;
  className?: string;
  textClassName?: string;
}) => {
  if (isLink)
    return (
      <Link
        href={href}
        className={cn("flex flex-col items-center justify-center", className)}
      >
        <Image
          src={"/unlockpi-logo.png"}
          width={30}
          height={30}
          // alt="Unicorn Space UI logo"
          alt=""
          className="dark:hidden block"
        />
        <Image
          src={"/unlockpi-logo.png"}
          width={30}
          height={30}
          alt=""
          className="hidden dark:block"
        />

        {full && (
          <h3 className={cn("font-medium text-2xl", textClassName)}>
            UnicornSpaceUI
          </h3>
        )}
      </Link>
    );
  else
    return (
      <div
        className={cn("flex flex-col items-center justify-center", className)}
      >
        <Image
          src={"/unlockpi-logo.png"}
          width={width}
          height={height}
          alt="logo"
        />
        {full && <h2 className="font-medium text-2xl">FreelanceFlow</h2>}
        {isBeta && (
          <Badge variant={"secondary"} className="scale-[80%]">
            Beta
          </Badge>
        )}
      </div>
    );
};

export default Logo;
