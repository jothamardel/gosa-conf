// // 'use client';

// // import Link from 'next/link';
// // import { useState } from 'react';
// // import { Button } from '@/components/ui/button';
// // import { Menu, X, Calendar, Users, QrCode } from 'lucide-react';
// // import { useSession, signOut } from 'next-auth/react';

// // export function Navigation() {
// //   const [isOpen, setIsOpen] = useState(false);
// //   const { data: session } = useSession();

// //   const navItems = [
// //     { name: 'Home', href: '/', icon: Calendar },
// //     { name: 'Register', href: '/register', icon: Users },
// //     { name: 'Agenda', href: '/agenda', icon: Calendar },
// //     { name: 'Check-in', href: '/checkin', icon: QrCode },
// //   ];

// //   return (
// //     <nav className="bg-white/95 backdrop-blur-sm border-b border-green-100 sticky top-0 z-50">
// //       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
// //         <div className="flex justify-between h-16">
// //           <div className="flex items-center">
// //             <Link href="/" className="flex items-center space-x-2">
// //               <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-secondary-500 rounded-lg flex items-center justify-center">
// //                 <Calendar className="w-5 h-5 text-white" />
// //               </div>
// //               <span className="text-xl font-bold gradient-text">Convention 2024</span>
// //             </Link>
// //           </div>

// //           {/* Desktop Navigation */}
// //           <div className="hidden md:flex items-center space-x-8">
// //             {navItems.map((item) => (
// //               <Link
// //                 key={item.name}
// //                 href={item.href}
// //                 className="text-gray-600 hover:text-primary-600 px-3 py-2 text-sm font-medium transition-colors duration-200 flex items-center space-x-1"
// //               >
// //                 <item.icon className="w-4 h-4" />
// //                 <span>{item.name}</span>
// //               </Link>
// //             ))}

// //             {session ? (
// //               <div className="flex items-center space-x-4">
// //                 {session.user?.role === 'admin' && (
// //                   <Link href="/admin">
// //                     <Button variant="outline" size="sm">
// //                       Admin Dashboard
// //                     </Button>
// //                   </Link>
// //                 )}
// //                 <Button
// //                   variant="outline"
// //                   size="sm"
// //                   onClick={() => signOut()}
// //                 >
// //                   Sign Out
// //                 </Button>
// //               </div>
// //             ) : (
// //               <div className="flex items-center space-x-2">
// //                 <Link href="/auth/signin">
// //                   <Button variant="outline" size="sm">
// //                     Sign In
// //                   </Button>
// //                 </Link>
// //                 <Link href="/register">
// //                   <Button size="sm" className="bg-gradient-to-r from-primary-600 to-secondary-500 hover:from-primary-700 hover:to-secondary-600">
// //                     Register Now
// //                   </Button>
// //                 </Link>
// //               </div>
// //             )}
// //           </div>

// //           {/* Mobile menu button */}
// //           <div className="md:hidden flex items-center">
// //             <button
// //               onClick={() => setIsOpen(!isOpen)}
// //               className="text-gray-600 hover:text-primary-600 p-2"
// //             >
// //               {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
// //             </button>
// //           </div>
// //         </div>
// //       </div>

// //       {/* Mobile Navigation */}
// //       {isOpen && (
// //         <div className="md:hidden bg-white border-t border-green-100">
// //           <div className="px-2 pt-2 pb-3 space-y-1">
// //             {navItems.map((item) => (
// //               <Link
// //                 key={item.name}
// //                 href={item.href}
// //                 className="text-gray-600 hover:text-primary-600 block px-3 py-2 text-base font-medium transition-colors duration-200 flex items-center space-x-2"
// //                 onClick={() => setIsOpen(false)}
// //               >
// //                 <item.icon className="w-4 h-4" />
// //                 <span>{item.name}</span>
// //               </Link>
// //             ))}

