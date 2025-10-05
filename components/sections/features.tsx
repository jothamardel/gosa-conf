"use client";

import {
  QrCode,
  Utensils,
  Users,
  Gift,
  Building,
  Heart,
  BookOpen,
  ArrowRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

const features = [
  {
    icon: Users,
    title: "Event Registration",
    description: "Register for the convention and secure your spot.",
    gradient: "from-green-500 to-green-600",
    path: "/register",
    requiresAuth: false,
  },
  {
    icon: Utensils,
    title: "Dinner Reservation",
    description: "Reserve your seat at our exclusive welcome dinner.",
    gradient: "from-secondary-500 to-secondary-600",
    path: "/dinner",
    requiresAuth: false,
  },
  // {
  //   icon: Building,
  //   title: "Accommodation",
  //   description: "Book your stay with our partner hotels.",
  //   gradient: "from-blue-500 to-blue-600",
  //   path: "#",
  //   // path: "/accommodation",
  //   requiresAuth: false,
  // },
  {
    icon: BookOpen,
    title: "Convention Brochure",
    description: "Get the official event guide with complete program details.",
    gradient: "from-purple-500 to-purple-600",
    path: "/brochure",
    requiresAuth: false,
  },
  {
    icon: Gift,
    title: "Goodwill Messages",
    description: "Share your messages of support with the community.",
    gradient: "from-pink-500 to-pink-600",
    path: "/goodwill",
    requiresAuth: false,
  },
  {
    icon: Heart,
    title: "Donations",
    description: "Support our cause with your generous contribution.",
    gradient: "from-rose-500 to-rose-600",
    path: "/donate",
    requiresAuth: false,
  },
  // {
  //   icon: QrCode,
  //   title: "QR Code Check-in",
  //   description: "Access your unique QR code after registration.",
  //   gradient: "from-primary-500 to-primary-600",
  //   path: "/profile",
  //   requiresAuth: false,
  // },
];

export function Features() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";

  const handleNavigation = (path: string, requiresAuth: boolean) => {
    if (requiresAuth && !isAuthenticated) {
      router.push("/register");
    } else {
      router.push(path);
    }
  };

  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-white">
      <div className="max-w-7xl mx-auto mobile-container">
        <div className="text-center mb-8 sm:mb-12 lg:mb-16">
          <h2 className="heading-responsive-lg font-bold text-gray-900 mb-3 sm:mb-4">
            Convention
            <span className="gradient-text"> Services</span>
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            {
              " From registration to check-in, we've built comprehensive features to make your convention experience exceptional."
            }
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              onClick={() =>
                handleNavigation(feature.path, feature.requiresAuth)
              }
              className="group relative bg-gradient-to-br from-gray-50 to-white mobile-card-spacing rounded-xl sm:rounded-2xl border border-gray-100 hover:border-primary-200 transition-all duration-300 hover-lift animate-fade-in cursor-pointer touch-target shadow-sm hover:shadow-lg interactive-card touch-feedback"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div
                className={`inline-flex p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-gradient-to-r ${feature.gradient} mb-4 sm:mb-6 group-hover:scale-110 transition-transform duration-300`}
              >
                <feature.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>

              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-4 group-hover:text-primary-600 transition-colors duration-300">
                {feature.title}
              </h3>

              <p className="text-sm sm:text-base text-gray-600 leading-relaxed mb-4">
                {feature.description}
              </p>

              {/* Interactive Indicator */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-primary-600 group-hover:text-primary-700 transition-colors duration-300">
                  <span className="text-sm font-medium">Get Started</span>
                  <div className="w-6 h-6 rounded-full bg-primary-100 group-hover:bg-primary-200 flex items-center justify-center transition-all duration-300 group-hover:scale-110">
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </div>

                {/* Tap indicator for mobile */}
                <div className="sm:hidden flex items-center space-x-1 text-gray-400 text-xs">
                  <div className="w-2 h-2 rounded-full bg-gray-300 tap-indicator"></div>
                  <span>Tap</span>
                </div>
              </div>

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary-600/5 to-secondary-600/5 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

              {/* Click ripple effect */}
              <div className="absolute inset-0 rounded-xl sm:rounded-2xl overflow-hidden">
                <div className="absolute inset-0 bg-primary-600/10 scale-0 group-active:scale-100 transition-transform duration-150 origin-center rounded-full"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
