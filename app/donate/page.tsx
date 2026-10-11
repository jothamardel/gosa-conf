"use client";

import { Navigation } from "@/components/layout/navigation";
import { Footer } from "@/components/layout/footer";
import { WhatsAppRedirectBanner } from "@/components/sections/whatsapp-redirect-banner";

export default function DonationPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-emerald-500 selection:text-white">
      <Navigation />

      <main className="py-8 sm:py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <WhatsAppRedirectBanner
            serviceTitle="GOSA Community & School Projects Fund"
            serviceCategory="donation"
            headline="Support our mission to empower the next generation and renovate mother schools"
            description="Online card payments on the website are currently paused. You can securely make your contribution and support BSS/GHS Gindiri laboratory, hostel, and scholarship projects directly through GOSA Bilkwas on WhatsApp."
            unitPrice="Any Amount (Min ₦1,000)"
            prefilledPrompt="Hello GOSA Bilkwas, I want to make a donation to support GOSA projects"
            suggestedCommands={[
              "GOSA donate 5000",
              "GOSA donate 10000 support BSS hostel renovation",
              "GOSA donate 25000 for student scholarship",
            ]}
            bulletPoints={[
              "100% of donations directly fund verified Gindiri schools projects",
              "Official electronic receipt generated instantly with audit reference",
              "Option to donate on behalf of family, sets, or anonymously",
              "Immediate Paystack checkout link delivered directly in WhatsApp",
            ]}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}