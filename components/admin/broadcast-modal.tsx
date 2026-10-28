'use client';

import { useState, useEffect, useRef } from 'react';
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
  Megaphone,
  ShieldCheck,
  Users,
  Send,
  Play,
  Pause,
  XCircle,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Smartphone,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Info,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  BROADCAST_TEMPLATES,
  personalizeMessage,
  resolveSpintax,
} from '@/lib/utils/broadcast-spintax';
import { BroadcastAudienceFilter } from '@/lib/schema';

interface BroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BroadcastModal({ isOpen, onClose }: BroadcastModalProps) {
  // Navigation tabs: 'compose' | 'active-campaign'
  const [activeTab, setActiveTab] = useState<'compose' | 'active-campaign'>('compose');

  // Compose State
  const [campaignTitle, setCampaignTitle] = useState('GOSA 2026 Ticket Fast-Track Reminder');
  const [selectedFilter, setSelectedFilter] = useState<BroadcastAudienceFilter>('no-tickets');
  const [templateText, setTemplateText] = useState(BROADCAST_TEMPLATES.FAST_TRACK_PASS.template);
  const [selectedPresetId, setSelectedPresetId] = useState('fast-track-pass');

  // Audience preview state
  const [audienceLoading, setAudienceLoading] = useState(false);
  const [audienceData, setAudienceData] = useState<{
    total: number;
    sample: any[];
    estimatedDurationMinutes: { min: number; max: number };
  } | null>(null);
  const [showSampleRecipients, setShowSampleRecipients] = useState(false);

  // Live WhatsApp Preview state
  const [previewRecipientIndex, setPreviewRecipientIndex] = useState(0);
  const [previewKey, setPreviewKey] = useState(0);

  // Test send state
  const [testPhoneNumber, setTestPhoneNumber] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Active Campaign Monitoring State
  const [activeCampaign, setActiveCampaign] = useState<any>(null);
  const [campaignActionLoading, setCampaignActionLoading] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch Audience whenever filter changes
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function loadAudience() {
      setAudienceLoading(true);
      try {
        const res = await fetch(`/api/v1/admin/broadcast/audience?filter=${selectedFilter}`);
        const json = await res.json();
        if (json.success && isMounted) {
          setAudienceData(json.data);
        }
      } catch (err) {
        console.error('Failed to load audience preview:', err);
      } finally {
        if (isMounted) setAudienceLoading(false);
      }
    }

