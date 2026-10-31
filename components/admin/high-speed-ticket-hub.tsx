'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  UserPlus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Ticket,
  Utensils,
  BookOpen,
  Users,
  Copy,
  ChevronRight,
  Sparkles,
  Phone,
  Mail,
  GraduationCap,
  Home,
  Check,
  CheckCheck,
  AlertCircle,
  QrCode,
  ArrowRight,
  Loader2,
  Calendar,
  Cloud,
  PauseCircle,
  PlayCircle,
  Database,
  Power,
  Megaphone,
  ArrowUpRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { WalkinRegistrationModal } from './walkin-registration-modal';
import { BroadcastModal } from './broadcast-modal';
import { UpgradeTicketModal, UpgradeCandidateTicket } from './upgrade-ticket-modal';
import { playSuccessChime, playAlreadyCheckedAlert } from '@/lib/utils/audio-cue';
import { useLocalTicketSync } from '@/lib/hooks/use-local-ticket-sync';
import { useAdminAuth } from '@/lib/hooks/useAdminAuth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface AnalyticsData {
  convention: {
    total: number;
    checkedIn: number;
    pending: number;
    checkInRate: number;
    revenue: number;
  };
  dinner: {
    total: number;
    checkedIn: number;
    pending: number;
    checkInRate: number;
    revenue: number;
  };
  brochure: {
    total: number;
    collected: number;
    pending: number;
    collectionRate: number;
    revenue: number;
  };
  walkins: {
    total: number;
    convention: number;
    dinner: number;
    brochure: number;
  };
  totalRevenue: number;
}

interface TicketItem {
  _id: string;
  type: string;
  paymentReference: string;
  checkInCode?: string | null;
  amount: number;
  quantity: number;
  brochureType?: string | null;
  guestDetails?: any[];
  status: string;
  checkedIn: boolean;
  checkedInAt?: string | null;
  collected?: boolean;
  collectedAt?: string | null;
  user: {
    _id?: string | null;
    fullName: string;
    email: string;
    phoneNumber: string;
    house?: string;
    year?: string;
    checkInCode?: string | null;
  };
  createdAt: string;
}

interface MatchedMember {
  _id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  house?: string;
  year?: string;
  checkInCode?: string | null;
  totalItems: number;
  allCheckedIn: boolean;
  hasUncheckedItems: boolean;
  tickets: {
    conventions: any[];
    dinners: any[];
    brochures: any[];
  };
}

