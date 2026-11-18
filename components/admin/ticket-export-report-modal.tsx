'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Download,
  FileSpreadsheet,
  FileText,
  BarChart3,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Clock,
  Wallet,
  Users,
  Filter,
  Calendar,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { toast } from 'sonner';
import type {
  TicketCategory,
  SaleStatusFilter,
  ChannelFilter,
  CheckInFilter,
  TicketReportSummary,
  NormalizedTicketRecord,
} from '@/lib/services/ticket-report.service';
import { downloadTicketReportPdf } from '@/lib/utils/ticket-report-pdf';

interface TicketExportReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: 'report' | 'download';
}

const CATEGORY_OPTIONS: Array<{ id: TicketCategory; label: string }> = [
  { id: 'convention', label: 'Convention' },
  { id: 'dinner', label: 'Dinner' },
  { id: 'brochure', label: 'Brochure' },
  { id: 'accommodation', label: 'Accommodation' },
  { id: 'goodwill', label: 'Goodwill' },
  { id: 'donation', label: 'Donations' },
];

const CORE_TICKET_TYPES: TicketCategory[] = ['convention', 'dinner', 'brochure'];
const ALL_TYPES: TicketCategory[] = [
  'convention',
  'dinner',
  'brochure',
  'accommodation',
  'goodwill',
  'donation',
];

