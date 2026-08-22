"use client";

import { Navigation } from '@/components/layout/navigation';
import { Footer } from '@/components/layout/footer';
import GoodwillMessageForm from '@/components/forms/goodwill-message';
import { HeartHandshake, Award, Sparkles, Building2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CORPORATE_GOODWILL = [
  { name: "Crispan Suites & Event Center", logo: "/images/sponsors/crispan.png", contribution: "Host Partner & Event Venue Sponsor" },
  { name: "Grand Cereals Limited", logo: "/images/sponsors/grand_cereals.png", contribution: "School Feeding & Youth Agriculture Fund" },
  { name: "Paystack", logo: "/images/sponsors/paystack.png", tag: "Tech Infrastructure Sponsor", contribution: "Alumni Digital Ecosystem Sponsor" },
  { name: "MTN Nigeria", logo: "/images/sponsors/mtn.png", contribution: "STEM Lab & Broadband Connectivity Project" },
  { name: "Access Bank Plc", logo: "/images/sponsors/access_bank.png", contribution: "Alumni SME Incubator & Endowment Fund" },
  { name: "Airtel Nigeria", logo: "/images/sponsors/airtel.png", contribution: "Solar Power & Green Energy Grant" },
];

export default function GoodwillMessagePage() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 selection:bg-emerald-500 selection:text-white">
      <Navigation />
      
      <main className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <GoodwillMessageForm />

          {/* Corporate Goodwill & CSR Partners */}
          <section className="bg-slate-950 border border-slate-800 rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-10" style={{
              backgroundImage: 'radial-gradient(#10b981 1px, transparent 1px)',
              backgroundSize: '24px 24px'
            }} />

            <div className="relative z-10">
              <div className="max-w-3xl mb-10">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-4">
                  <HeartHandshake className="w-3.5 h-3.5" />
                  <span>Corporate Social Responsibility & Brand Goodwill</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight uppercase font-display">
                  Corporate Goodwill <span className="bg-gradient-to-r from-emerald-400 to-amber-300 bg-clip-text text-transparent normal-case">& CSR Partners</span>
                </h2>
                <p className="text-slate-400 mt-2 text-base leading-relaxed">
                  We proudly celebrate the corporate brands and enterprises giving back to Gindiri infrastructure and student empowerment projects.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {CORPORATE_GOODWILL.map((partner, i) => (
                  <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-emerald-500/40 transition-all duration-300 group">
                    <div>
                      <div className="h-12 w-28 p-1 flex items-center justify-center mb-4">
                        <img src={partner.logo} alt={partner.name} className="max-h-full max-w-full object-contain mx-auto" />
                      </div>
                      <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">{partner.name}</h3>
                      <p className="text-slate-400 text-xs mt-2 leading-relaxed font-medium">
                        <span className="text-emerald-400 font-semibold">Project Impact: </span>
                        {partner.contribution}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-1.5 text-[10px] font-bold text-amber-400">
                      <Award className="w-3.5 h-3.5 shrink-0" />
                      <span>Certified Corporate Goodwill Partner</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

        </div>
      </main>

      <Footer />
    </div>
  );
}