// //             <div className="pt-4 border-t border-gray-200">
// //               {session ? (
// //                 <div className="space-y-2">
// //                   {session.user?.role === 'admin' && (
// //                     <Link
// //                       href="/admin"
// //                       className="block px-3 py-2"
// //                       onClick={() => setIsOpen(false)}
// //                     >
// //                       <Button variant="outline" size="sm" className="w-full">
// //                         Admin Dashboard
// //                       </Button>
// //                     </Link>
// //                   )}
// //                   <div className="px-3 py-2">
// //                     <Button
// //                       variant="outline"
// //                       size="sm"
// //                       className="w-full"
// //                       onClick={() => {
// //                         signOut();
// //                         setIsOpen(false);
// //                       }}
// //                     >
// //                       Sign Out
// //                     </Button>
// //                   </div>
// //                 </div>
// //               ) : (
// //                 <div className="space-y-2">
// //                   <Link
// //                     href="/auth/signin"
// //                     className="block px-3 py-2"
// //                     onClick={() => setIsOpen(false)}
// //                   >
// //                     <Button variant="outline" size="sm" className="w-full">
// //                       Sign In
// //                     </Button>
// //                   </Link>
// //                   <Link
// //                     href="/register"
// //                     className="block px-3 py-2"
// //                     onClick={() => setIsOpen(false)}
// //                   >
// //                     <Button size="sm" className="w-full bg-gradient-to-r from-primary-600 to-secondary-500 hover:from-primary-700 hover:to-secondary-600">
// //                       Register Now
// //                     </Button>
// //                   </Link>
// //                 </div>
// //               )}
// //             </div>
// //           </div>
// //         </div>
// //       )}
// //     </nav>
// //   );
// // }

// 'use client';

// import Link from 'next/link';
// import { useState } from 'react';
// import { Button } from '@/components/ui/button';
// import { Menu, X, Calendar, Users, QrCode } from 'lucide-react';
// import { useSession, signOut } from 'next-auth/react';

// export function Navigation() {
//   const [isOpen, setIsOpen] = useState(false);
//   const { data: session } = useSession();

//   const navItems = [
//     { name: 'Home', href: '/', icon: Calendar },
//     { name: 'Register', href: '/register', icon: Users },
//     { name: 'Agenda', href: '/agenda', icon: Calendar },
//     { name: 'Check-in', href: '/checkin', icon: QrCode },
//   ];

//   const handleSignOut = async () => {
//     await signOut();
//   };

//   const handleMobileSignOut = async () => {
//     await signOut();
//     setIsOpen(false);
//   };

//   const toggleMobileMenu = () => {
//     setIsOpen(!isOpen);
//   };

//   const closeMobileMenu = () => {
//     setIsOpen(false);
//   };

//   return (
//     <nav className="bg-white/95 backdrop-blur-sm border-b border-green-100 sticky top-0 z-50">
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//         <div className="flex justify-between h-16">
//           <div className="flex items-center">
//             <Link href="/" className="flex items-center space-x-2">
//               <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-secondary-500 rounded-lg flex items-center justify-center">
//                 <Calendar className="w-5 h-5 text-white" />
//               </div>
//               <span className="text-xl font-bold gradient-text">Convention 2024</span>
//             </Link>
//           </div>

//           {/* Desktop Navigation */}
//           <div className="hidden md:flex items-center space-x-8">
//             {navItems.map((item) => {
//               const IconComponent = item.icon;
//               return (
//                 <Link
//                   key={item.name}
//                   href={item.href}
//                   className="text-gray-600 hover:text-primary-600 px-3 py-2 text-sm font-medium transition-colors duration-200 flex items-center space-x-1"
//                 >
//                   <IconComponent className="w-4 h-4" />
//                   <span>{item.name}</span>
//                 </Link>
//               );
//             })}

