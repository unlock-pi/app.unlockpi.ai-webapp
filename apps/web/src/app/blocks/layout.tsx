import { notFound } from "next/navigation";
import Link from "next/link";

/**
 * Gate for the whole /blocks tree — an internal component playground, not a
 * page real users should ever land on.
 *
 * true  → /blocks only renders in `next dev` (NODE_ENV === "development").
 *         Any production build (`next build && next start`, or a deployed
 *         prod build) 404s on every route under here.
 * false → the gate is off; /blocks renders in production too, once built.
 */
const enable = true;

export default function BlocksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (enable && process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 px-4 py-3 backdrop-blur-sm sm:px-8">
        <Link
          href="/blocks"
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Back to blocks
        </Link>
      </header>
      {children}
    </div>
  );
}
