import { EventAgenda } from "@/components/agenda/event-agenda";
import { Navigation } from "@/components/layout/navigation";
import { Footer } from "@/components/layout/footer";

export default function AgendaPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      <Navigation />
      <div className="py-6 sm:py-12">
        <div className="max-w-7xl mx-auto mobile-container">
          <div className="text-center mb-8 sm:mb-12">
            <h1 className="heading-responsive-lg font-bold text-gray-900 mb-3 sm:mb-4">
              Event
              <span className="gradient-text"> Agenda</span>
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Discover our comprehensive five-day program featuring industry
              experts, networking sessions, and engaging workshops.
            </p>
          </div>

          <EventAgenda />
        </div>
      </div>
      <Footer />
    </div>
  );
}