export function HighSpeedTicketHub() {
  // Master Analytics State
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  // Tab State
  const [activeTab, setActiveTab] = useState<'convention' | 'dinner' | 'brochure'>('convention');
  const [tabStatus, setTabStatus] = useState<'all' | 'checkedIn' | 'notCheckedIn'>('all');
  const [tabTickets, setTabTickets] = useState<TicketItem[]>([]);
  const [tabLoading, setTabLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Sub-Second Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MatchedMember[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchExecutionMs, setSearchExecutionMs] = useState<number | null>(null);

  // Action Loading tracking (ticketId -> boolean)
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Walkin, Broadcast & Upgrade Modals
  const [isWalkinOpen, setIsWalkinOpen] = useState(false);
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [selectedUpgradeTicket, setSelectedUpgradeTicket] = useState<UpgradeCandidateTicket | null>(null);
  const { canBroadcast, adminName } = useAdminAuth();

  // Local Database Sync & Master Check-In Activation State
  const {
    checkinActive,
    isSyncing,
    cachedCount,
    syncNow,
    toggleCheckInStatus,
    searchLocal,
    updateMemberLocally,
  } = useLocalTicketSync();

  const [showToggleModal, setShowToggleModal] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // '/' to focus search (when not in an input)
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }

      // 'Escape' to clear search
      if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        setSearchQuery('');
        setDebouncedQuery('');
        setSearchResults([]);
      }

      // 'Alt+N' or 'Ctrl+N' to open walk-in registration
      if ((e.altKey || e.metaKey) && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        setIsWalkinOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 150ms Debounce for Sub-Second Search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 150);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load Analytics
  const fetchAnalytics = useCallback(async () => {
    try {
      setAnalyticsLoading(true);
      const res = await fetch('/api/v1/admin/tickets/overview');
      const json = await res.json();
      if (json.success) {
        setAnalytics(json.data);
      }
    } catch (err) {
      console.error('Failed to load ticket analytics:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  // Load Tab Tickets
  const fetchTabTickets = useCallback(async () => {
    try {
      setTabLoading(true);
      const params = new URLSearchParams({
        tab: activeTab,
        page: page.toString(),
        limit: '25',
        status: tabStatus,
      });

      const res = await fetch(`/api/v1/admin/tickets/list?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setTabTickets(json.items);
        setTotalPages(json.totalPages);
        setTotalItems(json.total);
      }
    } catch (err) {
      console.error('Failed to load tickets list:', err);
    } finally {
      setTabLoading(false);
    }
  }, [activeTab, page, tabStatus]);

  // Execute Zero-Latency Search (Local IndexedDB first <2ms + Cloud background verification)
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setSearchResults([]);
      setSearchExecutionMs(null);
      return;
    }

    let isCancelled = false;
    const runSearch = async () => {
      const startT = performance.now();
      setSearchLoading(true);

      // Step 1: In-browser IndexedDB instant search (0–2ms)
      try {
        const localMatches = await searchLocal(debouncedQuery);
        if (!isCancelled && localMatches.length > 0) {
          setSearchResults(localMatches as any);
          setSearchExecutionMs(Math.max(1, Math.round(performance.now() - startT)));
          setSearchLoading(false);

          // If exact code match in local DB, avoid unnecessary network spinner
          const queryUpper = debouncedQuery.toUpperCase().trim();
          if (localMatches[0].checkInCode?.toUpperCase() === queryUpper) {
            return;
          }
        }
      } catch (err) {
        console.warn('Local search fallback to network:', err);
      }

      // Step 2: Query cloud server for newest records / fallback
      try {
        const res = await fetch(`/api/v1/admin/tickets/fast-search?q=${encodeURIComponent(debouncedQuery)}`);
        const json = await res.json();
        if (!isCancelled && json.success && json.members) {
          setSearchResults((prev) => {
            if (prev.length > 0 && json.members.length === 0) return prev;
            return json.members;
          });
          setSearchExecutionMs(json.executionMs || Math.round(performance.now() - startT));
        }
      } catch (err) {
        console.error('Fast search network error:', err);
      } finally {
        if (!isCancelled) setSearchLoading(false);
      }
    };

    runSearch();
    return () => { isCancelled = true; };
  }, [debouncedQuery, searchLocal]);

  // Initial Data Fetch
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Refetch tab on tab/page/status change
  useEffect(() => {
    fetchTabTickets();
  }, [fetchTabTickets]);

  // Copy code helper
  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Check-In Code ${code} copied!`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // 1-Click Check-In All for a Member (Optimistic local IndexedDB + Cloud sync)
  const handleCheckInAll = async (member: MatchedMember) => {
    if (!checkinActive) {
      toast.error('Check-ins are currently paused. Please activate check-ins from the top bar.', {
        icon: <AlertCircle className="w-5 h-5 text-amber-500" />,
      });
      setShowToggleModal(true);
      return;
    }

    setActionLoading((prev) => ({ ...prev, [`all-${member._id}`]: true }));

    // 1. Optimistic Update (React state + IndexedDB immediately <1ms)
    const previousMemberState = { ...member };
    const optimisticCode = member.checkInCode || 'SYNCING...';

    const applyOptimistic = (m: MatchedMember) => ({
      ...m,
      allCheckedIn: true,
      hasUncheckedItems: false,
      tickets: {
        conventions: m.tickets.conventions.map((c) => ({ ...c, checkedIn: true, checkInCode: c.checkInCode || optimisticCode })),
        dinners: m.tickets.dinners.map((d) => ({ ...d, checkedIn: true, checkInCode: d.checkInCode || optimisticCode })),
        brochures: m.tickets.brochures.map((b) => ({ ...b, collected: true, checkedIn: true, checkInCode: b.checkInCode || optimisticCode })),
      },
    });

    setSearchResults((prev) => prev.map((m) => m._id === member._id ? applyOptimistic(m) : m));
    playSuccessChime();
    updateMemberLocally(member._id, applyOptimistic as any);

    try {
      const res = await fetch('/api/v1/admin/tickets/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check-in-all',
          userId: member._id,
          officialName: 'Check-In Desk Admin',
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success(`All tickets verified! Pass Code: ${json.checkInCode}`);

        // Confirm server checkInCode locally
        const confirmedApply = (m: MatchedMember) => ({
          ...m,
          checkInCode: json.checkInCode,
          allCheckedIn: true,
          hasUncheckedItems: false,
          tickets: {
            conventions: m.tickets.conventions.map((c) => ({ ...c, checkedIn: true, checkInCode: json.checkInCode })),
            dinners: m.tickets.dinners.map((d) => ({ ...d, checkedIn: true, checkInCode: json.checkInCode })),
            brochures: m.tickets.brochures.map((b) => ({ ...b, collected: true, checkedIn: true, checkInCode: json.checkInCode })),
          },
        });
        setSearchResults((prev) => prev.map((m) => m._id === member._id ? confirmedApply(m) : m));
        updateMemberLocally(member._id, confirmedApply as any);

        // Refresh analytics & tab in background
        fetchAnalytics();
        fetchTabTickets();
      } else {
        // Rollback on server failure
        setSearchResults((prev) => prev.map((m) => m._id === member._id ? previousMemberState : m));
        updateMemberLocally(member._id, () => previousMemberState as any);
        toast.error(json.error || 'Check-in failed');
      }
    } catch (err: any) {
      setSearchResults((prev) => prev.map((m) => m._id === member._id ? previousMemberState : m));
      updateMemberLocally(member._id, () => previousMemberState as any);
      toast.error('Check-in failed: ' + err.message);
    } finally {
      setActionLoading((prev) => ({ ...prev, [`all-${member._id}`]: false }));
    }
  };

  // Single Ticket Check-In / Check-Out Action
  const handleSingleTicketAction = async (
    ticketId: string,
    ticketType: string,
    action: 'check-in-single' | 'check-out-single' | 'collect-brochure',
    userId?: string
  ) => {
    if (action === 'check-in-single' && !checkinActive) {
      toast.error('Check-ins are currently paused. Please activate check-ins from the top bar.', {
        icon: <AlertCircle className="w-5 h-5 text-amber-500" />,
      });
      setShowToggleModal(true);
      return;
    }

    const loadingKey = `${action}-${ticketId}`;
    setActionLoading((prev) => ({ ...prev, [loadingKey]: true }));

    try {
      const res = await fetch('/api/v1/admin/tickets/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          ticketId,
          ticketType,
          officialName: 'Check-In Desk Admin',
        }),
      });

      const json = await res.json();
      if (json.success) {
        if (action !== 'check-out-single') {
          playSuccessChime();
          toast.success(action === 'collect-brochure' ? 'Brochure collected!' : `Checked in! Code: ${json.checkInCode || 'Assigned'}`);
        } else {
          toast.info('Check-in undone');
        }

        // Optimistically update tab list
        setTabTickets((prev) =>
          prev.map((t) => {
            if (t._id !== ticketId) return t;
            const isCheckIn = action !== 'check-out-single';
            return {
              ...t,
              checkedIn: isCheckIn,
              checkedInAt: isCheckIn ? new Date().toISOString() : null,
              collected: action === 'collect-brochure' || (isCheckIn && t.type === 'brochure'),
              collectedAt: isCheckIn ? new Date().toISOString() : null,
              checkInCode: json.checkInCode || t.checkInCode,
            };
          })
        );

        // Optimistically update search results if active
        if (userId) {
          setSearchResults((prev) =>
            prev.map((m) => {
              if (m._id !== userId) return m;
              const updateTicket = (t: any) =>
                t._id === ticketId
                  ? {
                      ...t,
                      checkedIn: action !== 'check-out-single',
                      collected: action === 'collect-brochure' ? true : action !== 'check-out-single' && t.type === 'brochure',
                      checkInCode: json.checkInCode || t.checkInCode || m.checkInCode,
                    }
                  : t;

              return {
                ...m,
                checkInCode: json.checkInCode || m.checkInCode,
                tickets: {
                  conventions: m.tickets.conventions.map(updateTicket),
                  dinners: m.tickets.dinners.map(updateTicket),
                  brochures: m.tickets.brochures.map(updateTicket),
                },
              };
            })
          );
        }

        // Refresh analytics in background
        fetchAnalytics();
      } else {
        toast.error(json.error || 'Action failed');
      }
    } catch (err: any) {
      toast.error('Action failed: ' + err.message);
    } finally {
      setActionLoading((prev) => ({ ...prev, [loadingKey]: false }));
    }
  };

  const handleGenerateCode = async (member: MatchedMember) => {
    const loadingKey = `code-${member._id}`;
    setActionLoading((prev) => ({ ...prev, [loadingKey]: true }));
    try {
      const res = await fetch('/api/v1/admin/tickets/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-code',
          userId: member._id,
        }),
      });
      const json = await res.json();
      if (json.success && json.checkInCode) {
        toast.success(`Pass code generated: ${json.checkInCode}`);
        setSearchResults((prev) =>
          prev.map((m) => (m._id === member._id ? { ...m, checkInCode: json.checkInCode } : m))
        );
      } else {
        toast.error(json.error || 'Failed to generate pass code');
      }
    } catch (err: any) {
      toast.error('Failed to generate pass code: ' + err.message);
    } finally {
      setActionLoading((prev) => ({ ...prev, [loadingKey]: false }));
    }
  };

  const handleWalkinSuccess = () => {
    fetchAnalytics();
    fetchTabTickets();
  };

  const handleOpenUpgradeModal = (ticket: any, memberOrUser: any) => {
    const user = {
      _id: memberOrUser._id || memberOrUser.id || ticket.user?._id || null,
      fullName: memberOrUser.fullName || ticket.user?.fullName || 'Attendee',
      phoneNumber: memberOrUser.phoneNumber || ticket.user?.phoneNumber || '—',
      email: memberOrUser.email || ticket.user?.email || '—',
      checkInCode: memberOrUser.checkInCode || ticket.user?.checkInCode || ticket.checkInCode || null,
      house: memberOrUser.house || ticket.user?.house,
      year: memberOrUser.year || ticket.user?.year,
    };

    setSelectedUpgradeTicket({
      _id: ticket._id,
      type: 'convention',
      paymentReference: ticket.paymentReference,
      amount: ticket.amount,
      quantity: ticket.quantity || 1,
      status: ticket.status || 'confirmed',
      checkedIn: ticket.checkedIn,
      checkInCode: ticket.checkInCode || user.checkInCode,
      user,
    });
    setIsUpgradeOpen(true);
  };

  const handleUpgradeSuccess = async () => {
    fetchAnalytics();
    fetchTabTickets();
    if (debouncedQuery && debouncedQuery.length >= 2) {
      try {
        const res = await fetch(`/api/v1/admin/tickets/fast-search?q=${encodeURIComponent(debouncedQuery)}`);
        const json = await res.json();
        if (json.success && json.members) {
          setSearchResults(json.members);
        }
      } catch (e) {
        console.error('Failed to refresh search results:', e);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Desk Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-gray-900 p-6 rounded-2xl border shadow-sm">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
              GOSA 2026 Ticket & Check-In Desk
            </h1>
            <Badge className="bg-primary-600 text-white font-bold text-xs px-2 sm:px-2.5 py-0.5 rounded-full">
              2026 Session
            </Badge>
            {/* Master Check-In Activation Switch */}
            <button
              type="button"
              onClick={() => setShowToggleModal(true)}
              className={`flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border transition-all shadow-sm ${
                checkinActive
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 cursor-pointer'
                  : 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700 hover:bg-amber-100 animate-pulse cursor-pointer'
              }`}
              title="Click to activate or pause check-ins"
            >
              {checkinActive ? (
                <>
                  <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-[11px] sm:text-xs font-bold tracking-tight">Check-Ins: ACTIVE</span>
                </>
              ) : (
                <>
                  <PauseCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span className="text-[11px] sm:text-xs font-bold tracking-tight">Check-Ins: PAUSED</span>
                </>
              )}
              <span className="text-[10px] uppercase font-bold opacity-75 underline ml-0.5">
                Toggle
              </span>
            </button>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Scoped to GOSA 2026: Sub-second member verification, 1-click check-ins, and walk-in cash/POS registrations
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">
          {/* Local IndexedDB Cloud Sync Status Pill */}
          <button
            type="button"
            onClick={() => {
              syncNow(true);
              toast.info('Synchronizing cloud database to local IndexedDB...');
            }}
            disabled={isSyncing}
            title="Local IndexedDB database cache status. Click to force full sync with cloud."
            className="flex items-center justify-center space-x-1.5 text-xs px-2.5 sm:px-3 py-2 rounded-xl border bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition h-10 sm:h-11"
          >
            <Cloud className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-primary-600' : 'text-gray-400'}`} />
            <span className="font-semibold text-[11px] sm:text-xs">
              {isSyncing ? 'Syncing...' : `${cachedCount.toLocaleString()} local`}
            </span>
          </button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchAnalytics();
              fetchTabTickets();
              syncNow(false);
              toast.info('Refreshed desk data');
            }}
            disabled={analyticsLoading || tabLoading}
            className="rounded-xl h-10 sm:h-11 px-3 sm:px-4 text-xs text-gray-600 hover:text-gray-900 justify-center"
          >
            <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 ${analyticsLoading || tabLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          {canBroadcast && (
            <Button
              onClick={() => setIsBroadcastOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-10 sm:h-11 px-3 sm:px-4 text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-1.5"
            >
              <Megaphone className="w-3.5 h-3.5 mr-1" />
              <span className="hidden sm:inline">Broadcast Campaign</span>
              <span className="sm:hidden">Broadcast</span>
            </Button>
          )}

          <Button
            onClick={() => setIsWalkinOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-10 sm:h-11 px-3 sm:px-5 text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-1.5"
          >
            <UserPlus className="w-3.5 h-3.5 sm:w-5 sm:h-5 mr-1" />
            <span className="hidden sm:inline">Register Walk-In (+ Paid)</span>
            <span className="sm:hidden">Walk-In</span>
            <kbd className="hidden md:inline-block ml-2 px-1.5 py-0.5 text-[10px] bg-emerald-700/60 text-white rounded font-mono">
              Alt+N
            </kbd>
          </Button>
        </div>
      </div>

      {/* Analytics Summary Row: 3 Ticket Types + Walk-Ins */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Convention Tickets Card */}
        <Card className="rounded-xl sm:rounded-2xl border shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between p-3 sm:p-5 pb-1 sm:pb-2 space-y-0">
            <CardTitle className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-500">
              Convention
            </CardTitle>
            <div className="p-1.5 sm:p-2 bg-primary-50 text-primary-600 dark:bg-primary-950 dark:text-primary-400 rounded-lg">
              <Ticket className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-5 pt-0">
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
              <div className="text-lg sm:text-2xl font-black text-gray-900 dark:text-gray-100">
                {analytics?.convention.total.toLocaleString() ?? '—'}
              </div>
              <Badge variant="outline" className="font-semibold text-[10px] sm:text-xs text-emerald-700 bg-emerald-50 dark:bg-emerald-950 border-emerald-200 self-start sm:self-auto px-1.5 py-0.5">
                {analytics?.convention.checkedIn.toLocaleString() ?? 0} In
              </Badge>
            </div>
            {/* Progress Bar */}
            <div className="mt-2 sm:mt-3">
              <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 sm:h-2 overflow-hidden">
                <div
                  className="bg-primary-600 h-1.5 sm:h-2 rounded-full transition-all duration-500"
                  style={{ width: `${analytics?.convention.checkInRate ?? 0}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] sm:text-[11px] text-gray-500 mt-1 sm:mt-1.5 font-medium">
                <span>{analytics?.convention.pending.toLocaleString() ?? 0} Pend</span>
                <span className="font-bold text-gray-700 dark:text-gray-300">{analytics?.convention.checkInRate ?? 0}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dinner Tickets Card */}
        <Card className="rounded-xl sm:rounded-2xl border shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between p-3 sm:p-5 pb-1 sm:pb-2 space-y-0">
            <CardTitle className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-500">
              Gala Dinner
            </CardTitle>
            <div className="p-1.5 sm:p-2 bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 rounded-lg">
              <Utensils className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-5 pt-0">
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
              <div className="text-lg sm:text-2xl font-black text-gray-900 dark:text-gray-100">
                {analytics?.dinner.total.toLocaleString() ?? '—'}
              </div>
              <Badge variant="outline" className="font-semibold text-[10px] sm:text-xs text-indigo-700 bg-indigo-50 dark:bg-indigo-950 border-indigo-200 self-start sm:self-auto px-1.5 py-0.5">
                {analytics?.dinner.checkedIn.toLocaleString() ?? 0} In
              </Badge>
            </div>
            {/* Progress Bar */}
            <div className="mt-2 sm:mt-3">
              <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 sm:h-2 overflow-hidden">
                <div
                  className="bg-indigo-600 h-1.5 sm:h-2 rounded-full transition-all duration-500"
                  style={{ width: `${analytics?.dinner.checkInRate ?? 0}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] sm:text-[11px] text-gray-500 mt-1 sm:mt-1.5 font-medium">
                <span>{analytics?.dinner.pending.toLocaleString() ?? 0} Pend</span>
                <span className="font-bold text-gray-700 dark:text-gray-300">{analytics?.dinner.checkInRate ?? 0}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Brochures Card */}
        <Card className="rounded-xl sm:rounded-2xl border shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between p-3 sm:p-5 pb-1 sm:pb-2 space-y-0">
            <CardTitle className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-500">
              Brochures
            </CardTitle>
            <div className="p-1.5 sm:p-2 bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400 rounded-lg">
              <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-5 pt-0">
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
              <div className="text-lg sm:text-2xl font-black text-gray-900 dark:text-gray-100">
                {analytics?.brochure.total.toLocaleString() ?? '—'}
              </div>
              <Badge variant="outline" className="font-semibold text-[10px] sm:text-xs text-purple-700 bg-purple-50 dark:bg-purple-950 border-purple-200 self-start sm:self-auto px-1.5 py-0.5">
                {analytics?.brochure.collected.toLocaleString() ?? 0} Picked
              </Badge>
            </div>
            {/* Progress Bar */}
            <div className="mt-2 sm:mt-3">
              <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 sm:h-2 overflow-hidden">
                <div
                  className="bg-purple-600 h-1.5 sm:h-2 rounded-full transition-all duration-500"
                  style={{ width: `${analytics?.brochure.collectionRate ?? 0}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] sm:text-[11px] text-gray-500 mt-1 sm:mt-1.5 font-medium">
                <span>{analytics?.brochure.pending.toLocaleString() ?? 0} Pend</span>
                <span className="font-bold text-gray-700 dark:text-gray-300">{analytics?.brochure.collectionRate ?? 0}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Walk-in Registrations Card */}
        <Card className="rounded-xl sm:rounded-2xl border shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-emerald-50/50 to-white dark:from-emerald-950/20 dark:to-gray-900">
          <CardHeader className="flex flex-row items-center justify-between p-3 sm:p-5 pb-1 sm:pb-2 space-y-0">
            <CardTitle className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              Walk-Ins
            </CardTitle>
            <div className="p-1.5 sm:p-2 bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 rounded-lg">
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-5 pt-0">
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
              <div className="text-lg sm:text-2xl font-black text-emerald-900 dark:text-emerald-100">
                {analytics?.walkins.total.toLocaleString() ?? '0'}
              </div>
              <span className="text-[10px] sm:text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                Paid
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-gray-500 mt-2 sm:mt-3 font-medium line-clamp-1">
              Conv: <strong>{analytics?.walkins.convention ?? 0}</strong> • Din: <strong>{analytics?.walkins.dinner ?? 0}</strong> • Bro: <strong>{analytics?.walkins.brochure ?? 0}</strong>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Check-ins Paused Warning Banner */}
      {!checkinActive && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-800 rounded-2xl text-amber-900 dark:text-amber-200 shadow-sm gap-3 animate-pulse">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0" />
            <div>
              <div className="font-extrabold text-sm sm:text-base">
                Check-Ins are Currently DEACTIVATED (PAUSED)
              </div>
              <div className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                Admin check-in confirmations and 1-click badge verification buttons are temporarily blocked on this desk. Member searches and pass retrievals remain functional.
              </div>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setShowToggleModal(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-9 px-4 rounded-xl shadow self-start sm:self-auto flex-shrink-0"
          >
            Activate Check-Ins
          </Button>
        </div>
      )}

      {/* Sub-Second Lightning Search Bar */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="absolute left-4 w-5 h-5 text-gray-400 pointer-events-none" />
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="Lightning Search (2026): Member Name, Phone (0803...), Email, Ref, or Pass Code (RT34-UU6T)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-14 pl-12 pr-28 text-base bg-white dark:bg-gray-900 rounded-2xl border-2 border-gray-200 focus:border-primary-600 shadow-sm transition-all"
          />
          <div className="absolute right-3.5 flex items-center space-x-2">
            {searchLoading ? (
              <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />
            ) : searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setDebouncedQuery('');
                  setSearchResults([]);
                  searchInputRef.current?.focus();
                }}
                className="text-xs px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors font-semibold"
              >
                Clear
              </button>
            ) : (
              <kbd className="hidden sm:inline-block px-2 py-1 text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 rounded font-mono border">
                Press /
              </kbd>
            )}
          </div>
        </div>

        {/* Search Speed Meter */}
        {searchExecutionMs !== null && debouncedQuery && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-2 px-1 text-xs text-gray-500 gap-1">
            <span>
              Found <strong>{searchResults.length}</strong> matching member(s) for &ldquo;{debouncedQuery}&rdquo;
            </span>
            <span className="flex items-center text-emerald-600 dark:text-emerald-400 font-medium">
              <Sparkles className="w-3.5 h-3.5 mr-1" />
              Retrieved in {searchExecutionMs}ms (&lt; 1 second)
            </span>
          </div>
        )}
      </div>

      {/* SEARCH RESULTS VIEW (When searching) */}
      {debouncedQuery.length >= 2 && (
        <div className="space-y-4">
          {searchResults.length === 0 && !searchLoading ? (
            <Card className="p-8 text-center rounded-2xl border bg-white dark:bg-gray-900">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-3">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                No Member Found Matching &ldquo;{debouncedQuery}&rdquo;
              </h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto mt-1 mb-4">
                Verify the spelling or phone number. If this is a walk-in attendee, register them on-site and mark them paid.
              </p>
              <Button
                onClick={() => setIsWalkinOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-5 font-bold"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Register &ldquo;{debouncedQuery}&rdquo; as Walk-In
              </Button>
            </Card>
          ) : (
            searchResults.map((member) => (
              <Card
                key={member._id}
                className="rounded-2xl border-2 border-primary-500/30 bg-white dark:bg-gray-900 shadow-md overflow-hidden transition-all"
              >
                {/* Member Header Card */}
                <div className="p-4 sm:p-6 bg-gradient-to-r from-primary-50/40 via-white to-secondary-50/30 dark:from-primary-950/20 dark:via-gray-900 dark:to-secondary-950/20 border-b flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="text-xl font-black text-gray-900 dark:text-gray-100">
                        {member.fullName}
                      </h3>

                      {/* Persistent 8-character Check-In Code Badge */}
                      {member.checkInCode ? (
                        <div className="flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-300 dark:bg-emerald-950/60 dark:border-emerald-700">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 dark:text-emerald-300">
                            Pass Code:
                          </span>
                          <span className="font-mono font-extrabold text-sm text-emerald-800 dark:text-emerald-200 tracking-wider">
                            {member.checkInCode}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyCode(member.checkInCode!)}
                            className="p-1 text-emerald-600 hover:text-emerald-800 rounded transition-colors"
                            title="Copy Check-In Code"
                          >
                            {copiedCode === member.checkInCode ? (
                              <Check className="w-3.5 h-3.5 text-emerald-700" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1.5">
                          <Badge variant="outline" className="border-slate-300 text-slate-600 bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:bg-slate-900 text-[10px] font-semibold">
                            Pass Code: Not Generated
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGenerateCode(member)}
                            disabled={actionLoading[`code-${member._id}`]}
                            className="h-6 px-2 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 cursor-pointer"
                          >
                            {actionLoading[`code-${member._id}`] ? (
                              <Loader2 className="w-3 h-3 animate-spin mr-1" />
                            ) : (
                              <Sparkles className="w-3 h-3 mr-1" />
                            )}
                            Generate Code
                          </Button>
                        </div>
                      )}

                      {member.allCheckedIn && (
                        <Badge className="bg-emerald-600 text-white font-semibold">
                          <CheckCheck className="w-3.5 h-3.5 mr-1" />
                          All Items Verified
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
                      <span className="flex items-center font-medium">
                        <Phone className="w-3.5 h-3.5 mr-1 text-gray-400" />
                        {member.phoneNumber}
                      </span>
                      {member.email && member.email !== '—' && (
                        <span className="flex items-center">
                          <Mail className="w-3.5 h-3.5 mr-1 text-gray-400" />
                          {member.email}
                        </span>
                      )}
                      {member.house && member.house !== '—' && (
                        <span className="flex items-center">
                          <Home className="w-3.5 h-3.5 mr-1 text-gray-400" />
                          House: <strong className="ml-1 text-gray-700 dark:text-gray-300">{member.house}</strong>
                        </span>
                      )}
                      {member.year && member.year !== '—' && (
                        <span className="flex items-center">
                          <GraduationCap className="w-3.5 h-3.5 mr-1 text-gray-400" />
                          Set: <strong className="ml-1 text-gray-700 dark:text-gray-300">{member.year}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 1-Click Check In All Button */}
                  <div>
                    {member.hasUncheckedItems ? (
                      <Button
                        size="lg"
                        onClick={() => handleCheckInAll(member)}
                        disabled={actionLoading[`all-${member._id}`]}
                        className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl px-6 h-12 shadow-lg hover:shadow-xl transition-all flex items-center space-x-2"
                      >
                        {actionLoading[`all-${member._id}`] ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                            Checking In All...
                          </>
                        ) : (
                          <>
                            <CheckCheck className="w-5 h-5 mr-2" />
                            <span>1-Click Check In All ({member.totalItems} Items)</span>
                          </>
                        )}
                      </Button>
                    ) : (
                      <div className="flex items-center space-x-2.5 text-emerald-700 dark:text-emerald-400 font-bold text-sm bg-emerald-50 dark:bg-emerald-950/40 px-4 py-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <div>
                          <span className="block leading-tight">Member Checked In &amp; Verified</span>
                          <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 font-medium block mt-0.5">
                            All ticket items for this delegate have been verified at desk
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Member Ticket Breakdown Items */}
                <div className="p-4 sm:p-6 divide-y divide-gray-100 dark:divide-gray-800">
                  {/* Conventions */}
                  {member.tickets.conventions.map((c) => (
                    <div key={c._id} className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-300 rounded-lg">
                          <Ticket className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-sm text-gray-900 dark:text-gray-100">
                              Convention Ticket ({c.quantity} person)
                            </span>
                            <span className="font-mono text-xs text-gray-400">
                              • Ref: {c.paymentReference}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            ₦{c.amount.toLocaleString()} • {c.checkedIn ? `Checked in ${c.checkedInAt ? new Date(c.checkedInAt).toLocaleTimeString() : ''}` : 'Not checked in yet'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end space-x-2 w-full sm:w-auto">
                        {c.status === 'upgraded' ? (
                          <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200 font-bold">
                            Upgraded to Dinner
                          </Badge>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenUpgradeModal(c, member)}
                              className="text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800 h-9 px-3 flex items-center space-x-1"
                            >
                              <ArrowUpRight className="w-3.5 h-3.5" />
                              <span>Upgrade to Dinner</span>
                            </Button>
                            {c.checkedIn ? (
                              <>
                                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200">
                                  Checked In
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleSingleTicketAction(c._id, 'convention', 'check-out-single', member._id)}
                                  disabled={actionLoading[`check-out-single-${c._id}`]}
                                  className="text-xs text-gray-400 hover:text-red-600 h-8 px-2.5"
                                >
                                  Undo
                                </Button>
                              </>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => handleSingleTicketAction(c._id, 'convention', 'check-in-single', member._id)}
                                disabled={actionLoading[`check-in-single-${c._id}`] || !checkinActive}
                                className="w-full sm:w-auto bg-primary-600 hover:bg-primary-700 text-white rounded-lg h-10 sm:h-9 px-4 font-bold flex items-center justify-center"
                              >
                                {actionLoading[`check-in-single-${c._id}`] ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  'Check In'
                                )}
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Dinners */}
                  {member.tickets.dinners.map((d) => (
                    <div key={d._id} className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 rounded-lg">
                          <Utensils className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-sm text-gray-900 dark:text-gray-100">
                              Gala Dinner Ticket ({d.quantity} Guest{d.quantity > 1 ? 's' : ''})
                            </span>
                            <span className="font-mono text-xs text-gray-400">
                              • Ref: {d.paymentReference}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            ₦{d.amount.toLocaleString()} • {d.checkedIn ? `Checked in ${d.checkedInAt ? new Date(d.checkedInAt).toLocaleTimeString() : ''}` : 'Not checked in yet'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end space-x-2 w-full sm:w-auto">
                        {d.checkedIn ? (
                          <>
                            <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200">
                              Checked In
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSingleTicketAction(d._id, 'dinner', 'check-out-single', member._id)}
                              disabled={actionLoading[`check-out-single-${d._id}`]}
                              className="text-xs text-gray-400 hover:text-red-600 h-8 px-2.5"
                            >
                              Undo
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleSingleTicketAction(d._id, 'dinner', 'check-in-single', member._id)}
                            disabled={actionLoading[`check-in-single-${d._id}`] || !checkinActive}
                            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg h-10 sm:h-9 px-4 font-bold flex items-center justify-center"
                          >
                            {actionLoading[`check-in-single-${d._id}`] ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              'Check In Dinner'
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Brochures */}
                  {member.tickets.brochures.map((b) => (
                    <div key={b._id} className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 rounded-lg">
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-sm text-gray-900 dark:text-gray-100">
                              Convention Brochure ({b.quantity} copy, {b.brochureType})
                            </span>
                            <span className="font-mono text-xs text-gray-400">
                              • Ref: {b.paymentReference}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            ₦{b.amount.toLocaleString()} • {b.collected ? `Collected ${b.collectedAt ? new Date(b.collectedAt).toLocaleTimeString() : ''}` : 'Pending Pickup'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end space-x-2 w-full sm:w-auto">
                        {b.collected ? (
                          <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200">
                            Collected
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleSingleTicketAction(b._id, 'brochure', 'collect-brochure', member._id)}
                            disabled={actionLoading[`collect-brochure-${b._id}`]}
                            className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white rounded-lg h-10 sm:h-9 px-4 font-bold flex items-center justify-center"
                          >
                            {actionLoading[`collect-brochure-${b._id}`] ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              'Mark Collected'
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* 3 MASTER TABS: Convention Tickets, Dinner Tickets, Brochures */}
      {(!debouncedQuery || debouncedQuery.length < 2) && (
        <Card className="rounded-2xl border shadow-sm bg-white dark:bg-gray-900">
          <Tabs
            value={activeTab}
            onValueChange={(val) => {
              setActiveTab(val as any);
              setPage(1);
            }}
            className="w-full"
          >
            {/* Tab Navigation & Status Filter Bar */}
            <div className="p-3 sm:p-6 border-b flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4">
              <TabsList className="bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-full grid grid-cols-3 sm:inline-flex sm:w-auto h-auto">
                <TabsTrigger
                  value="convention"
                  className="rounded-lg py-2 sm:py-2.5 px-1.5 sm:px-4 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center justify-center space-x-1 sm:space-x-2"
                >
                  <Ticket className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary-600 shrink-0" />
                  <span className="text-xs truncate">Convention</span>
                  <Badge variant="secondary" className="ml-1 text-[10px] sm:text-xs px-1 sm:px-1.5 py-0 shrink-0">
                    {analytics?.convention.total.toLocaleString() ?? 0}
                  </Badge>
                </TabsTrigger>

                <TabsTrigger
                  value="dinner"
                  className="rounded-lg py-2 sm:py-2.5 px-1.5 sm:px-4 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center justify-center space-x-1 sm:space-x-2"
                >
                  <Utensils className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600 shrink-0" />
                  <span className="text-xs truncate">Dinner</span>
                  <Badge variant="secondary" className="ml-1 text-[10px] sm:text-xs px-1 sm:px-1.5 py-0 shrink-0">
                    {analytics?.dinner.total.toLocaleString() ?? 0}
                  </Badge>
                </TabsTrigger>

                <TabsTrigger
                  value="brochure"
                  className="rounded-lg py-2 sm:py-2.5 px-1.5 sm:px-4 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center justify-center space-x-1 sm:space-x-2"
                >
                  <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 shrink-0" />
                  <span className="text-xs truncate">Brochures</span>
                  <Badge variant="secondary" className="ml-1 text-[10px] sm:text-xs px-1 sm:px-1.5 py-0 shrink-0">
                    {analytics?.brochure.total.toLocaleString() ?? 0}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              {/* Status Filter Toggle */}
              <div className="flex items-center space-x-2 w-full md:w-auto justify-between sm:justify-start">
                <span className="text-xs text-gray-500 font-medium shrink-0">Filter:</span>
                <div className="inline-flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1 w-full sm:w-auto justify-between sm:justify-start">
                  <button
                    type="button"
                    onClick={() => { setTabStatus('all'); setPage(1); }}
                    className={`flex-1 sm:flex-initial text-center px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      tabStatus === 'all'
                        ? 'bg-white dark:bg-gray-900 shadow-sm text-gray-900 dark:text-gray-100'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => { setTabStatus('checkedIn'); setPage(1); }}
                    className={`flex-1 sm:flex-initial text-center px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      tabStatus === 'checkedIn'
                        ? 'bg-white dark:bg-gray-900 shadow-sm text-emerald-700'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    <span className="hidden sm:inline">Checked In / Collected</span>
                    <span className="sm:hidden">Checked In</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setTabStatus('notCheckedIn'); setPage(1); }}
                    className={`flex-1 sm:flex-initial text-center px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      tabStatus === 'notCheckedIn'
                        ? 'bg-white dark:bg-gray-900 shadow-sm text-amber-700'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    Pending
                  </button>
                </div>
              </div>
            </div>

            {/* Common Tab Table Content */}
            <div className="p-3 sm:p-6">
              {tabLoading ? (
                <div className="py-16 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Loading tickets...</p>
                </div>
              ) : tabTickets.length === 0 ? (
                <div className="py-16 text-center text-gray-500">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-base font-semibold">No tickets found in this tab / filter</p>
                  <p className="text-xs text-gray-400 mt-1">Try switching status filter to &ldquo;All&rdquo; or register a walk-in member.</p>
                </div>
              ) : (
                <>
                  {/* Desktop / Tablet High-Density Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b text-xs font-bold text-gray-500 uppercase tracking-wider">
                          <th className="pb-3 pl-2">Pass Code</th>
                          <th className="pb-3">Attendee</th>
                          <th className="pb-3">Reference</th>
                          <th className="pb-3">Qty / Amount</th>
                          <th className="pb-3">Status</th>
                          <th className="pb-3 text-right pr-2">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {tabTickets.map((t) => {
                          const isVerified = activeTab === 'brochure' ? Boolean(t.collected || t.checkedIn) : Boolean(t.checkedIn);
                          const code = t.checkInCode || t.user.checkInCode;

                          return (
                            <tr key={t._id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors">
                              {/* Check-In Code Badge */}
                              <td className="py-4 pl-2 font-mono">
                                {code ? (
                                  <button
                                    type="button"
                                    onClick={() => copyCode(code)}
                                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800 font-extrabold text-xs tracking-wider hover:bg-emerald-100 transition-colors"
                                    title="Click to copy code"
                                  >
                                    <span>{code}</span>
                                    {copiedCode === code ? (
                                      <Check className="w-3 h-3 text-emerald-700" />
                                    ) : (
                                      <Copy className="w-3 h-3 text-emerald-500 opacity-60" />
                                    )}
                                  </button>
                                ) : (
                                  <span className="text-xs text-gray-400 font-mono">—</span>
                                )}
                              </td>

                              {/* Attendee Info */}
                              <td className="py-4">
                                <div className="font-bold text-gray-900 dark:text-gray-100">
                                  {t.user.fullName}
                                </div>
                                <div className="text-xs text-gray-500 flex items-center space-x-2 mt-0.5">
                                  <span>{t.user.phoneNumber}</span>
                                  {t.user.year && t.user.year !== '—' && (
                                    <span>• Set {t.user.year}</span>
                                  )}
                                </div>
                              </td>

                              {/* Reference */}
                              <td className="py-4 font-mono text-xs text-gray-600 dark:text-gray-300">
                                <div>{t.paymentReference}</div>
                                <div className="text-[11px] text-gray-400 mt-0.5">
                                  {new Date(t.createdAt).toLocaleDateString()}
                                </div>
                              </td>

                              {/* Quantity & Amount */}
                              <td className="py-4">
                                <div className="font-bold text-gray-900 dark:text-gray-100">
                                  ₦{t.amount.toLocaleString()}
                                </div>
                                <div className="text-xs text-gray-500">
                                  Qty: {t.quantity} {activeTab === 'dinner' ? 'Guest(s)' : activeTab === 'brochure' ? `(${t.brochureType})` : 'Pass'}
                                </div>
                              </td>

                              {/* Status */}
                              <td className="py-4">
                                {t.status === 'upgraded' ? (
                                  <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200 font-semibold">
                                    Upgraded
                                  </Badge>
                                ) : isVerified ? (
                                  <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 font-semibold">
                                    <Check className="w-3 h-3 mr-1" />
                                    {activeTab === 'brochure' ? 'Collected' : 'Checked In'}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/40">
                                    Pending
                                  </Badge>
                                )}
                                {t.checkedInAt && (
                                  <div className="text-[11px] text-gray-400 mt-0.5">
                                    {new Date(t.checkedInAt).toLocaleTimeString()}
                                  </div>
                                )}
                              </td>

                              {/* Action Button */}
                              <td className="py-4 text-right pr-2">
                                {t.status === 'upgraded' ? (
                                  <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200 font-bold">
                                    Upgraded to Dinner
                                  </Badge>
                                ) : (
                                  <div className="flex items-center justify-end space-x-2">
                                    {activeTab === 'convention' && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleOpenUpgradeModal(t, t.user)}
                                        className="h-9 px-3 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800 rounded-xl flex items-center space-x-1"
                                      >
                                        <ArrowUpRight className="w-3.5 h-3.5" />
                                        <span>Upgrade</span>
                                      </Button>
                                    )}
                                    {isVerified ? (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleSingleTicketAction(t._id, activeTab, 'check-out-single', t.user._id || undefined)}
                                        disabled={actionLoading[`check-out-single-${t._id}`]}
                                        className="h-9 px-3 text-xs text-gray-500 hover:text-red-600 hover:border-red-200 rounded-xl"
                                      >
                                        {actionLoading[`check-out-single-${t._id}`] ? (
                                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                          'Undo Check-In'
                                        )}
                                      </Button>
                                    ) : (
                                      <Button
                                        size="sm"
                                        onClick={() =>
                                          handleSingleTicketAction(
                                            t._id,
                                            activeTab,
                                            activeTab === 'brochure' ? 'collect-brochure' : 'check-in-single',
                                            t.user._id || undefined
                                          )
                                        }
                                        disabled={
                                          actionLoading[`check-in-single-${t._id}`] ||
                                          actionLoading[`collect-brochure-${t._id}`]
                                        }
                                        className="h-9 px-4 text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white rounded-xl shadow-sm"
                                      >
                                        {actionLoading[`check-in-single-${t._id}`] ||
                                        actionLoading[`collect-brochure-${t._id}`] ? (
                                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : activeTab === 'brochure' ? (
                                          'Collect'
                                        ) : (
                                          'Check In'
                                        )}
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Touch-First Attendee Cards */}
                  <div className="block md:hidden space-y-3">
                    {tabTickets.map((t) => {
                      const isVerified = activeTab === 'brochure' ? Boolean(t.collected || t.checkedIn) : Boolean(t.checkedIn);
                      const code = t.checkInCode || t.user.checkInCode;

                      return (
                        <div
                          key={t._id}
                          className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 space-y-2.5 shadow-xs"
                        >
                          {/* Row 1: Attendee Name + Pass Code */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate">
                                {t.user.fullName}
                              </div>
                              <div className="text-xs text-gray-500 flex items-center space-x-1.5 mt-0.5">
                                <span>{t.user.phoneNumber}</span>
                                {t.user.year && t.user.year !== '—' && (
                                  <span>• Set {t.user.year}</span>
                                )}
                              </div>
                            </div>

                            {code ? (
                              <button
                                type="button"
                                onClick={() => copyCode(code)}
                                className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800 font-extrabold text-[11px] font-mono tracking-wider shrink-0"
                                title="Tap to copy"
                              >
                                <span>{code}</span>
                                {copiedCode === code ? (
                                  <Check className="w-3 h-3 text-emerald-700" />
                                ) : (
                                  <Copy className="w-3 h-3 text-emerald-500 opacity-60" />
                                )}
                              </button>
                            ) : (
                              <span className="text-[11px] text-gray-400 font-mono shrink-0">No Pass Code</span>
                            )}
                          </div>

                          {/* Row 2: Details Pill (Reference & Quantity / Amount) */}
                          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300 py-1.5 px-2.5 rounded-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                            <div className="font-mono text-[11px] text-gray-500 truncate max-w-[140px]">
                              Ref: {t.paymentReference}
                            </div>
                            <div className="font-bold text-right shrink-0">
                              <span>₦{t.amount.toLocaleString()}</span>
                              <span className="text-gray-400 font-normal ml-1">
                                ({t.quantity} {activeTab === 'dinner' ? 'Guest' : activeTab === 'brochure' ? `(${t.brochureType})` : 'Pass'})
                              </span>
                            </div>
                          </div>

                          {/* Row 3: Status & Full-Width 1-Thumb Action */}
                          <div className="flex items-center justify-between gap-2 pt-0.5">
                            <div>
                              {t.status === 'upgraded' ? (
                                <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200 font-semibold text-[11px] px-2 py-0.5">
                                  Upgraded
                                </Badge>
                              ) : isVerified ? (
                                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 font-semibold text-[11px] px-2 py-0.5">
                                  <Check className="w-3 h-3 mr-1" />
                                  {activeTab === 'brochure' ? 'Collected' : 'Checked In'}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/40 text-[11px] px-2 py-0.5">
                                  Pending
                                </Badge>
                              )}
                              {t.checkedInAt && (
                                <div className="text-[10px] text-gray-400 mt-0.5">
                                  {new Date(t.checkedInAt).toLocaleTimeString()}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center space-x-1.5">
                              {t.status === 'upgraded' ? (
                                <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200 font-bold text-xs py-1 px-2.5">
                                  Upgraded to Dinner
                                </Badge>
                              ) : (
                                <>
                                  {activeTab === 'convention' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleOpenUpgradeModal(t, t.user)}
                                      className="h-8 px-2.5 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 rounded-xl flex items-center space-x-1"
                                    >
                                      <ArrowUpRight className="w-3.5 h-3.5" />
                                      <span>Upgrade</span>
                                    </Button>
                                  )}
                                  {isVerified ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleSingleTicketAction(t._id, activeTab, 'check-out-single', t.user._id || undefined)}
                                      disabled={actionLoading[`check-out-single-${t._id}`]}
                                      className="h-8 px-3 text-xs text-gray-500 hover:text-red-600 rounded-xl"
                                    >
                                      {actionLoading[`check-out-single-${t._id}`] ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      ) : (
                                        'Undo'
                                      )}
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      onClick={() =>
                                        handleSingleTicketAction(
                                          t._id,
                                          activeTab,
                                          activeTab === 'brochure' ? 'collect-brochure' : 'check-in-single',
                                          t.user._id || undefined
                                        )
                                      }
                                      disabled={
                                        actionLoading[`check-in-single-${t._id}`] ||
                                        actionLoading[`collect-brochure-${t._id}`]
                                      }
                                      className="h-8 px-3 text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white rounded-xl shadow-sm"
                                    >
                                      {actionLoading[`check-in-single-${t._id}`] ||
                                      actionLoading[`collect-brochure-${t._id}`] ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      ) : activeTab === 'brochure' ? (
                                        'Collect'
                                      ) : (
                                        'Check In'
                                      )}
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Pagination Row */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 sm:pt-6 border-t mt-4 text-xs sm:text-sm text-gray-500">
                  <div className="text-center sm:text-left">
                    Showing <strong>{(page - 1) * 25 + 1}</strong> to <strong>{Math.min(page * 25, totalItems)}</strong> of <strong>{totalItems}</strong> tickets
                  </div>
                  <div className="flex items-center space-x-2 w-full sm:w-auto justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1 || tabLoading}
                      className="rounded-xl px-3 h-8 sm:h-9"
                    >
                      Previous
                    </Button>
                    <span className="text-xs font-bold px-2">
                      {page} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages || tabLoading}
                      className="rounded-xl px-3 h-8 sm:h-9"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Tabs>
        </Card>
      )}

      {/* Walkin Registration Modal */}
      <WalkinRegistrationModal
        isOpen={isWalkinOpen}
        onClose={() => setIsWalkinOpen(false)}
        onSuccess={handleWalkinSuccess}
        initialQuery={debouncedQuery}
        checkinActive={checkinActive}
      />

      {/* Upgrade Ticket to Dinner Modal */}
      <UpgradeTicketModal
        isOpen={isUpgradeOpen}
        onClose={() => {
          setIsUpgradeOpen(false);
          setSelectedUpgradeTicket(null);
        }}
        ticket={selectedUpgradeTicket}
        onSuccess={handleUpgradeSuccess}
        checkinActive={checkinActive}
        adminName={adminName}
      />

      {/* Broadcast Campaign & Ticket Sales Drive Modal */}
      <BroadcastModal
        isOpen={isBroadcastOpen}
        onClose={() => setIsBroadcastOpen(false)}
      />

      {/* Check-In Activation / Deactivation Confirmation Dialog */}
      <AlertDialog open={showToggleModal} onOpenChange={setShowToggleModal}>
        <AlertDialogContent className="rounded-2xl w-[92vw] max-w-md p-5 sm:p-6 bg-white dark:bg-gray-900 border">
          <AlertDialogHeader>
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-2 mx-auto sm:mx-0 border"
              style={{
                backgroundColor: checkinActive ? '#FEF3C7' : '#D1FAE5',
                borderColor: checkinActive ? '#FCD34D' : '#6EE7B7',
              }}
            >
              {checkinActive ? (
                <PauseCircle className="w-6 h-6 text-amber-600" />
              ) : (
                <PlayCircle className="w-6 h-6 text-emerald-600" />
              )}
            </div>
            <AlertDialogTitle className="text-xl font-black">
              {checkinActive ? 'Pause Attendee Check-Ins?' : 'Activate Attendee Check-Ins?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-600 dark:text-gray-400">
              {checkinActive
                ? 'Deactivating check-ins will temporarily block all check-in confirmations and 1-click badge verifications across all admin desks. Members can still receive their codes via WhatsApp and admins can still search records.'
                : 'Activating check-ins will enable all desk officials to immediately verify codes, confirm 1-click attendee check-ins, and issue admission badges.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
            <AlertDialogCancel
              disabled={toggleLoading}
              className="w-full sm:w-auto rounded-xl h-11 px-4"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={toggleLoading}
              onClick={async (e) => {
                e.preventDefault();
                setToggleLoading(true);
                try {
                  const newStatus = await toggleCheckInStatus(!checkinActive);
                  toast.success(
                    newStatus
                      ? 'Check-Ins are now ACTIVE across all desks!'
                      : 'Check-Ins have been PAUSED across all desks.'
                  );
                  setShowToggleModal(false);
                } catch (err: any) {
                  toast.error('Failed to change status: ' + err.message);
                } finally {
                  setToggleLoading(false);
                }
              }}
              className={`w-full sm:w-auto rounded-xl h-11 px-5 font-bold text-white shadow-md transition flex items-center justify-center ${
                checkinActive
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {toggleLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {checkinActive ? 'Confirm Pause Check-Ins' : 'Confirm Activate Check-Ins'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
