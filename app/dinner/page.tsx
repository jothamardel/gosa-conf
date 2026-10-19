"use client";

import { Navigation } from "@/components/layout/navigation";
import { Footer } from "@/components/layout/footer";
import DinnerPayment from "@/components/forms/dinner";

export default function DinnerReservationPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-emerald-500 selection:text-white">
      <Navigation />

      <main className="py-6 sm:py-12">
        <div className="max-w-4xl mx-auto mobile-container px-4 sm:px-6">
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="heading-responsive-lg font-bold text-gray-900 mb-3 sm:mb-4">
              Annual Homecoming Gala Dinner Reservation
            </h1>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Reserve your spot for the convention gala dinner. Enjoy culinary excellence, networking, and legacy fellowship with fellow alumni.
            </p>
          </div>

          <DinnerPayment />
        </div>
      </main>

      <Footer />
    </div>
  );
}