//             {session ? (
//               <div className="flex items-center space-x-4">
//                 {session.user?.role === 'admin' && (
//                   <Link href="/admin">
//                     <Button variant="outline" size="sm">
//                       Admin Dashboard
//                     </Button>
//                   </Link>
//                 )}
//                 <Button
//                   variant="outline"
//                   size="sm"
//                   onClick={handleSignOut}
//                 >
//                   Sign Out
//                 </Button>
//               </div>
//             ) : (
//               <div className="flex items-center space-x-2">
//                 <Link href="/auth/signin">
//                   <Button variant="outline" size="sm">
//                     Sign In
//                   </Button>
//                 </Link>
//                 <Link href="/register">
//                   <Button size="sm" className="bg-gradient-to-r from-primary-600 to-secondary-500 hover:from-primary-700 hover:to-secondary-600">
//                     Register Now
//                   </Button>
//                 </Link>
//               </div>
//             )}
//           </div>

//           {/* Mobile menu button */}
//           <div className="md:hidden flex items-center">
//             <button
//               onClick={toggleMobileMenu}
//               className="text-gray-600 hover:text-primary-600 p-2"
//               aria-label="Toggle mobile menu"
//             >
//               {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
//             </button>
//           </div>
//         </div>
//       </div>

//       {/* Mobile Navigation */}
//       {isOpen && (
//         <div className="md:hidden bg-white border-t border-green-100">
//           <div className="px-2 pt-2 pb-3 space-y-1">
//             {navItems.map((item) => {
//               const IconComponent = item.icon;
//               return (
//                 <Link
//                   key={item.name}
//                   href={item.href}
//                   className="text-gray-600 hover:text-primary-600 block px-3 py-2 text-base font-medium transition-colors duration-200 flex items-center space-x-2"
//                   onClick={closeMobileMenu}
//                 >
//                   <IconComponent className="w-4 h-4" />
//                   <span>{item.name}</span>
//                 </Link>
//               );
//             })}

//             <div className="pt-4 border-t border-gray-200">
//               {session ? (
//                 <div className="space-y-2">
//                   {session.user?.role === 'admin' && (
//                     <Link
//                       href="/admin"
//                       className="block px-3 py-2"
//                       onClick={closeMobileMenu}
//                     >
//                       <Button variant="outline" size="sm" className="w-full">
//                         Admin Dashboard
//                       </Button>
//                     </Link>
//                   )}
//                   <div className="px-3 py-2">
//                     <Button
//                       variant="outline"
//                       size="sm"
//                       className="w-full"
//                       onClick={handleMobileSignOut}
//                     >
//                       Sign Out
//                     </Button>
//                   </div>
//                 </div>
//               ) : (
//                 <div className="space-y-2">
//                   <Link
//                     href="/auth/signin"
//                     className="block px-3 py-2"
//                     onClick={closeMobileMenu}
//                   >
//                     <Button variant="outline" size="sm" className="w-full">
//                       Sign In
//                     </Button>
//                   </Link>
//                   <Link
//                     href="/register"
//                     className="block px-3 py-2"
//                     onClick={closeMobileMenu}
//                   >
//                     <Button size="sm" className="w-full bg-gradient-to-r from-primary-600 to-secondary-500 hover:from-primary-700 hover:to-secondary-600">
//                       Register Now
//                     </Button>
//                   </Link>
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       )}
//     </nav>
//   );
// }

"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Menu,
  X,
  Calendar,
  Users,
  QrCode,
  Home,
  LogIn,
  User,
  Shield,
  Lock,
  ChevronDown,
  LucideIcon,
  Wallet,
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";

// Type definitions
interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  public?: boolean;
  requiresAuth?: boolean;
  guestOnly?: boolean;
}

interface ProtectedLinkProps {
  item: NavItem;
  onClick?: () => void;
  className: string;
}

