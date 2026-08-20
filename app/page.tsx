"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Calendar,
  Mail,
  MapPin,
  Sparkles,
  Twitter,
  Facebook,
  Linkedin,
  Instagram,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

export default function ComingSoon() {
  const [mounted, setMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const targetDate = new Date("2026-11-01T09:00:00");

    const calculateTimeLeft = () => {
      const difference = +targetDate - +new Date();
      if (difference <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [mounted]);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.trim() || !email.includes("@")) {
      setStatus("error");
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    try {
      // Simulate API registration call
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setStatus("success");
      setEmail("");
    } catch (err) {
      setStatus("error");
      setErrorMessage("Something went wrong. Please try again later.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50/70 via-amber-50/50 to-green-100/40 relative flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* Decorative Blur Blobs */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/15 rounded-full blur-3xl animate-pulse pointer-events-none" />
      <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-green-200/20 rounded-full blur-3xl animate-pulse pointer-events-none" />

      {/* Main Glassmorphic Container */}
      <main className="relative z-10 w-full max-w-2xl glass-card rounded-3xl p-6 sm:p-10 flex flex-col items-center text-center shadow-2xl border border-white/50 backdrop-blur-md animate-fade-in">
        {/* Badge */}
        <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 text-primary-800 text-xs sm:text-sm font-semibold mb-6 animate-fade-in">
          <Sparkles className="w-3.5 h-3.5 mr-1.5 text-secondary-500 animate-spin-slow" />
          <span>GOSA Convention 2026 • Coming Soon</span>
        </div>

        {/* Logo with Hover Animation */}
        <div className="w-24 h-24 sm:w-28 sm:h-28 relative mb-6 transition-transform duration-300 hover:scale-105 cursor-pointer">
          <Image
            src="/images/gosa.png"
            alt="GOSA Logo"
            fill
            className="object-contain"
            priority
          />
        </div>

        {/* Heading */}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-950 mb-3 tracking-tight leading-tight">
          Strengthening Our Legacy:
          <span className="block bg-gradient-to-r from-primary to-secondary-500 bg-clip-text text-transparent mt-1">
            Empowering Leaders
          </span>
        </h1>

        {/* Description */}
        <p className="text-gray-600 text-sm sm:text-base max-w-lg mb-8 leading-relaxed">
          Professional development meets cherished memories at our premier alumni convention.
          Featuring keynote speakers, career networking, and special reunion events.
          Our new portal is currently preparing for launch.
        </p>

        {/* Countdown Timer */}
        <div className="w-full max-w-md grid grid-cols-4 gap-2.5 sm:gap-4 mb-8">
          {[
            { label: "Days", value: timeLeft.days },
            { label: "Hours", value: timeLeft.hours },
            { label: "Minutes", value: timeLeft.minutes },
            { label: "Seconds", value: timeLeft.seconds },
          ].map((item, index) => (
            <div
              key={index}
              className="bg-white/40 backdrop-blur-sm border border-white/60 rounded-2xl p-3 flex flex-col items-center justify-center shadow-sm transition-all duration-300 hover:scale-105 hover:bg-white/50"
            >
              <span className="text-2xl sm:text-3xl font-black text-gray-900 leading-none">
                {mounted ? String(item.value).padStart(2, "0") : "--"}
              </span>
              <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider mt-1 sm:mt-1.5">
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {/* Event Meta Details */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-xs sm:text-sm text-gray-600 mb-8 w-full max-w-md border-t border-b border-gray-200/50 py-4">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-primary-600" />
            <span className="font-medium text-gray-800">November 1 - 2, 2026</span>
          </div>
          <span className="hidden sm:inline text-gray-300">|</span>
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-secondary-600" />
            <span className="font-medium text-gray-800">Crispan Events Center</span>
          </div>
        </div>

        {/* Newsletter Subscription Form */}
        <div className="w-full max-w-md mb-8">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center justify-center">
            <Mail className="w-4 h-4 mr-1.5 text-primary-600" />
            Get notified when registration opens
          </h3>

          <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2 relative">
            <div className="relative flex-grow">
              <Input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={status === "loading" || status === "success"}
                className="bg-white/80 border-gray-300 focus-visible:ring-primary focus-visible:ring-offset-0 focus:border-primary w-full h-11 pr-10 text-sm sm:text-base rounded-xl transition-all"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={status === "loading" || status === "success"}
              className="bg-gradient-to-r from-primary to-secondary-500 hover:from-primary-700 hover:to-secondary-600 text-white font-semibold h-11 px-6 rounded-xl shadow-md transition-all duration-300 hover:shadow-lg disabled:opacity-50"
            >
              {status === "loading" ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Notify Me
            </Button>
          </form>

          {/* Form Feedback Messages */}
          {status === "success" && (
            <div className="flex items-center gap-2 text-green-600 text-sm font-medium mt-3 bg-green-50 border border-green-200/50 p-3 rounded-xl animate-fade-in">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>Awesome! We will email you once registration opens.</span>
            </div>
          )}
          {status === "error" && (
            <div className="flex items-center gap-2 text-red-600 text-sm font-medium mt-3 bg-red-50 border border-red-200/50 p-3 rounded-xl animate-fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Social Media Links */}
        <div className="flex items-center justify-center space-x-5">
          {[
            { icon: Twitter, href: "#", label: "Twitter" },
            { icon: Facebook, href: "#", label: "Facebook" },
            { icon: Linkedin, href: "#", label: "LinkedIn" },
            { icon: Instagram, href: "#", label: "Instagram" },
          ].map((social, index) => {
            const Icon = social.icon;
            return (
              <a
                key={index}
                href={social.href}
                className="w-10 h-10 rounded-full bg-white/40 border border-white/60 flex items-center justify-center text-gray-600 hover:text-primary hover:bg-white/80 hover:scale-110 hover:shadow-md transition-all duration-300"
                aria-label={social.label}
              >
                <Icon className="w-4 h-4" />
              </a>
            );
          })}
        </div>
      </main>

      {/* Page Footer */}
      <footer className="relative z-10 mt-8 text-center text-xs text-gray-500/80">
        &copy; {new Date().getFullYear()} GOSA. All rights reserved. • For light and truth.
      </footer>
    </div>
  );
}
