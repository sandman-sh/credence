import { CategoryScores, taskCategories } from "@/lib/types";

const labels = {
  research: "Research",
  coding: "Coding",
  translation: "Translation",
  analysis: "Analysis",
};

export function CategoryScoreBars({ scores }: { scores: CategoryScores }) {
  return (
    <div className="space-y-3">
      {taskCategories.map((category) => (
        <div key={category} className="space-y-1.5">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
            <span>{labels[category]}</span>
            <span className="font-medium text-[var(--foreground)]">{scores[category]}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#A78BFA_0%,#22D3EE_100%)] shadow-[0_0_18px_rgba(167,139,250,0.24)] transition-all duration-700"
              style={{ width: `${scores[category]}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