    loadAudience();
    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedFilter]);

  // Check for existing running or paused campaigns on open
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function checkExistingCampaign() {
      try {
        const res = await fetch('/api/v1/admin/broadcast/campaigns');
        const json = await res.json();
        if (json.success && isMounted && json.data?.activeCampaign) {
          setActiveCampaign(json.data.activeCampaign);
          setActiveTab('active-campaign');
        }
      } catch (err) {
        console.error('Failed to check active campaigns:', err);
      }
    }

    checkExistingCampaign();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Polling active campaign progress when running
  useEffect(() => {
    if (!isOpen || activeTab !== 'active-campaign' || !activeCampaign?._id) {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      return;
    }

    const campaignId = activeCampaign._id;

    async function pollStatus() {
      try {
        const res = await fetch(`/api/v1/admin/broadcast/campaigns/${campaignId}`);
        const json = await res.json();
        if (json.success && json.data) {
          setActiveCampaign(json.data);
          if (json.data.status === 'completed' || json.data.status === 'cancelled') {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          }
        }
      } catch (err) {
        console.error('Poll failed:', err);
      }
    }

    // Poll every 3 seconds while active
    pollIntervalRef.current = setInterval(pollStatus, 3000);
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [isOpen, activeTab, activeCampaign?._id, activeCampaign?.status]);

  // Handle Preset selection
  const handleSelectPreset = (presetKey: keyof typeof BROADCAST_TEMPLATES) => {
    const preset = BROADCAST_TEMPLATES[presetKey];
    setSelectedPresetId(preset.id);
    setTemplateText(preset.template);
    setPreviewKey((prev) => prev + 1);
  };

  // Insert tag helper
  const handleInsertTag = (tag: string) => {
    setTemplateText((prev) => `${prev} ${tag}`);
    setPreviewKey((prev) => prev + 1);
  };

  // Test Send on WhatsApp
  const handleSendTest = async () => {
    if (!testPhoneNumber.trim()) {
      toast.error('Please enter a WhatsApp phone number for the test');
      return;
    }

    setIsSendingTest(true);
    try {
      const res = await fetch('/api/v1/admin/broadcast/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: testPhoneNumber,
          template: templateText,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success(`Test WhatsApp message delivered to ${testPhoneNumber}! 🎉`);
      } else {
        toast.error(`Test failed: ${json.error || 'Check WASender provider status'}`);
      }
    } catch (err: any) {
      toast.error(`Test delivery error: ${err.message}`);
    } finally {
      setIsSendingTest(false);
    }
  };

  // Launch Full Campaign
  const handleLaunchCampaign = async () => {
    if (!campaignTitle.trim()) {
      toast.error('Please specify a campaign title');
      return;
    }

    if (!templateText.trim()) {
      toast.error('Please compose a message template');
      return;
    }

    if (!audienceData || audienceData.total === 0) {
      toast.error('No matching recipients found for selected filter');
      return;
    }

    setCampaignActionLoading(true);
    try {
      const res = await fetch('/api/v1/admin/broadcast/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: campaignTitle,
          template: templateText,
          audienceFilter: selectedFilter,
          minDelaySeconds: 8,
          maxDelaySeconds: 18,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success(`🚀 Broadcast Campaign "${campaignTitle}" launched to ${json.data.totalRecipients} members!`);
        setActiveCampaign({
          _id: json.data.campaignId,
          title: json.data.title,
          totalRecipients: json.data.totalRecipients,
          sentCount: 0,
          failedCount: 0,
          currentCursor: 0,
          percentage: 0,
          status: 'running',
          recentActivity: [],
        });
        setActiveTab('active-campaign');
      } else {
        toast.error(`Failed to launch: ${json.error}`);
      }
    } catch (err: any) {
      toast.error(`Launch error: ${err.message}`);
    } finally {
      setCampaignActionLoading(false);
    }
  };

  // Pause / Resume / Cancel Campaign
  const handleCampaignControl = async (action: 'pause' | 'resume' | 'cancel') => {
    if (!activeCampaign?._id) return;
    setCampaignActionLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/broadcast/campaigns/${activeCampaign._id}/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Campaign marked as ${json.status}`);
        setActiveCampaign((prev: any) => ({ ...prev, status: json.status }));
      } else {
        toast.error(`Action failed: ${json.error}`);
      }
    } catch (err: any) {
      toast.error(`Action failed: ${err.message}`);
    } finally {
      setCampaignActionLoading(false);
    }
  };

  // Render sample preview text
  const currentSample =
    audienceData?.sample && audienceData.sample.length > 0
      ? audienceData.sample[previewRecipientIndex % audienceData.sample.length]
      : { fullName: 'Dr. Ibrahim Danladi', phoneNumber: '+2348031234567', year: '1998' };

  const renderedPreview = personalizeMessage(templateText, {
    fullName: currentSample?.fullName || 'Esteemed Member',
    phoneNumber: currentSample?.phoneNumber || '+2348031234567',
    year: currentSample?.year || '1998',
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] sm:max-w-4xl max-h-[92vh] overflow-y-auto p-0 rounded-2xl bg-white dark:bg-gray-900 border shadow-2xl">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b bg-gradient-to-r from-indigo-900 via-indigo-800 to-primary-900 text-white rounded-t-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center border border-white/20">
                <Megaphone className="w-5 h-5 text-indigo-300" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  <span>Ticket Broadcast & Campaign Engine</span>
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-xs px-2 py-0.5">
                    Anti-Spam Shield Active
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-indigo-200 mt-0.5">
                  Direct WhatsApp notifications guiding members to secure convention passes before event day
                </DialogDescription>
              </div>
            </div>

            {/* Tab Switcher */}
            <div className="flex items-center space-x-1 bg-black/20 p-1 rounded-xl self-start sm:self-auto border border-white/10">
              <button
                type="button"
                onClick={() => setActiveTab('compose')}
                className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition ${
                  activeTab === 'compose'
                    ? 'bg-white text-indigo-950 shadow-sm'
                    : 'text-indigo-200 hover:text-white'
                }`}
              >
                Compose Campaign
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('active-campaign')}
                className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
                  activeTab === 'active-campaign'
                    ? 'bg-white text-indigo-950 shadow-sm'
                    : 'text-indigo-200 hover:text-white'
                }`}
              >
                <span>Live Campaign</span>
                {activeCampaign && activeCampaign.status === 'running' && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        {activeTab === 'compose' ? (
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            {/* Meta Anti-Spam Safeguard Banner */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800 text-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-start space-x-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-bold text-emerald-950 dark:text-emerald-200">
                    Facebook / Meta Anti-Spam Protection Guarantee
                  </h4>
                  <p className="text-emerald-800 dark:text-emerald-300 mt-0.5">
                    Every message is delivered with <strong>randomized 8–18s human jitter</strong>, dynamic <strong>Spintax phrasing variations</strong>, and first-name personalization to prevent hash pattern detection and protect the official sending line.
                  </p>
                </div>
              </div>
              <Badge className="bg-emerald-600 text-white font-mono self-start md:self-auto whitespace-nowrap">
                8s – 18s Jitter Rate
              </Badge>
            </div>

            {/* Campaign Title & Audience Segment */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  Campaign Name / Reference
                </Label>
                <Input
                  value={campaignTitle}
                  onChange={(e) => setCampaignTitle(e.target.value)}
                  placeholder="e.g. Pre-Event Ticket Fast-Track Drive #1"
                  className="mt-1 h-10 rounded-xl"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center justify-between">
                  <span>Target Audience Segment</span>
                  {audienceLoading && <Loader2 className="w-3 h-3 animate-spin text-primary-600" />}
                </Label>
                <div className="grid grid-cols-3 gap-1.5 mt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedFilter('no-tickets')}
                    className={`text-left p-2 rounded-xl border text-xs transition ${
                      selectedFilter === 'no-tickets'
                        ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 font-bold shadow-sm'
                        : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/60 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <div className="flex items-center gap-1 font-bold">
                      <span>🎯 Zero Tickets</span>
                    </div>
                    <p className="text-[10px] text-gray-500 line-clamp-1">Queue prevention</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedFilter('missing-dinner')}
                    className={`text-left p-2 rounded-xl border text-xs transition ${
                      selectedFilter === 'missing-dinner'
                        ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 font-bold shadow-sm'
                        : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/60 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <div className="flex items-center gap-1 font-bold">
                      <span>🍽️ Missing Dinner</span>
                    </div>
                    <p className="text-[10px] text-gray-500 line-clamp-1">Upsell dinner pass</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedFilter('all-members')}
                    className={`text-left p-2 rounded-xl border text-xs transition ${
                      selectedFilter === 'all-members'
                        ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 font-bold shadow-sm'
                        : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/60 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <div className="flex items-center gap-1 font-bold">
                      <span>👥 All Members</span>
                    </div>
                    <p className="text-[10px] text-gray-500 line-clamp-1">Entire alumni base</p>
                  </button>
                </div>
              </div>
            </div>

            {/* Audience Stats Pill */}
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  Targeted Recipients:
                </span>
                <span className="font-bold text-indigo-700 dark:text-indigo-300 text-sm">
                  {audienceLoading ? 'Calculating...' : `${audienceData?.total.toLocaleString() || 0} members`}
                </span>
              </div>

              <div className="flex items-center space-x-4">
                {audienceData && audienceData.total > 0 && (
                  <div className="flex items-center space-x-1.5 text-gray-500 dark:text-gray-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Est. safe dispatch: <strong>{audienceData.estimatedDurationMinutes.min}–{audienceData.estimatedDurationMinutes.max} mins</strong></span>
                  </div>
                )}
                {audienceData?.sample && audienceData.sample.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowSampleRecipients(!showSampleRecipients)}
                    className="text-xs text-primary-600 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <span>Sample list</span>
                    {showSampleRecipients ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </div>

            {/* Expandable Sample List */}
            {showSampleRecipients && audienceData?.sample && (
              <div className="p-3 rounded-xl bg-white dark:bg-gray-800 border text-xs space-y-1.5 animate-in fade-in">
                <p className="font-bold text-gray-600 dark:text-gray-300">First 5 Sample Members:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {audienceData.sample.map((m, idx) => (
                    <div key={idx} className="p-2 rounded-lg bg-gray-50 dark:bg-gray-900 border flex items-center justify-between">
                      <span className="font-medium text-gray-800 dark:text-gray-200">{m.fullName}</span>
                      <span className="font-mono text-gray-500">{m.formattedPhone}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Template Presets */}
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  Pre-Configured High-Conversion Presets
                </Label>
                <span className="text-[11px] text-gray-500">Includes Dual Call-to-Action (Web + WhatsApp Bot)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1.5">
                {Object.entries(BROADCAST_TEMPLATES).map(([key, preset]) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(key as any)}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      selectedPresetId === preset.id
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 font-bold'
                        : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/60 text-gray-700 dark:text-gray-300 text-xs'
                    }`}
                  >
                    <span className="text-xs font-semibold line-clamp-1">{preset.title}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Editor & Preview Split */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left Column: Template Editor */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    WhatsApp Message Template (with Spintax)
                  </Label>
                  <span className="text-[10px] text-gray-500 font-mono">
                    {templateText.length} chars
                  </span>
                </div>

                <textarea
                  rows={11}
                  value={templateText}
                  onChange={(e) => {
                    setTemplateText(e.target.value);
                    setPreviewKey((k) => k + 1);
                  }}
                  className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-xs font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  placeholder="Type your message with {Spintax|Phrasing} and {first_name} tags..."
                />

                {/* Variable Insertion Pills */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-gray-500 mr-1 font-semibold">Insert Tag:</span>
                  <button
                    type="button"
                    onClick={() => handleInsertTag('{first_name}')}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100"
                  >
                    +{'{first_name}'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertTag('{name}')}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100"
                  >
                    +{'{name}'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertTag('{portal_link}')}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100"
                  >
                    +{'{portal_link}'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertTag('{Hello|Hi|Greetings}')}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100"
                  >
                    +Spintax Example
                  </button>
                </div>
              </div>

              {/* Right Column: Live WhatsApp Bubble Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Live WhatsApp Delivery Preview</span>
                  </Label>
                  <button
                    type="button"
                    onClick={() => setPreviewKey((k) => k + 1)}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
                    title="Roll another Spintax variation to see how another recipient sees it"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Roll Variation</span>
                  </button>
                </div>

                {/* WhatsApp Chat Container */}
                <div className="rounded-xl border border-emerald-300/60 dark:border-emerald-900/60 bg-[#e5ddd5] dark:bg-[#0b141a] p-4 min-h-[260px] flex flex-col justify-end shadow-inner relative">
                  <div className="absolute top-2 left-3 text-[10px] text-gray-600 dark:text-gray-400 bg-white/70 dark:bg-black/40 px-2 py-0.5 rounded-full backdrop-blur">
                    Simulating: <strong>{currentSample.fullName}</strong>
                  </div>

                  <div className="self-start max-w-[92%] bg-white dark:bg-[#1f2c34] text-gray-900 dark:text-gray-100 p-3.5 rounded-2xl rounded-tl-none shadow text-xs whitespace-pre-wrap leading-relaxed border border-black/5">
                    {renderedPreview}
                    <div className="flex items-center justify-end space-x-1 mt-1 text-[10px] text-gray-400">
                      <span>12:45 PM</span>
                      <CheckCircle2 className="w-3 h-3 text-sky-500" />
                    </div>
                  </div>
                </div>

                {/* Test Send to Admin's Real Phone */}
                <div className="p-3 rounded-xl border bg-gray-50 dark:bg-gray-800/40 space-y-2">
                  <Label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center justify-between">
                    <span>Send Live Test to Your WhatsApp</span>
                    <span className="text-[10px] text-gray-500">Verifies before blast</span>
                  </Label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      value={testPhoneNumber}
                      onChange={(e) => setTestPhoneNumber(e.target.value)}
                      placeholder="e.g. 08031234567 or +234..."
                      className="h-10 sm:h-9 text-xs rounded-xl bg-white dark:bg-gray-900 flex-1"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSendTest}
                      disabled={isSendingTest || !testPhoneNumber.trim()}
                      className="rounded-xl h-10 sm:h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold w-full sm:w-auto shrink-0 flex items-center justify-center"
                    >
                      {isSendingTest ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5 mr-1.5" />
                          Send Test
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Launch Footer */}
            <div className="pt-4 border-t flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="text-xs text-gray-500 text-center sm:text-left">
                <span>Targets <strong>{audienceData?.total || 0} members</strong> • Safe delivery interval: <strong>8s – 18s</strong> per member</span>
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2 sm:space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="w-full sm:w-auto rounded-xl h-11 px-5"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleLaunchCampaign}
                  disabled={campaignActionLoading || !audienceData || audienceData.total === 0}
                  className="w-full sm:w-auto rounded-xl h-11 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  {campaignActionLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Preparing Campaign...</span>
                    </>
                  ) : (
                    <>
                      <Megaphone className="w-4 h-4" />
                      <span>Start Broadcast Campaign ({audienceData?.total || 0})</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Live Campaign Dashboard View */
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            {activeCampaign ? (
              <div className="space-y-6">
                {/* Active Campaign Header Card */}
                <div className="p-5 rounded-2xl border bg-gradient-to-br from-indigo-50/60 to-purple-50/60 dark:from-indigo-950/20 dark:to-purple-950/20 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">
                          {activeCampaign.title}
                        </h3>
                        <Badge
                          className={`text-xs uppercase px-2 py-0.5 font-bold ${
                            activeCampaign.status === 'running'
                              ? 'bg-emerald-600 text-white animate-pulse'
                              : activeCampaign.status === 'paused'
                              ? 'bg-amber-500 text-white'
                              : activeCampaign.status === 'completed'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-500 text-white'
                          }`}
                        >
                          {activeCampaign.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Filter: <strong>{activeCampaign.audienceFilter}</strong> • Started at {activeCampaign.startedAt ? new Date(activeCampaign.startedAt).toLocaleTimeString() : 'Recently'}
                      </p>
                    </div>

                    {/* Control Buttons */}
                    <div className="flex items-center space-x-2">
                      {activeCampaign.status === 'running' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCampaignControl('pause')}
                          disabled={campaignActionLoading}
                          className="rounded-xl border-amber-300 text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                        >
                          <Pause className="w-3.5 h-3.5 mr-1" />
                          Pause
                        </Button>
                      )}

                      {activeCampaign.status === 'paused' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCampaignControl('resume')}
                          disabled={campaignActionLoading}
                          className="rounded-xl border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                        >
                          <Play className="w-3.5 h-3.5 mr-1" />
                          Resume
                        </Button>
                      )}

                      {(activeCampaign.status === 'running' || activeCampaign.status === 'paused') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCampaignControl('cancel')}
                          disabled={campaignActionLoading}
                          className="rounded-xl border-rose-300 text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" />
                          Abort
                        </Button>
                      )}

                      {(activeCampaign.status === 'completed' || activeCampaign.status === 'cancelled') && (
                        <Button
                          size="sm"
                          onClick={() => setActiveTab('compose')}
                          className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                          <Megaphone className="w-3.5 h-3.5 mr-1" />
                          New Campaign
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold text-gray-700 dark:text-gray-300">
                      <span>
                        Overall Progress: {activeCampaign.sentCount + activeCampaign.failedCount} / {activeCampaign.totalRecipients}
                      </span>
                      <span>
                        {Math.round(
                          ((activeCampaign.sentCount + activeCampaign.failedCount) /
                            Math.max(1, activeCampaign.totalRecipients)) *
                            100,
                        )}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-indigo-600 h-3 rounded-full transition-all duration-500 ease-out"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round(
                              ((activeCampaign.sentCount + activeCampaign.failedCount) /
                                Math.max(1, activeCampaign.totalRecipients)) *
                                100,
                            ),
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Summary Metric Counters */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    <div className="p-3 rounded-xl bg-white dark:bg-gray-900 border text-center">
                      <span className="text-[10px] uppercase font-bold text-gray-500">Total Audience</span>
                      <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">
                        {activeCampaign.totalRecipients.toLocaleString()}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-white dark:bg-gray-900 border text-center">
                      <span className="text-[10px] uppercase font-bold text-emerald-600">Delivered</span>
                      <p className="text-xl font-bold text-emerald-600 mt-0.5">
                        {activeCampaign.sentCount.toLocaleString()}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-white dark:bg-gray-900 border text-center">
                      <span className="text-[10px] uppercase font-bold text-rose-600">Failed / Skipped</span>
                      <p className="text-xl font-bold text-rose-600 mt-0.5">
                        {activeCampaign.failedCount.toLocaleString()}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-white dark:bg-gray-900 border text-center">
                      <span className="text-[10px] uppercase font-bold text-indigo-600">Remaining</span>
                      <p className="text-xl font-bold text-indigo-600 mt-0.5">
                        {Math.max(0, activeCampaign.totalRecipients - (activeCampaign.sentCount + activeCampaign.failedCount)).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Real-time Recipient Activity Stream */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Live Delivery Stream (Last 15 Dispatches)
                    </h4>
                    {activeCampaign.status === 'running' && (
                      <span className="flex items-center text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        Dispatches in progress (8–18s jitter)
                      </span>
                    )}
                  </div>

                  <div className="rounded-xl border bg-white dark:bg-gray-900 overflow-hidden divide-y divide-gray-100 dark:divide-gray-800 text-xs max-h-72 overflow-y-auto">
                    {activeCampaign.recentActivity && activeCampaign.recentActivity.length > 0 ? (
                      activeCampaign.recentActivity.map((r: any, idx: number) => (
                        <div key={idx} className="p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/40">
                          <div className="space-y-0.5">
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {r.fullName}
                            </span>
                            <div className="text-[10px] text-gray-500 font-mono">
                              {r.phoneNumber}
                            </div>
                          </div>

                          <div className="flex items-center space-x-3">
                            {r.sentAt && (
                              <span className="text-[10px] text-gray-400">
                                {new Date(r.sentAt).toLocaleTimeString()}
                              </span>
                            )}
                            <Badge
                              className={`text-[10px] px-2 py-0.5 ${
                                r.status === 'sent'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                              }`}
                            >
                              {r.status === 'sent' ? 'Delivered' : r.error || 'Failed'}
                            </Badge>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-gray-400 text-xs">
                        No messages dispatched yet in this campaign.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center space-y-3">
                <Megaphone className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto" />
                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300">
                  No Active Broadcast Campaign
                </h4>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  You can design, preview, and launch a targeted WhatsApp ticket sales drive from the Compose tab.
                </p>
                <Button
                  onClick={() => setActiveTab('compose')}
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold mt-2"
                >
                  Create New Broadcast Campaign
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
