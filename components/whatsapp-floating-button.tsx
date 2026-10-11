"use client";

import React, { useState } from "react";
import { MessageCircle, X } from "lucide-react";

export function WhatsAppFloatingButton() {
  const [showTooltip, setShowTooltip] = useState(true);
  const botNumber = "2348102481754";
  const defaultPrompt = encodeURIComponent("Hello GOSA Bilkwas, I would like assistance with GOSA 2026 Convention registration and services");
  const whatsappUrl = `https://wa.me/${botNumber}?text=${defaultPrompt}`;

  return (
    <aside aria-label="WhatsApp Support" className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {/* Interactive Tooltip Callout */}
      {showTooltip && (
        <div className="relative bg-slate-900 text-white text-xs py-2 px-3.5 rounded-2xl shadow-xl border border-emerald-500/30 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-[230px]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="font-medium text-slate-200">
            Pay & register via <strong className="text-emerald-300 font-bold">GOSA Bilkwas</strong> on WhatsApp
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowTooltip(false);
            }}
            className="text-slate-400 hover:text-white p-0.5 ml-1"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Floating Button */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        id="floating-whatsapp-bilkwas"
        aria-label="Chat with GOSA Bilkwas on WhatsApp"
        className="group relative flex items-center justify-center w-14 h-14 bg-[#25D366] hover:bg-[#1EBE5D] text-slate-950 rounded-full shadow-2xl shadow-emerald-950/40 hover:scale-110 active:scale-95 transition-all duration-300 border-2 border-white/80"
      >
        <span className="sr-only">Chat with GOSA Bilkwas on WhatsApp</span>
        <MessageCircle className="w-7 h-7 fill-slate-950 group-hover:fill-white text-slate-950 group-hover:text-white transition-colors" />

        {/* Pulse Ring */}
        <span className="absolute -inset-1 rounded-full bg-[#25D366]/40 animate-ping pointer-events-none -z-10" />
      </a>
    </aside>
  );
}
