import type { IndicatorResearchNote as IndicatorResearchNoteData } from "@/lib/data/types";

export function IndicatorResearchNote({ note }: { note: IndicatorResearchNoteData }) {
  const researchedDate = new Date(note.researchedOn).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="rounded-xl border-2 p-4" style={{ borderColor: "var(--accent-heading)", background: "var(--surface-1)" }}>
      <p className="text-base" style={{ color: "var(--text-primary)" }}>
        {note.summary}
      </p>
      <p className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
        Researched {researchedDate} —{" "}
        {note.sources.map((source, i) => (
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
