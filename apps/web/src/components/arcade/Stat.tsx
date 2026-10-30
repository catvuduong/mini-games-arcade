import type { ReactNode } from "react";

/** A labelled counter tile used in every game's HUD. */
export function Stat({
  label,
  value,
  testId,
}: {
  label: string;
  value: ReactNode;
  testId?: string;
}) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value" data-testid={testId}>
        {value}
      </span>
    </div>
  );
}
