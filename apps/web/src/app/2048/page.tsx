import { Suspense } from "react";
import { Game2048 } from "@/components/arcade/Game2048";
import { GamePage } from "@/components/arcade/GamePage";

export const metadata = { title: "2048" };

export default function Game2048Page() {
  return (
    <GamePage
      title="2048"
      accent="2048"
      rules="Slide the tiles together. Equal tiles merge into one that is double the value."
    >
      <Suspense fallback={<div className="game-loading" aria-hidden="true" />}>
        <Game2048 />
      </Suspense>
    </GamePage>
  );
}
