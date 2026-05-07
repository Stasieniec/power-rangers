import Link from "next/link";

/**
 * Small honest banner on public read-only pages so judges/visitors know they're
 * looking at a seeded demo cast, not a live production marketplace.
 */
export function DemoDataBanner() {
  return (
    <div className="border-gold/30 bg-gold/5 border-b">
      <div className="text-text-dim mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-6 py-2 font-mono text-[11px] tracking-widest uppercase">
        <span>
          <span className="text-gold">Demo data</span> · seeded researchers, projects, and AI
          outputs are real
        </span>
        <Link href="/demo" className="text-gold hover:underline">
          Open demo door →
        </Link>
      </div>
    </div>
  );
}
