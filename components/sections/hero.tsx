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




"use client";

import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Users, Sparkles, Handshake, GraduationCap, BookOpen } from "lucide-react";
import Link from "next/link";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-secondary-50 py-10 sm:py-32">
      {/* Subtle alumni-themed background pattern */}
      <div className="absolute inset-0 bg-[url('/images/convention-pattern.svg')] opacity-10"></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-primary-100 to-secondary-100 text-primary-800 text-sm font-medium mb-8 animate-fade-in">
            <Sparkles className="w-4 h-4 mr-2" />
            Alumni Convention & Reunion 2024 • Register Today
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 animate-fade-in">
            <span className="block">Where Legacy Meets</span>
            <span className="gradient-text">Future Connections</span>
          </h1>

          <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed animate-fade-in">
            Professional development meets cherished memories at our premier alumni convention. 
            Featuring keynote speakers, career networking, and special reunion events.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-fade-in">
            <Link href="/register">
              <Button
                size="lg"
                className="bg-gradient-to-r from-primary-600 to-secondary-500 hover:from-primary-700 hover:to-secondary-600 text-white px-8 py-4 text-lg font-semibold shadow-lg hover-lift"
              >
                Secure Your Spot
                <GraduationCap className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/program">
              <Button
                variant="outline"
                size="lg"
                className="border-2 border-primary-600 text-primary-600 hover:bg-primary-50 px-8 py-4 text-lg font-semibold hover-lift"
              >
                Convention Program
                <BookOpen className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="glass-card p-6 rounded-2xl hover-lift animate-fade-in">
              <Calendar className="w-12 h-12 text-primary-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nov 15-17, 2024
              </h3>
              <p className="text-gray-600">
                3 days of professional sessions + reunion activities
              </p>
            </div>

            <div className="glass-card p-6 rounded-2xl hover-lift animate-fade-in">
              <MapPin className="w-12 h-12 text-secondary-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Convention Center
              </h3>
              <p className="text-gray-600">
                Premium venue with dedicated reunion spaces
              </p>
            </div>

            <div className="glass-card p-6 rounded-2xl hover-lift animate-fade-in">
              <Handshake className="w-12 h-12 text-primary-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Dual Focus
              </h3>
              <p className="text-gray-600">
                Career networking + class reunions
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}