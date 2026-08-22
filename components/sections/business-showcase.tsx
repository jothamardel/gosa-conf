"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Tag,
  ExternalLink,
  PhoneCall,
  Sparkles,
  Award,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface BusinessBrand {
  id: string;
  name: string;
  category: "hospitality" | "finance" | "tech" | "agriculture";
  logo: string;
  tagline: string;
  description: string;
  offer?: string;
  code?: string;
  location: string;
  featured?: boolean;
}

const BRANDS: BusinessBrand[] = [
  {
    id: "crispan",
    name: "Crispan Suites & Event Center",
    category: "hospitality",
    logo: "/images/sponsors/crispan.png",
    tagline: "Premier Hospitality & Event Spaces in Jos",
    description: "Luxury accommodation, state-of-the-art conference halls, and premium catering for GOSA 2026 delegates.",
    offer: "15% off room bookings for GOSA delegates",
    code: "GOSA2026",
    location: "Plot 9257 Opp Old Airport, Jos",
    featured: true,
  },
  {
    id: "grand_cereals",
    name: "Grand Cereals Limited",
    category: "agriculture",
    logo: "/images/sponsors/grand_cereals.png",
    tagline: "Nourishing Families with Quality Agricultural Products",
    description: "Leading producer of premium cereals, vegetable oils, and livestock feeds across West Africa.",
    offer: "Special convention discount bulk orders",
    code: "GRANDGOSA",
    location: "Jos, Plateau State",
    featured: true,
  },
  {
    id: "paystack",
    name: "Paystack",
    category: "finance",
    logo: "/images/sponsors/paystack.png",
    tagline: "Modern Online Payments for Businesses in Africa",
    description: "Empowering businesses of all sizes to accept secure online and offline payments across Africa.",
    offer: "Free payment integration consult for alumni SMEs",
    code: "PAYSTACK-GOSA",
    location: "Lagos & San Francisco",
    featured: true,
  },
  {
    id: "mtn",
    name: "MTN Nigeria",
    category: "tech",
    logo: "/images/sponsors/mtn.png",
    tagline: "Everywhere You Go",
    description: "Connecting millions with high-speed 5G internet, enterprise broadband, and digital financial services.",
    offer: "Free convention Wi-Fi & data bonus packs",
    code: "MTNGOSA",
    location: "Nationwide",
    featured: true,
  },
  {
    id: "access_bank",
    name: "Access Bank Plc",
    category: "finance",
    logo: "/images/sponsors/access_bank.png",
    tagline: "More Than Banking",
    description: "Tailored business loans, international trade finance, and SME growth accounts for alumni entrepreneurs.",
    offer: "Zero account maintenance fee for alumni SMEs",
    code: "ACCESSGOSA",
    location: "Nationwide & Global",
    featured: true,
  },
  {
    id: "airtel",
    name: "Airtel Nigeria",
    category: "tech",
    logo: "/images/sponsors/airtel.png",
    tagline: "A Reason to Imagine",
    description: "Ultra-fast fiber connectivity, cloud hosting, and Mobile Money (SmartCash PSB) solutions for modern enterprises.",
    offer: "Special corporate data packages for GOSA businesses",
    code: "AIRTELGOSA",
    location: "Nationwide",
    featured: true,
  },
];

const CATEGORIES = [
  { id: "all", label: "All Businesses" },
  { id: "hospitality", label: "Hospitality & Travel" },
  { id: "finance", label: "Finance & Payments" },
  { id: "tech", label: "Tech & Telecoms" },
  { id: "agriculture", label: "Agribusiness & Food" },
];

export function BusinessShowcase() {
  const [activeCategory, setActiveCategory] = useState("all");

  const filteredBrands = BRANDS.filter(
    (brand) => activeCategory === "all" || brand.category === activeCategory
  );

  return (
    <section className="py-20 md:py-28 bg-slate-900 text-white relative overflow-hidden" id="business-directory">
      {/* Background Decor */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-10"
        style={{
          backgroundImage: "radial-gradient(#10b981 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-4">
              <Building2 className="w-3.5 h-3.5" />
              <span>GOSA Alumni Business Hub & Corporate Sponsors</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight uppercase font-display">
              Promoting Brands &{" "}
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 bg-clip-text text-transparent normal-case">
                Empowering Alumni Businesses
              </span>
            </h2>
          </div>

          <p className="text-slate-400 text-base max-w-md font-medium leading-relaxed">
            Discover leading alumni enterprises and official convention partners offering exclusive discounts and services for GOSA 2026 attendees.
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 mb-10 border-b border-slate-800 pb-4">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
                activeCategory === cat.id
                  ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-950/40"
                  : "bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Brands Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          <AnimatePresence mode="popLayout">
            {filteredBrands.map((brand) => (
              <motion.div
                key={brand.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="bg-slate-850 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-6 flex flex-col justify-between group hover:shadow-2xl hover:shadow-emerald-950/30 transition-all duration-300"
              >
                <div>
                  {/* Brand Header & Logo Container */}
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="h-12 w-28 flex items-center justify-center p-1 shrink-0">
                      <img
                        src={brand.logo}
                        alt={brand.name}
                        className="max-h-full max-w-full object-contain mx-auto"
                      />
                    </div>
                    {brand.featured && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
                        <Sparkles className="w-3 h-3" />
                        Official Partner
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors">
                    {brand.name}
                  </h3>
                  <p className="text-emerald-400 text-xs font-semibold mt-1">
                    {brand.tagline}
                  </p>
                  <p className="text-slate-400 text-sm mt-3 leading-relaxed">
                    {brand.description}
                  </p>
                </div>

                {/* Offer Badge & Footer */}
                <div className="mt-6 pt-4 border-t border-slate-800/80">
                  {brand.offer && (
                    <div className="bg-emerald-950/60 border border-emerald-500/30 rounded-xl p-2.5 mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-emerald-200">
                        <Tag className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="font-semibold">{brand.offer}</span>
                      </div>
                      {brand.code && (
                        <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                          {brand.code}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="truncate max-w-[180px]">{brand.location}</span>
                    <span className="text-emerald-400 font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                      View Offer
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Corporate Sponsorship Promo CTA Banner */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 border border-emerald-700/50 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="max-w-2xl relative z-10">
            <div className="inline-flex items-center gap-1.5 text-amber-400 text-xs font-extrabold uppercase tracking-wider mb-2">
              <TrendingUp className="w-4 h-4" />
              <span>Reach 1,500+ Alumni Leaders & Delegates</span>
            </div>
            <h3 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              Promote Your Brand at GOSA 2026
            </h3>
            <p className="text-slate-300 text-sm sm:text-base mt-2 leading-relaxed">
              Elevate your business visibility. Secure booth spaces, digital brochure ads, custom badge branding, and dinner gala sponsorship packages today.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0 relative z-10">
            <Link href="/donate#sponsor-packages">
              <Button className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold h-12 px-6 rounded-xl shadow-lg w-full sm:w-auto">
                Become a Sponsor
              </Button>
            </Link>
            <Link href="/brochure#ad-rates">
              <Button variant="outline" className="border-emerald-600/60 text-emerald-300 hover:bg-emerald-900/50 hover:text-white font-bold h-12 px-6 rounded-xl w-full sm:w-auto">
                Book Brochure Ad
              </Button>
            </Link>
          </div>
        </div>

      </div>
    </section>
  );
}
