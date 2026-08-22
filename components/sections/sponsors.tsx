"use client";

import Image from "next/image";

const SPONSORS = [
  { name: "Crispan Suites", logo: "/images/sponsors/crispan.png" },
  { name: "Grand Cereals", logo: "/images/sponsors/grand_cereals.png" },
  { name: "Paystack", logo: "/images/sponsors/paystack.png" },
  { name: "MTN Nigeria", logo: "/images/sponsors/mtn.png" },
  { name: "Access Bank", logo: "/images/sponsors/access_bank.png" },
  { name: "Airtel", logo: "/images/sponsors/airtel.png" },
];

const animationStyles = `
  @keyframes scroll-sponsors {
    0% {
      transform: translateX(0);
    }
    100% {
      transform: translateX(-50%);
    }
  }

  .animate-scroll-sponsors {
    animation: scroll-sponsors 25s linear infinite;
  }

  .animate-scroll-sponsors:hover {
    animation-play-state: paused;
  }
`;

export function Sponsors({ bg = "bg-white" }: { bg?: string }) {
  return (
    <div className={`py-8 sm:py-10 relative overflow-hidden border-t border-b border-slate-200/80 ${bg}`}>
      <style>{animationStyles}</style>

      <div className="max-w-7xl mx-auto px-4 text-center mb-6">
        <p className="text-slate-600 text-xs sm:text-sm font-bold uppercase tracking-widest">
          Proudly Supported By Our Official Convention Partners & Corporate Sponsors
        </p>
      </div>

      {/* Sponsor Slider Container */}
      <div className="relative overflow-hidden">
        {/* Gradient Fade Edge Overlay */}
        <div className="absolute left-0 top-0 w-24 sm:w-32 h-full bg-gradient-to-r from-white via-white/90 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 w-24 sm:w-32 h-full bg-gradient-to-l from-white via-white/90 to-transparent z-10 pointer-events-none" />

        {/* Sponsor Logos Infinite Ticker */}
        <div className="flex animate-scroll-sponsors items-center">
          {/* First Loop */}
          {SPONSORS.map((sponsor, index) => (
            <div key={`s1-${index}`} className="flex-none mx-5 sm:mx-8">
              <div className="w-32 sm:w-40 h-12 sm:h-16 flex items-center justify-center p-1 opacity-90 hover:opacity-100 hover:scale-110 transition-all duration-300">
                <img
                  src={sponsor.logo}
                  alt={sponsor.name}
                  className="max-h-full max-w-full object-contain mx-auto"
                />
              </div>
            </div>
          ))}

          {/* Duplicate Set for Seamless Loop */}
          {SPONSORS.map((sponsor, index) => (
            <div key={`s2-${index}`} className="flex-none mx-5 sm:mx-8">
              <div className="w-32 sm:w-40 h-12 sm:h-16 flex items-center justify-center p-1 opacity-90 hover:opacity-100 hover:scale-110 transition-all duration-300">
                <img
                  src={sponsor.logo}
                  alt={sponsor.name}
                  className="max-h-full max-w-full object-contain mx-auto"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
