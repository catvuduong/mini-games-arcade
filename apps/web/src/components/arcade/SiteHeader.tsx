import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

interface SiteHeaderProps {
  /** On a game page, the title and a link back to the arcade. */
  game?: { title: string };
}

export function SiteHeader({ game }: SiteHeaderProps) {
  return (
    <header className="site-header">
      {game ? (
        <Link href="/" className="back-link" data-testid="back-to-arcade">
          <span aria-hidden="true">←</span> Arcade
        </Link>
      ) : (
        <Link href="/" className="brand" aria-label="Mini Games Arcade home">
          <span className="brand-mark" aria-hidden="true">🕹️</span>
          <span>Arcade</span>
        </Link>
      )}
      {game && <span className="site-header-title">{game.title}</span>}
      <ThemeToggle />
    </header>
  );
}
