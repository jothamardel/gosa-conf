// "use client";

// import { Button } from "@/components/ui/button";
// import { Calendar, MapPin, Users, Sparkles } from "lucide-react";
// import Link from "next/link";

// export function Hero() {
//   return (
//     <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-secondary-50 py-20 sm:py-32">
//       {/* <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%2316A34A" fill-opacity="0.05"%3E%3Ccircle cx="7" cy="7" r="7"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-40"></div> */}

//       <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//         <div className="text-center">
//           <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-primary-100 to-secondary-100 text-primary-800 text-sm font-medium mb-8 animate-fade-in">
//             <Sparkles className="w-4 h-4 mr-2" />
//             Annual Convention 2024 - Now Open for Registration
//           </div>

//           <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 animate-fade-in">
//             <span className="block">Join the</span>
//             <span className="gradient-text">Premier Convention</span>
//             <span className="block">Experience</span>
//           </h1>

//           <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed animate-fade-in">
//             Connect with industry leaders, discover innovative solutions, and be
//             part of an unforgettable experience. Register now with our seamless
//             QR code check-in system.
//           </p>

//           <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-fade-in">
//             <Link href="/register">
//               <Button
//                 size="lg"
//                 className="bg-gradient-to-r from-primary-600 to-secondary-500 hover:from-primary-700 hover:to-secondary-600 text-white px-8 py-4 text-lg font-semibold shadow-lg hover-lift"
//               >
//                 Register Now
//                 <Users className="ml-2 w-5 h-5" />
//               </Button>
//             </Link>
//             <Link href="/agenda">
//               <Button
//                 variant="outline"
//                 size="lg"
//                 className="border-2 border-primary-600 text-primary-600 hover:bg-primary-50 px-8 py-4 text-lg font-semibold hover-lift"
//               >
//                 View Agenda
//                 <Calendar className="ml-2 w-5 h-5" />
//               </Button>
//             </Link>
//           </div>

//           <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
//             <div className="glass-card p-6 rounded-2xl hover-lift animate-fade-in">
//               <Calendar className="w-12 h-12 text-primary-600 mx-auto mb-4" />
//               <h3 className="text-lg font-semibold text-gray-900 mb-2">
//                 November 2024
//               </h3>
//               <p className="text-gray-600">
//                 Three days of inspiring content and networking
//               </p>
//             </div>

//             <div className="glass-card p-6 rounded-2xl hover-lift animate-fade-in">
//               <MapPin className="w-12 h-12 text-secondary-600 mx-auto mb-4" />
//               <h3 className="text-lg font-semibold text-gray-900 mb-2">
//                 Premium Venue
//               </h3>
//               <p className="text-gray-600">
//                 State-of-the-art conference facilities
//               </p>
//             </div>

//             <div className="glass-card p-6 rounded-2xl hover-lift animate-fade-in">
//               <Users className="w-12 h-12 text-primary-600 mx-auto mb-4" />
//               <h3 className="text-lg font-semibold text-gray-900 mb-2">
//                 500+ Attendees
//               </h3>
//               <p className="text-gray-600">
//                 Connect with industry professionals
//               </p>
//             </div>
//           </div>
//         </div>
//       </div>
//     </section>
//   );
// }

// "use client";

// import { Button } from "@/components/ui/button";
// import {
//   Calendar,
//   MapPin,
//   Users,
//   Sparkles,
//   Handshake,
//   GraduationCap,
//   BookOpen,
//   ArrowRight,
// } from "lucide-react";
// import Link from "next/link";

// export function Hero() {
//   return (
//     <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-secondary-50 py-8 sm:py-16 lg:py-20">
//       {/* Subtle alumni-themed background pattern */}
//       <div className="absolute inset-0 bg-[url('/images/convention-pattern.svg')] opacity-10"></div>

//       <div className="relative max-w-7xl mx-auto mobile-container">
//         {/* Logo Section - Mobile Optimized */}
//         <div className="w-full flex justify-center mb-6 sm:mb-8">
//           <img
//             src="/images/gosa.png"
//             alt="GOSA Logo"
//             className="w-32 sm:w-40 md:w-48 lg:w-52 h-auto object-contain"
//           />
//         </div>

//         <div className="text-center">
//           {/* Badge - Mobile Responsive */}
//           <div className="inline-flex items-center px-3 py-2 sm:px-4 sm:py-2 rounded-full bg-gradient-to-r from-primary-100 to-secondary-100 text-primary-800 text-xs sm:text-sm font-medium mb-6 sm:mb-8 animate-fade-in max-w-full">
//             <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0" />
//             <span className="text-center">Alumni Convention & Reunion 2025 • Register Today</span>
//           </div>

//           {/* Main Heading - Mobile Responsive Typography */}
//           <h1 className="heading-responsive-xl font-bold text-gray-900 mb-4 sm:mb-6 animate-fade-in leading-tight">
//             <span className="block">Nurturing Excellence</span>
//             <span className="gradient-text block mt-2">
//               Strengthen bonds for a brighter future.
//             </span>
//           </h1>

//           {/* Description - Mobile Optimized */}
//           <p className="text-base sm:text-lg lg:text-xl text-gray-600 mb-8 sm:mb-12 max-w-3xl mx-auto leading-relaxed animate-fade-in px-4 sm:px-0">
//             Professional development meets cherished memories at our premier
//             alumni convention. Featuring keynote speakers, career networking,
//             and special reunion events.
//           </p>

