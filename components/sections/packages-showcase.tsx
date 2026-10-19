"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Ticket,
  Utensils,
  BookOpen,
  Crown,
  CreditCard,
  X,
  Loader2,
  ShieldCheck,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatDisplayPrice, calculatePaystackBreakdown } from "@/lib/utils/price-formatter";

export interface PackageItem {
  type: 'convention' | 'dinner' | 'brochure';
  name: string;
  unitPrice: number;
  quantity: number;
}

export interface ConventionPackage {
  id: string;
  name: string;
  badge: string;
  tagline: string;
  basePrice: number;
  popular?: boolean;
  highlightColor: string;
  items: PackageItem[];
  perks: string[];
  ctaText: string;
}

const CONVENTION_PACKAGES: ConventionPackage[] = [
  {
    id: "full_experience",
    name: "Full Experience Pass",
    badge: "⭐ ALL-INCLUSIVE • BEST VALUE",
    tagline: "The complete GOSA 2026 homecoming VIP experience for alumni and delegates.",
    basePrice: 5500,
    popular: true,
    highlightColor: "emerald",
    items: [
      { type: "convention", name: "Convention Registration Pass", unitPrice: 1000, quantity: 1 },
      { type: "dinner", name: "Gala Dinner & Awards Banquet Ticket", unitPrice: 2500, quantity: 1 },
      { type: "brochure", name: "Official Convention Brochure & Program", unitPrice: 2000, quantity: 1 },
    ],
    perks: [
      "Access to all 3-Day Convention sessions & AGM congress",
      "Fast-track accreditation & attendee QR check-in pass",
      "Reserved seat at the Saturday Evening Gala Dinner banquet",
      "Official 50+ page full-color printed commemorative brochure",
      "Entry to alumni sports tournament and networking mixers",
    ],
    ctaText: "Get Full Experience",
  },
  {
    id: "convention_dinner",
    name: "Convention & Gala Dinner Pass",
    badge: "CELEBRATION PASS",
    tagline: "All daytime convention sessions plus the Saturday night gala celebration banquet.",
    basePrice: 3500,
    popular: false,
    highlightColor: "amber",
    items: [
      { type: "convention", name: "Convention Registration Pass", unitPrice: 1000, quantity: 1 },
      { type: "dinner", name: "Gala Dinner & Awards Banquet Ticket", unitPrice: 2500, quantity: 1 },
    ],
    perks: [
      "Full access to all 3-Day Convention sessions & plenary halls",
      "Attendee QR check-in pass for venue gate access",
      "Seat at the Saturday Evening Gala Dinner & awards presentation",
      "Live alumni band entertainment & networking banquet",
    ],
    ctaText: "Select Celebration Pass",
  },
  {
    id: "convention_brochure",
    name: "Convention & Brochure Pass",
    badge: "KEEPSAKE PASS",
    tagline: "Convention entry paired with the official commemorative alumni publication.",
    basePrice: 3000,
    popular: false,
    highlightColor: "teal",
    items: [
      { type: "convention", name: "Convention Registration Pass", unitPrice: 1000, quantity: 1 },
      { type: "brochure", name: "Official Convention Brochure & Program", unitPrice: 2000, quantity: 1 },
    ],
    perks: [
      "Complete 3-Day Convention access & voting delegate status",
      "Attendee QR check-in pass for accreditation",
      "Official convention program guide with alumni roll-call",
      "Access to community sports matches & assembly halls",
    ],
    ctaText: "Select Keepsake Pass",
  },
];

const SINGLE_OPTIONS = [
  {
    id: "convention_only",
    title: "Convention Ticket Only",
    price: 1000,
    desc: "Single accreditation pass for all 3 days of convention sessions, sports, and AGM.",
    items: [{ type: "convention" as const, name: "Convention Registration", unitPrice: 1000, quantity: 1 }],
  },
  {
    id: "dinner_only",
    title: "Gala Dinner Ticket Only",
    price: 2500,
    desc: "Admission to the grand Saturday evening banquet, awards night, and alumni dinner.",
    items: [{ type: "dinner" as const, name: "Gala Dinner Reservation", unitPrice: 2500, quantity: 1 }],
  },
  {
    id: "brochure_only",
    title: "Brochure Only",
    price: 2000,
    desc: "Official printed copy of the 2026 convention brochure available at the venue.",
    items: [{ type: "brochure" as const, name: "Convention Brochure", unitPrice: 2000, quantity: 1 }],
  },
];



