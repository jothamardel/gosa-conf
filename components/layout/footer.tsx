// 'use client';

// import Link from 'next/link';
// import { Calendar, Mail, Phone, MapPin, Facebook, Twitter, Linkedin, Instagram } from 'lucide-react';

// export function Footer() {
//   const socialLinks = [
//     { icon: Facebook, href: '#', label: 'Facebook' },
//     { icon: Twitter, href: '#', label: 'Twitter' },
//     { icon: Linkedin, href: '#', label: 'LinkedIn' },
//     { icon: Instagram, href: '#', label: 'Instagram' },
//   ];

//   const quickLinks = [
//     { name: 'Home', href: '/' },
//     { name: 'Register', href: '/register' },
//     { name: 'Agenda', href: '/agenda' },
//     { name: 'Check-in', href: '/checkin' },
//     { name: 'Accommodation', href: '/accommodation' },
//     { name: 'Donations', href: '/donations' },
//   ];

//   return (
//     <footer className="bg-gray-900 text-white">
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
//           {/* Brand Section */}
//           <div className="col-span-1 lg:col-span-2">
//             <div className="flex items-center space-x-2 mb-6">
//               <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-secondary-500 rounded-lg flex items-center justify-center">
//                 <Calendar className="w-5 h-5 text-white" />
//               </div>
//               <span className="text-2xl font-bold">Convention 2025</span>
//             </div>

//             <p className="text-gray-300 mb-6 leading-relaxed max-w-md">
//               Join us for an unforgettable experience at the premier annual convention.
//               Connect, learn, and grow with industry leaders and peers.
//             </p>

//             <div className="flex space-x-4">
//               {socialLinks.map((social) => (
//                 <a
//                   key={social.label}
//                   href={social.href}
//                   className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-primary-600 transition-colors duration-300"
//                   aria-label={social.label}
//                 >
//                   <social.icon className="w-5 h-5" />
//                 </a>
//               ))}
//             </div>
//           </div>

//           {/* Quick Links */}
//           <div>
//             <h3 className="text-lg font-semibold mb-6">Quick Links</h3>
//             <ul className="space-y-3">
//               {quickLinks.map((link) => (
//                 <li key={link.name}>
//                   <Link
//                     href={link.href}
//                     className="text-gray-300 hover:text-primary-400 transition-colors duration-300"
//                   >
//                     {link.name}
//                   </Link>
//                 </li>
//               ))}
//             </ul>
//           </div>

//           {/* Contact Info */}
//           <div>
//             <h3 className="text-lg font-semibold mb-6">Contact Info</h3>
//             <div className="space-y-4">
//               <div className="flex items-center space-x-3">
//                 <Mail className="w-5 h-5 text-primary-400" />
//                 <span className="text-gray-300">info@convention2025.com</span>
//               </div>
//               <div className="flex items-center space-x-3">
//                 <Phone className="w-5 h-5 text-primary-400" />
//                 <span className="text-gray-300">+1 +234 816 2329 082</span>
//               </div>
//               <div className="flex items-center space-x-3">
//                 <MapPin className="w-5 h-5 text-primary-400" />
//                 <span className="text-gray-300">Convention Center, City</span>
//               </div>
//             </div>
//           </div>
//         </div>

//         <div className="border-t border-gray-800 mt-12 pt-8">
//           <div className="flex flex-col md:flex-row justify-between items-center">
//             <p className="text-gray-400 text-sm">
//               © 2025 Convention Management System. All rights reserved.
//             </p>
//             <div className="flex space-x-6 mt-4 md:mt-0">
//               <Link href="/privacy" className="text-gray-400 hover:text-primary-400 text-sm transition-colors duration-300">
//                 Privacy Policy
//               </Link>
//               <Link href="/terms" className="text-gray-400 hover:text-primary-400 text-sm transition-colors duration-300">
//                 Terms of Service
//               </Link>
//             </div>
//           </div>
//         </div>
//       </div>
//     </footer>
//   );
// }

"use client";

import Link from "next/link";
import {
  Calendar,
  Mail,
  Phone,
  MapPin,
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
} from "lucide-react";

export function Footer() {
  const socialLinks = [
    { icon: Facebook, href: "#", label: "Facebook" },
    { icon: Twitter, href: "#", label: "Twitter" },
    { icon: Linkedin, href: "#", label: "LinkedIn" },
    { icon: Instagram, href: "#", label: "Instagram" },
  ];

  const quickLinks = [
    { name: "Home", href: "/" },
    { name: "Register", href: "/register" },
    { name: "Agenda", href: "/agenda" },
    { name: "Check-in", href: "/checkin" },
    { name: "Accommodation", href: "/accommodation" },
    { name: "Donations", href: "/donations" },
  ];

  return (
    <footer className="bg-slate-950 text-white border-t border-slate-800/80 relative overflow-hidden">
      {/* Radial Emerald Glow Decor */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12">
          {/* Brand Section */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-2 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-1 flex items-center justify-center">
                <img src="/images/gosa.png" alt="GOSA" className="w-8 h-8 object-contain" />
              </div>
              <div>
                <span className="text-xl sm:text-2xl font-black bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 bg-clip-text text-transparent tracking-tight font-display block">
                  GOSA Convention 2026
                </span>
                <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block">
                  For Light and Truth
                </span>
              </div>
            </div>

            <p className="text-slate-400 leading-relaxed max-w-md text-sm sm:text-base font-medium">
              Empowering Gindiri Compound Schools, fostering alumni networking, and celebrating decades of leadership and service.
            </p>

            <div className="flex space-x-3 pt-2">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  className="w-10 h-10 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center text-slate-400 hover:text-emerald-400 hover:border-emerald-500/40 hover:bg-slate-850 transition-all duration-300"
                  aria-label={social.label}
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="col-span-1">
            <h3 className="text-sm font-extrabold uppercase tracking-widest text-emerald-400 mb-4 sm:mb-6">
              Quick Links
            </h3>
            <ul className="space-y-2.5">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-slate-400 hover:text-white text-sm font-medium transition-colors duration-200 flex items-center gap-1.5"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/40" />
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div className="col-span-1">
            <h3 className="text-sm font-extrabold uppercase tracking-widest text-emerald-400 mb-4 sm:mb-6">
              Contact Secretariat
            </h3>
            <div className="space-y-3.5 text-xs sm:text-sm text-slate-300">
              <div className="flex items-start space-x-3">
                <Mail className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <span className="truncate">gosasecretariat@gmail.com</span>
              </div>
              <div className="flex items-start space-x-3">
                <Phone className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <span>+234 816 2329 082</span>
              </div>
              <div className="flex items-start space-x-3">
                <MapPin className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <span className="leading-relaxed">
                  J.D Gomwalk National Secretariat<br />
                  Ahead Mu'azu House, Dogon Karfe<br />
                  P.O. Box 8126, Jos, Nigeria
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-900 mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-slate-500 text-xs text-center sm:text-left font-medium">
            © 2026 GOSA - Gindiri Old Students Association. All rights reserved.
          </p>
          <div className="flex space-x-6 text-xs text-slate-400">
            <Link href="/privacy" className="hover:text-emerald-400 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-emerald-400 transition-colors">
              Terms of Service
            </Link>
            <Link href="/contact" className="hover:text-emerald-400 transition-colors">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