// Extend the session user type to include role
declare module "next-auth" {
  interface User {
    role?: string;
  }
  interface Session {
    user: User & {
      role?: string;
    };
  }
}

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { data: session, status } = useSession();

  // Safe role checking with fallback
  const userRole = session?.user?.role || "guest";
  const isAuthenticated = status === "authenticated";
  const isAdmin = isAuthenticated && userRole === "admin";

  // Public navigation items (always visible)
  const publicNavItems: NavItem[] = [];

  // Protected navigation items (require authentication)
  const protectedNavItems: NavItem[] = [
    { name: "Home", href: "/", icon: Home, public: true },
    { name: "Agenda", href: "/agenda", icon: Calendar, public: true },
    { name: "Check-in", href: "/checkin", icon: QrCode, requiresAuth: true },
    { name: "My Profile", href: "/profile", icon: User, requiresAuth: true },
  ];

  // Guest-only navigation items
  const guestNavItems: NavItem[] = [
    { name: "Register", href: "/register", icon: Users, guestOnly: true },
  ];

  // Get navigation items based on authentication status
  const getNavItems = (): NavItem[] => {
    const items: NavItem[] = [...publicNavItems];

    if (isAuthenticated) {
      items.push(...protectedNavItems);
    } else {
      items.push(...guestNavItems);
    }

    return items;
  };

  const navItems = getNavItems();

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" });
    setShowUserMenu(false);
  };

  const toggleMobileMenu = () => setIsOpen(!isOpen);
  const closeMobileMenu = () => {
    setIsOpen(false);
    setShowUserMenu(false);
  };

  const toggleUserMenu = () => setShowUserMenu(!showUserMenu);

  // Protected Link Component with Lock Icon
  const ProtectedLink: React.FC<ProtectedLinkProps> = ({
    item,
    onClick,
    className,
  }) => {
    const IconComponent = item.icon;
    const isProtected = item.requiresAuth && !isAuthenticated;

    if (isProtected) {
      return (
        <div
          className={`${className} opacity-60 cursor-not-allowed relative group`}
        >
          <div className="flex items-center space-x-2">
            <Lock className="w-4 h-4 text-gray-400" />
            <IconComponent className="w-4 h-4" />
            <span>{item.name}</span>
          </div>
          <div className="absolute bottom-full left-0 mb-2 px-3 py-1 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
            Sign in required
          </div>
        </div>
      );
    }

    return (
      <Link href={item.href} className={className} onClick={onClick}>
        <IconComponent className="w-4 h-4" />
        <span>{item.name}</span>
      </Link>
    );
  };

  return (
    <nav className="bg-white/95 backdrop-blur-sm border-b border-green-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-secondary-500 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-200 shadow-lg">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold gradient-text">
                  GOSA Convention 2025
                </span>
                <span className="text-xs text-gray-500 -mt-1">
                  For light and truth
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <ProtectedLink
                key={item.name}
                item={item}
                className="text-gray-600 hover:text-primary-600 hover:bg-primary-50 px-4 py-2 text-sm font-medium transition-all duration-200 flex items-center space-x-2 rounded-lg"
              />
            ))}

            {/* User Menu for Authenticated Users */}
            {isAuthenticated && (
              <div className="relative ml-4">
                <button
                  onClick={toggleUserMenu}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-200 border border-gray-200"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <span className="max-w-32 truncate">
                    {session?.user?.name || session?.user?.email || "User"}
                  </span>
                  {isAdmin && <Shield className="w-4 h-4 text-amber-500" />}
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${showUserMenu ? "rotate-180" : ""}`}
                  />
                </button>

                {/* User Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {session?.user?.name || "User"}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {session?.user?.email}
                      </p>
                      <div className="flex items-center space-x-2 mt-2">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            isAdmin
                              ? "bg-amber-100 text-amber-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {isAdmin ? (
                            <>
                              <Shield className="w-3 h-3 mr-1" />
                              Administrator
                            </>
                          ) : (
                            <>
                              <User className="w-3 h-3 mr-1" />
                              Member
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Admin Dashboard Link */}
                    {isAdmin && (
                      <Link
                        href="/admin"
                        className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-700 transition-colors duration-200"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Shield className="w-4 h-4 mr-3 text-amber-500" />
                        Admin Dashboard
                        <span className="ml-auto text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                          Admin
                        </span>
                      </Link>
                    )}

                    <div className="border-t border-gray-100 mt-2">
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200"
                      >
                        <LogIn className="w-4 h-4 mr-3 rotate-180" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sign In Button for Guests */}
            {!isAuthenticated && status !== "loading" && (
              <div className="ml-4">
                <Link href="/signin">
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-primary-600 to-secondary-500 hover:from-primary-700 hover:to-secondary-600 text-white shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    <Wallet className="w-4 h-4 mr-2" />
                    Donate
                  </Button>
                </Link>
              </div>
            )}

            {/* Loading State */}
            {status === "loading" && (
              <div className="ml-4 flex items-center space-x-2">
                <div className="w-8 h-8 bg-gray-200 animate-pulse rounded-full" />
                <div className="w-20 h-4 bg-gray-200 animate-pulse rounded" />
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={toggleMobileMenu}
              className="text-gray-600 hover:text-primary-600 p-2 rounded-lg hover:bg-gray-50 transition-colors duration-200"
              aria-label="Toggle mobile menu"
            >
              {isOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 shadow-lg">
          <div className="px-4 pt-4 pb-3 space-y-2">
            {/* User Info Section for Mobile */}
            {isAuthenticated && (
              <div className="bg-gradient-to-r from-primary-50 to-secondary-50 rounded-lg p-4 mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {session?.user?.name || "User"}
                    </p>
                    <p className="text-xs text-gray-600 truncate">
                      {session?.user?.email}
                    </p>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                        isAdmin
                          ? "bg-amber-100 text-amber-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {isAdmin ? (
                        <>
                          <Shield className="w-3 h-3 mr-1" />
                          Admin
                        </>
                      ) : (
                        <>
                          <User className="w-3 h-3 mr-1" />
                          Member
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Items */}
            {navItems.map((item) => (
              <ProtectedLink
                key={item.name}
                item={item}
                onClick={closeMobileMenu}
                className="text-gray-600 hover:text-primary-600 hover:bg-primary-50 block px-4 py-3 text-base font-medium transition-all duration-200 flex items-center space-x-3 rounded-lg"
              />
            ))}

            {/* Admin Dashboard for Mobile */}
            {isAdmin && (
              <Link
                href="/admin"
                className="flex items-center px-4 py-3 text-base font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors duration-200 rounded-lg"
                onClick={closeMobileMenu}
              >
                <Shield className="w-5 h-5 mr-3" />
                <span>Admin Dashboard</span>
                <span className="ml-auto text-xs bg-amber-200 text-amber-800 px-2 py-1 rounded-full">
                  Admin
                </span>
              </Link>
            )}

            {/* Auth Section for Mobile */}
            <div className="pt-4 border-t border-gray-200 space-y-2">
              {isAuthenticated ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                  onClick={() => {
                    handleSignOut();
                    closeMobileMenu();
                  }}
                >
                  <LogIn className="w-4 h-4 mr-2 rotate-180" />
                  Sign Out
                </Button>
              ) : status === "unauthenticated" ? (
                <Link href="/signin" onClick={closeMobileMenu}>
                  <Button
                    size="sm"
                    className="w-full bg-gradient-to-r from-primary-600 to-secondary-500 hover:from-primary-700 hover:to-secondary-600 text-white shadow-md"
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    Sign In
                  </Button>
                </Link>
              ) : (
                <div className="w-full h-10 bg-gray-200 animate-pulse rounded-lg" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Overlay for mobile menu */}
      {(isOpen || showUserMenu) && (
        <div
          className="fixed inset-0 bg-black bg-opacity-25 z-40 md:hidden"
          onClick={closeMobileMenu}
        />
      )}
    </nav>
  );
}
