"use client";

import { Navigation } from '@/components/layout/navigation';
import { Footer } from '@/components/layout/footer';
import ConventionBrochureForm from '@/components/forms/convention-brochure';

export default function BrochurePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      <Navigation />
      
      <main className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          
          <ConventionBrochureForm />
        </div>
      </main>

      <Footer />
    </div>
  );
}