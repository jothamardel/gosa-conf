'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  QrCode,
  Copy,
  Check,
  Search,
  Sparkles,
  Ticket,
  Utensils,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ExternalLink,
  Phone,
  User,
  ShieldCheck,
} from 'lucide-react';
import QRCode from 'qrcode';
import { toast } from 'sonner';
import { playSuccessChime } from '@/lib/utils/audio-cue';
import Link from 'next/link';

export interface CheckInPassResult {
  checkInCode: string;
  user: {
    _id?: string;
    fullName: string;
    phoneNumber?: string;
    email?: string;
    house?: string;
    year?: string;
  };
  isCheckedIn: boolean;
  itemsSummary: Array<{
    name: string;
    quantity: number;
    icon: string;
  }>;
  primaryTicketId?: string;
  ticketUrl?: string;
}

interface CheckinCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: CheckInPassResult | null;
  initialQuery?: string;
}

export function CheckinCodeModal({
  isOpen,
  onClose,
  initialData = null,
  initialQuery = '',
}: CheckinCodeModalProps) {
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckInPassResult | null>(initialData);
  const [copied, setCopied] = useState(false);
  const [qrUrl, setQrUrl] = useState<string>('');

  // Synchronize when initialData or initialQuery changes
  useEffect(() => {
    if (initialData) {
      setResult(initialData);
      generateQr(initialData.checkInCode);
    } else if (isOpen) {
      setResult(null);
      setError(null);
      setQrUrl('');
      if (initialQuery) {
        setQuery(initialQuery);
      }
    }
  }, [initialData, initialQuery, isOpen]);

  const generateQr = async (code: string) => {
    try {
      const url = await QRCode.toDataURL(code, {
        width: 220,
        margin: 1.5,
        color: {
          dark: '#020617', // slate-950
          light: '#FFFFFF',
        },
      });
      setQrUrl(url);
    } catch (e) {
      console.warn('QR code generation failed:', e);
    }
  };

  const handleLookup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = query.trim();
    if (!clean) {
      setError('Please enter your phone number, email, or payment reference.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/ticket/checkin-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: clean }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No confirmed ticket found.');
      }

      playSuccessChime();
      setResult(data);
      await generateQr(data.checkInCode);
      toast.success(`Check-In Code retrieved for ${data.user.fullName}!`);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve check-in code. Please try again.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result?.checkInCode) return;
    navigator.clipboard.writeText(result.checkInCode);
    setCopied(true);
    playSuccessChime();
    toast.success('Check-in code copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    setQuery('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md w-full p-0 overflow-hidden rounded-3xl border border-slate-800 shadow-2xl bg-slate-950 text-white">
        {/* Metallic Banner Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-5 text-white">
          <DialogHeader className="space-y-1 text-left">
            <div className="flex items-center space-x-2">
              <span className="p-1.5 bg-white/20 rounded-xl backdrop-blur-xs">
                <QrCode className="w-5 h-5 text-white" />
              </span>
              <DialogTitle className="text-xl font-black tracking-tight text-white">
                GOSA 2026 Venue Check-In
              </DialogTitle>
            </div>
            <DialogDescription className="text-emerald-100 text-xs sm:text-sm">
              Instant attendee verification &amp; 8-digit official admission code.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-5 sm:p-6 space-y-5 max-h-[85vh] overflow-y-auto">
          {result ? (
            /* Results Display */
            <div className="space-y-5 text-center">
              {/* Attendee Greeting & Status */}
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-semibold text-slate-300">{result.user.fullName}</span>
                  {result.user.year && <span>• Set {result.user.year}</span>}
                </div>
                {result.isCheckedIn ? (
                  <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold px-2.5 py-0.5">
                    ✅ Already Checked-In at Venue
                  </Badge>
                ) : (
                  <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2.5 py-0.5">
                    🟢 Ready for Admission &amp; Badge Collection
                  </Badge>
                )}
              </div>

              {/* The Prominent 8-Digit Code Display */}
              <div className="relative p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-emerald-500/50 shadow-xl space-y-3">
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-emerald-400 block">
                  YOUR OFFICIAL CHECK-IN PASS CODE
                </span>

                <div className="py-1">
                  <span className="font-mono text-3xl sm:text-4xl font-black tracking-widest text-white drop-shadow-md selection:bg-emerald-500 selection:text-slate-950">
                    {result.checkInCode}
                  </span>
                </div>

                {/* 1-Tap Big Copy Button */}
                <Button
                  onClick={handleCopy}
                  className="w-full h-11 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98]"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-slate-950" />
                      <span>Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-950" />
                      <span>Tap to Copy Code</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Scannable QR Code */}
              {qrUrl && (
                <div className="flex flex-col items-center justify-center p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-2">
                  <div className="bg-white p-2.5 rounded-xl shadow-md">
                    <img src={qrUrl} alt="Check-In QR Code" className="w-36 h-36 object-contain" />
                  </div>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Present QR code or pass code to desk officials</span>
                  </p>
                </div>
              )}

              {/* Confirmed Tickets Breakdown */}
              {result.itemsSummary && result.itemsSummary.length > 0 && (
                <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800 text-left space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Confirmed Convention Items
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {result.itemsSummary.map((item, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="bg-slate-950 border-slate-800 text-slate-300 text-xs py-1 px-2.5 flex items-center space-x-1.5"
                      >
                        {item.icon === 'utensils' ? (
                          <Utensils className="w-3 h-3 text-indigo-400" />
                        ) : item.icon === 'book' ? (
                          <BookOpen className="w-3 h-3 text-amber-400" />
                        ) : (
                          <Ticket className="w-3 h-3 text-emerald-400" />
                        )}
                        <span>
                          {item.name} ({item.quantity})
                        </span>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Bottom Actions */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                {result.ticketUrl && (
                  <Link href={result.ticketUrl} className="w-full sm:w-auto flex-1" onClick={onClose}>
                    <Button
                      variant="outline"
                      className="w-full h-10 rounded-xl text-xs font-bold border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-200 flex items-center justify-center space-x-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>View Full E-Ticket Pass</span>
                    </Button>
                  </Link>
                )}
                <Button
                  onClick={handleReset}
                  variant="ghost"
                  className="w-full sm:w-auto h-10 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-900"
                >
                  Lookup Another
                </Button>
              </div>
            </div>
          ) : (
            /* Lookup Form */
            <form onSubmit={handleLookup} className="space-y-4">
              <div className="text-center space-y-1 pb-1">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto mb-2">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Retrieve Your Admission Pass Code
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Enter the phone number, email, or payment reference you registered with to view your 8-digit check-in code.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="checkin-lookup-input" className="text-xs font-semibold text-slate-300">
                  Phone Number, Email, or Reference
                </Label>
                <div className="relative">
                  <Input
                    id="checkin-lookup-input"
                    type="text"
                    placeholder="e.g. 08012345678 or john@example.com"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    disabled={loading}
                    className="h-12 pl-4 pr-10 bg-slate-900 border-slate-800 text-white rounded-xl placeholder:text-slate-500 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    autoFocus
                  />
                  <div className="absolute right-3 top-3.5 text-slate-400 pointer-events-none">
                    <Search className="w-5 h-5 text-slate-500" />
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Big Check-In Action Button */}
              <Button
                type="submit"
                disabled={loading || !query.trim()}
                className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-xl text-sm flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/25 transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Resolving Pass Code...</span>
                  </>
                ) : (
                  <>
                    <QrCode className="w-5 h-5 text-slate-950" />
                    <span>Get My Check-In Code</span>
                  </>
                )}
              </Button>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-[11px] text-slate-400 text-center space-y-1">
                <p>
                  💡 <strong>Venue Admission Tip:</strong> Once retrieved, you can copy the code or save the QR code to your phone gallery for speedy walk-in admission.
                </p>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
