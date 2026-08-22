"use client";

import { useState } from "react";
import { BadgeGenerator, OFFICIAL_SPONSORS } from "@/components/badge/badge-generator";
import { Navigation } from "@/components/layout/navigation";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar, ImageIcon, MapPin, Upload, Sparkles, Compass, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";

const DEMO_USER_ID = "demo-user";
const CONVENTION_YEAR = "2026";

export default function BadgePage() {
  const [previewData, setPreviewData] = useState({
    name: "",
    imageUrl: "",
    title: "ATTENDEE",
    school: "BSS",
    house: "aggrey",
    year: "",
    assignedSponsor: null as any
  });
  const [showPreview, setShowPreview] = useState(true);

  const handleBadgeGenerated = (badge: any) => {
    setShowPreview(false); // Hide preview when badge is generated
  };

  const handlePreviewUpdate = (
    name: string,
    imageUrl: string,
    school: string,
    house: string,
    year: string,
    sponsor: any
  ) => {
    setPreviewData((prev) => ({
      ...prev,
      name,
      imageUrl,
      school,
      house,
      year,
      assignedSponsor: sponsor
    }));
    setShowPreview(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-green-500 selection:text-white overflow-x-hidden">
      {/* Global Navigation */}
      <Navigation />

      <main className="grow container mx-auto px-4 py-8 sm:py-12 max-w-7xl">

        {/* Page Header */}
        <div className="text-center md:text-left max-w-3xl mb-8 sm:mb-12">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold mb-3 border border-emerald-200">
            <Sparkles className="w-3 h-3 mr-1 text-amber-500 animate-pulse" />
            <span>Digital ID Portal</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Claim Your GOSA 2026 Badge
          </h1>
          <p className="text-slate-600 text-sm sm:text-base mt-2">
            Create a custom digital attendance badge representing your school, class year, and house house. Powered by GOSA partners.
          </p>
        </div>

        {/* Generator Form and Live Preview Grid */}
        <div className="grid gap-8 lg:grid-cols-12 items-start">

          {/* Left Column - Form Card */}
          <div className="lg:col-span-7 xl:col-span-8">
            <BadgeGenerator
              userId={DEMO_USER_ID}
              onBadgeGenerated={handleBadgeGenerated}
              onPreviewUpdate={handlePreviewUpdate}
            />
          </div>

          {/* Right Column - Preview Card */}
          {showPreview && (
            <div className="lg:col-span-5 xl:col-span-4 sticky top-20">
              <Card className="border border-slate-200 bg-white shadow-xl rounded-2xl overflow-hidden">
                <CardHeader className="bg-slate-50 border-b border-slate-100">
                  <CardTitle className="text-slate-900 text-base font-bold flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                    Live Badge Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 flex justify-center">

                  {/* Badge design */}
                  <div
                    className="w-[300px] min-h-[460px] rounded-[18px] p-5 text-center border-4 border-white/80 shadow-2xl relative overflow-hidden flex flex-col items-center text-white"
                    style={{
                      backgroundImage: "linear-gradient(to bottom, #022c22 0%, #064e3b 45%, #022c22 100%)",
                      boxSizing: "border-box"
                    }}
                  >
                    {/* Header Logo & Convention Details */}
                    <div className="w-full flex flex-col items-center mt-1 shrink-0 z-10">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="relative w-8 h-8 flex items-center justify-center">
                          <img
                            src="/images/gosa.png"
                            alt="GOSA Logo"
                            className="w-8 h-8 object-contain brightness-0 invert"
                          />
                        </div>
                        <div className="text-left">
                          <h3 className="text-xs font-black tracking-widest text-white uppercase leading-none">GOSA 2026</h3>
                          <p className="text-[7px] font-bold text-emerald-300 uppercase tracking-wider mt-0.5">Annual Convention</p>
                        </div>
                      </div>
                      <div className="h-0.5 bg-gradient-to-r from-transparent via-white/50 to-transparent w-3/4 mb-1.5" />
                      <span className="text-[10px] font-extrabold tracking-widest text-emerald-200 uppercase block my-1">
                        {previewData.title || "ATTENDEE"}
                      </span>
                    </div>

                    {/* Profile Picture Slot */}
                    <div className="relative mt-3 mb-1 shrink-0 z-10">
                      <div className="absolute inset-0 bg-white/20 rounded-full blur-md" />
                      <div className="relative w-28 h-28 rounded-full border-4 border-white overflow-hidden shadow-xl bg-slate-900 flex items-center justify-center" style={{ borderRadius: "9999px" }}>
                        {previewData.imageUrl ? (
                          <img
                            src={previewData.imageUrl}
                            alt="Preview"
                            className="w-full h-full object-cover rounded-full"
                            style={{ borderRadius: "9999px" }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-500 bg-slate-900 rounded-full" style={{ borderRadius: "9999px" }}>
                            <Upload className="w-6 h-6" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Name, School, House */}
                    <div className="mb-2 shrink-0 w-full px-2 py-1 z-10">
                      <h2
                        className="text-base font-black text-white tracking-tight uppercase truncate drop-shadow-md"
                        style={{ lineHeight: 1.4, paddingTop: 2, paddingBottom: 2 }}
                      >
                        {previewData.name || "YOUR NAME"}
                      </h2>

                      <div className="flex items-center justify-center gap-2 my-1.5 text-[10px] font-extrabold uppercase">
                        <span className={previewData.school === "GHS" ? "text-rose-300" : "text-emerald-300"}>
                          {previewData.school} Gindiri
                        </span>
                        <span className="text-white/60 font-black">•</span>
                        <span className="text-emerald-100">
                          Class of {previewData.year || "----"}
                        </span>
                      </div>

                      <p className="text-[10px] text-emerald-200 my-0.5 font-medium">
                        House: <span className="text-white font-bold capitalize">{previewData.house}</span>
                      </p>

                      {/* 6 Company Sponsor Advertisements inside White-Trimmed Glass Panel */}
                      <div className="mt-2 mb-0.5 w-full shrink-0 bg-emerald-950/70 border border-white/20 rounded-none p-1.5 shadow-lg">
                        <span className="text-[6px] font-black text-emerald-200 uppercase tracking-widest leading-none block mb-1">
                          Official Convention Sponsors
                        </span>
                        <div className="grid grid-cols-3 gap-1.5 items-center justify-center px-0.5">
                          <div className="h-8 rounded-none bg-white p-1 flex items-center justify-center overflow-hidden shadow-xs">
                            <img src="/images/sponsors/crispan.png" alt="Crispan Suites" className="max-h-full max-w-full object-contain mx-auto" />
                          </div>
                          <div className="h-8 rounded-none bg-white p-1 flex items-center justify-center overflow-hidden shadow-xs">
                            <img src="/images/sponsors/grand_cereals.png" alt="Grand Cereals" className="max-h-full max-w-full object-contain mx-auto" />
                          </div>
                          <div className="h-8 rounded-none bg-white p-1 flex items-center justify-center overflow-hidden shadow-xs">
                            <img src="/images/sponsors/paystack.png" alt="Paystack" className="max-h-full max-w-full object-contain mx-auto" />
                          </div>
                          <div className="h-8 rounded-none bg-white p-1 flex items-center justify-center overflow-hidden shadow-xs">
                            <img src="/images/sponsors/mtn.png" alt="MTN" className="max-h-full max-w-full object-contain mx-auto" />
                          </div>
                          <div className="h-8 rounded-none bg-white p-1 flex items-center justify-center overflow-hidden shadow-xs">
                            <img src="/images/sponsors/access_bank.png" alt="Access Bank" className="max-h-full max-w-full object-contain mx-auto" />
                          </div>
                          <div className="h-8 rounded-none bg-white p-1 flex items-center justify-center overflow-hidden shadow-xs">
                            <img src="/images/sponsors/airtel.png" alt="Airtel" className="max-h-full max-w-full object-contain mx-auto" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Auto-selected Sponsor strip advertisement */}
                    <div className="w-full border-t border-white/20 pt-2 pb-1.5 bg-emerald-950/90 rounded-b-xl flex flex-col items-center justify-center shrink-0 mt-auto z-10">
                      <span className="text-[6px] font-black text-emerald-300/80 uppercase tracking-widest leading-none mb-0.5">
                        Official Convention Partner
                      </span>
                      {previewData.assignedSponsor ? (
                        <div className="flex items-center justify-center gap-1 mt-0.5">
                          <span className="text-[9px] font-black tracking-tight text-white">
                            {previewData.assignedSponsor.logoText}
                          </span>
                          <span className="text-[8px] text-emerald-200 font-medium border-l border-emerald-700 pl-1.5 leading-none">
                            {previewData.assignedSponsor.slogan}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[8px] text-emerald-200 font-semibold">GOSA Secretariat</span>
                      )}
                    </div>

                  </div>

                </CardContent>
              </Card>
            </div>
          )}

        </div>

        {/* Convention Sponsors & Advertisers Showcase (The Advertising Channel on site) */}
        <section className="mt-16 sm:mt-24 border-t border-slate-200 pt-12" id="sponsors-showcase">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Official GOSA 2026 Convention Partners
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm mt-2">
              We appreciate the massive support from our corporate sponsors enabling Gindiri compound school development projects.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {OFFICIAL_SPONSORS.map((sponsor) => (
              <div
                key={sponsor.name}
                className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow flex flex-col items-center text-center group"
              >
                <div className="w-12 h-12 bg-slate-100 group-hover:bg-slate-200/60 rounded-xl flex items-center justify-center text-lg font-black text-slate-700 transition-colors mb-4">
                  {sponsor.logoText.split(" ")[0]}
                </div>
                <h3 className="text-sm font-bold text-slate-900">{sponsor.name}</h3>
                <p className="text-[11px] text-slate-500 mt-1 flex-grow font-medium leading-relaxed">
                  {sponsor.slogan} • Powering alumni credentials, reunion packages, and campus connectivity campaigns.
                </p>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 mt-4 uppercase">
                  Platinum Partner
                </span>
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* Global Footer */}
      <Footer />
    </div>
  );
}
