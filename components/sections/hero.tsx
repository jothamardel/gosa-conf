"use client";

import { Button } from "@/components/ui/button";
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
import Link from "next/link";
import { useEffect, useState } from "react";

// Array of background images for the carousel
const backgroundImages = [
  "/images/DSC_7116.jpg",
  "/images/DSC_7137.jpg",
  "/images/DSC_7252.jpg",
  "/images/DSC_7311.jpg",
  "/images/DSC_7466.jpg",
  "/images/DSC_7546.jpg",
  "/images/DSC_7550.jpg",
  "/images/DSC_7716.jpg",
  "/images/DSC_7718.jpg",
  "/images/DSC_8295.jpg",
];
export function Hero() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Auto-advance carousel every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex(
        (prevIndex: number) => (prevIndex + 1) % backgroundImages.length,
      );
    }, 5000);

    return () => clearInterval(interval);
  }, [backgroundImages.length]);

  // Manual navigation functions
  const goToSlide = (index: number) => {
    setCurrentImageIndex(index);
  };

  const nextSlide = () => {
    setCurrentImageIndex(
      (prevIndex: number) => (prevIndex + 1) % backgroundImages.length,
    );
  };

  const prevSlide = () => {
    setCurrentImageIndex(
      (prevIndex: number) =>
        (prevIndex - 1 + backgroundImages.length) % backgroundImages.length,
    );
  };
  return (
    <section className="relative overflow-hidden py-8 sm:py-16 lg:py-20">
      {/* Background Image */}
      {/*<div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/images/DSC_7550.jpg')", // Replace with your image path
        }}
      ></div>*/}

      {/* Background Image Carousel */}
      <div className="absolute inset-0">
        {backgroundImages.map((image, index) => (
          <div
            key={index}
            className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000 ${
              index === currentImageIndex ? "opacity-100" : "opacity-0"
            }`}
            style={{
              backgroundImage: `url('${image}')`,
            }}
          />
        ))}
      </div>

      {/* Carousel Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white/20 backdrop-blur-sm rounded-full p-3 hover:bg-white/30 transition-all duration-200 group"
      >
        <svg
          className="w-6 h-6 text-white group-hover:scale-110 transition-transform"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>

      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-white/20 backdrop-blur-sm rounded-full p-3 hover:bg-white/30 transition-all duration-200 group"
      >
        <svg
          className="w-6 h-6 text-white group-hover:scale-110 transition-transform"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>

      {/* Carousel Indicators */}
      <div className="absolute bottom-4  left-1/2 -translate-x-1/2 z-20 flex space-x-2">
        {backgroundImages.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-3 h-3 rounded-full transition-all duration-200 ${
              index === currentImageIndex
                ? "bg-white scale-110"
                : "bg-white/50 hover:bg-white/70"
            }`}
          />
        ))}
      </div>

      {/* White Gradient Overlay */}
      {/*<div className="absolute inset-0 bg-gradient-to-br from-black/90 via-white/85 to-black/80"></div>*/}

      {/* Additional Color Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-50/60 via-transparent to-secondary-50/40"></div>

      {/* Subtle alumni-themed background pattern */}
      <div className="absolute inset-0 bg-[url('/images/DSC_7550.jpg')] opacity-5"></div>

      <div className="relative max-w-7xl mx-auto mobile-container">
        {/* Logo Section - Mobile Optimized */}
        <div className="w-full flex justify-center mb-6 sm:mb-8">
          <img
            src="/images/gosa.png"
            alt="GOSA Logo"
            // width="32px"
            // height="32px"
            className="w-32 sm:w-40 md:w-48 lg:w-52 h-auto object-contain"
          />
        </div>

        <div className="text-center">
          {/* Badge - Mobile Responsive */}
          <div className="inline-flex items-center px-3 py-2 sm:px-4 sm:py-2 rounded-full bg-gradient-to-r from-primary-100/90 to-secondary-100/90 backdrop-blur-sm text-primary-800 text-xs sm:text-sm font-medium mb-6 sm:mb-8 animate-fade-in max-w-full border border-white/50">
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0" />
            <span className="text-center">
              Alumni Convention & Reunion 2025 • Register Today
            </span>
          </div>

          {/* Main Heading - Mobile Responsive Typography */}
          <h1 className="heading-responsive-lg font-extrabold text-gray-900 mb-4 sm:mb-6 animate-fade-in leading-none">
            <span
              className="block text-white"
              style={{
                textShadow:
                  "2px 2px 4px rgba(0,0,0,0.9), -1px -1px 2px rgba(255,255,255,0.2), 0 0 20px rgba(0,0,0,0.5)",
              }}
            >
              Strengthening our legacy
            </span>
            <span
              className="text-white block mt-1.5"
              // className="gradient-text block mt-1.5"
              style={{
                textShadow:
                  "2px 2px 4px rgba(0,0,0,0.9), -1px -1px 2px rgba(255,255,255,0.2), 0 0 20px rgba(0,0,0,0.5)",
              }}
            >
              Empowering the next generation of leaders
            </span>
          </h1>

          {/* Description - Mobile Optimized */}
          <div className="text-center w-full">
            <p className="bg-gradient-to-r from-primary-100/30 to-secondary-100/30 backdrop-blur-sm w-fit rounded-lg p-2 text-black text-base sm:text-lg lg:text-xl  mb-8 sm:mb-12 max-w-3xl mx-auto leading-relaxed animate-fade-in px-4 sm:px-0">
              Professional development meets cherished memories at our premier
              alumni convention. Featuring keynote speakers, career networking,
              and special reunion events.
            </p>
          </div>

          {/* CTA Buttons - Mobile Stack */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-12 sm:mb-16 animate-fade-in px-4 sm:px-0">
            <Link href="/register" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-gradient-to-r from-primary-600 to-secondary-500 hover:from-primary-700 hover:to-secondary-600 text-white mobile-button-responsive font-semibold shadow-lg hover-lift touch-target"
              >
                Register Now
                <GraduationCap className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </Link>
            <Link href="/agenda" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto border-2 border-primary-600 text-primary-600 hover:bg-primary-50/80 backdrop-blur-sm mobile-button-responsive font-semibold hover-lift touch-target bg-white"
              >
                Convention Program
                <BookOpen className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </Link>
          </div>

          {/* Feature Cards - Mobile Responsive Grid */}
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
                Premium venue with dedicated reunion spaces
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

          {/* Quick Actions for Mobile */}
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
      </div>
    </section>
  );
}
