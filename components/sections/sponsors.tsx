// CSS Animation Styles
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

export function Sponsors({ bg = "bg-white" }) {
  return (
    <div className={`pt-12 sm:pt-16 relative ${bg}`}>
      {/* Inject animation styles */}
      <style>{animationStyles}</style>

      {/* Section Title */}
      <h3 className="text-center text-black text-lg sm:text-xl font-semibold mb-8">
        Proudly Supported By Our Sponsors
      </h3>

      {/* Sponsor Slider Container */}
      <div className="relative overflow-hidden">
        {/* Gradient Masks for Smooth Fade Edges */}
        <div className="absolute left-0 top-0 w-24 h-full bg-gradient-to-r from-black/40 via-black/10 to-transparent z-10 pointer-events-none"></div>
        <div className="absolute right-0 top-0 w-24 h-full bg-gradient-to-l from-black/40 via-black/10 to-transparent z-10 pointer-events-none"></div>

        {/* Sponsor Logos Slider */}
        <div className="flex animate-scroll-sponsors">
          {[
            "Tech Corp",
            "Global Bank",
            "Innovation Hub",
            "Future Systems",
            "Digital Solutions",
            "Smart Industries",
            "Next Gen Tech",
            "Prime Ventures",
          ].map((sponsor, index) => (
            <div key={index} className="flex-none mx-6 sm:mx-8 border rounded">
              <div
                className="w-32 sm:w-40 h-20 sm:h-24
                           bg-white backdrop-blur-md
                           border border-white/20
                           rounded-xl flex items-center justify-center
                           p-4 hover:scale-105 transition-transform duration-300"
              >
                <span className="text-black text-xs sm:text-sm font-medium text-center">
                  {sponsor}
                </span>
              </div>
            </div>
          ))}

          {/* Duplicate Set for Seamless Loop */}
          {[
            "Tech Corp",
            "Global Bank",
            "Innovation Hub",
            "Future Systems",
            "Digital Solutions",
            "Smart Industries",
            "Next Gen Tech",
            "Prime Ventures",
          ].map((sponsor, index) => (
            <div
              key={`dup-${index}`}
              className="flex-none mx-6 sm:mx-8 border rounded"
            >
              <div
                className="w-32 sm:w-40 h-20 sm:h-24
                           bg-white backdrop-blur-md
                           border border-white/20
                           rounded-xl flex items-center justify-center
                           p-4 hover:scale-105 transition-transform duration-300"
              >
                <span className="text-black text-xs sm:text-sm font-medium text-center">
                  {sponsor}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
