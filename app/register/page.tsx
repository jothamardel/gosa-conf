import { WhatsAppRedirectBanner } from "@/components/sections/whatsapp-redirect-banner";
import { Navigation } from "@/components/layout/navigation";
import { Footer } from "@/components/layout/footer";
import { Sponsors } from "@/components/sections/sponsors";

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-emerald-500 selection:text-white">
      <Navigation />
      <div className="py-8 sm:py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <WhatsAppRedirectBanner
            serviceTitle="Convention Ticket Registration"
            serviceCategory="convention"
            headline="Secure your verified attendance pass through our official WhatsApp bot"
            description="Online web registration has moved to GOSA Bilkwas on WhatsApp. Message Bilkwas to purchase tickets for yourself, your classmates, or group delegates with automated QR pass delivery."
            unitPrice="₦1,000 / Person"
            prefilledPrompt="Hello GOSA Bilkwas, I want to register and purchase a convention ticket"
            suggestedCommands={[
              "buy ticket for myself",
              "buy 2 tickets",
              "buy ticket for 08012345678",
            ]}
            bulletPoints={[
              "Instant QR badge sent right to your WhatsApp",
              "Delegate check-in verification at convention gates",
              "Group & individual booking support",
              "Secure Paystack integration directly in WhatsApp",
            ]}
          />
        </div>
      </div>
      <div className="mb-8">
        <Sponsors bg={"bg-none"} />
      </div>
      <Footer />
    </div>
  );
}