export function PackagesShowcase() {
  const [selectedPackage, setSelectedPackage] = useState<{
    id: string;
    name: string;
    items: PackageItem[];
    basePrice: number;
  } | null>(null);

  const [quantity, setQuantity] = useState(1);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openCheckout = (pkg: { id: string; name: string; items: PackageItem[]; basePrice: number }) => {
    setSelectedPackage(pkg);
    setQuantity(1);
  };

  const closeCheckout = () => {
    if (isSubmitting) return;
    setSelectedPackage(null);
  };

  const baseSubtotal = (selectedPackage?.basePrice || 0) * quantity;
  const { fee: paystackFee, total: grandTotal } = calculatePaystackBreakdown(baseSubtotal);

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast.error("Please enter your full name.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (!phone.trim() || phone.replace(/\D/g, "").length < 10) {
      toast.error("Please enter a valid 11-digit phone number.");
      return;
    }

    if (!selectedPackage) return;

    setIsSubmitting(true);

    try {
      // Map items with updated quantity
      const payloadItems = selectedPackage.items.map((item) => ({
        type: item.type,
        quantity: item.quantity * quantity,
      }));

      const res = await fetch("/api/v1/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          phoneNumber: phone,
          items: payloadItems,
          packageKey: selectedPackage.id,
          packageName: `${selectedPackage.name} (${quantity}x)`,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to initialize payment.");
      }

      toast.success("Payment initialized! Redirecting to Paystack secure checkout...");
      if (data.paymentLink) {
        window.location.href = data.paymentLink;
      }
    } catch (err: any) {
      console.error("Package checkout error:", err);
      toast.error(err.message || "Could not start checkout. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <section className="bg-slate-900 text-white relative py-20 md:py-28 overflow-hidden border-t border-b border-slate-800" id="packages">
      {/* Decorative background grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-10"
        style={{
          backgroundImage: "radial-gradient(#10b981 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs sm:text-sm font-semibold mb-4 shadow-sm">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>OFFICIAL CONVENTION EXPERIENCE PACKAGES</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight uppercase font-display">
            Choose Your <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 bg-clip-text text-transparent normal-case">2026 Convention Pass</span>
          </h2>

          <p className="text-slate-300 mt-4 text-base sm:text-lg leading-relaxed">
            All-in-one registration packages bundled with the Saturday Gala Dinner and official convention keepsake brochure. Instant secure Paystack checkout.
          </p>
        </div>

        {/* Featured Packages Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {CONVENTION_PACKAGES.map((pkg) => (
            <div
              key={pkg.id}
              className={`rounded-3xl flex flex-col justify-between p-7 sm:p-8 relative transition-all duration-300 ${
                pkg.popular
                  ? "bg-gradient-to-b from-slate-800 to-slate-900 border-2 border-emerald-400 shadow-2xl shadow-emerald-950/60 scale-[1.02] md:-translate-y-2"
                  : "bg-slate-950/80 border border-slate-800 hover:border-slate-700 shadow-xl"
              }`}
            >
              {pkg.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[11px] font-black uppercase tracking-wider px-4 py-1 rounded-full shadow-lg flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-amber-300" />
                  <span>{pkg.badge}</span>
                </div>
              )}

              <div>
                {!pkg.popular && (
                  <span className="inline-block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">
                    {pkg.badge}
                  </span>
                )}

                <h3 className="text-2xl font-black text-white mt-1 mb-2 font-display">{pkg.name}</h3>
                <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-6">{pkg.tagline}</p>

                {/* Price Display */}
                <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800/80 mb-6 flex items-baseline justify-between">
                  <div>
                    <div className="text-3xl sm:text-4xl font-extrabold text-emerald-400">
                      {formatDisplayPrice(calculatePaystackBreakdown(pkg.basePrice).total)}
                    </div>
                    <span className="text-xs text-slate-400">
                      Total per pass ({formatDisplayPrice(pkg.basePrice)} base + ₦{calculatePaystackBreakdown(pkg.basePrice).fee} fee)
                    </span>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                    Instant Pass
                  </span>
                </div>

                {/* Included Items Pill List */}
                <div className="mb-6 space-y-2 border-b border-slate-800/80 pb-6">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Includes:
                  </div>
                  {pkg.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs text-slate-200 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-800">
                      <span className="font-medium flex items-center gap-2">
                        {item.type === "convention" && <Ticket className="w-3.5 h-3.5 text-emerald-400" />}
                        {item.type === "dinner" && <Utensils className="w-3.5 h-3.5 text-amber-400" />}
                        {item.type === "brochure" && <BookOpen className="w-3.5 h-3.5 text-teal-400" />}
                        {item.name}
                      </span>
                      <span className="font-bold text-slate-400">{formatDisplayPrice(item.unitPrice)}</span>
                    </div>
                  ))}
                </div>

                {/* Perks Checklist */}
                <div className="space-y-2.5 mb-8">
                  {pkg.perks.map((perk, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{perk}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <Button
                onClick={() => openCheckout(pkg)}
                className={`w-full h-12 text-sm sm:text-base font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${
                  pkg.popular
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-emerald-950/40"
                    : "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
                }`}
              >
                <span>{pkg.ctaText}</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* Single Item / Individual Ticket Cards */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-3xl p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-xl font-bold text-white">Prefer Individual Tickets?</h3>
              <p className="text-slate-400 text-xs sm:text-sm">
                Purchase single items independently with direct online accreditation.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Official 2026 GOSA Rates</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SINGLE_OPTIONS.map((opt) => (
              <div
                key={opt.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition-colors"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-base font-bold text-white">{opt.title}</h4>
                    <span className="text-lg font-black text-emerald-400">
                      {formatDisplayPrice(calculatePaystackBreakdown(opt.price).total)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                    {opt.desc} ({formatDisplayPrice(opt.price)} base + ₦{calculatePaystackBreakdown(opt.price).fee} fee)
                  </p>
                </div>
                <Button
                  onClick={() => openCheckout({ id: opt.id, name: opt.title, items: opt.items, basePrice: opt.price })}
                  variant="outline"
                  className="w-full h-10 text-xs font-semibold border-slate-700 hover:bg-slate-800 hover:text-white"
                >
                  Book Online
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Alternative Support Banner */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-emerald-950/40 border border-emerald-800/40 text-xs sm:text-sm text-slate-300">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-white">Need personal assistance or paying for a group?</span>
              <p className="text-slate-400">You can also chat directly with our official WhatsApp Concierge bot *GOSA Bilkwas* at *08102481754*.</p>
            </div>
          </div>
          <a
            href="https://wa.me/2348102481754?text=Hello%20GOSA%20Bilkwas%2C%20I%20want%20to%20inquire%20about%20Convention%20Packages"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0"
          >
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-9 rounded-lg">
              Open WhatsApp
            </Button>
          </a>
        </div>
      </div>

      {/* Direct Paystack Checkout Modal */}
      {selectedPackage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={closeCheckout}
              disabled={isSubmitting}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Header */}
            <div className="mb-6">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-semibold mb-2">
                <Ticket className="w-3.5 h-3.5" />
                <span>Instant Checkout</span>
              </div>
              <h3 className="text-2xl font-black text-white font-display">{selectedPackage.name}</h3>
              <p className="text-slate-400 text-xs mt-1">
                Enter your details to generate your verified Paystack payment link and pass.
              </p>
            </div>

            <form onSubmit={handleCheckoutSubmit} className="space-y-4">
              {/* Quantity Selector */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">Number of Passes</label>
                    <p className="text-[11px] text-slate-400">Purchasing for self or additional alumni delegates</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      disabled={quantity <= 1 || isSubmitting}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-bold flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="text-base font-black w-6 text-center">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                      disabled={quantity >= 10 || isSubmitting}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-bold flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-3">
                <div>
                  <Label htmlFor="pkg-name" className="text-xs font-semibold text-slate-300">
                    Full Name (Primary Contact / Delegate) *
                  </Label>
                  <Input
                    id="pkg-name"
                    required
                    placeholder="e.g. John Nanle"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={isSubmitting}
                    className="mt-1 bg-slate-950 border-slate-800 text-white placeholder:text-slate-500 h-11"
                  />
                </div>

                <div>
                  <Label htmlFor="pkg-email" className="text-xs font-semibold text-slate-300">
                    Email Address (for receipt & QR ticket) *
                  </Label>
                  <Input
                    id="pkg-email"
                    type="email"
                    required
                    placeholder="e.g. jnanle@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting}
                    className="mt-1 bg-slate-950 border-slate-800 text-white placeholder:text-slate-500 h-11"
                  />
                </div>

                <div>
                  <Label htmlFor="pkg-phone" className="text-xs font-semibold text-slate-300">
                    WhatsApp Phone Number (e.g. 08012345678) *
                  </Label>
                  <Input
                    id="pkg-phone"
                    type="tel"
                    required
                    placeholder="08012345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={isSubmitting}
                    className="mt-1 bg-slate-950 border-slate-800 text-white placeholder:text-slate-500 h-11"
                  />
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Base Rate ({quantity}x {formatDisplayPrice(selectedPackage.basePrice)}):</span>
                  <span>{formatDisplayPrice(baseSubtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Paystack Processing Fee:</span>
                  <span>{formatDisplayPrice(paystackFee)}</span>
                </div>
                <div className="border-t border-slate-800 pt-2 flex justify-between text-sm font-bold text-white">
                  <span>Total Payable:</span>
                  <span className="text-emerald-400 font-extrabold">{formatDisplayPrice(grandTotal)}</span>
                </div>
              </div>

              {/* Submit CTA */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-extrabold rounded-xl shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Connecting to Paystack...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>Pay {formatDisplayPrice(grandTotal)} via Paystack</span>
                  </>
                )}
              </Button>

              <p className="text-[11px] text-center text-slate-400 flex items-center justify-center gap-1.5 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Secured 256-bit encryption by Paystack • Instant e-ticket issued</span>
              </p>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
