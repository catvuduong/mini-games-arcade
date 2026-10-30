import type { ReactNode } from "react";
import { SiteHeader } from "./SiteHeader";

/** Page chrome shared by the three games: header, title, one-line rules and the game itself. */
export function GamePage({
  title,
  accent,
  rules,
  children,
}: {
  title: string;
  accent: "memory" | "2048" | "minesweeper";
  rules: string;
  children: ReactNode;
}) {
  return (
    <main className={`game-page accent-${accent}`}>
      <SiteHeader game={{ title }} />
      <div className="game-intro">
        <h1 className="game-title">{title}</h1>
        <p className="game-rules">{rules}</p>
      </div>
      {children}
    </main>
  );
}
