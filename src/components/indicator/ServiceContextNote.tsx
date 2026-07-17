import type { ServiceContext } from "@/lib/data/types";

/**
 * Why the underlying work exists at all — not why this specific number
 * moved (that's IndicatorResearchNote's job). Shown in the expanded card,
 * below the main trend explanation, since it's background a reader wants
 * on demand rather than something that belongs in the collapsed summary.
 */
export function ServiceContextNote({ context }: { context: ServiceContext }) {
  return (
    <div className="mt-4 rounded-xl border-2 p-4" style={{ borderColor: "var(--border-hairline)", background: "var(--background)" }}>
      <h4 className="text-xs font-semibold tracking-wide uppercase" style={{ color: "var(--text-muted)" }}>
        Why this is tracked
      </h4>
      <p className="mt-1.5 text-sm" style={{ color: "var(--text-secondary)" }}>
        {context.summary}
      </p>
      <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
        {context.sources.map((source, i) => (
          <span key={source.url}>
            {i > 0 && ", "}
            <a href={source.url} className="underline" target="_blank" rel="noreferrer">
              {source.label}
            </a>
          </span>
        ))}
      </p>
    </div>
  );
}
