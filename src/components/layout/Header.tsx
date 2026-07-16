import Link from "next/link";

export function Header() {
  return (
    <header style={{ background: "var(--brand-blue)", borderBottom: "4px solid var(--brand-gold)" }}>
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-display text-xl" style={{ color: "var(--brand-gold)" }}>
          NYC Accountability
        </Link>
        <nav className="flex gap-6 text-sm font-medium" style={{ color: "var(--brand-cream)" }}>
          <Link href="/methodology" className="hover:underline" style={{ textDecorationColor: "var(--brand-gold)" }}>
            Methodology
          </Link>
        </nav>
      </div>
    </header>
  );
}
