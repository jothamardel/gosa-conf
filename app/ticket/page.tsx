"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Navigation } from "@/components/layout/navigation";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  AlertCircle,
  Gift,
  Lock
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
  checkedIn?: boolean;
}

interface TicketData {
  _id: string;
  primaryTitle: string;
  paymentReference: string;
  amount: number;
  status: string;
  confirmed: boolean;
  checkedIn?: boolean;
  transferredFrom?: {
    name: string;
    phone?: string;
  };
  transferredAt?: string;
  transferReason?: "gift" | "on_behalf" | "transfer";
  personalNote?: string;
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

  // Unified Ticket Transfer & Assignment State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignMode, setAssignMode] = useState<"split" | "full">("split");
  const [transferReason, setTransferReason] = useState<"gift" | "on_behalf" | "transfer">("gift");
  const [selectedItem, setSelectedItem] = useState<PaidServiceItem | null>(null);
  const [assignFullName, setAssignFullName] = useState("");
  const [assignPhone, setAssignPhone] = useState("");
  const [assignEmail, setAssignEmail] = useState("");
  const [assignYear, setAssignYear] = useState("");
  const [personalNote, setPersonalNote] = useState("");
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignSuccessData, setAssignSuccessData] = useState<{
    ticketId: string;
    ticketPassUrl: string;
    newOwner: {
      fullName: string;
      phoneNumber: string;
      email?: string;
    };
    mode: "split" | "full";
    serviceName?: string;
    remainingQuantity?: number;
    transferReason: "gift" | "on_behalf" | "transfer";
    personalNote?: string;
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

  const openAssignModal = (mode?: "split" | "full", item?: PaidServiceItem) => {
    const splittable = ticket?.serviceItems?.find(
      (i) => i.quantity > 1 && (i.category === "convention" || i.category === "dinner")
    );
    const chosenMode = mode || (splittable ? "split" : "full");
    setAssignMode(chosenMode);
    setSelectedItem(item || splittable || ticket?.serviceItems?.[0] || null);
    setTransferReason("gift");
    setAssignFullName("");
    setAssignPhone("");
    setAssignEmail("");
    setAssignYear("");
    setPersonalNote("");
    setAssignError(null);
    setAssignSuccessData(null);
    setCopiedNewLink(false);
    setIsAssignModalOpen(true);
  };

  const closeAssignModal = () => {
    setIsAssignModalOpen(false);
    setSelectedItem(null);
    setAssignFullName("");
    setAssignPhone("");
    setAssignEmail("");
    setAssignYear("");
    setPersonalNote("");
    setAssignError(null);
    setAssignSuccessData(null);
    setCopiedNewLink(false);
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket) return;

    if (!assignFullName.trim() || !assignPhone.trim()) {
      setAssignError("Please provide both Recipient's Full Name and Phone Number.");
      return;
    }

    try {
      setAssignSubmitting(true);
      setAssignError(null);

      const endpoint = assignMode === "split" ? "/api/v1/ticket/split" : "/api/v1/ticket/transfer";
      const targetId =
        assignMode === "split"
          ? selectedItem?.id || ticket._id
          : selectedItem?.id || ticket._id;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId: targetId,
          serviceCategory: selectedItem?.category,
          transferType: transferReason,
          personalNote: personalNote.trim() || undefined,
          newOwner: {
            fullName: assignFullName.trim(),
            phoneNumber: assignPhone.trim(),
            email: assignEmail.trim() || undefined,
            year: assignYear.trim() || undefined,
          },
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        setAssignError(result.message || "Failed to process ticket transfer. Please try again.");
        return;
      }

      setAssignSuccessData({
        ticketId: result.data.newTicketId || result.data.ticketId,
        ticketPassUrl: result.data.newTicketPassUrl || result.data.ticketPassUrl,
        newOwner: result.data.newOwner,
        mode: assignMode,
        serviceName: result.data.serviceName,
        remainingQuantity: result.data.remainingQuantity,
        transferReason,
        personalNote: personalNote.trim() || undefined,
      });

      // Refresh current ticket in background so remaining quantity / owner name updates
      await fetchTicket(true);
    } catch (err: any) {
      console.error("Error processing ticket transfer:", err);
      setAssignError(err?.message || "An unexpected error occurred.");
    } finally {
      setAssignSubmitting(false);
    }
  };

  const handleCopyNewLink = () => {
    if (!assignSuccessData?.ticketPassUrl) return;
    navigator.clipboard.writeText(assignSuccessData.ticketPassUrl);
    setCopiedNewLink(true);
    setTimeout(() => setCopiedNewLink(false), 2500);
  };

  const handleShareWhatsApp = () => {
    if (!assignSuccessData) return;
    const cleanDigits = assignSuccessData.newOwner.phoneNumber.replace(/\D/g, "");
    const intlDigits = cleanDigits.startsWith("0") ? `234${cleanDigits.slice(1)}` : cleanDigits;

    let headline = "🎉 Official GOSA 2026 Ticket Pass";
    let intro = `${ticket?.user?.fullName || "A fellow alumnus"} has transferred a GOSA 2026 Annual Convention Pass to you! 🎟️`;

    if (assignSuccessData.transferReason === "gift") {
      headline = "🎁 GOSA 2026 Convention Pass Gift";
      intro = `${ticket?.user?.fullName || "A fellow alumnus"} has presented you with a GOSA 2026 Convention Pass as a gift! 🎁🎟️`;
    } else if (assignSuccessData.transferReason === "on_behalf") {
      headline = "🤝 GOSA 2026 Ticket Pass";
      intro = `${ticket?.user?.fullName || "A fellow alumnus"} helped purchase your GOSA 2026 Ticket Pass, and it has been officially registered to you! 🎟️`;
    }

    let text = `*${headline}*\nFor Light and Truth\n\nHello ${assignSuccessData.newOwner.fullName},\n\n${intro}\n\n👤 *Attendee:* ${assignSuccessData.newOwner.fullName}\n📱 *Phone:* ${assignSuccessData.newOwner.phoneNumber}\n🎟️ *Pass Link:* ${assignSuccessData.ticketPassUrl}`;

    if (assignSuccessData.personalNote) {
      text += `\n\n💌 *Note from ${ticket?.user?.fullName || "Sender"}:*\n"${assignSuccessData.personalNote}"`;
    }

    text += `\n\n📍 *Venue:* Crispan Luxury Hotel, Jos, Plateau State\n📅 *Dates:* Oct 31 – Nov 2, 2026\n\nPlease tap your pass link above to view your verified E-Ticket and QR code.`;

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

      <main className="grow container mx-auto px-3 sm:px-4 py-6 sm:py-12 max-w-5xl">
        {/* Top Header Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Link href="/" className="self-start sm:self-auto">
            <Button variant="outline" className="border-slate-700 bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 gap-2 h-9 sm:h-10 text-xs">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </Link>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] sm:text-xs font-bold text-center">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>Official GOSA 2026 E-Ticket &amp; Credentials Portal</span>
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
          <div className="space-y-6 sm:space-y-8">
            {/* Action Bar */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <h2 className="text-base sm:text-lg font-bold text-white">
                    Official GOSA Pass Confirmed
                  </h2>
                  {ticket.checkedIn && (
                    <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold shrink-0">
                      Venue Checked-In
                    </Badge>
                  )}
                </div>
                <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
                  Download your pass, copy your link, or assign/transfer passes to colleagues.
                </p>
              </div>

              {/* 2x2 Clean Grid on Mobile, Inline Horizontal Row on Desktop */}
              <div className="grid grid-cols-2 gap-2 w-full md:w-auto md:flex md:flex-wrap md:items-center md:gap-2.5">
                {/* Row 1 / Col 1: Download PNG Pass */}
                <Button
                  onClick={handleDownloadImage}
                  disabled={downloadingImage}
                  className="w-full md:w-auto bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold gap-1.5 sm:gap-2 shadow-lg shadow-amber-500/20 text-xs h-11 sm:h-10 px-3 sm:px-4 justify-center"
                >
                  {downloadingImage ? (
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  ) : (
                    <Download className="w-4 h-4 shrink-0" />
                  )}
                  <span>Download PNG</span>
                </Button>

                {/* Row 1 / Col 2: Download PDF Pass */}
                <Button
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                  variant="outline"
                  className="w-full md:w-auto border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 font-bold gap-1.5 sm:gap-2 text-xs h-11 sm:h-10 px-3 sm:px-4 justify-center"
                >
                  {downloadingPdf ? (
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  ) : (
                    <FileText className="w-4 h-4 shrink-0" />
                  )}
                  <span>Download PDF</span>
                </Button>

                {/* Row 2 / Col 1: Assign / Transfer Pass */}
                {ticket.checkedIn ? (
                  <div className="w-full md:w-auto flex items-center justify-center gap-1.5 px-3 h-11 sm:h-10 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-400 text-xs font-semibold">
                    <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Checked In</span>
                  </div>
                ) : (
                  <Button
                    onClick={() => openAssignModal(hasSplittableItems ? "split" : "full")}
                    className="w-full md:w-auto bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/40 font-bold gap-1.5 sm:gap-2 text-xs h-11 sm:h-10 px-3 transition-all shadow-md shadow-amber-500/10 justify-center"
                  >
                    <Gift className="w-4 h-4 shrink-0" />
                    <span>Assign / Transfer</span>
                  </Button>
                )}

                {/* Row 2 / Col 2: Copy Link */}
                <Button
                  onClick={handleCopyLink}
                  variant="ghost"
                  className="w-full md:w-auto border border-slate-800 md:border-transparent bg-slate-950/60 md:bg-transparent text-slate-300 hover:text-white hover:bg-slate-800 gap-1.5 text-xs h-11 sm:h-10 px-3 justify-center"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <Copy className="w-4 h-4 shrink-0" />
                  )}
                  <span>{copied ? "Copied!" : "Copy Link"}</span>
                </Button>
              </div>
            </div>

            {/* Multiple Tickets Detach / Reassign Banner */}
            {hasSplittableItems && !ticket.checkedIn && (
              <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-slate-900 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shadow-lg">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                      Multiple Passes Under This Ticket
                      <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                        Assign Available
                      </Badge>
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                      You purchased multiple passes. You can detach and assign individual passes to friends or family so each person receives their own ticket &amp; QR code directly via WhatsApp.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => openAssignModal("split")}
                  className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs gap-2 shrink-0 shadow-lg shadow-amber-500/25 h-11 sm:h-10 px-4 justify-center"
                >
                  <UserPlus className="w-4 h-4" />
                  Detach &amp; Assign a Pass
                </Button>
              </div>
            )}

            {/* Ticket Card Component to render & snapshot */}
            <div className="flex justify-center px-1 sm:px-0">
              <div
                ref={ticketCardRef}
                id="ticket-pass-card"
                className="w-full max-w-[460px] rounded-2xl sm:rounded-[32px] p-4 sm:p-6 text-white relative overflow-hidden shadow-2xl border-2 sm:border-4 border-amber-400/40 flex flex-col justify-between"
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
                <div className="relative z-10 flex items-center justify-between border-b border-amber-400/20 pb-3 sm:pb-4 mb-2.5 sm:mb-3">
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <img
                      src="/images/gosa.png"
                      alt="GOSA Logo"
                      className="w-8 h-8 sm:w-10 sm:h-10 object-contain drop-shadow-md brightness-0 invert shrink-0"
                    />
                    <div>
                      <h3 className="text-[11px] sm:text-xs font-black tracking-wider text-amber-400 uppercase leading-none">
                        GOSA 2026
                      </h3>
                      <p className="text-[8px] sm:text-[9px] font-bold text-slate-300 uppercase tracking-widest mt-1">
                        Annual Convention Pass
                      </p>
                    </div>
                  </div>

                  {ticket.checkedIn ? (
                    <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold text-[9px] sm:text-[10px] px-2 sm:px-2.5 py-0.5 uppercase tracking-wider flex items-center gap-1 shrink-0">
                      <CheckCircle2 className="w-3 h-3 text-amber-400" />
                      CHECKED IN 🎫
                    </Badge>
                  ) : (
                    <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold text-[9px] sm:text-[10px] px-2 sm:px-2.5 py-0.5 uppercase tracking-wider shrink-0">
                      CONFIRMED ✅
                    </Badge>
                  )}
                </div>

                {/* Gift / Transfer Attribution Badge */}
                {(ticket.transferredFrom || ticket.transferReason) && (
                  <div className="relative z-10 mb-2.5 sm:mb-3 bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-amber-500/20 border border-amber-400/40 rounded-xl sm:rounded-2xl p-2.5 sm:p-3 text-center shadow-inner">
                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-amber-300 flex items-center justify-center gap-1.5">
                      {ticket.transferReason === "gift" ? (
                        <>🎁 Official Gift Pass</>
                      ) : ticket.transferReason === "on_behalf" ? (
                        <>🤝 Purchased on Behalf</>
                      ) : (
                        <>🔄 Transferred Ticket Pass</>
                      )}
                    </span>
                    {ticket.transferredFrom?.name && (
                      <p className="text-white text-[11px] sm:text-xs font-bold mt-0.5 sm:mt-1">
                        {ticket.transferReason === "gift" ? "Gift from" : "Assigned by"}:{" "}
                        <span className="text-amber-300">{ticket.transferredFrom.name}</span>
                      </p>
                    )}
                    {ticket.personalNote && (
                      <p className="text-slate-300 text-[10px] sm:text-[11px] italic mt-1 sm:mt-1.5 font-serif bg-slate-950/40 rounded-lg py-1 px-2 border border-slate-800 break-words">
                        &ldquo;{ticket.personalNote}&rdquo;
                      </p>
                    )}
                  </div>
                )}

                {/* Attendee Name & Pass Header */}
                <div className="relative z-10 text-center mb-2.5 sm:mb-3 bg-slate-900/70 border border-amber-400/20 rounded-xl sm:rounded-2xl p-3 sm:p-4">
                  <span className="text-[8px] sm:text-[9px] font-extrabold uppercase tracking-widest text-amber-400/90 block mb-1">
                    DELEGATE / ATTENDEE NAME
                  </span>

                  <h2 className="text-lg sm:text-2xl font-black text-white uppercase tracking-tight drop-shadow-md break-words leading-tight">
                    {ticket.user.fullName}
                  </h2>

                  {ticket.user.phone && (
                    <span className="text-[11px] sm:text-xs font-mono font-bold text-amber-300 block mt-1">
                      📱 {ticket.user.phone}
                    </span>
                  )}

                  <div className="mt-2 sm:mt-2.5 inline-block px-2.5 sm:px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-[10px] sm:text-xs uppercase tracking-wider shadow-md max-w-full truncate">
                    {ticket.primaryTitle || "COMBINED GOSA CONVENTION PASS"}
                  </div>
                </div>

                {/* Itemized Paid Services Breakdown Section */}
                <div className="relative z-10 my-2 bg-slate-900/80 border border-amber-400/30 rounded-xl sm:rounded-2xl p-3 sm:p-3.5 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-700/60 pb-2 mb-2">
                    <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
                      <PackageCheck className="w-3.5 h-3.5 shrink-0" />
                      Services &amp; Items Included
                    </span>
                    <span className="text-[8px] sm:text-[9px] font-mono text-slate-300 font-bold shrink-0">
                      Total: ₦{ticket.amount.toLocaleString()}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {ticket.serviceItems && ticket.serviceItems.length > 0 ? (
                      ticket.serviceItems.map((item, idx) => (
                        <div
                          key={item.id || idx}
                          className="bg-slate-950/60 border border-slate-800 rounded-lg sm:rounded-xl px-2.5 sm:px-3 py-2 sm:py-2.5 text-xs space-y-1.5"
                        >
                          <div className="flex items-start sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {renderServiceIcon(item.icon, item.category)}
                              <div className="min-w-0">
                                <span className="font-bold text-white text-xs block leading-tight truncate sm:whitespace-normal">
                                  {item.name}
                                </span>
                                {item.quantity > 1 && (
                                  <span className="text-[10px] text-amber-400/90 font-semibold">
                                    Quantity: {item.quantity}
                                  </span>
                                )}
                              </div>
                            </div>

                            <Badge className="bg-amber-500/10 text-amber-300 border border-amber-500/30 font-semibold text-[9px] px-2 py-0.5 shrink-0 whitespace-nowrap">
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
                                <div key={bIdx} className="flex flex-col sm:flex-row sm:items-center justify-between text-[10px] font-mono gap-0.5 sm:gap-2">
                                  <span className="font-semibold text-slate-200 truncate">
                                    • {b.name}
                                  </span>
                                  <span className="text-amber-300 font-bold sm:ml-2 shrink-0">
                                    {b.phone || "N/A"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Detach Ticket Button if quantity > 1 (Excluded from html2canvas pass snapshot) */}
                          {item.quantity > 1 &&
                            !ticket.checkedIn &&
                            (item.category === "convention" || item.category === "dinner") && (
                              <div
                                data-html2canvas-ignore="true"
                                className="pt-2 border-t border-slate-800/80 flex items-center justify-end"
                              >
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => openAssignModal("split", item)}
                                  className="w-full sm:w-auto bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/30 text-[10px] font-bold h-8 px-2.5 rounded-lg gap-1.5 transition-all shadow-sm justify-center"
                                >
                                  <UserPlus className="w-3.5 h-3.5" />
                                  Detach &amp; Assign Pass
                                </Button>
                              </div>
                            )}
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center justify-between bg-slate-950/60 border border-slate-800 rounded-lg sm:rounded-xl px-2.5 sm:px-3 py-2 text-xs">
                        <span className="font-bold text-white text-xs">Convention Registration Ticket</span>
                        <Badge className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[9px] shrink-0">
                          Confirmed Ticket 🎟️
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>

                {/* Event Schedule & Location Grid */}
                <div className="relative z-10 grid grid-cols-2 gap-2 my-2 text-[10px]">
                  <div className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-2 sm:p-2.5 flex items-start gap-2">
                    <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-400 uppercase block text-[7px] sm:text-[8px]">Dates</span>
                      <span className="font-extrabold text-white text-[10px] sm:text-[11px] leading-tight block">Oct 31 – Nov 2, 2026</span>
                    </div>
                  </div>

                  <div className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-2 sm:p-2.5 flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <span className="font-bold text-slate-400 uppercase block text-[7px] sm:text-[8px]">Venue</span>
                      <span className="font-extrabold text-white text-[10px] sm:text-[11px] leading-tight truncate block">Crispan Hotel, Jos</span>
                    </div>
                  </div>
                </div>

                {/* QR Code Container */}
                <div className="relative z-10 my-2 bg-white text-slate-950 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex flex-col items-center justify-center text-center shadow-inner border border-amber-400/30">
                  <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1.5 sm:mb-2">
                    Official Verification QR Code
                  </span>

                  {qrCodeUrl ? (
                    <img src={qrCodeUrl} alt="Ticket QR Code" className="w-32 h-32 sm:w-36 sm:h-36 object-contain" />
                  ) : (
                    <div className="w-32 h-32 sm:w-36 sm:h-36 flex items-center justify-center text-slate-400">
                      <QrCode className="w-10 h-10" />
                    </div>
                  )}

                  <p className="text-[8px] sm:text-[9px] font-mono text-slate-600 mt-1.5 sm:mt-2 truncate w-full px-1">
                    Ref: {ticket.paymentReference}
                  </p>
                </div>

                {/* Security Seal & Motto Footer */}
                <div className="relative z-10 border-t border-amber-400/20 pt-2.5 sm:pt-3 flex items-center justify-between text-[8px] sm:text-[9px] text-slate-400 font-medium">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>GOSA Official Security Code</span>
                  </div>

                  <span className="font-extrabold text-amber-300 uppercase tracking-widest shrink-0">
                    "For Light &amp; Truth"
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Ticket Transfer & Assign Modal Popup */}
      <Dialog open={isAssignModalOpen} onOpenChange={(open) => !open && closeAssignModal()}>
        <DialogContent className="bg-slate-900 border border-slate-800 text-white w-[94vw] sm:max-w-lg p-4 sm:p-6 rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                {assignMode === "split" ? <UserPlus className="w-4 h-4" /> : <Gift className="w-4 h-4" />}
              </div>
              <DialogTitle className="text-base sm:text-lg font-bold text-white">
                {assignMode === "split" ? "Detach & Assign Ticket Pass" : "Transfer Ticket Pass"}
              </DialogTitle>
            </div>
            <DialogDescription className="text-slate-400 text-xs">
              {assignMode === "split"
                ? "Detach 1 pass for another delegate so they receive their own verified ticket and QR code directly on WhatsApp."
                : "Reassign this official ticket pass and QR code to a new delegate with automated WhatsApp credentials."}
            </DialogDescription>
          </DialogHeader>

          {assignSuccessData ? (
            <div className="space-y-4 pt-2">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="font-extrabold text-white text-base">
                  {assignSuccessData.mode === "split"
                    ? "Ticket Pass Successfully Detached!"
                    : "Ticket Pass Successfully Transferred!"}
                </h4>
                <p className="text-slate-300 text-xs mt-1">
                  Now registered to{" "}
                  <strong className="text-amber-300">{assignSuccessData.newOwner.fullName}</strong> (
                  {assignSuccessData.newOwner.phoneNumber}).
                </p>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold">
                  <Check className="w-3.5 h-3.5" />
                  Automated WhatsApp notification dispatched
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300 font-semibold">Recipient's Pass Link</Label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={assignSuccessData.ticketPassUrl}
                    className="bg-slate-950 border-slate-800 text-amber-300 text-xs font-mono h-11 sm:h-10 select-all"
                  />
                  <Button
                    type="button"
                    onClick={handleCopyNewLink}
                    variant="outline"
                    className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs shrink-0 gap-1.5 h-11 sm:h-10 px-3"
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
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-2 h-11 sm:h-10 shadow-lg shadow-emerald-600/20"
                >
                  <Send className="w-4 h-4" />
                  Share on WhatsApp
                </Button>
                <Button
                  type="button"
                  onClick={closeAssignModal}
                  variant="outline"
                  className="w-full border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs h-11 sm:h-10"
                >
                  Done &amp; View Updated Pass
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleAssignSubmit} className="space-y-4 pt-2">
              {/* Mode Switcher for multi-pass orders */}
              {hasSplittableItems && (
                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setAssignMode("split")}
                    className={`py-2 px-2.5 sm:px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      assignMode === "split"
                        ? "bg-amber-500 text-slate-950 shadow-md"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5 shrink-0" />
                    <span>Detach 1 Pass</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignMode("full")}
                    className={`py-2 px-2.5 sm:px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      assignMode === "full"
                        ? "bg-amber-500 text-slate-950 shadow-md"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Send className="w-3.5 h-3.5 shrink-0" />
                    <span>Transfer Entire Pass</span>
                  </button>
                </div>
              )}

              {/* Transfer Reason Selection */}
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300 font-semibold">
                  Transfer Reason / Category
                </Label>
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => setTransferReason("gift")}
                    className={`p-2 sm:p-2.5 rounded-xl border text-center transition-all ${
                      transferReason === "gift"
                        ? "bg-amber-500/20 border-amber-400 text-amber-300 shadow-sm"
                        : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span className="text-sm sm:text-base block">🎁</span>
                    <span className="text-[10px] sm:text-[11px] font-bold block mt-0.5 truncate">Gift / Courtesy</span>
                    <span className="text-[8px] sm:text-[9px] text-slate-400 block mt-0.5 leading-tight">Present as gift</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransferReason("on_behalf")}
                    className={`p-2 sm:p-2.5 rounded-xl border text-center transition-all ${
                      transferReason === "on_behalf"
                        ? "bg-amber-500/20 border-amber-400 text-amber-300 shadow-sm"
                        : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span className="text-sm sm:text-base block">🤝</span>
                    <span className="text-[10px] sm:text-[11px] font-bold block mt-0.5 truncate">On Behalf</span>
                    <span className="text-[8px] sm:text-[9px] text-slate-400 block mt-0.5 leading-tight">Bought for someone</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransferReason("transfer")}
                    className={`p-2 sm:p-2.5 rounded-xl border text-center transition-all ${
                      transferReason === "transfer"
                        ? "bg-amber-500/20 border-amber-400 text-amber-300 shadow-sm"
                        : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span className="text-sm sm:text-base block">🔄</span>
                    <span className="text-[10px] sm:text-[11px] font-bold block mt-0.5 truncate">Transfer</span>
                    <span className="text-[8px] sm:text-[9px] text-slate-400 block mt-0.5 leading-tight">Change attendee</span>
                  </button>
                </div>
              </div>

              {/* Splitting Details Notice */}
              {assignMode === "split" && selectedItem && (
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">
                      Splitting From
                    </span>
                    <span className="font-bold text-white text-xs sm:text-sm">{selectedItem.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">
                      Remaining on This Pass
                    </span>
                    <span className="font-mono text-amber-400 font-bold">
                      {selectedItem.quantity - 1} Pass(es)
                    </span>
                  </div>
                </div>
              )}

              {assignError && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl p-3 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{assignError}</span>
                </div>
              )}

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="assign-name" className="text-xs text-slate-300 font-semibold">
                    Recipient's Full Name <span className="text-rose-400">*</span>
                  </Label>
                  <Input
                    id="assign-name"
                    required
                    placeholder="e.g. Nansel Danboyi"
                    value={assignFullName}
                    onChange={(e) => setAssignFullName(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-500 text-base sm:text-sm h-11 sm:h-10 focus:border-amber-400"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="assign-phone" className="text-xs text-slate-300 font-semibold">
                    WhatsApp Phone Number <span className="text-rose-400">*</span>
                  </Label>
                  <Input
                    id="assign-phone"
                    required
                    type="tel"
                    placeholder="e.g. 08083501484"
                    value={assignPhone}
                    onChange={(e) => setAssignPhone(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-500 text-base sm:text-sm h-11 sm:h-10 focus:border-amber-400"
                  />
                  <p className="text-[10px] text-slate-400">
                    The verified ticket pass link and QR code will be dispatched automatically to this WhatsApp phone.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="assign-email" className="text-xs text-slate-300 font-semibold">
                      Email Address <span className="text-slate-500 text-[10px]">(Optional)</span>
                    </Label>
                    <Input
                      id="assign-email"
                      type="email"
                      placeholder="e.g. delegate@gmail.com"
                      value={assignEmail}
                      onChange={(e) => setAssignEmail(e.target.value)}
                      className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-500 text-base sm:text-sm h-11 sm:h-10 focus:border-amber-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="assign-year" className="text-xs text-slate-300 font-semibold">
                      Graduation Set / Year <span className="text-slate-500 text-[10px]">(Optional)</span>
                    </Label>
                    <Input
                      id="assign-year"
                      placeholder="e.g. Class of 1998"
                      value={assignYear}
                      onChange={(e) => setAssignYear(e.target.value)}
                      className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-500 text-base sm:text-sm h-11 sm:h-10 focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="assign-note" className="text-xs text-slate-300 font-semibold">
                    Personal Note / Message <span className="text-slate-500 text-[10px]">(Optional)</span>
                  </Label>
                  <Textarea
                    id="assign-note"
                    rows={2}
                    placeholder="e.g. Can't wait to catch up in Jos! Enjoy the convention."
                    value={personalNote}
                    onChange={(e) => setPersonalNote(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-500 text-base sm:text-xs min-h-[64px] focus:border-amber-400 resize-none"
                  />
                  <p className="text-[10px] text-slate-400">
                    This message will appear on their ticket pass card and in their WhatsApp greeting.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={closeAssignModal}
                  disabled={assignSubmitting}
                  className="text-slate-400 hover:text-white hover:bg-slate-800 text-xs h-11 sm:h-10 w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={assignSubmitting}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs h-11 sm:h-10 px-4 gap-2 shadow-lg shadow-amber-500/20 w-full sm:w-auto justify-center"
                >
                  {assignSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {assignMode === "split" ? "Detaching Pass..." : "Transferring Pass..."}
                    </>
                  ) : (
                    <>
                      {assignMode === "split" ? (
                        <UserPlus className="w-4 h-4" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      {assignMode === "split"
                        ? "Confirm & Detach Pass"
                        : "Confirm & Transfer Entire Pass"}
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
