"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Navigation } from "@/components/layout/navigation";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Download,
  FileText,
  Share2,
  CheckCircle2,
  Calendar,
  MapPin,
  QrCode,
  ShieldCheck,
  Sparkles,
  ArrowLeft,
  Loader2,
  Ticket,
  Copy,
  Check
} from "lucide-react";
import Link from "next/link";
import QRCode from "qrcode";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface TicketData {
  _id: string;
  ticketType: string;
  paymentReference: string;
  amount: number;
  status: string;
  confirmed: boolean;
  user: {
    fullName: string;
    email: string;
    phone: string;
    house?: string;
    year?: string;
  };
  createdAt: string;
  details?: {
    quantity?: number;
    items?: any[];
  };
}

export default function TicketPage() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [downloadingImage, setDownloadingImage] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const ticketCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError("No ticket ID provided. Please check your link or reference.");
      return;
    }

    async function fetchTicket() {
      try {
        setLoading(true);
        setError(null);

        // Try primary ticket API
        let res = await fetch(`/api/v1/ticket/${id}`);
        let data = await res.json();

        if (!res.ok || !data.ticket) {
          // Fallback to scan ticket API
          res = await fetch(`/api/v1/scan/ticket/${id}`);
          data = await res.json();
        }

        if (data.ticket) {
          setTicket(data.ticket);

          // Generate QR code canvas data URL
          const qrText = data.ticket.paymentReference || data.ticket._id || id;
          const qrDataUrl = await QRCode.toDataURL(qrText, {
            width: 300,
            margin: 1,
            color: {
              dark: "#0F172A",
              light: "#FFFFFF",
            },
          });
          setQrCodeUrl(qrDataUrl);
        } else {
          setError(data.error || "Unable to locate ticket record.");
        }
      } catch (err: any) {
        console.error("Error fetching ticket:", err);
        setError("Error connecting to server. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchTicket();
  }, [id]);

  const handleDownloadImage = async () => {
    if (!ticketCardRef.current) return;
    try {
      setDownloadingImage(true);
      const canvas = await html2canvas(ticketCardRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: null,
        logging: false,
      });

      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = `GOSA-2026-Ticket-${ticket?.user?.fullName?.replace(/\s+/g, "_") || "Pass"}.png`;
      link.click();
    } catch (err) {
      console.error("Failed to export image:", err);
    } finally {
      setDownloadingImage(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!ticketCardRef.current) return;
    try {
      setDownloadingPdf(true);
      const canvas = await html2canvas(ticketCardRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: null,
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 170;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const x = (210 - imgWidth) / 2;
      const y = 25;

      pdf.addImage(imgData, "PNG", x, y, imgWidth, imgHeight);
      pdf.save(`GOSA-2026-Ticket-${ticket?.user?.fullName?.replace(/\s+/g, "_") || "Pass"}.pdf`);
    } catch (err) {
      console.error("Failed to export PDF:", err);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950 overflow-x-hidden">
      <Navigation />

      <main className="grow container mx-auto px-4 py-8 sm:py-12 max-w-5xl">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
          <Link href="/">
            <Button variant="outline" className="border-slate-700 bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </Link>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            Official GOSA 2026 E-Ticket Portal
          </div>
        </div>

        {loading ? (
          <div className="min-h-[450px] flex flex-col items-center justify-center text-center p-8 bg-slate-900/60 border border-slate-800 rounded-3xl">
            <Loader2 className="w-12 h-12 text-amber-400 animate-spin mb-4" />
            <h2 className="text-xl font-bold text-white">Fetching Your Official Ticket Pass...</h2>
            <p className="text-slate-400 text-sm mt-1">Please wait while we generate your credentials.</p>
          </div>
        ) : error || !ticket ? (
          <div className="min-h-[400px] flex flex-col items-center justify-center text-center p-8 bg-slate-900/60 border border-rose-950 rounded-3xl max-w-xl mx-auto">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
              <Ticket className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-white">Ticket Record Not Found</h2>
            <p className="text-slate-400 text-sm mt-2 max-w-md">{error || "The ticket ID provided could not be matched."}</p>
            <Link href="/" className="mt-6">
              <Button className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-6">
                Return to Homepage
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Download Action Controls */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  Your Ticket Pass is Ready
                </h2>
                <p className="text-slate-400 text-xs sm:text-sm">
                  Save your official pass image or PDF directly to your device for easy event entry.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <Button
                  onClick={handleDownloadImage}
                  disabled={downloadingImage}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold gap-2 shadow-lg shadow-amber-500/20 flex-1 sm:flex-none"
                >
                  {downloadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Download PNG
                </Button>

                <Button
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                  variant="outline"
                  className="border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 font-bold gap-2 flex-1 sm:flex-none"
                >
                  {downloadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                  Download PDF
                </Button>

                <Button
                  onClick={handleCopyLink}
                  variant="ghost"
                  className="text-slate-300 hover:text-white hover:bg-slate-800 gap-1.5"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied!" : "Copy Link"}
                </Button>
              </div>
            </div>

            {/* Ticket Card Component to render & snapshot */}
            <div className="flex justify-center">
              <div
                ref={ticketCardRef}
                id="ticket-pass-card"
                className="w-full max-w-[440px] rounded-[32px] p-6 text-white relative overflow-hidden shadow-2xl border-4 border-amber-400/40 flex flex-col justify-between"
                style={{
                  backgroundImage: "linear-gradient(135deg, #09172A 0%, #102A43 45%, #0A192F 100%)",
                  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(217, 119, 6, 0.15)",
                }}
              >
                {/* Background Pattern Overlay */}
                <div
                  className="absolute inset-0 opacity-10 pointer-events-none"
                  style={{
                    backgroundImage: "radial-gradient(#F59E0B 1px, transparent 1px)",
                    backgroundSize: "16px 16px",
                  }}
                />

                {/* Top Metallic Banner */}
                <div className="relative z-10 flex items-center justify-between border-b border-amber-400/20 pb-4 mb-4">
                  <div className="flex items-center gap-3">
                    <img
                      src="/images/gosa.png"
                      alt="GOSA Logo"
                      className="w-10 h-10 object-contain drop-shadow-md brightness-0 invert"
                    />
                    <div>
                      <h3 className="text-sm font-black tracking-wider text-amber-400 uppercase leading-none">
                        GOSA 2026
                      </h3>
                      <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mt-1">
                        Annual Convention Pass
                      </p>
                    </div>
                  </div>

                  <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold text-[10px] px-2.5 py-0.5 uppercase tracking-wider">
                    CONFIRMED ✅
                  </Badge>
                </div>

                {/* Attendee Name & Pass Details */}
                <div className="relative z-10 text-center my-3 py-2 bg-slate-900/60 border border-amber-400/20 rounded-2xl p-4">
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-amber-400/80 block mb-1">
                    DELEGATE / ATTENDEE PASS
                  </span>

                  <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight drop-shadow-md">
                    {ticket.user.fullName}
                  </h2>

                  <div className="mt-3 inline-block px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md">
                    {ticket.ticketType || "Convention Registration"}
                  </div>

                  {ticket.amount > 0 && (
                    <p className="text-xs font-semibold text-slate-300 mt-2">
                      Amount Paid: <span className="text-amber-400 font-bold">₦{ticket.amount.toLocaleString()}</span>
                    </p>
                  )}
                </div>

                {/* Event Schedule & Location Grid */}
                <div className="relative z-10 grid grid-cols-2 gap-2 my-2 text-[10px]">
                  <div className="bg-slate-900/40 border border-slate-700/50 rounded-xl p-2.5 flex items-start gap-2">
                    <Calendar className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-400 uppercase block text-[8px]">Dates</span>
                      <span className="font-extrabold text-white">Oct 31 – Nov 2, 2026</span>
                    </div>
                  </div>

                  <div className="bg-slate-900/40 border border-slate-700/50 rounded-xl p-2.5 flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-400 uppercase block text-[8px]">Venue</span>
                      <span className="font-extrabold text-white truncate block">Gindiri Compound</span>
                    </div>
                  </div>
                </div>

                {/* QR Code Container */}
                <div className="relative z-10 my-3 bg-white text-slate-950 rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-inner border border-amber-400/30">
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-2">
                    Official Verification QR Code
                  </span>

                  {qrCodeUrl ? (
                    <img src={qrCodeUrl} alt="Ticket QR Code" className="w-36 h-36 object-contain" />
                  ) : (
                    <div className="w-36 h-36 flex items-center justify-center text-slate-400">
                      <QrCode className="w-10 h-10" />
                    </div>
                  )}

                  <p className="text-[9px] font-mono text-slate-600 mt-2 truncate w-full px-2">
                    Ref: {ticket.paymentReference}
                  </p>
                </div>

                {/* Bottom Security Footer */}
                <div className="relative z-10 border-t border-amber-400/20 pt-3 flex items-center justify-between text-[9px] text-slate-400 font-medium">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>GOSA Official Security Code</span>
                  </div>

                  <span className="font-extrabold text-amber-300 uppercase tracking-widest">
                    "For Light & Truth"
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
