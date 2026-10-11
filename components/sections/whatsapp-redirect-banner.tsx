"use client";

import React, { useEffect, useState } from "react";
import {
  MessageCircle,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  QrCode as QrCodeIcon,
  Phone,
  ArrowRight,
  Info,
  CheckCircle2,
  LucideIcon,
  Ticket,
  Utensils,
  BookOpen,
  Heart,
  MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import QRCode from "qrcode";
import { toast } from "sonner";

export interface WhatsAppRedirectBannerProps {
  serviceTitle: string;
  serviceCategory: "convention" | "dinner" | "brochure" | "donation" | "goodwill";
  headline: string;
  description: string;
  prefilledPrompt: string;
  unitPrice?: string;
  bulletPoints?: string[];
  suggestedCommands?: string[];
}

const BOT_PHONE_NUMBER = "08102481754";
const BOT_PHONE_INTERNATIONAL = "2348102481754";

export function WhatsAppRedirectBanner({
  serviceTitle,
  serviceCategory,
  headline,
  description,
  prefilledPrompt,
  unitPrice,
  bulletPoints = [],
  suggestedCommands = [],
}: WhatsAppRedirectBannerProps) {
  const [copied, setCopied] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [showQrCode, setShowQrCode] = useState(false);

  const encodedPrompt = encodeURIComponent(prefilledPrompt);
  const whatsappUrl = `https://wa.me/${BOT_PHONE_INTERNATIONAL}?text=${encodedPrompt}`;

  useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL(whatsappUrl, {
      width: 260,
      margin: 1,
      color: {
        dark: "#064E3B", // emerald-900
        light: "#FFFFFF",
      },
    })
      .then((url) => {
        if (isMounted) setQrCodeUrl(url);
      })
      .catch((err) => console.error("Failed to generate QR code", err));

    return () => {
      isMounted = false;
    };
  }, [whatsappUrl]);

  const handleCopyPhone = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(BOT_PHONE_NUMBER);
      setCopied(true);
      toast.success(`Copied official bot number: ${BOT_PHONE_NUMBER}`);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const getCategoryIcon = (): LucideIcon => {
    switch (serviceCategory) {
      case "dinner":
        return Utensils;
      case "brochure":
        return BookOpen;
      case "donation":
        return Heart;
      case "goodwill":
        return MessageSquare;
      case "convention":
      default:
        return Ticket;
    }
  };

  const CategoryIcon = getCategoryIcon();

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Top Status Alert Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-400/40 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-emerald-500/10 p-4 sm:p-5 shadow-sm backdrop-blur-md">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-600 shrink-0 mt-0.5 sm:mt-0">
            <Info className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-extrabold text-sm sm:text-base text-amber-900">
                Notice: Direct Website Payment Is Currently Paused
              </span>
              <Badge variant="outline" className="border-amber-500/40 text-amber-700 bg-amber-500/10 font-bold text-[10px] uppercase tracking-wider">
                Processed via WhatsApp
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-amber-800/90 mt-1 leading-relaxed">
              All official convention registrations, tickets, brochures, and donations are now managed directly by our AI assistant, <strong className="font-semibold text-emerald-800">GOSA Bilkwas</strong>, on WhatsApp.
            </p>
          </div>
        </div>
      </div>

      {/* Main Glassmorphic Hero Card */}
      <div className="relative overflow-hidden rounded-3xl border border-emerald-900/10 bg-white/95 shadow-2xl backdrop-blur-xl">
        {/* Decorative Top Gradient Banner */}
        <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 p-6 sm:p-8 text-white relative">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-10"
            style={{
              backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-600/50 text-emerald-300 text-xs font-semibold backdrop-blur-sm">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Official GOSA AI Assistant</span>
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight uppercase font-display text-white">
                {serviceTitle}
              </h2>
              <p className="text-emerald-100/90 text-sm sm:text-base max-w-xl font-medium">
                {headline}
              </p>
            </div>

            {unitPrice && (
              <div className="bg-emerald-950/60 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 flex flex-col items-start md:items-end justify-center min-w-[170px] shadow-inner backdrop-blur-md">
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">
                  Official Rate
                </span>
                <span className="text-2xl sm:text-3xl font-black text-amber-300">
                  {unitPrice}
                </span>
                <span className="text-[11px] text-emerald-200/80 mt-0.5">
                  Instant digital receipt
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-8">
          {/* Main Action Section: Glowing CTA Button */}
          <div className="bg-gradient-to-br from-emerald-50 via-slate-50 to-teal-50/50 border border-emerald-200/80 rounded-2xl p-6 sm:p-8 text-center space-y-5 shadow-sm">
            <div className="max-w-xl mx-auto space-y-2">
              <div className="w-14 h-14 bg-emerald-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-600/30">
                <MessageCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Chat with GOSA Bilkwas on WhatsApp
              </h3>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                {description}
              </p>
            </div>

            {/* Call To Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto"
                id="btn-whatsapp-redirect"
              >
                <Button className="w-full sm:w-auto bg-[#25D366] hover:bg-[#1EBE5D] text-slate-950 hover:text-white font-extrabold text-base sm:text-lg h-14 px-8 rounded-xl shadow-lg shadow-[#25D366]/25 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3">
                  <MessageCircle className="w-6 h-6 fill-current" />
                  <span>Start on WhatsApp Now</span>
                  <ExternalLink className="w-4 h-4 ml-1 opacity-70" />
                </Button>
              </a>

              <Button
                variant="outline"
                onClick={() => setShowQrCode(!showQrCode)}
                className="w-full sm:w-auto border-emerald-300 text-emerald-800 hover:bg-emerald-100/50 h-14 px-6 rounded-xl font-bold flex items-center justify-center gap-2"
                id="btn-toggle-qr"
              >
                <QrCodeIcon className="w-5 h-5 text-emerald-700" />
                <span>{showQrCode ? "Hide QR Code" : "Scan QR on Phone"}</span>
              </Button>
            </div>

            {/* Mobile / Direct Number & Copy Button */}
            <div className="flex items-center justify-center gap-2 pt-2 text-xs sm:text-sm text-slate-600">
              <Phone className="w-4 h-4 text-emerald-600" />
              <span>Official WhatsApp Bot Number:</span>
              <span className="font-mono font-bold text-slate-900 bg-emerald-100/70 border border-emerald-200 px-2.5 py-0.5 rounded-lg">
                {BOT_PHONE_NUMBER}
              </span>
              <button
                onClick={handleCopyPhone}
                type="button"
                className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-semibold underline ml-1 cursor-pointer"
                title="Copy phone number"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>

            {/* Expandable QR Code Box for Desktop Users */}
            {showQrCode && (
              <div className="pt-4 border-t border-emerald-200/60 max-w-xs mx-auto animate-in fade-in zoom-in-95 duration-200">
                <div className="bg-white p-4 rounded-2xl border-2 border-emerald-500/30 shadow-md inline-block">
                  {qrCodeUrl ? (
                    <img
                      src={qrCodeUrl}
                      alt="WhatsApp Bilkwas QR Code"
                      className="w-48 h-48 mx-auto object-contain"
                    />
                  ) : (
                    <div className="w-48 h-48 bg-slate-100 animate-pulse rounded-xl flex items-center justify-center text-slate-400">
                      Generating QR...
                    </div>
                  )}
                  <p className="text-[11px] font-bold text-emerald-800 mt-2 uppercase tracking-wider">
                    Scan with Phone Camera
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Quick Steps on How It Works */}
          <div className="space-y-4">
            <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              How GOSA Bilkwas Processes Your Request
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-1.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center">
                  1
                </div>
                <h5 className="font-bold text-sm text-slate-900">Message the Bot</h5>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Send the prefilled message or text your request directly to <strong>{BOT_PHONE_NUMBER}</strong> in WhatsApp.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-1.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center">
                  2
                </div>
                <h5 className="font-bold text-sm text-slate-900">Instant Checkout</h5>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Bilkwas generates a secure, personalized Paystack checkout link for your transaction.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-1.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center">
                  3
                </div>
                <h5 className="font-bold text-sm text-slate-900">Instant Credentials</h5>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Receive your official verified digital pass, QR badge, and receipt delivered immediately in your WhatsApp chat.
                </p>
              </div>
            </div>
          </div>

          {/* Suggested WhatsApp Prompts / Commands */}
          {suggestedCommands.length > 0 && (
            <div className="bg-slate-900 text-slate-100 rounded-2xl p-5 sm:p-6 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 block">
                Sample Commands You Can Send to Bilkwas
              </span>
              <div className="flex flex-wrap gap-2">
                {suggestedCommands.map((cmd, idx) => (
                  <a
                    key={idx}
                    href={`https://wa.me/${BOT_PHONE_INTERNATIONAL}?text=${encodeURIComponent(cmd)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 hover:text-emerald-200 px-3 py-1.5 rounded-lg font-mono text-xs border border-slate-700 hover:border-emerald-500/40 transition-colors"
                  >
                    <span>💬 "{cmd}"</span>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Key Highlights / Perks */}
          {bulletPoints.length > 0 && (
            <div className="pt-2 border-t border-slate-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {bulletPoints.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs sm:text-sm text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
