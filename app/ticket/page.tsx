"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Navigation } from "@/components/layout/navigation";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Download,
  FileText,
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
  Check,
  Utensils,
  BookOpen,
  Shirt,
  HeartHandshake,
  ShoppingBag,
  PackageCheck,
  Users,
  UserPlus,
  Send,
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import QRCode from "qrcode";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface ServiceBeneficiary {
  name: string;
  phone?: string;
  email?: string;
}

interface PaidServiceItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  amount: number;
  badgeText: string;
  icon: string;
  beneficiaries?: ServiceBeneficiary[];
}

interface TicketData {
  _id: string;
  primaryTitle: string;
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
  serviceItems: PaidServiceItem[];
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

  // Ticket Splitting / Detach State
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [selectedSplitItem, setSelectedSplitItem] = useState<PaidServiceItem | null>(null);
  const [splitFullName, setSplitFullName] = useState("");
  const [splitPhone, setSplitPhone] = useState("");
  const [splitEmail, setSplitEmail] = useState("");
  const [splitYear, setSplitYear] = useState("");
  const [splitSubmitting, setSplitSubmitting] = useState(false);
  const [splitError, setSplitError] = useState<string | null>(null);
  const [splitSuccessData, setSplitSuccessData] = useState<{
    newTicketId: string;
    newTicketPassUrl: string;
    newOwner: {
      fullName: string;
      phoneNumber: string;
      email?: string;
    };
    serviceName: string;
    remainingQuantity: number;
  } | null>(null);
  const [copiedNewLink, setCopiedNewLink] = useState(false);

  const ticketCardRef = useRef<HTMLDivElement>(null);

