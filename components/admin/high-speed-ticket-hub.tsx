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
} from 'lucide-react';
import { toast } from 'sonner';
import { WalkinRegistrationModal } from './walkin-registration-modal';
import { playSuccessChime, playAlreadyCheckedAlert } from '@/lib/utils/audio-cue';

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

  // Walkin Modal
  const [isWalkinOpen, setIsWalkinOpen] = useState(false);

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

  // Execute Sub-Second Search
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setSearchResults([]);
      setSearchExecutionMs(null);
      return;
    }

    let isCancelled = false;
    const runSearch = async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/v1/admin/tickets/fast-search?q=${encodeURIComponent(debouncedQuery)}`);
        const json = await res.json();
        if (!isCancelled && json.success) {
          setSearchResults(json.members || []);
          setSearchExecutionMs(json.executionMs || null);
        }
      } catch (err) {
        console.error('Fast search error:', err);
      } finally {
        if (!isCancelled) setSearchLoading(false);
      }
    };

    runSearch();
    return () => { isCancelled = true; };
  }, [debouncedQuery]);

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

  // 1-Click Check-In All for a Member
  const handleCheckInAll = async (member: MatchedMember) => {
    setActionLoading((prev) => ({ ...prev, [`all-${member._id}`]: true }));
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
        playSuccessChime();
        toast.success(`All tickets verified! Pass Code: ${json.checkInCode}`);

        // Update local search results optimistically
        setSearchResults((prev) =>
          prev.map((m) => {
            if (m._id !== member._id) return m;
            return {
              ...m,
              checkInCode: json.checkInCode,
              allCheckedIn: true,
              hasUncheckedItems: false,
              tickets: {
                conventions: m.tickets.conventions.map((c) => ({ ...c, checkedIn: true, checkInCode: json.checkInCode })),
                dinners: m.tickets.dinners.map((d) => ({ ...d, checkedIn: true, checkInCode: json.checkInCode })),
                brochures: m.tickets.brochures.map((b) => ({ ...b, collected: true, checkedIn: true, checkInCode: json.checkInCode })),
              },
            };
          })
        );

        // Refresh analytics & tab in background
        fetchAnalytics();
        fetchTabTickets();
      } else {
        toast.error(json.error || 'Check-in failed');
      }
    } catch (err: any) {
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

  const handleWalkinSuccess = () => {
    fetchAnalytics();
    fetchTabTickets();
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
            <Badge className="bg-primary-600 text-white font-bold text-xs px-2.5 py-0.5 rounded-full">
              2026 Session
            </Badge>
            <span className="flex items-center text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
              Live
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Scoped to GOSA 2026: Sub-second member verification, 1-click check-ins, and walk-in cash/POS registrations
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchAnalytics();
              fetchTabTickets();
              toast.info('Refreshed desk data');
            }}
            disabled={analyticsLoading || tabLoading}
            className="rounded-xl h-11 px-4 text-gray-600 hover:text-gray-900"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${analyticsLoading || tabLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            onClick={() => setIsWalkinOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-11 px-5 font-bold shadow-md hover:shadow-lg transition-all flex items-center space-x-2"
          >
            <UserPlus className="w-5 h-5 mr-1.5" />
            <span>Register Walk-In Member (+ Mark Paid)</span>
            <kbd className="hidden md:inline-block ml-2 px-1.5 py-0.5 text-[10px] bg-emerald-700/60 text-white rounded font-mono">
              Alt+N
            </kbd>
          </Button>
        </div>
      </div>

      {/* Analytics Summary Row: 3 Ticket Types + Walk-Ins */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Convention Tickets Card */}
        <Card className="rounded-2xl border shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Convention Tickets
            </CardTitle>
            <div className="p-2 bg-primary-50 text-primary-600 dark:bg-primary-950 dark:text-primary-400 rounded-lg">
              <Ticket className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-black text-gray-900 dark:text-gray-100">
                {analytics?.convention.total.toLocaleString() ?? '—'}
              </div>
              <Badge variant="outline" className="font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950 border-emerald-200">
                {analytics?.convention.checkedIn.toLocaleString() ?? 0} Checked In
              </Badge>
            </div>
            {/* Progress Bar */}
            <div className="mt-3">
              <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${analytics?.convention.checkInRate ?? 0}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-gray-500 mt-1.5 font-medium">
                <span>{analytics?.convention.pending.toLocaleString() ?? 0} Pending</span>
                <span className="font-bold text-gray-700 dark:text-gray-300">{analytics?.convention.checkInRate ?? 0}% Checked In</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dinner Tickets Card */}
        <Card className="rounded-2xl border shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Dinner Tickets
            </CardTitle>
            <div className="p-2 bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 rounded-lg">
              <Utensils className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-black text-gray-900 dark:text-gray-100">
                {analytics?.dinner.total.toLocaleString() ?? '—'}
              </div>
              <Badge variant="outline" className="font-semibold text-indigo-700 bg-indigo-50 dark:bg-indigo-950 border-indigo-200">
                {analytics?.dinner.checkedIn.toLocaleString() ?? 0} Checked In
              </Badge>
            </div>
            {/* Progress Bar */}
            <div className="mt-3">
              <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${analytics?.dinner.checkInRate ?? 0}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-gray-500 mt-1.5 font-medium">
                <span>{analytics?.dinner.pending.toLocaleString() ?? 0} Pending</span>
                <span className="font-bold text-gray-700 dark:text-gray-300">{analytics?.dinner.checkInRate ?? 0}% Checked In</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Brochures Card */}
        <Card className="rounded-2xl border shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Convention Brochures
            </CardTitle>
            <div className="p-2 bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400 rounded-lg">
              <BookOpen className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-black text-gray-900 dark:text-gray-100">
                {analytics?.brochure.total.toLocaleString() ?? '—'}
              </div>
              <Badge variant="outline" className="font-semibold text-purple-700 bg-purple-50 dark:bg-purple-950 border-purple-200">
                {analytics?.brochure.collected.toLocaleString() ?? 0} Collected
              </Badge>
            </div>
            {/* Progress Bar */}
            <div className="mt-3">
              <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${analytics?.brochure.collectionRate ?? 0}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-gray-500 mt-1.5 font-medium">
                <span>{analytics?.brochure.pending.toLocaleString() ?? 0} Pending</span>
                <span className="font-bold text-gray-700 dark:text-gray-300">{analytics?.brochure.collectionRate ?? 0}% Collected</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Walk-in Registrations Card */}
        <Card className="rounded-2xl border shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-emerald-50/50 to-white dark:from-emerald-950/20 dark:to-gray-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              Desk Walk-Ins (On-Site)
            </CardTitle>
            <div className="p-2 bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 rounded-lg">
              <Users className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-black text-emerald-900 dark:text-emerald-100">
                {analytics?.walkins.total.toLocaleString() ?? '0'}
              </div>
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                Marked Paid
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-3 font-medium">
              Conv: <strong>{analytics?.walkins.convention ?? 0}</strong> • Dinner: <strong>{analytics?.walkins.dinner ?? 0}</strong> • Broch: <strong>{analytics?.walkins.brochure ?? 0}</strong>
            </p>
          </CardContent>
        </Card>
      </div>

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
          <div className="flex items-center justify-between mt-2 px-1 text-xs text-gray-500">
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
                <div className="p-6 bg-gradient-to-r from-primary-50/40 via-white to-secondary-50/30 dark:from-primary-950/20 dark:via-gray-900 dark:to-secondary-950/20 border-b flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
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
                        <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/40">
                          Pass Code: Pending Check-In
                        </Badge>
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
                      <div className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm bg-emerald-50 dark:bg-emerald-950/40 px-4 py-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-5 h-5" />
                        <span>Member Checked In & Verified</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Member Ticket Breakdown Items */}
                <div className="p-6 divide-y divide-gray-100 dark:divide-gray-800">
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

                      <div className="flex items-center space-x-2">
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
                            disabled={actionLoading[`check-in-single-${c._id}`]}
                            className="bg-primary-600 hover:bg-primary-700 text-white rounded-lg h-9 px-4 font-bold"
                          >
                            {actionLoading[`check-in-single-${c._id}`] ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              'Check In'
                            )}
                          </Button>
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

                      <div className="flex items-center space-x-2">
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
                            disabled={actionLoading[`check-in-single-${d._id}`]}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg h-9 px-4 font-bold"
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

                      <div className="flex items-center space-x-2">
                        {b.collected ? (
                          <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200">
                            Collected
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleSingleTicketAction(b._id, 'brochure', 'collect-brochure', member._id)}
                            disabled={actionLoading[`collect-brochure-${b._id}`]}
                            className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg h-9 px-4 font-bold"
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
            <div className="p-4 sm:p-6 border-b flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <TabsList className="bg-gray-100 dark:bg-gray-800 p-1 rounded-xl h-auto flex flex-wrap">
                <TabsTrigger
                  value="convention"
                  className="rounded-lg py-2.5 px-4 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center space-x-2"
                >
                  <Ticket className="w-4 h-4 text-primary-600" />
                  <span>Convention Tickets</span>
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {analytics?.convention.total.toLocaleString() ?? 0}
                  </Badge>
                </TabsTrigger>

                <TabsTrigger
                  value="dinner"
                  className="rounded-lg py-2.5 px-4 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center space-x-2"
                >
                  <Utensils className="w-4 h-4 text-indigo-600" />
                  <span>Dinner Tickets</span>
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {analytics?.dinner.total.toLocaleString() ?? 0}
                  </Badge>
                </TabsTrigger>

                <TabsTrigger
                  value="brochure"
                  className="rounded-lg py-2.5 px-4 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center space-x-2"
                >
                  <BookOpen className="w-4 h-4 text-purple-600" />
                  <span>Brochures</span>
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {analytics?.brochure.total.toLocaleString() ?? 0}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              {/* Status Filter Toggle */}
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500 font-medium">Filter:</span>
                <div className="inline-flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1">
                  <button
                    type="button"
                    onClick={() => { setTabStatus('all'); setPage(1); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
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
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      tabStatus === 'checkedIn'
                        ? 'bg-white dark:bg-gray-900 shadow-sm text-emerald-700'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    Checked In / Collected
                  </button>
                  <button
                    type="button"
                    onClick={() => { setTabStatus('notCheckedIn'); setPage(1); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
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
            <div className="p-4 sm:p-6">
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
                <div className="overflow-x-auto">
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
                              {isVerified ? (
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
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination Row */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-6 border-t mt-4 text-sm text-gray-500">
                  <div>
                    Showing <strong>{(page - 1) * 25 + 1}</strong> to <strong>{Math.min(page * 25, totalItems)}</strong> of <strong>{totalItems}</strong> tickets
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1 || tabLoading}
                      className="rounded-xl px-3"
                    >
                      Previous
                    </Button>
                    <span className="text-xs font-bold px-2">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages || tabLoading}
                      className="rounded-xl px-3"
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
      />
    </div>
  );
}