//           {/* CTA Buttons - Mobile Stack */}
//           <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-12 sm:mb-16 animate-fade-in px-4 sm:px-0">
//             <Link href="/register" className="w-full sm:w-auto">
//               <Button
//                 size="lg"
//                 className="w-full sm:w-auto bg-gradient-to-r from-primary-600 to-secondary-500 hover:from-primary-700 hover:to-secondary-600 text-white mobile-button-responsive font-semibold shadow-lg hover-lift touch-target"
//               >
//                 Register Now
//                 <GraduationCap className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
//               </Button>
//             </Link>
//             <Link href="/agenda" className="w-full sm:w-auto">
//               <Button
//                 variant="outline"
//                 size="lg"
//                 className="w-full sm:w-auto border-2 border-primary-600 text-primary-600 hover:bg-primary-50 mobile-button-responsive font-semibold hover-lift touch-target"
//               >
//                 Convention Program
//                 <BookOpen className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
//               </Button>
//             </Link>
//           </div>

//           {/* Feature Cards - Mobile Responsive Grid */}
//           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 max-w-5xl mx-auto px-4 sm:px-0">
//             <div className="glass-card mobile-card-spacing rounded-xl sm:rounded-2xl hover-lift animate-fade-in">
//               <Calendar className="w-10 h-10 sm:w-12 sm:h-12 text-primary-600 mx-auto mb-3 sm:mb-4" />
//               <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
//                 October 29th - November 2nd, 2025
//               </h3>
//               <p className="text-sm sm:text-base text-gray-600">
//                 5 days of sessions + reunion activities
//               </p>
//             </div>

//             <div className="glass-card mobile-card-spacing rounded-xl sm:rounded-2xl hover-lift animate-fade-in">
//               <MapPin className="w-10 h-10 sm:w-12 sm:h-12 text-secondary-600 mx-auto mb-3 sm:mb-4" />
//               <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
//                 Convention Center
//               </h3>
//               <p className="text-sm sm:text-base text-gray-600">
//                 Premium venue with dedicated reunion spaces
//               </p>
//             </div>

//             <div className="glass-card mobile-card-spacing rounded-xl sm:rounded-2xl hover-lift animate-fade-in sm:col-span-2 lg:col-span-1">
//               <Handshake className="w-10 h-10 sm:w-12 sm:h-12 text-primary-600 mx-auto mb-3 sm:mb-4" />
//               <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
//                 Dual Focus
//               </h3>
//               <p className="text-sm sm:text-base text-gray-600">
//                 Professional networking + class reunions
//               </p>
//             </div>
//           </div>

//           {/* Quick Actions for Mobile */}
//           <div className="mt-8 sm:mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-sm text-gray-600">
//             <div className="flex items-center space-x-2">
//               <Users className="w-4 h-4 text-primary-600" />
//               <span>500+ Expected Attendees</span>
//             </div>
//             <div className="flex items-center space-x-2">
//               <Calendar className="w-4 h-4 text-secondary-600" />
//               <span>Early Bird Pricing Available</span>
//             </div>
//           </div>
//         </div>
//       </div>
//     </section>
//   );
// }


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

export function Hero() {
  return (
    <section className="relative overflow-hidden py-8 sm:py-16 lg:py-20">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/images/DSC_7550.jpg')", // Replace with your image path
        }}
      ></div>
      
      {/* White Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/90 via-white/85 to-white/80"></div>
      
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
            className="w-32 sm:w-40 md:w-48 lg:w-52 h-auto object-contain"
          />
        </div>

        <div className="text-center">
          {/* Badge - Mobile Responsive */}
          <div className="inline-flex items-center px-3 py-2 sm:px-4 sm:py-2 rounded-full bg-gradient-to-r from-primary-100/90 to-secondary-100/90 backdrop-blur-sm text-primary-800 text-xs sm:text-sm font-medium mb-6 sm:mb-8 animate-fade-in max-w-full border border-white/50">
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0" />
            <span className="text-center">Alumni Convention & Reunion 2025 • Register Today</span>
          </div>

          {/* Main Heading - Mobile Responsive Typography */}
          <h1 className="heading-responsive-xl font-bold text-gray-900 mb-4 sm:mb-6 animate-fade-in leading-tight">
            <span className="block">Nurturing Excellence</span>
            <span className="gradient-text block mt-2">
              Strengthen bonds for a brighter future.
            </span>
          </h1>

          {/* Description - Mobile Optimized */}
          <p className="text-base sm:text-lg lg:text-xl text-gray-700 mb-8 sm:mb-12 max-w-3xl mx-auto leading-relaxed animate-fade-in px-4 sm:px-0">
            Professional development meets cherished memories at our premier
            alumni convention. Featuring keynote speakers, career networking,
            and special reunion events.
          </p>

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
                className="w-full sm:w-auto border-2 border-primary-600 text-primary-600 hover:bg-primary-50/80 backdrop-blur-sm mobile-button-responsive font-semibold hover-lift touch-target bg-white/70"
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
                October 29th - November 2nd, 2025
              </h3>
              <p className="text-sm sm:text-base text-gray-600">
                5 days of sessions + reunion activities
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
              <span>500+ Expected Attendees</span>
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