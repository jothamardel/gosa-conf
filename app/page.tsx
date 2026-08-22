"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Navigation } from "@/components/layout/navigation";
import { Footer } from "@/components/layout/footer";
import { Sponsors } from "@/components/sections/sponsors";
import { BusinessShowcase } from "@/components/sections/business-showcase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Calendar,
  Mail,
  MapPin,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ChevronDown,
  Clock,
  BookOpen,
  Bed,
  Utensils,
  CreditCard,
  ArrowUpRight,
  Activity,
  Users,
  Compass,
  Award,
} from "lucide-react";

export default function LandingPage() {
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
  const [activeHeroTab, setActiveHeroTab] = useState<"agenda" | "lodging" | "network">(
    "agenda"
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const targetDate = new Date("2026-10-31T09:00:00");

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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-green-500 selection:text-white overflow-x-hidden">
      {/* Global Navigation Bar */}
      <Navigation />

      {/* Hero Section Container */}
      <section className="bg-emerald-950 relative mx-2.5 mt-2.5 rounded-t-2xl rounded-b-3xl lg:mx-4 overflow-hidden border border-emerald-900 shadow-2xl">
        {/* Subtle Grid Backdrop */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-15" style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }} />

        <div className="pt-24 pb-20 sm:pt-32 sm:pb-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col justify-between gap-12 lg:flex-row lg:items-center">
              
              {/* Left Column: Heading and Action CTAs */}
              <div className="flex-1 text-left relative z-10">
                {/* Event Badge */}
                <div className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-emerald-900/50 border border-emerald-700/60 text-emerald-300 text-xs sm:text-sm font-semibold mb-6 shadow-inner">
                  <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-400 animate-pulse" />
                  <span>October 31, 2026 • Crispan Events Center</span>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.1] uppercase font-display max-w-2xl">
                  Building Bridges:
                  <span className="block bg-gradient-to-r from-green-400 via-emerald-300 to-amber-300 bg-clip-text text-transparent mt-1 text-3xl sm:text-4xl lg:text-5xl normal-case font-bold tracking-normal leading-tight">
                    Connecting the Past with the Present
                  </span>
                </h1>

                <p className="text-emerald-100/80 mt-5 max-w-xl text-lg sm:text-xl font-medium leading-relaxed">
                  Strengthening Our Legacy: Empowering the Next Generation of Leaders. Join us at the premier Gindiri Old Students Association alumni convention.
                </p>

                <div className="mt-8 flex flex-col gap-3.5 sm:flex-row sm:items-center">
                  <Link href="/register" className="w-full sm:w-auto" id="hero-cta-register">
                    <Button className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold text-base py-6 px-8 rounded-xl shadow-lg shadow-amber-950/20 hover:scale-[1.02] active:scale-[0.98] transition-all w-full flex items-center justify-center gap-2">
                      Register Now
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Link href="/badge" className="w-full sm:w-auto" id="hero-cta-generate-badge">
                    <Button className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-extrabold text-base py-6 px-8 rounded-xl shadow-lg shadow-emerald-950/40 border border-emerald-300/40 hover:scale-[1.02] active:scale-[0.98] transition-all w-full flex items-center justify-center gap-2.5">
                      <Award className="w-5 h-5 text-amber-300 shrink-0" />
                      <span>Generate Badge</span>
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Right Column: Interactive Mockup Panel Switching tabs */}
              <div className="flex-1 flex flex-col justify-center max-w-xl w-full mx-auto lg:mx-0 relative z-10">
                <div className="bg-slate-900/85 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-1">
                  
                  {/* Selector Tabs */}
                  <div className="flex border-b border-slate-800 p-2 gap-1 bg-slate-950/40 rounded-t-2xl">
                    <button
                      id="hero-tab-agenda"
                      type="button"
                      aria-pressed={activeHeroTab === "agenda"}
                      onClick={() => setActiveHeroTab("agenda")}
                      className={`flex-1 py-2 px-3 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 text-center flex items-center justify-center gap-2 ${
                        activeHeroTab === "agenda"
                          ? "bg-slate-800 text-white shadow-sm"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Agenda Board</span>
                    </button>
                    <button
                      id="hero-tab-lodging"
                      type="button"
                      aria-pressed={activeHeroTab === "lodging"}
                      onClick={() => setActiveHeroTab("lodging")}
                      className={`flex-1 py-2 px-3 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 text-center flex items-center justify-center gap-2 ${
                        activeHeroTab === "lodging"
                          ? "bg-slate-800 text-white shadow-sm"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                      }`}
                    >
                      <Bed className="w-3.5 h-3.5 text-amber-400" />
                      <span>Lodging Planner</span>
                    </button>
                    <button
                      id="hero-tab-network"
                      type="button"
                      aria-pressed={activeHeroTab === "network"}
                      onClick={() => setActiveHeroTab("network")}
                      className={`flex-1 py-2 px-3 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 text-center flex items-center justify-center gap-2 ${
                        activeHeroTab === "network"
                          ? "bg-slate-800 text-white shadow-sm"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                      }`}
                    >
                      <Users className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Alumni Network</span>
                    </button>
                  </div>

                  {/* Tab Contents */}
                  <div className="p-4 sm:p-6 min-h-[260px] flex flex-col justify-center">
                    <AnimatePresence mode="wait">
                      {activeHeroTab === "agenda" && (
                        <motion.div
                          key="agenda"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.2 }}
                          className="space-y-4"
                        >
                          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                            <span>Upcoming Sessions</span>
                            <span className="text-emerald-400 font-bold">Oct 31 - Nov 2</span>
                          </div>
                          
                          <div className="space-y-2.5">
                            {/* Agenda Item 1 */}
                            <div className="flex items-center gap-3 bg-slate-950/50 border border-slate-800/60 rounded-xl p-3 hover:border-emerald-500/30 transition-colors">
                              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                              <div className="min-w-0 flex-1">
                                <h4 className="text-sm font-bold text-white truncate">Opening Keynote: Future Leaders</h4>
                                <p className="text-slate-400 text-xs mt-0.5">09:00 AM • Crispan Grand Hall</p>
                              </div>
                              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 py-1 px-2 rounded-full border border-emerald-500/20 shrink-0">Keynote</span>
                            </div>

                            {/* Agenda Item 2 */}
                            <div className="flex items-center gap-3 bg-slate-950/50 border border-slate-800/60 rounded-xl p-3 hover:border-amber-500/30 transition-colors">
                              <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <h4 className="text-sm font-bold text-white truncate">Alumni Business Networking Round</h4>
                                <p className="text-slate-400 text-xs mt-0.5">02:00 PM • Pavilion Suite B</p>
                              </div>
                              <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 py-1 px-2 rounded-full border border-amber-500/20 shrink-0">Career</span>
                            </div>

                            {/* Agenda Item 3 */}
                            <div className="flex items-center gap-3 bg-slate-950/50 border border-slate-800/60 rounded-xl p-3 hover:border-cyan-500/30 transition-colors">
                              <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <h4 className="text-sm font-bold text-white truncate">Annual Homecoming Gala Dinner</h4>
                                <p className="text-slate-400 text-xs mt-0.5">07:00 PM • Banquet Arena</p>
                              </div>
                              <span className="text-[10px] font-semibold text-cyan-400 bg-cyan-500/10 py-1 px-2 rounded-full border border-cyan-500/20 shrink-0">Social</span>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {activeHeroTab === "lodging" && (
                        <motion.div
                          key="lodging"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.2 }}
                          className="space-y-4"
                        >
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span>Crispan Events Center (Venue)</span>
                            <span className="text-amber-400 font-bold">Special Group Rates</span>
                          </div>

                          <div className="bg-slate-950/50 border border-slate-800/60 rounded-xl p-4 space-y-4">
                            <div>
                              <div className="flex justify-between text-sm mb-1.5 font-semibold text-white">
                                <span>Hotel Room Availability</span>
                                <span className="text-amber-400">82% Booked</span>
                              </div>
                              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                                <div className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full rounded-full w-[82%]" />
                              </div>
                            </div>

                            <div className="border-t border-slate-800 pt-3 flex items-center justify-between">
                              <div className="min-w-0">
                                <h4 className="text-sm font-bold text-white">Executive Deluxe Room</h4>
                                <p className="text-slate-400 text-xs mt-0.5">Discount code: <span className="font-semibold text-emerald-400">GOSA2026</span></p>
                              </div>
                              <Link href="/accommodation">
                                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 px-4 rounded-lg">
                                  Book Hotel
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {activeHeroTab === "network" && (
                        <motion.div
                          key="network"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.2 }}
                          className="space-y-4"
                        >
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span>Alumni Demographics</span>
                            <span className="text-cyan-400 font-bold">Active Members</span>
                          </div>

                          <div className="bg-slate-950/50 border border-slate-800/60 rounded-xl p-4 grid grid-cols-2 gap-4">
                            <div className="text-center bg-slate-900/60 border border-slate-800/40 rounded-lg p-3">
                              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Registered</p>
                              <p className="text-2xl font-black text-white mt-1">1,420+</p>
                              <p className="text-[10px] text-emerald-400 mt-0.5">BSS & GHS Alumni</p>
                            </div>
                            <div className="text-center bg-slate-900/60 border border-slate-800/40 rounded-lg p-3">
                              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Donations</p>
                              <p className="text-2xl font-black text-white mt-1">₦4.8M+</p>
                              <p className="text-[10px] text-emerald-400 mt-0.5">Projects Funded</p>
                            </div>

                            <div className="col-span-2 border-t border-slate-800 pt-3">
                              <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                                <span>Graduation Decades Distribution</span>
                              </div>
                              <div className="flex items-end justify-between gap-1 h-12 pt-2 px-1">
                                {[
                                  { label: "80s", height: "45%", color: "bg-emerald-500" },
                                  { label: "90s", height: "65%", color: "bg-amber-500" },
                                  { label: "00s", height: "85%", color: "bg-cyan-500" },
                                  { label: "10s", height: "95%", color: "bg-purple-500" },
                                ].map((bar, i) => (
                                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                    <div className="w-full bg-slate-800 rounded-t-sm relative h-8 overflow-hidden">
                                      <div className={`absolute bottom-0 left-0 right-0 ${bar.color} rounded-t-sm`} style={{ height: bar.height }} />
                                    </div>
                                    <span className="text-[9px] font-semibold text-slate-400">{bar.label}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Hero Footer: Sleek Countdown and Location Card */}
        <div className="bg-emerald-900/40 border-t border-emerald-800/60 py-6 backdrop-blur-sm relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              
              {/* Time Remaining */}
              <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left w-full md:w-auto">
                <span className="text-emerald-300 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 animate-pulse" />
                  Time Remaining
                </span>
                <div className="grid grid-cols-4 gap-2.5 max-w-sm w-full sm:w-auto">
                  {[
                    { label: "Days", value: timeLeft.days },
                    { label: "Hours", value: timeLeft.hours },
                    { label: "Mins", value: timeLeft.minutes },
                    { label: "Secs", value: timeLeft.seconds },
                  ].map((item, index) => (
                    <div
                      key={index}
                      className="bg-emerald-950/60 border border-emerald-700/40 rounded-xl px-3 py-1.5 flex flex-col items-center justify-center min-w-[64px]"
                    >
                      <span className="text-lg sm:text-xl font-extrabold text-white leading-none">
                        {mounted ? String(item.value).padStart(2, "0") : "--"}
                      </span>
                      <span className="text-[9px] font-bold text-emerald-400/70 uppercase tracking-widest mt-0.5">
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Event Location Info */}
              <div className="flex flex-wrap justify-center items-center gap-4 md:gap-6 border-t md:border-t-0 md:border-l border-emerald-800/60 pt-4 md:pt-0 md:pl-6 w-full md:w-auto">
                <div className="flex items-center space-x-2 text-emerald-100">
                  <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="font-semibold text-sm">October 31 - November 2, 2026</span>
                </div>
                <div className="flex items-center space-x-2 text-emerald-100">
                  <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="font-semibold text-sm">Crispan Events Center, Jos</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Official Convention Sponsors Ticker */}
      <Sponsors />

      {/* Solutions Section: Reconnecting Generations */}
      <section className="py-20 md:py-28 relative bg-white overflow-hidden" id="solutions">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(rgba(0,0,0,0.08) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          maskImage: 'radial-gradient(ellipse at center, black, transparent 70%)'
        }} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-end mb-12 lg:mb-16">
            <div className="flex-1 max-w-2xl">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                Designed for every generation of Gindiri Old Students
              </h2>
            </div>
            <div className="flex-1 max-w-md">
              <p className="text-slate-600 text-lg leading-relaxed font-medium">
                Whether you are an alumnus of BSS (Boys' Secondary School) or GHS (Girls' High School), GOSA 2026 hosts tailored spaces and schedules for everyone.
              </p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Young Leaders Card */}
            <article className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50 flex flex-col p-6 hover:shadow-xl hover:border-green-500/20 hover:-translate-y-0.5 transition-all duration-300">
              <div className="w-12 h-12 bg-green-500/10 border border-green-500/20 text-green-600 rounded-xl flex items-center justify-center mb-6">
                <Compass className="w-6 h-6 animate-spin-slow" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">The Young Alumni</h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-6 flex-grow">
                Unlock career mentorship networks, present startup blueprints to senior partners, and join industry-centric corridors.
              </p>
              <div className="border-t border-slate-200/60 pt-4 mt-auto flex items-center justify-between text-xs font-semibold text-emerald-600">
                <span>Highlight: Business Incubators</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </article>

            {/* Golden Era Card */}
            <article className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50 flex flex-col p-6 hover:shadow-xl hover:border-amber-500/20 hover:-translate-y-0.5 transition-all duration-300">
              <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-xl flex items-center justify-center mb-6">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">The Golden Era Classes</h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-6 flex-grow">
                Share rich archives, commemorate pioneering memories, reconnect with legacy teachers, and secure commemorative awards.
              </p>
              <div className="border-t border-slate-200/60 pt-4 mt-auto flex items-center justify-between text-xs font-semibold text-amber-600">
                <span>Highlight: Legacy Gala Dinners</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </article>

            {/* General Alumni Card */}
            <article className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50 flex flex-col p-6 hover:shadow-xl hover:border-cyan-500/20 hover:-translate-y-0.5 transition-all duration-300">
              <div className="w-12 h-12 bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 rounded-xl flex items-center justify-center mb-6">
                <Activity className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">General Conveners</h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-6 flex-grow">
                Participate in sporting matches, structural debate chambers, general assembly elections, and community outreach.
              </p>
              <div className="border-t border-slate-200/60 pt-4 mt-auto flex items-center justify-between text-xs font-semibold text-cyan-600">
                <span>Highlight: AGM Congress Rooms</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* GOSA Alumni Business Directory & Corporate Brand Showcase */}
      <BusinessShowcase />

      {/* Features Grid: Everything for a Seamless Convention */}
      <section className="bg-slate-100 relative py-20 md:py-28 border-t border-b border-slate-200/60" id="features">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-end mb-12 lg:mb-16">
            <div className="flex-1 max-w-2xl">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                Everything you need for a memorable homecoming
              </h2>
            </div>
            <div className="flex-1 max-w-md">
              <p className="text-slate-600 text-lg leading-relaxed font-medium">
                Our convention digital toolkit keeps registration, schedules, lodging, and badges coordinated in one clean, responsive space.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Feature 1: QR Badges */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-lg transition-shadow flex flex-col">
              <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-xl flex items-center justify-center mb-5 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">QR Badge Check-In</h3>
              <p className="text-slate-600 text-sm leading-relaxed flex-grow">
                Skip long queues. Get your custom attendee QR badge, update details in your profile, and scan at gates.
              </p>
              <Link href="/checkin" className="mt-5 text-xs font-bold text-emerald-600 inline-flex items-center gap-1 hover:text-emerald-700">
                Verify Badge
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Feature 2: Digital Brochure */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-lg transition-shadow flex flex-col">
              <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-xl flex items-center justify-center mb-5 shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Digital Brochure</h3>
              <p className="text-slate-600 text-sm leading-relaxed flex-grow">
                Access PDF booklets containing maps, schedules, keynote abstracts, and speaker bios right on your phone.
              </p>
              <Link href="/brochure" className="mt-5 text-xs font-bold text-amber-600 inline-flex items-center gap-1 hover:text-amber-700">
                View Brochure
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Feature 3: Accommodation Discount */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-lg transition-shadow flex flex-col">
              <div className="w-10 h-10 bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 rounded-xl flex items-center justify-center mb-5 shrink-0">
                <Bed className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Lodging Partnerships</h3>
              <p className="text-slate-600 text-sm leading-relaxed flex-grow">
                Special convention discounts active at Crispan Events Center and nearby partner suites.
              </p>
              <Link href="/accommodation" className="mt-5 text-xs font-bold text-cyan-600 inline-flex items-center gap-1 hover:text-cyan-700">
                Book Accommodation
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Feature 4: Safe Donations */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-lg transition-shadow flex flex-col">
              <div className="w-10 h-10 bg-purple-500/10 border border-purple-500/20 text-purple-600 rounded-xl flex items-center justify-center mb-5 shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Donate & Goodwill</h3>
              <p className="text-slate-600 text-sm leading-relaxed flex-grow">
                Support Gindiri development projects securely. Monitor donation status and check the leaderboards.
              </p>
              <Link href="/donate" className="mt-5 text-xs font-bold text-purple-600 inline-flex items-center gap-1 hover:text-purple-700">
                Support Project
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* Timeline Section: Your Journey */}
      <section className="py-20 md:py-28 relative bg-white" id="journey">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
              Your journey to GOSA 2026
            </h2>
            <p className="text-slate-600 mt-4 text-lg font-medium">
              A simple, structured timeline to secure your credentials and settle down for the weekend.
            </p>
          </div>

          <div className="relative border-l border-slate-200 max-w-2xl mx-auto pl-6 sm:pl-8 space-y-12">
            
            {/* Step 1 */}
            <div className="relative">
              <div className="absolute -left-[35px] sm:-left-[43px] top-1 bg-green-600 text-white rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-sm font-bold shadow-md border-4 border-white">
                1
              </div>
              <h3 className="text-lg font-bold text-slate-900">Register & Verify Alumni Status</h3>
              <p className="text-slate-600 text-sm mt-1.5 leading-relaxed">
                Create a quick profile on our platform and link your graduation details. Verified members gain access to all sessions and group hotel benefits.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <div className="absolute -left-[35px] sm:-left-[43px] top-1 bg-amber-500 text-white rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-sm font-bold shadow-md border-4 border-white">
                2
              </div>
              <h3 className="text-lg font-bold text-slate-900">Lock Special Lodging Rates</h3>
              <p className="text-slate-600 text-sm mt-1.5 leading-relaxed">
                Visit the accommodation page to browse host suites at Crispan and secure rooms with direct GOSA discounts before the general public slots close.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative">
              <div className="absolute -left-[35px] sm:-left-[43px] top-1 bg-cyan-500 text-white rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-sm font-bold shadow-md border-4 border-white">
                3
              </div>
              <h3 className="text-lg font-bold text-slate-900">Customize Your Convention Schedule</h3>
              <p className="text-slate-600 text-sm mt-1.5 leading-relaxed">
                Add lectures, business roundtable meets, class reunions, and dinners to your user calendar, ensuring you get text/email reminders.
              </p>
            </div>

            {/* Step 4 */}
            <div className="relative">
              <div className="absolute -left-[35px] sm:-left-[43px] top-1 bg-emerald-600 text-white rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-sm font-bold shadow-md border-4 border-white">
                4
              </div>
              <h3 className="text-lg font-bold text-slate-900">Arrive & Present Entry Badge</h3>
              <p className="text-slate-600 text-sm mt-1.5 leading-relaxed">
                Locate your digital entry pass (QR badge) from your mobile profile dashboard at check-in points to get instant access.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Newsletter Subscription Container: Kept Original Logic and State */}
      <section className="bg-slate-100 border-t border-b border-slate-200/60 py-16 md:py-20" id="newsletter">
        <div className="max-w-4xl mx-auto px-4 text-center">
          
          <div className="w-12 h-12 bg-emerald-600/10 border border-emerald-600/20 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="w-6 h-6" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
            Get notified when registration opens
          </h2>
          <p className="text-slate-600 text-sm sm:text-base max-w-lg mx-auto mb-8 font-medium">
            Be the first to hear about schedules, room discounts, and guest list announcements.
          </p>

          <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto relative justify-center">
            <div className="relative flex-grow">
              <Input
                type="email"
                id="newsletter-email-input"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={status === "loading" || status === "success"}
                className="bg-white border-slate-300 focus-visible:ring-emerald-500 focus-visible:ring-offset-0 focus:border-emerald-500 w-full h-12 pr-10 text-sm rounded-xl transition-all"
                required
              />
            </div>
            <Button
              type="submit"
              id="newsletter-submit-button"
              disabled={status === "loading" || status === "success"}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-12 px-6 rounded-xl shadow-md transition-all duration-300 disabled:opacity-50"
            >
              {status === "loading" ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Notify Me
            </Button>
          </form>

          {/* Form Feedback Messages */}
          <AnimatePresence>
            {status === "success" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center gap-2 text-green-700 text-sm font-semibold mt-4 bg-green-50 border border-green-200/50 p-3 rounded-xl max-w-md mx-auto"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Awesome! We will email you once registration opens.</span>
              </motion.div>
            )}
            {status === "error" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center gap-2 text-red-700 text-sm font-semibold mt-4 bg-red-50 border border-red-200/50 p-3 rounded-xl max-w-md mx-auto"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </section>

      {/* Global Footer component */}
      <Footer />
    </div>
  );
}
