import { Hero } from "@/components/sections/hero";
import { Features } from "@/components/sections/features";
import { EventDetails } from "@/components/sections/event-details";
import { Navigation } from "@/components/layout/navigation";
import { Footer } from "@/components/layout/footer";
import { GallerySection } from "@/components/sections/gallery";
import AboutSection from "@/components/sections/about";
import { Sponsors } from "@/components/sections/sponsors";
import {
  Calendar,
  MapPin,
  Users,
  Sparkles,
  Handshake,
  GraduationCap,
  BookOpen,
  ArrowRight,
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-amber-50 overflow-hidden">
      <Navigation />
      <Hero />
      <div className="py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 max-w-5xl mx-auto px-4 sm:px-0">
          <div className="glass-card mobile-card-spacing rounded-xl sm:rounded-2xl hover-lift animate-fade-in bg-white/80 backdrop-blur-sm border border-white/50">
            <Calendar className="w-10 h-10 sm:w-12 sm:h-12 text-primary-600 mx-auto mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
              November 1st - November 2nd, 2025
            </h3>
            <p className="text-sm sm:text-base text-gray-600">
              2 days of sessions + reunion activities
            </p>
          </div>

          <div className="glass-card mobile-card-spacing rounded-xl sm:rounded-2xl hover-lift animate-fade-in bg-white/80 backdrop-blur-sm border border-white/50">
            <MapPin className="w-10 h-10 sm:w-12 sm:h-12 text-secondary-600 mx-auto mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
              Convention Center
            </h3>
            <p className="text-sm sm:text-base text-gray-600">
              Crispan Events Center
            </p>
          </div>

          <div className="glass-card mobile-card-spacing rounded-xl sm:rounded-2xl hover-lift animate-fade-in sm:col-span-2 lg:col-span-1 bg-white/80 backdrop-blur-sm border border-white/50">
            <Handshake className="w-10 h-10 sm:w-12 sm:h-12 text-primary-600 mx-auto mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
              Dual Focus
            </h3>
            <p className="text-sm sm:text-base text-gray-600">
              Professional networking + class reunions
            </p>
          </div>
        </div>

        <div className="mt-8 sm:mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-sm text-gray-700">
          <div className="flex items-center space-x-2 bg-white/60 backdrop-blur-sm px-3 py-2 rounded-full border border-white/50">
            <Users className="w-4 h-4 text-primary-600" />
            <span>15,000+ Expected Attendees</span>
          </div>
          <div className="flex items-center space-x-2 bg-white/60 backdrop-blur-sm px-3 py-2 rounded-full border border-white/50">
            <Calendar className="w-4 h-4 text-secondary-600" />
            <span>Early Bird Pricing Available</span>
          </div>
        </div>
      </div>
      <Sponsors />
      <Features />
      <EventDetails />
      <AboutSection />
      <GallerySection />
      <Footer />
    </div>
  );
}
