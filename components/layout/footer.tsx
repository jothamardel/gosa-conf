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
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto mobile-container py-12 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {/* Brand Section - Mobile Optimized */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-2">
            <div className="flex items-center space-x-3 mb-4 sm:mb-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-primary-600 to-secondary-500 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <span className="text-xl sm:text-2xl font-bold">GOSA Convention 2025</span>
            </div>

            <p className="text-gray-300 mb-6 leading-relaxed max-w-md text-sm sm:text-base">
              For light and truth. Join us for an unforgettable alumni experience.
            </p>

            <div className="flex space-x-3 sm:space-x-4">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-primary-600 transition-colors duration-300 touch-target"
                  aria-label={social.label}
                >
                  <social.icon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-300 hover:text-white" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links - Mobile Optimized */}
          <div className="col-span-1">
            <h3 className="text-base sm:text-lg font-semibold mb-4 sm:mb-6 text-primary-100">
              Quick Links
            </h3>
            <ul className="space-y-2 sm:space-y-3">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-gray-300 hover:text-primary-400 transition-colors duration-300 flex items-center text-sm sm:text-base touch-target py-1"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info - Mobile Optimized */}
          <div className="col-span-1">
            <h3 className="text-base sm:text-lg font-semibold mb-4 sm:mb-6 text-primary-100">
              Contact Us
            </h3>
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-start space-x-3">
                <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-primary-400 mt-1 flex-shrink-0" />
                <span className="text-gray-300 text-sm sm:text-base">gosasecretariat@gmail.com</span>
              </div>
              <div className="flex items-start space-x-3">
                <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-primary-400 mt-1 flex-shrink-0" />
                <span className="text-gray-300 text-sm sm:text-base">+234 816 2329 082</span>
              </div>
              <div className="flex items-start space-x-3">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-primary-400 mt-1 flex-shrink-0" />
                <span className="text-gray-300 text-sm sm:text-base">
                  J.D Gomwalk National Secretariat
                  Ahead Mu'azu House
                  Dogon Karfe
                  <br />
                  P.O. Box, 8126
                  Jos, Nigeria
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 sm:mt-12 pt-6 sm:pt-8">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
            <p className="text-gray-400 text-xs sm:text-sm text-center sm:text-left">
              © 2025 GOSA - Gindiri Old Students Association. All rights reserved.
            </p>
            <div className="flex flex-wrap justify-center sm:justify-end space-x-4 sm:space-x-6">
              <Link
                href="/privacy"
                className="text-gray-400 hover:text-primary-400 text-xs sm:text-sm transition-colors duration-300 touch-target py-1"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="text-gray-400 hover:text-primary-400 text-xs sm:text-sm transition-colors duration-300 touch-target py-1"
              >
                Terms of Service
              </Link>
              <Link
                href="/contact"
                className="text-gray-400 hover:text-primary-400 text-xs sm:text-sm transition-colors duration-300 touch-target py-1"
              >
                Contact
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
