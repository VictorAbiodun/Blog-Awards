import { ClosingPanel } from "@/components/home/closing-panel";
import { Faq } from "@/components/home/faq";
import { Hero } from "@/components/home/Hero";
import { HowItWorks } from "@/components/home/HowItWorks";
import { LeaderboardSection } from "@/components/home/leaderboard";
import { Numbers } from "@/components/home/numbers";
import { Showcase } from "@/components/home/Showcase";

export default function HomePage() {
  return (
    <main id="main">
      <Hero />
      <HowItWorks />
      <Showcase />
      <LeaderboardSection />
      <Numbers />
      <Faq />
      <ClosingPanel />
    </main>
  );
}
