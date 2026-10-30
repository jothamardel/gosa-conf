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
import { Switch } from '@/components/ui/switch';
import {
  ArrowRight,
  Ticket as TicketIcon,
  Utensils,
  CreditCard,
  Banknote,
  Building2,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Loader2,
  User,
  Phone,
  Receipt,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { CONVENTION_PRICING } from '@/lib/constants/pricing';
import { playSuccessChime } from '@/lib/utils/audio-cue';

export interface UpgradeCandidateTicket {
  _id: string;
  type: string;
  paymentReference: string;
  amount: number;
  quantity: number;
  status: string;
  checkedIn?: boolean;
  checkInCode?: string | null;
  user: {
    _id?: string | null;
    fullName: string;
    phoneNumber: string;
    email?: string;
    checkInCode?: string | null;
    house?: string;
    year?: string;
  };
}

interface UpgradeTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: UpgradeCandidateTicket | null;
  onSuccess: (result: any) => void;
  checkinActive?: boolean;
  adminName?: string;
}

export function UpgradeTicketModal({
  isOpen,
  onClose,
  ticket,
  onSuccess,
  checkinActive = true,
  adminName = 'Desk Admin',
}: UpgradeTicketModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'pos' | 'waived'>('cash');
  const [paymentRef, setPaymentRef] = useState('');
  const [notes, setNotes] = useState('');
  const [checkInImmediately, setCheckInImmediately] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedData, setCompletedData] = useState<any | null>(null);

  // Reset state when modal opens with new ticket
  useEffect(() => {
    if (isOpen) {
      setPaymentMethod('cash');
      setPaymentRef('');
      setNotes('');
      setCheckInImmediately(false);
      setCompletedData(null);
    }
  }, [isOpen, ticket]);

  if (!ticket) return null;

  const convUnit = CONVENTION_PRICING.convention || 1000;
  const dinUnit = CONVENTION_PRICING.dinner || 2500;
  const qty = ticket.quantity || 1;
  const origAmount = convUnit * qty;
  const dinnerAmount = dinUnit * qty;
  const standardDifference = Math.max(0, dinnerAmount - origAmount);
  const totalDifference = paymentMethod === 'waived' ? 0 : standardDifference;

  const handleUpgrade = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/v1/admin/tickets/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketId: ticket._id,
          sourceTicketType: 'convention',
          targetTicketType: 'dinner',
          paymentMethod,
          paymentReference: paymentRef.trim() || undefined,
          notes: notes.trim() || undefined,
          checkInImmediately,
          officialName: adminName,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upgrade ticket');
      }

      playSuccessChime();
      setCompletedData(data);
      toast.success(data.message || 'Ticket successfully upgraded to Dinner Ticket!');
      onSuccess(data);
    } catch (err: any) {
      console.error('Upgrade ticket error:', err);
      toast.error(err.message || 'Failed to upgrade ticket. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="max-w-lg w-full p-0 overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl bg-white dark:bg-gray-900">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-primary-600 to-primary-700 p-5 text-white">
          <DialogHeader className="space-y-1 text-left">
            <div className="flex items-center space-x-2">
              <span className="p-1.5 bg-white/20 rounded-lg backdrop-blur-xs">
                <Utensils className="w-5 h-5 text-white" />
              </span>
              <DialogTitle className="text-xl font-bold tracking-tight text-white">
                Upgrade Ticket to Dinner
              </DialogTitle>
            </div>
            <DialogDescription className="text-indigo-100 text-xs sm:text-sm">
              Upgrade an existing Convention Pass to a Grand Dinner Ticket and record the price difference.
            </DialogDescription>
          </DialogHeader>
        </div>

        {completedData ? (
          /* Completion State */
          <div className="p-6 text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Ticket Upgraded Successfully!
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {ticket.user.fullName} now has a verified Grand Dinner Ticket ({qty} guest{qty > 1 ? 's' : ''}).
              </p>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 text-left space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Attendee:</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">{ticket.user.fullName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">New Dinner Ref:</span>
                <span className="font-mono font-bold text-primary-600 dark:text-primary-400">
                  {completedData.dinnerTicket?.paymentReference}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Difference Paid:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  ₦{completedData.differencePaid?.toLocaleString()} ({paymentMethod.toUpperCase()})
                </span>
              </div>
              {completedData.dinnerTicket?.checkInCode && (
                <div className="flex justify-between items-center pt-1 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-gray-500">Check-In Pass Code:</span>
                  <Badge className="font-mono bg-emerald-600 text-white font-bold">
                    {completedData.dinnerTicket.checkInCode}
                  </Badge>
                </div>
              )}
            </div>

            <Button
              onClick={onClose}
              className="w-full h-11 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl"
            >
              Done
            </Button>
          </div>
        ) : (
          /* Form Body */
          <div className="p-5 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
            {/* Attendee Info Snapshot */}
            <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <User className="w-3.5 h-3.5 text-gray-400" />
                  <span className="font-bold text-sm text-gray-900 dark:text-white">
                    {ticket.user.fullName}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                  <Phone className="w-3 h-3 text-gray-400" />
                  <span>{ticket.user.phoneNumber}</span>
                  {ticket.user.year && <span>• Class of {ticket.user.year}</span>}
                </div>
              </div>
              {(ticket.checkInCode || ticket.user.checkInCode) && (
                <Badge variant="outline" className="font-mono font-bold text-xs bg-white dark:bg-gray-900 border-primary-200 text-primary-700 dark:text-primary-300">
                  {ticket.checkInCode || ticket.user.checkInCode}
                </Badge>
              )}
            </div>

            {/* Upgrade Path Visualizer */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50/70 to-purple-50/50 dark:from-indigo-950/30 dark:to-purple-950/20 border border-indigo-100 dark:border-indigo-900/40">
              <div className="grid grid-cols-1 sm:grid-cols-7 gap-2 items-center text-center sm:text-left">
                {/* Source Ticket */}
                <div className="sm:col-span-3 p-3 bg-white dark:bg-gray-800/90 rounded-lg border border-gray-200 dark:border-gray-700 shadow-xs">
                  <div className="flex items-center space-x-2 mb-1">
                    <TicketIcon className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                    <span className="font-bold text-xs text-gray-900 dark:text-white">
                      Current Ticket
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-300">
                    Convention Pass ({qty}x)
                  </div>
                  <div className="text-xs font-semibold text-gray-500">
                    ₦{origAmount.toLocaleString()}
                  </div>
                  <div className="text-[10px] font-mono text-gray-400 truncate mt-1">
                    Ref: {ticket.paymentReference}
                  </div>
                </div>

                {/* Arrow */}
                <div className="sm:col-span-1 flex justify-center py-1 sm:py-0">
                  <div className="p-2 bg-indigo-600 text-white rounded-full shadow-md">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>

                {/* Target Ticket */}
                <div className="sm:col-span-3 p-3 bg-white dark:bg-gray-800/90 rounded-lg border border-indigo-200 dark:border-indigo-800 shadow-xs">
                  <div className="flex items-center space-x-2 mb-1">
                    <Utensils className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="font-bold text-xs text-gray-900 dark:text-white">
                      Upgraded Ticket
                    </span>
                  </div>
                  <div className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                    Dinner Ticket ({qty}x)
                  </div>
                  <div className="text-xs font-semibold text-gray-500">
                    ₦{dinnerAmount.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-1 font-medium">
                    Grand Dinner Access
                  </div>
                </div>
              </div>

              {/* Price Calculation Summary */}
              <div className="mt-3 pt-3 border-t border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between text-xs sm:text-sm">
                <span className="text-gray-600 dark:text-gray-300 font-medium">
                  Additional Amount Due:
                </span>
                <span className="font-black text-base sm:text-lg text-emerald-600 dark:text-emerald-400">
                  ₦{totalDifference.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Payment Collection Method
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'cash', label: 'Cash', icon: Banknote },
                  { id: 'transfer', label: 'Transfer', icon: Building2 },
                  { id: 'pos', label: 'POS', icon: CreditCard },
                  { id: 'waived', label: 'Waived', icon: Sparkles },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = paymentMethod === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setPaymentMethod(item.id as any)}
                      className={`p-3 rounded-xl border text-center flex flex-col items-center justify-center space-y-1.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 dark:border-indigo-500 dark:bg-indigo-950/60 dark:text-indigo-200 ring-2 ring-indigo-500/20 shadow-xs'
                          : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'}`} />
                      <span className="text-xs font-bold">{item.label}</span>
                    </button>
                  );
                })}
              </div>
              {paymentMethod === 'waived' && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center space-x-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Complimentary / Waived: Total difference recorded will be ₦0.</span>
                </p>
              )}
            </div>

            {/* Optional Reference & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="paymentRef" className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center space-x-1">
                  <Receipt className="w-3.5 h-3.5 text-gray-400" />
                  <span>Payment Ref / Teller (Optional)</span>
                </Label>
                <Input
                  id="paymentRef"
                  placeholder="e.g. POS-9842 or Transfer ref"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="h-9 text-xs rounded-lg"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes" className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center space-x-1">
                  <FileText className="w-3.5 h-3.5 text-gray-400" />
                  <span>Admin Note (Optional)</span>
                </Label>
                <Input
                  id="notes"
                  placeholder="e.g. Requested dinner upgrade at desk"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-9 text-xs rounded-lg"
                />
              </div>
            </div>

            {/* Check-In Option */}
            <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="checkInToggle" className="text-xs font-bold text-gray-900 dark:text-gray-200 cursor-pointer">
                  Check-in to Dinner Hall Now
                </Label>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  {checkinActive
                    ? 'Immediately mark the attendee as admitted to the Dinner event.'
                    : 'Check-ins are currently paused from the admin top bar.'}
                </p>
              </div>
              <Switch
                id="checkInToggle"
                checked={checkInImmediately}
                onCheckedChange={setCheckInImmediately}
                disabled={!checkinActive}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
                className="w-1/3 h-11 rounded-xl text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleUpgrade}
                disabled={isSubmitting}
                className="w-2/3 h-11 bg-gradient-to-r from-indigo-600 to-primary-600 hover:from-indigo-700 hover:to-primary-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md flex items-center justify-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Upgrade...</span>
                  </>
                ) : (
                  <>
                    <Utensils className="w-4 h-4" />
                    <span>Confirm Upgrade (₦{totalDifference.toLocaleString()})</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