  const fetchTicket = useCallback(async (silent = false) => {
    if (!id) {
      setLoading(false);
      setError("No ticket ID provided. Please check your link or reference.");
      return;
    }

    try {
      if (!silent) setLoading(true);
      setError(null);

      // Fetch expanded ticket data with itemized breakdown
      let res = await fetch(`/api/v1/ticket/${id}`);
      let data = await res.json();

      if (!res.ok || !data.ticket) {
        res = await fetch(`/api/v1/scan/ticket/${id}`);
        data = await res.json();
      }

      if (data.ticket) {
        setTicket(data.ticket);

        const qrText = data.ticket.paymentReference || data.ticket._id || id;
        const qrDataUrl = await QRCode.toDataURL(qrText, {
          width: 320,
          margin: 1,
          color: {
            dark: "#09172A",
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
      if (!silent) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

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

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const contentWidth = pdfWidth - 30;
      const contentHeight = (canvas.height * contentWidth) / canvas.width;

      const pageHeight = pdf.internal.pageSize.getHeight();
      const marginY = Math.max(10, (pageHeight - contentHeight) / 2);

      pdf.addImage(imgData, "PNG", 15, marginY, contentWidth, contentHeight);
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
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const openSplitModal = (item: PaidServiceItem) => {
    setSelectedSplitItem(item);
    setSplitFullName("");
    setSplitPhone("");
    setSplitEmail("");
    setSplitYear("");
    setSplitError(null);
    setSplitSuccessData(null);
    setCopiedNewLink(false);
    setIsSplitModalOpen(true);
  };

  const closeSplitModal = () => {
    setIsSplitModalOpen(false);
    setSelectedSplitItem(null);
    setSplitFullName("");
    setSplitPhone("");
    setSplitEmail("");
    setSplitYear("");
    setSplitError(null);
    setSplitSuccessData(null);
    setCopiedNewLink(false);
  };

  const handleSplitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSplitItem || !ticket) return;

    if (!splitFullName.trim() || !splitPhone.trim()) {
      setSplitError("Please provide both Full Name and Phone Number.");
      return;
    }

    try {
      setSplitSubmitting(true);
      setSplitError(null);

      const res = await fetch("/api/v1/ticket/split", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId: selectedSplitItem.id || ticket._id,
          serviceCategory: selectedSplitItem.category,
          newOwner: {
            fullName: splitFullName.trim(),
            phoneNumber: splitPhone.trim(),
            email: splitEmail.trim() || undefined,
            year: splitYear.trim() || undefined,
          },
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        setSplitError(result.message || "Failed to split ticket. Please try again.");
        return;
      }

      setSplitSuccessData(result.data);
      // Refresh current ticket in background so remaining quantity and delegates update on the main pass
      await fetchTicket(true);
    } catch (err: any) {
      console.error("Error splitting ticket:", err);
      setSplitError(err?.message || "An unexpected error occurred.");
    } finally {
      setSplitSubmitting(false);
    }
  };

  const handleCopyNewLink = () => {
    if (!splitSuccessData?.newTicketPassUrl) return;
    navigator.clipboard.writeText(splitSuccessData.newTicketPassUrl);
    setCopiedNewLink(true);
    setTimeout(() => setCopiedNewLink(false), 2500);
  };

  const handleShareWhatsApp = () => {
    if (!splitSuccessData) return;
    const cleanDigits = splitSuccessData.newOwner.phoneNumber.replace(/\D/g, "");
    const intlDigits = cleanDigits.startsWith("0") ? `234${cleanDigits.slice(1)}` : cleanDigits;
    const text = `Hello ${splitSuccessData.newOwner.fullName},\n\nYour official GOSA 2026 Ticket Pass has been generated! 🎟️\n\nAccess your verified pass & QR code here:\n${splitSuccessData.newTicketPassUrl}\n\nPresent this at the convention check-in desk at Crispan Luxury Hotel, Jos.`;
    window.open(`https://wa.me/${intlDigits}?text=${encodeURIComponent(text)}`, "_blank");
  };

  const renderServiceIcon = (iconName: string, category: string) => {
    switch (category) {
      case "dinner":
        return <Utensils className="w-4 h-4 text-amber-400 shrink-0" />;
      case "brochure":
        return <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />;
      case "uniform":
        return <Shirt className="w-4 h-4 text-amber-400 shrink-0" />;
      case "donation":
        return <HeartHandshake className="w-4 h-4 text-emerald-400 shrink-0" />;
      case "product":
        return <ShoppingBag className="w-4 h-4 text-amber-400 shrink-0" />;
      default:
        return <Ticket className="w-4 h-4 text-amber-400 shrink-0" />;
    }
  };

  const hasSplittableItems =
    ticket?.serviceItems &&
    ticket.serviceItems.some(
      (item) => item.quantity > 1 && (item.category === "convention" || item.category === "dinner")
    );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950 overflow-x-hidden">
      <Navigation />

      <main className="grow container mx-auto px-4 py-8 sm:py-12 max-w-5xl">
        {/* Top Header Controls */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
          <Link href="/">
            <Button variant="outline" className="border-slate-700 bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </Link>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            Official GOSA 2026 E-Ticket & Credentials Portal
          </div>
        </div>

        {loading ? (
          <div className="min-h-[450px] flex flex-col items-center justify-center text-center p-8 bg-slate-900/60 border border-slate-800 rounded-3xl">
            <Loader2 className="w-12 h-12 text-amber-400 animate-spin mb-4" />
            <h2 className="text-xl font-bold text-white">Loading Paid Services & Ticket Credentials...</h2>
            <p className="text-slate-400 text-sm mt-1">Please wait while we resolve your event pass.</p>
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
            {/* Action Bar */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  Official GOSA Pass Confirmed
                </h2>
                <p className="text-slate-400 text-xs sm:text-sm">
                  Download your pass with all your paid services for presentation at the convention venue.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <Button
                  onClick={handleDownloadImage}
                  disabled={downloadingImage}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold gap-2 shadow-lg shadow-amber-500/20 flex-1 sm:flex-none"
                >
                  {downloadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Download PNG Pass
                </Button>

                <Button
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                  variant="outline"
                  className="border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 font-bold gap-2 flex-1 sm:flex-none"
                >
                  {downloadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                  Download PDF Pass
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

            {/* Multiple Tickets Detach / Reassign Banner */}
            {hasSplittableItems && (
              <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-slate-900 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                      Multiple Passes Under This Ticket
                      <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                        Detach Available
                      </Badge>
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                      You purchased multiple tickets under your name. You can detach extra passes to attach individual owners so each person receives their own ticket &amp; QR code to check in at the event.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    const splittable = ticket.serviceItems.find(
                      (i) => i.quantity > 1 && (i.category === "convention" || i.category === "dinner")
                    );
                    if (splittable) openSplitModal(splittable);
                  }}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs gap-2 shrink-0 shadow-lg shadow-amber-500/25 h-10 px-4"
                >
                  <UserPlus className="w-4 h-4" />
                  Detach &amp; Assign a Ticket
                </Button>
              </div>
            )}

            {/* Ticket Card Component to render & snapshot */}
            <div className="flex justify-center">
              <div
                ref={ticketCardRef}
                id="ticket-pass-card"
                className="w-full max-w-[460px] rounded-[32px] p-6 text-white relative overflow-hidden shadow-2xl border-4 border-amber-400/40 flex flex-col justify-between"
                style={{
                  backgroundImage: "linear-gradient(135deg, #09172A 0%, #102A43 45%, #0A192F 100%)",
                  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(217, 119, 6, 0.15)",
                }}
              >
                {/* Subtle Radial Pattern Overlay */}
                <div
                  className="absolute inset-0 opacity-10 pointer-events-none"
                  style={{
                    backgroundImage: "radial-gradient(#F59E0B 1px, transparent 1px)",
                    backgroundSize: "16px 16px",
                  }}
                />

                {/* Top Metallic Banner */}
                <div className="relative z-10 flex items-center justify-between border-b border-amber-400/20 pb-4 mb-3">
                  <div className="flex items-center gap-3">
                    <img
                      src="/images/gosa.png"
                      alt="GOSA Logo"
                      className="w-10 h-10 object-contain drop-shadow-md brightness-0 invert"
                    />
                    <div>
                      <h3 className="text-xs font-black tracking-wider text-amber-400 uppercase leading-none">
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

                {/* Attendee Name & Pass Header */}
                <div className="relative z-10 text-center mb-3 bg-slate-900/70 border border-amber-400/20 rounded-2xl p-4">
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-amber-400/90 block mb-1">
                    DELEGATE / ATTENDEE NAME
                  </span>

                  <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight drop-shadow-md">
                    {ticket.user.fullName}
                  </h2>

                  {ticket.user.phone && (
                    <span className="text-xs font-mono font-bold text-amber-300 block mt-1">
                      📱 {ticket.user.phone}
                    </span>
                  )}

                  <div className="mt-2.5 inline-block px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md">
                    {ticket.primaryTitle || "COMBINED GOSA CONVENTION PASS"}
                  </div>
                </div>

                {/* Itemized Paid Services Breakdown Section */}
                <div className="relative z-10 my-2 bg-slate-900/80 border border-amber-400/30 rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-700/60 pb-2 mb-2">
                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
                      <PackageCheck className="w-3.5 h-3.5" />
                      Services &amp; Items Included
                    </span>
                    <span className="text-[9px] font-mono text-slate-300 font-bold">
                      Total: ₦{ticket.amount.toLocaleString()}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {ticket.serviceItems && ticket.serviceItems.length > 0 ? (
                      ticket.serviceItems.map((item, idx) => (
                        <div
                          key={item.id || idx}
                          className="bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2.5 text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              {renderServiceIcon(item.icon, item.category)}
                              <div>
                                <span className="font-bold text-white text-xs block leading-tight">
                                  {item.name}
                                </span>
                                {item.quantity > 1 && (
                                  <span className="text-[10px] text-amber-400/90 font-semibold">
                                    Quantity: {item.quantity}
                                  </span>
                                )}
                              </div>
                            </div>

                            <Badge className="bg-amber-500/10 text-amber-300 border border-amber-500/30 font-semibold text-[9px] px-2 py-0.5 whitespace-nowrap">
                              {item.badgeText}
                            </Badge>
                          </div>

                          {/* Beneficiaries & Phone Numbers list */}
                          {item.beneficiaries && item.beneficiaries.length > 0 && (
                            <div className="pt-1.5 border-t border-slate-800/80 space-y-1">
                              <span className="text-[8px] font-black uppercase text-amber-400/90 block tracking-widest">
                                Delegates &amp; Phone Numbers:
                              </span>
                              {item.beneficiaries.map((b, bIdx) => (
                                <div key={bIdx} className="flex items-center justify-between text-[10px] font-mono">
                                  <span className="font-semibold text-slate-200 truncate max-w-[200px]">
                                    • {b.name}
                                  </span>
                                  <span className="text-amber-300 font-bold ml-2">
                                    {b.phone || "N/A"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Detach Ticket Button if quantity > 1 (Excluded from html2canvas pass snapshot) */}
                          {item.quantity > 1 &&
                            (item.category === "convention" || item.category === "dinner") && (
                              <div
                                data-html2canvas-ignore="true"
                                className="pt-2 border-t border-slate-800/80 flex items-center justify-end"
                              >
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => openSplitModal(item)}
                                  className="bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/30 text-[10px] font-bold h-7 px-2.5 rounded-lg gap-1.5 transition-all shadow-sm"
                                >
                                  <UserPlus className="w-3.5 h-3.5" />
                                  Detach &amp; Assign to New Owner
                                </Button>
                              </div>
                            )}
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center justify-between bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-xs">
                        <span className="font-bold text-white">Convention Registration Ticket</span>
                        <Badge className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[9px]">
                          Confirmed Ticket 🎟️
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>

                {/* Event Schedule & Location Grid */}
                <div className="relative z-10 grid grid-cols-2 gap-2 my-2 text-[10px]">
                  <div className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-2.5 flex items-start gap-2">
                    <Calendar className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-400 uppercase block text-[8px]">Dates</span>
                      <span className="font-extrabold text-white">Oct 31 – Nov 2, 2026</span>
                    </div>
                  </div>

                  <div className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-2.5 flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-400 uppercase block text-[8px]">Venue</span>
                      <span className="font-extrabold text-white truncate block">Crispan</span>
                    </div>
                  </div>
                </div>

                {/* QR Code Container */}
                <div className="relative z-10 my-2 bg-white text-slate-950 rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-inner border border-amber-400/30">
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

                {/* Security Seal & Motto Footer */}
                <div className="relative z-10 border-t border-amber-400/20 pt-3 flex items-center justify-between text-[9px] text-slate-400 font-medium">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>GOSA Official Security Code</span>
                  </div>

                  <span className="font-extrabold text-amber-300 uppercase tracking-widest">
                    "For Light &amp; Truth"
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Ticket Detach & Assign Modal Popup */}
      <Dialog open={isSplitModalOpen} onOpenChange={(open) => !open && closeSplitModal()}>
        <DialogContent className="bg-slate-900 border border-slate-800 text-white max-w-lg p-6 rounded-2xl shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Users className="w-4 h-4" />
              </div>
              <DialogTitle className="text-lg font-bold text-white">
                Detach &amp; Assign Ticket Pass
              </DialogTitle>
            </div>
            <DialogDescription className="text-slate-400 text-xs">
              Divide 1 ticket from this pass and assign it to a new delegate. They will receive their own verified ticket pass and unique QR code for independent event check-in.
            </DialogDescription>
          </DialogHeader>

          {splitSuccessData ? (
            <div className="space-y-4 pt-2">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="font-extrabold text-white text-base">Ticket Successfully Detached!</h4>
                <p className="text-slate-300 text-xs mt-1">
                  1 ticket pass is now officially registered to{" "}
                  <strong className="text-amber-300">{splitSuccessData.newOwner.fullName}</strong> (
                  {splitSuccessData.newOwner.phoneNumber}).
                </p>
                <div className="mt-2 text-[11px] text-emerald-300 font-medium">
                  ✅ Automated WhatsApp notification dispatched
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300 font-semibold">New Owner's Pass Link</Label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={splitSuccessData.newTicketPassUrl}
                    className="bg-slate-950 border-slate-800 text-amber-300 text-xs font-mono h-10 select-all"
                  />
                  <Button
                    type="button"
                    onClick={handleCopyNewLink}
                    variant="outline"
                    className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs shrink-0 gap-1.5 h-10 px-3"
                  >
                    {copiedNewLink ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    {copiedNewLink ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
                <Button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-2 h-10 shadow-lg shadow-emerald-600/20"
                >
                  <Send className="w-4 h-4" />
                  Share on WhatsApp
                </Button>
                <Button
                  type="button"
                  onClick={closeSplitModal}
                  variant="outline"
                  className="w-full border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs h-10"
                >
                  Done &amp; View Updated Pass
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSplitSubmit} className="space-y-4 pt-2">
              {selectedSplitItem && (
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">
                      Splitting From
                    </span>
                    <span className="font-bold text-white">{selectedSplitItem.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">
                      Remaining After Transfer
                    </span>
                    <span className="font-mono text-amber-400 font-bold">
                      {selectedSplitItem.quantity - 1} Pass(es)
                    </span>
                  </div>
                </div>
              )}

              {splitError && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl p-3 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{splitError}</span>
                </div>
              )}

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="split-name" className="text-xs text-slate-300 font-semibold">
                    New Owner Full Name <span className="text-rose-400">*</span>
                  </Label>
                  <Input
                    id="split-name"
                    required
                    placeholder="e.g. Nansel Danboyi"
                    value={splitFullName}
                    onChange={(e) => setSplitFullName(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-500 text-sm h-10 focus:border-amber-400"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="split-phone" className="text-xs text-slate-300 font-semibold">
                    Phone Number (WhatsApp) <span className="text-rose-400">*</span>
                  </Label>
                  <Input
                    id="split-phone"
                    required
                    type="tel"
                    placeholder="e.g. 08083501484"
                    value={splitPhone}
                    onChange={(e) => setSplitPhone(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-500 text-sm h-10 focus:border-amber-400"
                  />
                  <p className="text-[10px] text-slate-400">
                    The ticket pass link will be sent automatically to this phone via WhatsApp.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="split-email" className="text-xs text-slate-300 font-semibold">
                      Email Address <span className="text-slate-500 text-[10px]">(Optional)</span>
                    </Label>
                    <Input
                      id="split-email"
                      type="email"
                      placeholder="e.g. delegate@gmail.com"
                      value={splitEmail}
                      onChange={(e) => setSplitEmail(e.target.value)}
                      className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-500 text-sm h-10 focus:border-amber-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="split-year" className="text-xs text-slate-300 font-semibold">
                      Graduation Set / Year <span className="text-slate-500 text-[10px]">(Optional)</span>
                    </Label>
                    <Input
                      id="split-year"
                      placeholder="e.g. Class of 1998"
                      value={splitYear}
                      onChange={(e) => setSplitYear(e.target.value)}
                      className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-500 text-sm h-10 focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={closeSplitModal}
                  disabled={splitSubmitting}
                  className="text-slate-400 hover:text-white hover:bg-slate-800 text-xs h-10"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={splitSubmitting}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs h-10 px-4 gap-2 shadow-lg shadow-amber-500/20"
                >
                  {splitSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Detaching Ticket...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Confirm &amp; Detach Ticket
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
