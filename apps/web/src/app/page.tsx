import { GamePicker } from "@/components/arcade/GamePicker";
import { SiteHeader } from "@/components/arcade/SiteHeader";

export default function Home() {
  return (
    <main className="home">
      <SiteHeader />

      <section className="hero">
        <p className="eyebrow">Three classics · no sign-up · saved in your browser</p>
        <h1 className="hero-title">Mini Games Arcade</h1>
        <p className="hero-lede">Pick a game and beat your personal best.</p>
      </section>

      <GamePicker />

      <footer className="home-footer">Scores and best times are stored only in this browser.</footer>
    </main>
  );
}
