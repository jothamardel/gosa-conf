"use client";

import { Navigation } from '@/components/layout/navigation';
import { Footer } from '@/components/layout/footer';
import DinnerPayment from '@/components/forms/dinner';

export default function DinnerReservationPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      <Navigation />

      <main className="py-6 sm:py-12">
        <div className="max-w-4xl mx-auto mobile-container">
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="heading-responsive-lg font-bold text-gray-900 mb-3 sm:mb-4">
              Dinner Reservation
            </h1>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Reserve your spot for the convention dinner. Enjoy networking and great food with fellow attendees.
            </p>
          </div>

          <DinnerPayment />
        </div>
      </main>

      <Footer />
    </div>
  );
}