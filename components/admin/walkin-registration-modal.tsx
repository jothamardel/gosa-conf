'use client';

import { useState } from 'react';
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
import { Switch } from '@/components/ui/switch';
import {
  UserPlus,
  CreditCard,
  Banknote,
  Building2,
  CheckCircle,
  Copy,
  Plus,
  Minus,
  Ticket as TicketIcon,
  BookOpen,
  Utensils,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { CONVENTION_PRICING } from '@/lib/constants/pricing';
import { playSuccessChime } from '@/lib/utils/audio-cue';

interface WalkinRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: any) => void;
  initialQuery?: string;
  checkinActive?: boolean;
}

export function WalkinRegistrationModal({
  isOpen,
  onClose,
  onSuccess,
  initialQuery = '',
  checkinActive = true,
}: WalkinRegistrationModalProps) {
  // Prepopulate query if looks like phone or name
  const isLikelyPhone = /^\+?[0-9\s-]{6,}$/.test(initialQuery);

  const [fullName, setFullName] = useState(!isLikelyPhone ? initialQuery : '');
  const [phoneNumber, setPhoneNumber] = useState(isLikelyPhone ? initialQuery : '');
  const [email, setEmail] = useState('');
  const [house, setHouse] = useState('');
  const [year, setYear] = useState('');

  // Items
  const [conventionQty, setConventionQty] = useState(1);
  const [dinnerQty, setDinnerQty] = useState(0);
  const [brochureQty, setBrochureQty] = useState(0);
  const [brochureType, setBrochureType] = useState<'physical' | 'digital'>('physical');

  // Payment & Check-in
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'pos' | 'transfer'>('cash');
  const [checkInImmediately, setCheckInImmediately] = useState(true);
  const [loading, setLoading] = useState(false);

  // Success State
  const [registeredData, setRegisteredData] = useState<any | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const convPrice = CONVENTION_PRICING.convention || 1000;
  const dinPrice = CONVENTION_PRICING.dinner || 2500;
  const brochPrice = CONVENTION_PRICING.brochure || 2000;

  const totalAmount =
    conventionQty * convPrice + dinnerQty * dinPrice + brochureQty * brochPrice;

  const handleReset = () => {
    setFullName('');
    setPhoneNumber('');
    setEmail('');
    setHouse('');
    setYear('');
    setConventionQty(1);
    setDinnerQty(0);
    setBrochureQty(0);
    setPaymentMethod('cash');
    setCheckInImmediately(true);
    setRegisteredData(null);
    setCopiedCode(false);
  };

  const handleModalClose = () => {
    handleReset();
    onClose();
  };

  const copyCodeToClipboard = () => {
    if (registeredData?.checkInCode) {
      navigator.clipboard.writeText(registeredData.checkInCode);
      setCopiedCode(true);
      toast.success('Check-In Code copied to clipboard');
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast.error('Please enter the attendee full name');
      return;
    }

    if (!phoneNumber.trim()) {
      toast.error('Please enter attendee phone number');
      return;
    }

    if (totalAmount <= 0) {
      toast.error('Please select at least one ticket item');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/v1/admin/tickets/register-walkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          phoneNumber: phoneNumber.trim(),
          email: email.trim(),
          house: house.trim(),
          year: year.trim(),
          conventionQty,
          dinnerQty,
          brochureQty,
          brochureType,
          paymentMethod,
          checkInImmediately,
          officialName: 'Check-In Desk Admin',
        }),
      });

      const res = await response.json();

      if (!res.success) {
        throw new Error(res.error || 'Failed to register walk-in member');
      }

      playSuccessChime();
      toast.success(res.message || 'Member registered & marked paid successfully!');

      setRegisteredData(res.data);
      onSuccess(res.data);
    } catch (err: any) {
      console.error('Walk-in registration error:', err);
      toast.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleModalClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-6 bg-white dark:bg-gray-900 border shadow-2xl rounded-2xl">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <div className="p-2.5 bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-300 rounded-xl">
              <UserPlus className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Register Walk-In Member & Mark Paid
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-500 dark:text-gray-400">
                Instantly issue tickets, record cash/POS/transfer payment, and verify check-in
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {registeredData ? (
          // Success Confirmation Screen with Generated Check-In Code
          <div className="py-6 space-y-6 text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10" />
            </div>

            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {registeredData.user.fullName} Registered!
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Payment marked as <strong className="uppercase text-emerald-600">{registeredData.paymentMethod}</strong> • ₦{registeredData.totalAmount.toLocaleString()}
              </p>
            </div>

            {registeredData.checkInCode && (
              <div className="p-6 bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500/40 rounded-2xl space-y-3 max-w-md mx-auto">
                <span className="text-xs uppercase font-bold tracking-wider text-emerald-700 dark:text-emerald-300">
                  Official Check-In Code (Persistent Pass)
                </span>
                <div className="flex items-center justify-center space-x-3">
                  <span className="text-3xl font-mono font-extrabold text-emerald-800 dark:text-emerald-200 tracking-wider">
                    {registeredData.checkInCode}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={copyCodeToClipboard}
                    className="border-emerald-300 hover:bg-emerald-100 dark:border-emerald-700 dark:hover:bg-emerald-900"
                  >
                    <Copy className="w-4 h-4 mr-1.5" />
                    {copiedCode ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  Write this code on their physical wristband or badge. A confirmation has also been queued for WhatsApp.
                </p>
              </div>
            )}

            <div className="bg-gray-50 dark:bg-gray-800/60 p-4 rounded-xl text-left text-sm space-y-1.5 max-w-md mx-auto border">
              <div className="flex justify-between">
                <span className="text-gray-500">Phone:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{registeredData.user.phoneNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Payment Reference:</span>
                <span className="font-mono text-xs text-gray-700 dark:text-gray-300">{registeredData.paymentReference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Items:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{registeredData.itemsSummary.join(', ')}</span>
              </div>
            </div>

            <div className="flex justify-center space-x-3 pt-2">
              <Button
                variant="outline"
                onClick={handleReset}
                className="rounded-xl px-6"
              >
                Register Another Walk-In
              </Button>
              <Button
                onClick={handleModalClose}
                className="bg-primary-600 hover:bg-primary-700 text-white rounded-xl px-8"
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          // Registration Form
          <form onSubmit={handleSubmit} className="space-y-6 pt-2">
            {/* Member Details */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                1. Member Information
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="walkin-name" className="text-sm font-semibold">
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="walkin-name"
                    required
                    placeholder="e.g. Babatunde Adeyemi"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="h-11 rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="walkin-phone" className="text-sm font-semibold">
                    Phone Number (WhatsApp) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="walkin-phone"
                    required
                    placeholder="e.g. 08031234567"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="h-11 rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="walkin-email" className="text-sm font-semibold">
                    Email Address <span className="text-gray-400 font-normal">(optional)</span>
                  </Label>
                  <Input
                    id="walkin-email"
                    type="email"
                    placeholder="e.g. member@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="walkin-house" className="text-sm font-semibold">
                      House <span className="text-gray-400 font-normal">(opt)</span>
                    </Label>
                    <Input
                      id="walkin-house"
                      placeholder="e.g. Aggrey"
                      value={house}
                      onChange={(e) => setHouse(e.target.value)}
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="walkin-year" className="text-sm font-semibold">
                      Set / Year <span className="text-gray-400 font-normal">(opt)</span>
                    </Label>
                    <Input
                      id="walkin-year"
                      placeholder="e.g. 1998"
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      className="h-11 rounded-xl"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Ticket Package Selection */}
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  2. Select Ticket Package
                </h4>
                <span className="text-xs text-primary-600 font-semibold">
                  Official GOSA 2026 Rates
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Convention Pass */}
                <div
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    conventionQty > 0
                      ? 'border-primary-600 bg-primary-50/50 dark:bg-primary-950/20'
                      : 'border-gray-200 dark:border-gray-800'
                  }`}
                  onClick={() => conventionQty === 0 && setConventionQty(1)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <TicketIcon className="w-5 h-5 text-primary-600" />
                      <span className="font-bold text-sm">Convention</span>
                    </div>
                    <Badge variant={conventionQty > 0 ? 'default' : 'outline'}>
                      ₦{convPrice.toLocaleString()}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">General assembly & event entry</p>
                  <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 rounded-lg"
                      disabled={conventionQty <= 0}
                      onClick={() => setConventionQty((q) => Math.max(0, q - 1))}
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </Button>
                    <span className="font-bold w-6 text-center text-sm">{conventionQty}</span>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 rounded-lg"
                      onClick={() => setConventionQty((q) => q + 1)}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Dinner Ticket */}
                <div
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    dinnerQty > 0
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20'
                      : 'border-gray-200 dark:border-gray-800'
                  }`}
                  onClick={() => dinnerQty === 0 && setDinnerQty(1)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Utensils className="w-5 h-5 text-indigo-600" />
                      <span className="font-bold text-sm">Gala Dinner</span>
                    </div>
                    <Badge variant={dinnerQty > 0 ? 'default' : 'outline'} className={dinnerQty > 0 ? 'bg-indigo-600' : ''}>
                      ₦{dinPrice.toLocaleString()}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">Exclusive convention banquet</p>
                  <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 rounded-lg"
                      disabled={dinnerQty <= 0}
                      onClick={() => setDinnerQty((q) => Math.max(0, q - 1))}
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </Button>
                    <span className="font-bold w-6 text-center text-sm">{dinnerQty}</span>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 rounded-lg"
                      onClick={() => setDinnerQty((q) => q + 1)}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Brochure */}
                <div
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    brochureQty > 0
                      ? 'border-purple-600 bg-purple-50/50 dark:bg-purple-950/20'
                      : 'border-gray-200 dark:border-gray-800'
                  }`}
                  onClick={() => brochureQty === 0 && setBrochureQty(1)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <BookOpen className="w-5 h-5 text-purple-600" />
                      <span className="font-bold text-sm">Brochure</span>
                    </div>
                    <Badge variant={brochureQty > 0 ? 'default' : 'outline'} className={brochureQty > 0 ? 'bg-purple-600' : ''}>
                      ₦{brochPrice.toLocaleString()}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">Official commemorative book</p>
                  <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 rounded-lg"
                      disabled={brochureQty <= 0}
                      onClick={() => setBrochureQty((q) => Math.max(0, q - 1))}
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </Button>
                    <span className="font-bold w-6 text-center text-sm">{brochureQty}</span>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 rounded-lg"
                      onClick={() => setBrochureQty((q) => q + 1)}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Method & Total */}
            <div className="space-y-4 pt-2 border-t">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                3. Payment Details & Instant Check-In
              </h4>

              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center space-y-1 transition-all ${
                    paymentMethod === 'cash'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-700 dark:border-gray-700 dark:text-gray-300'
                  }`}
                >
                  <Banknote className="w-5 h-5 text-emerald-600" />
                  <span className="text-xs">Cash Received</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('pos')}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center space-y-1 transition-all ${
                    paymentMethod === 'pos'
                      ? 'border-blue-600 bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 font-bold'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-700 dark:border-gray-700 dark:text-gray-300'
                  }`}
                >
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  <span className="text-xs">POS Terminal</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('transfer')}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center space-y-1 transition-all ${
                    paymentMethod === 'transfer'
                      ? 'border-purple-600 bg-purple-50 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 font-bold'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-700 dark:border-gray-700 dark:text-gray-300'
                  }`}
                >
                  <Building2 className="w-5 h-5 text-purple-600" />
                  <span className="text-xs">Direct Transfer</span>
                </button>
              </div>

              {/* Instant Check-in Toggle */}
              <div
                className={`flex items-center justify-between p-3.5 rounded-xl border ${
                  !checkinActive
                    ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800'
                    : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-800'
                }`}
              >
                <div className="space-y-0.5 pr-2">
                  <div className="flex items-center space-x-2">
                    <Sparkles className={`w-4 h-4 ${!checkinActive ? 'text-amber-600' : 'text-emerald-600'}`} />
                    <Label htmlFor="checkin-toggle" className="text-sm font-bold text-gray-900 dark:text-gray-100 cursor-pointer">
                      Check-In Immediately & Generate Pass Code
                    </Label>
                    {!checkinActive && (
                      <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-800 border-amber-300 font-bold px-1.5 py-0">
                        Check-Ins Paused
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {!checkinActive
                      ? 'Check-ins are currently paused by administrator. Attendee will be registered with paid status, and can be checked in once check-ins are resumed.'
                      : 'Creates the 8-character check-in code and marks admission verified right away'}
                  </p>
                </div>
                <Switch
                  id="checkin-toggle"
                  checked={checkInImmediately && checkinActive}
                  disabled={!checkinActive}
                  onCheckedChange={setCheckInImmediately}
                />
              </div>

              {/* Total Summary Banner */}
              <div className="flex items-center justify-between p-4 bg-gray-900 text-white dark:bg-gray-950 rounded-2xl">
                <div>
                  <span className="text-xs uppercase text-gray-400 font-semibold">Total Amount Due</span>
                  <div className="text-2xl font-extrabold text-emerald-400">
                    ₦{totalAmount.toLocaleString()}
                  </div>
                </div>
                <div className="text-right text-xs text-gray-400">
                  <span>{conventionQty + dinnerQty + brochureQty} total item(s)</span>
                  <div className="text-gray-300 font-medium capitalize mt-0.5">
                    via {paymentMethod} payment
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleModalClose}
                disabled={loading}
                className="h-11 rounded-xl px-5"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || totalAmount <= 0}
                className="h-11 rounded-xl px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {checkInImmediately ? 'Register, Mark Paid & Check In' : 'Register & Mark Paid'}
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
