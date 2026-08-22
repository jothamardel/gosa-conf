"use client";

import { Navigation } from '@/components/layout/navigation';
import { Footer } from '@/components/layout/footer';
import ConventionBrochureForm from '@/components/forms/convention-brochure';
import { Building2, Megaphone, CheckCircle2, Sparkles, Tag, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const AD_RATES = [
  {
    tier: "Full Page Color",
    price: "₦150,000",
    desc: "Full-page glossy placement in 2,000+ printed & digital PDF brochures distributed to delegates.",
    features: ["Full 8.5x11 Color Placement", "Digital PDF Hyperlink", "Social Media Spotlight Post"],
    popular: true,
  },
  {
    tier: "Half Page Color",
    price: "₦85,000",
    desc: "High-impact half-page layout perfect for alumni businesses and corporate goodwill messages.",
    features: ["Half Page Color Layout", "Digital PDF Listing", "Alumni Directory Feature"],
    popular: false,
  },
  {
    tier: "Quarter Page Goodwill",
    price: "₦45,000",
    desc: "Ideal for class set goodwill congratulations and small enterprise branding.",
    features: ["Quarter Page Placement", "Class Set Shaded Box", "Alumni Directory Listing"],
    popular: false,
  },
];

const BROCHURE_SPONSORS = [
  { name: "Crispan Suites", logo: "/images/sponsors/crispan.png", tag: "Back Cover Sponsor" },
  { name: "Grand Cereals", logo: "/images/sponsors/grand_cereals.png", tag: "Inside Front Cover" },
  { name: "Paystack", logo: "/images/sponsors/paystack.png", tag: "Tech Partner Ad" },
  { name: "MTN Nigeria", logo: "/images/sponsors/mtn.png", tag: "Center Spread Sponsor" },
  { name: "Access Bank", logo: "/images/sponsors/access_bank.png", tag: "Goodwill Sponsor" },
  { name: "Airtel", logo: "/images/sponsors/airtel.png", tag: "Digital Partner" },
];

export default function BrochurePage() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 selection:bg-emerald-500 selection:text-white">
      <Navigation />
      
      <main className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          
          <ConventionBrochureForm />

          {/* Business & Brand Brochure Promotion Section */}
          <section className="bg-slate-950 border border-slate-800 rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden" id="ad-rates">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-10" style={{
              backgroundImage: 'radial-gradient(#10b981 1px, transparent 1px)',
              backgroundSize: '24px 24px'
            }} />
            
            <div className="relative z-10">
              <div className="max-w-3xl mb-12">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-4">
                  <Megaphone className="w-3.5 h-3.5" />
                  <span>Brochure Brand Advertising & Goodwill Messages</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight uppercase font-display">
                  Promote Your Business in the <span className="bg-gradient-to-r from-emerald-400 to-amber-300 bg-clip-text text-transparent normal-case">Official Convention Program</span>
                </h2>
                <p className="text-slate-400 mt-3 text-base leading-relaxed">
                  Put your brand directly in front of over 2,000 high-profile alumni, business executives, government dignitaries, and delegates across print and digital editions.
                </p>
              </div>

              {/* Rate Card Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                {AD_RATES.map((rate, i) => (
                  <div
                    key={i}
                    className={`rounded-2xl p-6 flex flex-col justify-between relative transition-all duration-300 ${
                      rate.popular
                        ? "bg-slate-900 border-2 border-emerald-500 shadow-xl shadow-emerald-950/50 scale-[1.02]"
                        : "bg-slate-900/60 border border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    {rate.popular && (
                      <span className="absolute -top-3.5 right-6 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md">
                        Most Popular
                      </span>
                    )}

                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">{rate.tier}</h3>
                      <p className="text-2xl font-black text-emerald-400 mb-3">{rate.price}</p>
                      <p className="text-slate-400 text-xs leading-relaxed mb-6">{rate.desc}</p>
                      
                      <div className="space-y-2 border-t border-slate-800 pt-4 mb-6">
                        {rate.features.map((feat, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Button className={`w-full font-bold h-11 rounded-xl ${
                      rate.popular
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-200"
                    }`}>
                      Book Advert Slot
                    </Button>
                  </div>
                ))}
              </div>

              {/* Brochure Advertisers Spotlight */}
              <div>
                <h3 className="text-sm font-extrabold text-amber-400 uppercase tracking-widest mb-6">
                  Featured Convention Brochure Advertisers
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                  {BROCHURE_SPONSORS.map((s, idx) => (
                    <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col items-center justify-center text-center group hover:border-emerald-500/40 transition-colors">
                      <div className="h-10 w-24 p-0.5 flex items-center justify-center mb-2 overflow-hidden">
                        <img src={s.logo} alt={s.name} className="max-h-full max-w-full object-contain mx-auto" />
                      </div>
                      <span className="text-[10px] font-semibold text-slate-300 truncate w-full">{s.name}</span>
                      <span className="text-[8px] text-emerald-400 font-mono mt-0.5">{s.tag}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </section>

        </div>
      </main>

      <Footer />
    </div>
  );
}