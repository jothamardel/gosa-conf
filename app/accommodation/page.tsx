"use client";

import { Navigation } from "@/components/layout/navigation";
import { Footer } from "@/components/layout/footer";
import { Bed, MapPin, Star, ShieldCheck, Tag, ExternalLink, Phone, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const HOTELS = [
  {
    name: "Crispan Suites & Event Center",
    tagline: "Official Host Venue & Primary Partner",
    image: "/images/sponsors/crispan.png",
    rating: "5 Star Facility",
    address: "Plot 9257 Opp Old Airport, Jos",
    discountCode: "GOSA2026",
    discount: "15% Convention Discount",
    features: ["Convention Center Venue", "Free High-Speed Wi-Fi", "Complimentary Breakfast", "24/7 Security"],
    featured: true,
  },
  {
    name: "Grand Hotel & Suites",
    tagline: "Official Accommodation Sponsor",
    image: "/images/sponsors/grand_cereals.png",
    rating: "4 Star Luxury",
    address: "Rayfield Boulevard, Jos",
    discountCode: "GOSA-GRAND",
    discount: "10% Delegate Discount",
    features: ["Shuttle Bus Service", "Executive Swimming Pool", "Fitted Gym", "Fine Dining Restaurant"],
    featured: false,
  },
];

export default function AccommodationBookingPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 selection:bg-emerald-500 selection:text-white">
      <Navigation />

      <main className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          {/* Header */}
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-4">
              <Bed className="w-3.5 h-3.5" />
              <span>GOSA 2026 Hospitality & Lodging Partners</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight uppercase font-display">
              Convention Lodging & <span className="bg-gradient-to-r from-emerald-400 to-amber-300 bg-clip-text text-transparent normal-case">Hospitality Partners</span>
            </h1>
            <p className="text-slate-400 text-base sm:text-lg mt-3 leading-relaxed">
              Book discounted suites at our official host hotel and partner suites in Jos with exclusive delegate rates.
            </p>
          </div>

          {/* Hotel Partner Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {HOTELS.map((hotel, i) => (
              <div key={i} className="bg-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden shadow-2xl">
                {hotel.featured && (
                  <div className="absolute top-4 right-4 bg-emerald-500 text-slate-950 font-black text-[10px] uppercase tracking-widest px-3 py-1 rounded-full">
                    Official Host Venue
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="h-14 w-32 p-1 flex items-center justify-center shrink-0">
                      <img src={hotel.image} alt={hotel.name} className="max-h-full max-w-full object-contain mx-auto" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">{hotel.name}</h2>
                      <p className="text-emerald-400 text-xs font-semibold">{hotel.tagline}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-slate-400 text-xs mb-4">
                    <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>{hotel.address}</span>
                  </div>

                  <div className="bg-emerald-950/60 border border-emerald-500/30 rounded-xl p-3 mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-emerald-200">
                      <Tag className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="font-bold">{hotel.discount}</span>
                    </div>
                    <span className="text-xs font-mono font-bold bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded border border-amber-500/30">
                      Code: {hotel.discountCode}
                    </span>
                  </div>

                  <div className="space-y-2 border-t border-slate-800 pt-4 mb-6">
                    {hotel.features.map((f, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 rounded-xl">
                    Book Room Now
                  </Button>
                  <Button variant="outline" className="border-slate-800 text-slate-300 hover:bg-slate-900 h-11 px-4 rounded-xl">
                    <Phone className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Become a Hospitality Sponsor CTA */}
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-8 text-center max-w-3xl mx-auto">
            <Building2 className="w-10 h-10 text-amber-400 mx-auto mb-3" />
            <h3 className="text-xl font-bold text-white">Are You a Hotel, Airline, or Transport Provider?</h3>
            <p className="text-slate-400 text-sm mt-1 mb-6">
              Partner with GOSA 2026 to offer accommodation or shuttle packages to over 1,500 visiting delegates.
            </p>
            <Button className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold h-11 px-8 rounded-xl">
              Register as Travel Partner
            </Button>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