export function TicketExportReportModal({
  open,
  onOpenChange,
  initialTab = 'report',
}: TicketExportReportModalProps) {
  const [activeTab, setActiveTab] = useState<'report' | 'download'>(initialTab);

  // Filters
  const [selectedTypes, setSelectedTypes] = useState<TicketCategory[]>(ALL_TYPES);
  const [saleStatus, setSaleStatus] = useState<SaleStatusFilter>('all');
  const [channel, setChannel] = useState<ChannelFilter>('all');
  const [checkInStatus, setCheckInStatus] = useState<CheckInFilter>('all');
  const [allTime, setAllTime] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Report Data
  const [loadingReport, setLoadingReport] = useState(false);
  const [summary, setSummary] = useState<TicketReportSummary | null>(null);
  const [recordsPreview, setRecordsPreview] = useState<NormalizedTicketRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState<number>(0);

  // Export Loading
  const [downloadingFormat, setDownloadingFormat] = useState<'csv' | 'xlsx' | 'pdf' | null>(null);

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);

  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams();
    if (selectedTypes.length > 0 && selectedTypes.length < ALL_TYPES.length) {
      params.set('types', selectedTypes.join(','));
    } else if (selectedTypes.length === ALL_TYPES.length) {
      params.set('types', ALL_TYPES.join(','));
    }
    if (saleStatus !== 'all') params.set('saleStatus', saleStatus);
    if (channel !== 'all') params.set('channel', channel);
    if (checkInStatus !== 'all') params.set('checkInStatus', checkInStatus);
    if (allTime) params.set('allTime', 'true');
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    return params;
  }, [selectedTypes, saleStatus, channel, checkInStatus, allTime, startDate, endDate]);

  const fetchReport = useCallback(async () => {
    if (selectedTypes.length === 0) {
      toast.error('Please select at least one ticket or item category.');
      return;
    }
    try {
      setLoadingReport(true);
      const params = buildQueryParams();
      const res = await fetch(`/api/v1/admin/tickets/report?${params.toString()}`);
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'Failed to load report');
      }
      setSummary(json.data.summary);
      setRecordsPreview(json.data.recordsPreview || []);
      setTotalRecords(json.data.totalRecords || 0);
    } catch (err: any) {
      console.error('Report fetch error:', err);
      toast.error(err.message || 'Failed to generate report');
    } finally {
      setLoadingReport(false);
    }
  }, [buildQueryParams, selectedTypes.length]);

  useEffect(() => {
    if (open) {
      fetchReport();
    }
  }, [open, fetchReport]);

  const toggleCategory = (cat: TicketCategory) => {
    setSelectedTypes((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleDownloadFile = async (format: 'csv' | 'xlsx') => {
    if (selectedTypes.length === 0) {
      toast.error('Please select at least one category to export.');
      return;
    }
    try {
      setDownloadingFormat(format);
      const params = buildQueryParams();
      params.set('format', format);

      const res = await fetch(`/api/v1/admin/tickets/export?${params.toString()}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || `Export failed (${res.status})`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStamp = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `gosa-ticket-records-${dateStamp}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`Downloaded ${format.toUpperCase()} records (${totalRecords.toLocaleString()} rows)`);
    } catch (err: any) {
      console.error('Export error:', err);
      toast.error(err.message || 'Failed to download records');
    } finally {
      setDownloadingFormat(null);
    }
  };

  const handleDownloadPdf = () => {
    if (!summary) {
      toast.error('Report data is not loaded yet.');
      return;
    }
    try {
      setDownloadingFormat('pdf');
      downloadTicketReportPdf(summary);
      toast.success('PDF report downloaded');
    } catch (err: any) {
      console.error('PDF generation error:', err);
      toast.error(err.message || 'Failed to generate PDF report');
    } finally {
      setDownloadingFormat(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[92vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pr-6">
            <div>
              <DialogTitle className="text-xl sm:text-2xl font-extrabold flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-600" />
                <span>Ticket Records Export &amp; Reports</span>
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm mt-1">
                Download all sold &amp; created records (CSV / Excel) or generate an executive summary &amp; PDF report.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchReport}
                disabled={loadingReport}
                className="h-9 text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loadingReport ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Filter Panel */}
        <div className="bg-gray-50 dark:bg-gray-900/60 border rounded-xl p-3 sm:p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
              <Filter className="w-3.5 h-3.5" />
              <span>Scope &amp; Filters</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTypes(CORE_TICKET_TYPES)}
                className="h-7 px-2 text-[11px] font-semibold"
              >
                Tickets Only (3)
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTypes(ALL_TYPES)}
                className="h-7 px-2 text-[11px] font-semibold"
              >
                All Items (6)
              </Button>
            </div>
          </div>

          {/* Category Multi-select */}
          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_OPTIONS.map((cat) => {
              const active = selectedTypes.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                    active
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Dropdown / Select Filters + Date Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-1">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                Sale Status
              </label>
              <select
                value={saleStatus}
                onChange={(e) => setSaleStatus(e.target.value as SaleStatusFilter)}
                className="w-full h-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 text-xs font-medium"
              >
                <option value="all">All (Sold &amp; Created)</option>
                <option value="sold">Sold Only (Confirmed)</option>
                <option value="created">Created Only (Pending / Cancelled)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                Sales Channel
              </label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as ChannelFilter)}
                className="w-full h-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 text-xs font-medium"
              >
                <option value="all">All Channels</option>
                <option value="online">Online Payments</option>
                <option value="walkin">Walk-In Desk</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                Check-In / Verification
              </label>
              <select
                value={checkInStatus}
                onChange={(e) => setCheckInStatus(e.target.value as CheckInFilter)}
                className="w-full h-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 text-xs font-medium"
              >
                <option value="all">All Statuses</option>
                <option value="checkedIn">Checked In / Collected</option>
                <option value="pending">Not Checked In</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                Start Date {allTime ? '(All-Time)' : '(Default: 2026)'}
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                End Date
              </label>
              <div className="flex items-center gap-1.5">
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-9 text-xs flex-1"
                />
                <button
                  type="button"
                  onClick={() => {
                    setAllTime((prev) => !prev);
                    if (!allTime) {
                      setStartDate('');
                      setEndDate('');
                    }
                  }}
                  title="Toggle 2026 Session vs All-Time"
                  className={`h-9 px-2.5 rounded-lg border text-[11px] font-bold shrink-0 transition-colors ${
                    allTime
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  {allTime ? 'All-Time' : '2026'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Tabs: Report vs Download */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'report' | 'download')}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-3">
            <TabsList className="grid w-full sm:w-auto grid-cols-2">
              <TabsTrigger value="report" className="text-xs font-bold flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5" />
                <span>In-App Report &amp; PDF</span>
              </TabsTrigger>
              <TabsTrigger value="download" className="text-xs font-bold flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5" />
                <span>Download Records ({totalRecords.toLocaleString()})</span>
              </TabsTrigger>
            </TabsList>

            {/* Quick Action Export Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDownloadFile('csv')}
                disabled={downloadingFormat !== null || loadingReport}
                className="h-9 text-xs font-bold"
              >
                {downloadingFormat === 'csv' ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <FileText className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                )}
                CSV
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDownloadFile('xlsx')}
                disabled={downloadingFormat !== null || loadingReport}
                className="h-9 text-xs font-bold"
              >
                {downloadingFormat === 'xlsx' ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                )}
                Excel (.xlsx)
              </Button>
              <Button
                size="sm"
                onClick={handleDownloadPdf}
                disabled={downloadingFormat !== null || loadingReport || !summary}
                className="h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {downloadingFormat === 'pdf' ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                )}
                Download PDF Report
              </Button>
            </div>
          </div>

          {/* TAB 1: IN-APP REPORT */}
          <TabsContent value="report" className="space-y-5 pt-2">
            {loadingReport && !summary ? (
              <div className="py-16 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Aggregating ticket &amp; revenue report...</p>
              </div>
            ) : summary ? (
              <>
                {/* KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <Card className="rounded-xl">
                    <CardHeader className="p-3.5 pb-1 flex flex-row items-center justify-between space-y-0">
                      <CardTitle className="text-[11px] font-bold uppercase text-gray-500">
                        Sold vs Created
                      </CardTitle>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent className="p-3.5 pt-0">
                      <div className="text-xl font-black text-gray-900 dark:text-gray-100">
                        {summary.totals.totalSoldCount.toLocaleString()}
                        <span className="text-xs font-semibold text-gray-400 ml-1.5">
                          / {summary.totals.totalCreatedCount.toLocaleString()} created
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1">
                        {summary.totals.totalPendingCount} pending • {summary.totals.totalCancelledCount} cancelled
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="rounded-xl">
                    <CardHeader className="p-3.5 pb-1 flex flex-row items-center justify-between space-y-0">
                      <CardTitle className="text-[11px] font-bold uppercase text-gray-500">
                        Sold Revenue
                      </CardTitle>
                      <Wallet className="w-4 h-4 text-indigo-600" />
                    </CardHeader>
                    <CardContent className="p-3.5 pt-0">
                      <div className="text-xl font-black text-gray-900 dark:text-gray-100">
                        ₦{summary.totals.totalSoldRevenue.toLocaleString()}
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1">
                        Total created value: ₦{summary.totals.totalCreatedValue.toLocaleString()}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="rounded-xl">
                    <CardHeader className="p-3.5 pb-1 flex flex-row items-center justify-between space-y-0">
                      <CardTitle className="text-[11px] font-bold uppercase text-gray-500">
                        Check-In / Verified
                      </CardTitle>
                      <Users className="w-4 h-4 text-purple-600" />
                    </CardHeader>
                    <CardContent className="p-3.5 pt-0">
                      <div className="text-xl font-black text-gray-900 dark:text-gray-100">
                        {summary.totals.totalCheckedInCount.toLocaleString()}
                        <span className="text-xs font-bold text-emerald-600 ml-1.5">
                          ({summary.totals.checkInRate}%)
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1">
                        Of confirmed/sold records
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="rounded-xl">
                    <CardHeader className="p-3.5 pb-1 flex flex-row items-center justify-between space-y-0">
                      <CardTitle className="text-[11px] font-bold uppercase text-gray-500">
                        Channel Split
                      </CardTitle>
                      <Clock className="w-4 h-4 text-amber-600" />
                    </CardHeader>
                    <CardContent className="p-3.5 pt-0">
                      <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        Online: {summary.totals.onlineCount.toLocaleString()} (₦{summary.totals.onlineRevenue.toLocaleString()})
                      </div>
                      <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mt-1">
                        Walk-In: {summary.totals.walkinCount.toLocaleString()} (₦{summary.totals.walkinRevenue.toLocaleString()})
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card className="rounded-xl">
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm font-bold">
                        Sold vs Created by Category
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={summary.byCategory}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Bar dataKey="soldCount" name="Sold (Confirmed)" fill="#10b981" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="pendingCount" name="Pending (Created)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card className="rounded-xl">
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-indigo-600" />
                        <span>Daily Sales &amp; Creation Trend</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 h-64">
                      {summary.dailyTrend.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={summary.dailyTrend}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Area
                              type="monotone"
                              dataKey="createdCount"
                              name="Created"
                              stroke="#6366f1"
                              fill="#6366f1"
                              fillOpacity={0.18}
                            />
                            <Area
                              type="monotone"
                              dataKey="soldCount"
                              name="Sold"
                              stroke="#10b981"
                              fill="#10b981"
                              fillOpacity={0.35}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-xs text-gray-400">
                          No daily trend data for current filters
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Category Breakdown Table */}
                <Card className="rounded-xl">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-bold">Category Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b text-gray-500 uppercase">
                          <th className="py-2 pr-3">Category</th>
                          <th className="py-2 px-2 text-right">Created</th>
                          <th className="py-2 px-2 text-right">Sold</th>
                          <th className="py-2 px-2 text-right">Pending</th>
                          <th className="py-2 px-2 text-right">Cancelled</th>
                          <th className="py-2 px-2 text-right">Checked In</th>
                          <th className="py-2 px-2 text-right">Walk-In</th>
                          <th className="py-2 px-2 text-right">Online</th>
                          <th className="py-2 pl-2 text-right">Sold Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {summary.byCategory.map((c) => (
                          <tr key={c.category}>
                            <td className="py-2.5 pr-3 font-bold text-gray-900 dark:text-gray-100">
                              {c.label}
                            </td>
                            <td className="py-2.5 px-2 text-right">{c.createdCount.toLocaleString()}</td>
                            <td className="py-2.5 px-2 text-right font-semibold text-emerald-700 dark:text-emerald-400">
                              {c.soldCount.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-2 text-right text-amber-600">{c.pendingCount.toLocaleString()}</td>
                            <td className="py-2.5 px-2 text-right text-gray-500">{c.cancelledCount.toLocaleString()}</td>
                            <td className="py-2.5 px-2 text-right">
                              {c.checkedInCount.toLocaleString()} ({c.checkInRate}%)
                            </td>
                            <td className="py-2.5 px-2 text-right">{c.walkinCount.toLocaleString()}</td>
                            <td className="py-2.5 px-2 text-right">{c.onlineCount.toLocaleString()}</td>
                            <td className="py-2.5 pl-2 text-right font-bold">
                              ₦{c.soldRevenue.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </>
            ) : null}
          </TabsContent>

          {/* TAB 2: DOWNLOAD RECORDS */}
          <TabsContent value="download" className="space-y-4 pt-2">
            <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                  Ready to Export {totalRecords.toLocaleString()} Matching Records
                </h3>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                  Includes Attendee Name, Email, Phone, House, Year/Set, Payment Reference, Pass Code, Sale State, Channel, Amount, and Check-In timestamps.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <Button
                  onClick={() => handleDownloadFile('csv')}
                  disabled={downloadingFormat !== null || loadingReport}
                  variant="outline"
                  className="bg-white dark:bg-gray-900 font-bold text-xs h-10"
                >
                  {downloadingFormat === 'csv' ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4 mr-2 text-blue-600" />
                  )}
                  Download CSV (.csv)
                </Button>
                <Button
                  onClick={() => handleDownloadFile('xlsx')}
                  disabled={downloadingFormat !== null || loadingReport}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10"
                >
                  {downloadingFormat === 'xlsx' ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                  )}
                  Download Excel (.xlsx)
                </Button>
              </div>
            </div>

            {/* Records Preview Table */}
            <Card className="rounded-xl">
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold">
                  Records Preview (First {Math.min(25, recordsPreview.length)} of {totalRecords.toLocaleString()})
                </CardTitle>
                <Badge variant="secondary" className="text-[11px]">
                  Sorted newest first
                </Badge>
              </CardHeader>
              <CardContent className="p-4 pt-0 overflow-x-auto">
                {loadingReport ? (
                  <div className="py-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">Loading preview...</p>
                  </div>
                ) : recordsPreview.length === 0 ? (
                  <div className="py-12 text-center text-xs text-gray-500">
                    No records match the current filters.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b text-gray-500 uppercase">
                        <th className="py-2 pr-3">Category</th>
                        <th className="py-2 px-2">Attendee / Donor</th>
                        <th className="py-2 px-2">Reference</th>
                        <th className="py-2 px-2">Sale State</th>
                        <th className="py-2 px-2">Channel</th>
                        <th className="py-2 px-2 text-right">Amount</th>
                        <th className="py-2 pl-2">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {recordsPreview.slice(0, 25).map((r) => (
                        <tr key={`${r.category}-${r.id}`}>
                          <td className="py-2 pr-3 font-semibold">{r.categoryLabel}</td>
                          <td className="py-2 px-2">
                            <div className="font-medium text-gray-900 dark:text-gray-100">{r.attendeeName}</div>
                            <div className="text-[10px] text-gray-400">{r.attendeePhone || r.attendeeEmail || '—'}</div>
                          </td>
                          <td className="py-2 px-2 font-mono text-[11px]">{r.paymentReference}</td>
                          <td className="py-2 px-2">
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                r.saleState === 'Sold (Confirmed)'
                                  ? 'border-emerald-300 text-emerald-700 bg-emerald-50'
                                  : r.saleState === 'Cancelled'
                                  ? 'border-red-300 text-red-700 bg-red-50'
                                  : 'border-amber-300 text-amber-700 bg-amber-50'
                              }`}
                            >
                              {r.saleState}
                            </Badge>
                          </td>
                          <td className="py-2 px-2">{r.channel}</td>
                          <td className="py-2 px-2 text-right font-bold">₦{r.amount.toLocaleString()}</td>
                          <td className="py-2 pl-2 text-gray-500">
                            {new Date(r.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

