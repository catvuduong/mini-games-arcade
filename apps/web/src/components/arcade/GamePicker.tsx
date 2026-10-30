"use client";

import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import { DIFFICULTIES, DIFFICULTY_IDS, type Difficulty } from "@/lib/games/minesweeper";
import { MEMORY_LEVEL_IDS, MEMORY_LEVELS, type MemoryLevel } from "@/lib/games/memory";
import { formatTime } from "@/lib/format";
import {
  BEST_2048_KEY,
  memoryBestKey,
  minesweeperBestKey,
  seedDemoScores,
  useBest,
} from "@/lib/scores";

function BestChip({
  storageKey,
  label,
  format,
}: {
  storageKey: string;
  label: string;
  format: (value: number) => string;
}) {
  const value = useBest(storageKey);
  return (
    <li className="card-best">
      <span className="card-best-label">{label}</span>
      <strong className="card-best-value">{value === null ? "—" : format(value)}</strong>
    </li>
  );
}

function GameCard({
  href,
  testId,
  accent,
  art,
  title,
  blurb,
  children,
}: {
  href: string;
  testId: string;
  accent: string;
  art: ReactNode;
  title: string;
  blurb: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={`game-card accent-${accent}`} data-testid={testId}>
      <span className="game-card-art" aria-hidden="true">
        {art}
      </span>
      <span className="game-card-body">
        <span className="game-card-title">{title}</span>
        <span className="game-card-blurb">{blurb}</span>
        {children}
      </span>
      <span className="game-card-cta" aria-hidden="true">
        Play <span className="game-card-arrow">→</span>
      </span>
    </Link>
  );
}

const MOVES = (value: number) => `${value} moves`;
const SECONDS = (value: number) => formatTime(value);

export function GamePicker() {
  useEffect(() => {
    seedDemoScores();
  }, []);

  return (
    <section className="game-picker" aria-label="Choose a game">
      <GameCard
        href="/memory"
        testId="game-card-memory"
        accent="memory"
        title="Memory Match"
        blurb="Flip pairs of emoji and clear the board in as few moves as you can."
        art={
          <span className="art-stack">
            <span className="art-tile art-tile-a">🍓</span>
            <span className="art-tile art-tile-b">🐙</span>
            <span className="art-tile art-tile-c">❔</span>
          </span>
        }
      >
        <ul className="card-bests">
          {MEMORY_LEVEL_IDS.map((level: MemoryLevel) => (
            <BestChip
              key={level}
              storageKey={memoryBestKey(level)}
              label={MEMORY_LEVELS[level].label}
              format={MOVES}
            />
          ))}
        </ul>
      </GameCard>

      <GameCard
        href="/2048"
        testId="game-card-2048"
        accent="2048"
        title="2048"
        blurb="Slide and merge numbered tiles until you build the 2048 tile."
        art={
          <span className="art-grid">
            <span className="art-grid-tile">2</span>
            <span className="art-grid-tile">4</span>
            <span className="art-grid-tile">8</span>
            <span className="art-grid-tile art-grid-tile-big">2048</span>
          </span>
        }
      >
        <ul className="card-bests">
          <BestChip
            storageKey={BEST_2048_KEY}
            label="Best score"
            format={(value) => value.toLocaleString("en-US")}
          />
        </ul>
      </GameCard>

      <GameCard
        href="/minesweeper"
        testId="game-card-minesweeper"
        accent="minesweeper"
        title="Minesweeper"
        blurb="Clear every safe square. Flag the mines and never click one."
        art={
          <span className="art-mines">
            <span className="art-mine-cell">1</span>
            <span className="art-mine-cell art-mine-flag">🚩</span>
            <span className="art-mine-cell">💣</span>
            <span className="art-mine-cell">2</span>
          </span>
        }
      >
        <ul className="card-bests">
          {DIFFICULTY_IDS.map((difficulty: Difficulty) => (
            <BestChip
              key={difficulty}
              storageKey={minesweeperBestKey(difficulty)}
              label={DIFFICULTIES[difficulty].label}
              format={SECONDS}
            />
          ))}
        </ul>
      </GameCard>
    </section>
  );
}
