"use client";

import { Navigation } from "@/components/layout/navigation";
import { Footer } from "@/components/layout/footer";
import { WhatsAppRedirectBanner } from "@/components/sections/whatsapp-redirect-banner";

export default function DinnerReservationPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-emerald-500 selection:text-white">
      <Navigation />

      <main className="py-8 sm:py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <WhatsAppRedirectBanner
            serviceTitle="Annual Homecoming Gala Dinner"
            serviceCategory="dinner"
            headline="An evening of culinary excellence, legacy fellowship, and networking"
            description="Direct website checkout for dinner reservations is currently paused. Please book your dinner tickets and seat reservations directly via GOSA Bilkwas on WhatsApp."
            unitPrice="₦2,500 / Seat"
            prefilledPrompt="Hello GOSA Bilkwas, I want to reserve a dinner ticket for the Homecoming Gala Dinner"
            suggestedCommands={[
              "buy dinner for myself",
              "buy 2 dinner tickets",
              "buy dinner for 08012345678",
            ]}
            bulletPoints={[
              "Venue: Banquet Arena, Crispan Events Center, Jos",
              "Date: Saturday, November 1st, 2026 • 7:00 PM",
              "Personalized guest seating & dietary support",
              "Instant confirmation code and digital dinner pass on WhatsApp",
            ]}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}