import { EventAgenda } from '@/components/agenda/event-agenda';
import { Navigation } from '@/components/layout/navigation';
import { Footer } from '@/components/layout/footer';

export default function AgendaPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      <Navigation />
      <div className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Event
              <span className="gradient-text"> Agenda</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Discover our comprehensive three-day program featuring industry experts, networking sessions, and engaging workshops.
            </p>
          </div>
          
          <EventAgenda />
        </div>
      </div>
      <Footer />
    </div>
  );
}