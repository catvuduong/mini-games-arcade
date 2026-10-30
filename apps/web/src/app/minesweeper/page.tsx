import { Suspense } from "react";
import { GamePage } from "@/components/arcade/GamePage";
import { MinesweeperGame } from "@/components/arcade/MinesweeperGame";

export const metadata = { title: "Minesweeper" };

export default function MinesweeperPage() {
  return (
    <GamePage
      title="Minesweeper"
      accent="minesweeper"
      rules="Reveal every square that is not a mine. The numbers count the mines touching each square."
    >
      <Suspense fallback={<div className="game-loading" aria-hidden="true" />}>
        <MinesweeperGame />
      </Suspense>
    </GamePage>
  );
}
