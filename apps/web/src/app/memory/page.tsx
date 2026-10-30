import { Suspense } from "react";
import { GamePage } from "@/components/arcade/GamePage";
import { MemoryGame } from "@/components/arcade/MemoryGame";

export const metadata = { title: "Memory Match" };

export default function MemoryPage() {
  return (
    <GamePage
      title="Memory Match"
      accent="memory"
      rules="Flip two cards per turn and find every pair in as few moves as you can."
    >
      <Suspense fallback={<div className="game-loading" aria-hidden="true" />}>
        <MemoryGame />
      </Suspense>
    </GamePage>
  );
}
