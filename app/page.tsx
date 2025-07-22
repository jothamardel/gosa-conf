import { Hero } from '@/components/sections/hero';
import { Features } from '@/components/sections/features';
import { EventDetails } from '@/components/sections/event-details';
import { Navigation } from '@/components/layout/navigation';
import { Footer } from '@/components/layout/footer';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-amber-50">
      <Navigation />
      <Hero />
      <Features />
      <EventDetails />
      <Footer />
    </div>
  );
}