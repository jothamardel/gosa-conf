"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Upload,
  Image as ImageIcon,
  Loader2,
  CheckCircle,
  Calendar,
  MapPin,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import html2canvas from "html2canvas";

interface BadgeGeneratorProps {
  userId: string;
  onBadgeGenerated?: (badge: any) => void;
  onPreviewUpdate?: (
    name: string,
    imageUrl: string,
    school: string,
    house: string,
    year: string,
    sponsor: any
  ) => void;
}

const CONVENTION_YEAR = "2026";

// Dynamic Sponsors List
export const OFFICIAL_SPONSORS = [
  {
    name: "Crispan Suites & Events",
    logoText: "🏨 CRISPAN SUITES",
    slogan: "Official Venue Host",
    color: "text-amber-400",
    bgColor: "bg-amber-950/40",
  },
  {
    name: "Grand Cereals Limited",
    logoText: "🌾 GRAND CEREALS",
    slogan: "Pioneering Agro-Nutrition",
    color: "text-emerald-400",
    bgColor: "bg-emerald-950/40",
  },
  {
    name: "Paystack Payments",
    logoText: "💳 paystack",
    slogan: "Securing Alumni Checkouts",
    color: "text-cyan-400",
    bgColor: "bg-cyan-950/40",
  },
  {
    name: "GOSA Secretariat",
    logoText: "🏛️ GOSA SECRETARIAT",
    slogan: "For Light and Truth",
    color: "text-green-400",
    bgColor: "bg-green-950/40",
  },
];

export function BadgeGenerator({
  userId,
  onBadgeGenerated,
  onPreviewUpdate,
}: BadgeGeneratorProps) {
  const [formData, setFormData] = useState({
    attendeeName: "",
    attendeeTitle: "ATTENDEE",
    year: "",
    school: "BSS", // Default to Boys' Secondary School
    house: "aggrey", // Default BSS house
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [generatedBadge, setGeneratedBadge] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [assignedSponsor, setAssignedSponsor] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const badgePreviewRef = useRef<HTMLDivElement>(null);

  // Assign a random sponsor on component mount
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * OFFICIAL_SPONSORS.length);
    const sponsor = OFFICIAL_SPONSORS[randomIndex];
    setAssignedSponsor(sponsor);
  }, []);

  // Pass preview updates to parent page when dependencies change
  useEffect(() => {
    if (onPreviewUpdate && assignedSponsor) {
      onPreviewUpdate(
        formData.attendeeName,
        previewUrl || "",
        formData.school,
        formData.house,
        formData.year,
        assignedSponsor
      );
    }
  }, [formData, previewUrl, assignedSponsor, onPreviewUpdate]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };

      // Auto-set first house if school changes to prevent invalid house state
      if (field === "school") {
        updated.house = value === "GHS" ? "curie" : "aggrey";
      }

      return updated;
    });
  };

  const getHousesForSchool = (school: string) => {
    if (school === "GHS") {
      return [
        { value: "curie", label: "Curie" },
        { value: "keller", label: "Keller" },
        { value: "nightangle", label: "Nightangle" },
        { value: "slessor", label: "Slessor" },
      ];
    }
    return [
      { value: "aggrey", label: "Aggrey House" },
      { value: "carver", label: "Carver House" },
      { value: "crowther", label: "Crowther House" },
      { value: "livingstone", label: "Livingstone House" },
    ];
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      const errorMsg = "Please select a valid image file (JPG, PNG, etc.)";
      setError(errorMsg);
      toast.error("❌ Invalid File Type", { description: errorMsg });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      const errorMsg = "File size must be less than 5MB";
      setError(errorMsg);
      toast.error("📁 File Too Large", { description: errorMsg });
      return;
    }

    setSelectedFile(file);
    setError(null);

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    toast.success("📸 Photo Uploaded!", {
      description: "Your profile photo is ready for the badge",
    });
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      if (file.size > 5 * 1024 * 1024) {
        const errorMsg = "File size must be less than 5MB";
        setError(errorMsg);
        toast.error("📁 File Too Large", { description: errorMsg });
        return;
      }

      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setError(null);

      toast.success("📸 Photo Uploaded!", {
        description: "Your profile photo is ready for the badge",
      });
    } else {
      toast.error("❌ Invalid File", {
        description: "Please drop a valid image file (JPG, PNG, etc.)",
      });
    }
  };

  const handleGenerateBadge = async () => {
    if (!selectedFile || !formData.attendeeName.trim() || !formData.year.trim()) {
      const errorMsg = "Please fill in all fields and upload a photo";
      setError(errorMsg);
      toast.error("⚠️ Missing Information", { description: errorMsg });
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("userId", userId || "demo-user");
      formDataToSend.append("attendeeName", formData.attendeeName.trim());
      formDataToSend.append("attendeeTitle", formData.attendeeTitle.trim());
      formDataToSend.append("profilePhoto", selectedFile);
      formDataToSend.append("school", formData.school);
      formDataToSend.append("house", formData.house);

      const response = await fetch("/api/v1/badge/generate", {
        method: "POST",
        body: formDataToSend,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to generate badge");
      }

      setGeneratedBadge(result.data);
      toast.success("🎉 Badge Generated!", {
        description: "Your GOSA 2026 Convention badge is ready to download!",
      });

      if (onBadgeGenerated) {
        onBadgeGenerated(result.data);
      }
    } catch (error: any) {
      console.error("Badge generation error:", error);
      const errorMsg = error.message || "Failed to generate badge. Please try again.";
      setError(errorMsg);
      toast.error("❌ Generation Failed", { description: errorMsg });
    } finally {
      setIsGenerating(false);
    }
  };

  const waitForImages = async (container: HTMLElement) => {
    const imgs = Array.from(container.querySelectorAll("img"));
    await Promise.all(
      imgs.map((img) =>
        img.complete
          ? img.decode().catch(() => { })
          : new Promise<void>((resolve) => {
            img.onload = () => img.decode().then(() => resolve()).catch(() => resolve());
            img.onerror = () => resolve();
          })
      )
    );
  };

  const handleDownloadBadge = async () => {
    if (!badgePreviewRef.current) {
      toast.error("❌ Badge preview not available");
      return;
    }

    try {
      setIsDownloading(true);

      // Wait for fonts to finish loading completely
      if (typeof window !== "undefined" && document.fonts) {
        await document.fonts.ready;
      }

      // Wait for all images inside the badge container to fully load and decode
      await waitForImages(badgePreviewRef.current);

      // Brief pause for paint cycle
      await new Promise((resolve) => setTimeout(resolve, 150));

      const canvas = await html2canvas(badgePreviewRef.current, {
        scale: 3,
        logging: false,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#022c22", // Emerald 950 base
      });

      const link = document.createElement("a");
      const fileName = `${formData.attendeeName.replace(/\s+/g, "_")}_GOSA_Convention_2026_Badge.png`;
      link.download = fileName;
      link.href = canvas.toDataURL("image/png", 1.0);

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("✅ Badge downloaded successfully!", {
        description: `Saved as: ${fileName}`,
      });
    } catch (error) {
      console.error("Download error:", error);
      toast.error("❌ Download Failed", {
        description: "Please try again or check browser permissions.",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  if (generatedBadge) {
    return (
      <Card className="w-full max-w-md mx-auto bg-white border border-slate-200 shadow-xl overflow-hidden rounded-2xl">
        <CardHeader className="bg-slate-50 border-b border-slate-100">
          <CardTitle className="flex items-center gap-2 text-slate-900 text-lg">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
            Badge Ready!
          </CardTitle>
          <CardDescription className="text-slate-500 text-xs">
            Dynamic sponsor banner has been successfully embedded at the bottom.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">

          {/* Output Badge Preview (DOM captured by html2canvas) */}
          <div className="flex justify-center">
            <div
              ref={badgePreviewRef}
              className="w-[300px] min-h-[460px] rounded-[18px] p-5 text-center border-4 border-white/80 shadow-2xl relative overflow-hidden flex flex-col items-center text-white"
              style={{
                backgroundImage: "linear-gradient(to bottom, #022c22 0%, #064e3b 45%, #022c22 100%)",
                boxSizing: "border-box"
              }}
            >
              {/* Header Logo & Convention Details */}
              <div className="w-full flex flex-col items-center mt-1 shrink-0 z-10">
                <div className="flex items-center gap-2 mb-1">
                  <div className="relative w-8 h-8 flex items-center justify-center">
                    <img
                      src="/images/gosa.png"
                      alt=""
                      className="w-8 h-8 object-contain brightness-0 invert"
                    />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xs font-black tracking-widest text-white uppercase leading-none">GOSA 2026</h3>
                    <p className="text-[7px] font-bold text-emerald-300 uppercase tracking-wider mt-0.5">Annual Convention</p>
                  </div>
                </div>
                <div className="h-0.5 bg-gradient-to-r from-transparent via-white/50 to-transparent w-3/4 mb-1.5" />
                <span className="text-[10px] font-extrabold tracking-widest text-emerald-200 uppercase block my-1">
                  {formData.attendeeTitle || "ATTENDEE"}
                </span>
              </div>

              {/* Photo Frame */}
              <div className="relative mt-3 mb-1 shrink-0 z-10">
                <div className="absolute inset-0 bg-white/20 rounded-full blur-md" />
                <div className="relative w-28 h-28 rounded-full border-4 border-white overflow-hidden shadow-xl bg-slate-900 flex items-center justify-center" style={{ borderRadius: "9999px" }}>
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt=""
                      className="w-full h-full object-contain rounded-full"
                      style={{ borderRadius: "9999px" }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500 bg-slate-900 rounded-full" style={{ borderRadius: "9999px" }}>
                      <Upload className="w-6 h-6" />
                    </div>
                  )}
                </div>
              </div>

              {/* Text metadata */}
              <div className="mb-2 shrink-0 w-full px-2 py-1 z-10">
                <h2
                  className="text-base font-black text-white tracking-tight uppercase truncate drop-shadow-md"
                  style={{ lineHeight: 1.4, paddingTop: 2, paddingBottom: 2 }}
                >
                  {formData.attendeeName}
                </h2>

                <div className="flex items-center justify-center gap-2 my-1.5 text-[10px] font-extrabold uppercase">
                  <span className={formData.school === "GHS" ? "text-rose-300" : "text-emerald-300"}>
                    {formData.school} Gindiri
                  </span>
                  <span className="text-white/60 font-black">•</span>
                  <span className="text-emerald-100">
                    Class of {formData.year}
                  </span>
                </div>

                <p className="text-[10px] text-emerald-200 my-0.5 font-medium">
                  House: <span className="text-white font-bold capitalize">{formData.house}</span>
                </p>

                {/* 6 Company Sponsor Advertisements inside White-Trimmed Glass Panel */}
                <div className="mt-2 mb-0.5 w-full shrink-0 bg-emerald-950/70 border border-white/20 rounded-none p-1.5 shadow-lg">
                  <span className="text-[6px] font-black text-emerald-200 uppercase tracking-widest leading-none block mb-1">
                    Official Convention Sponsors
                  </span>
                  <div className="grid grid-cols-3 gap-1.5 items-center justify-center px-0.5">
                    <div className="h-8 rounded-none bg-white p-1 flex items-center justify-center overflow-hidden shadow-xs">
                      <img src="/images/sponsors/crispan.png" alt="Crispan Suites" className="max-h-full max-w-full object-contain mx-auto" />
                    </div>
                    <div className="h-8 rounded-none bg-white p-1 flex items-center justify-center overflow-hidden shadow-xs">
                      <img src="/images/sponsors/grand_cereals.png" alt="Grand Cereals" className="max-h-full max-w-full object-contain mx-auto" />
                    </div>
                    <div className="h-8 rounded-none bg-white p-1 flex items-center justify-center overflow-hidden shadow-xs">
                      <img src="/images/sponsors/paystack.png" alt="Paystack" className="max-h-full max-w-full object-contain mx-auto" />
                    </div>
                    <div className="h-8 rounded-none bg-white p-1 flex items-center justify-center overflow-hidden shadow-xs">
                      <img src="/images/sponsors/mtn.png" alt="MTN" className="max-h-full max-w-full object-contain mx-auto" />
                    </div>
                    <div className="h-8 rounded-none bg-white p-1 flex items-center justify-center overflow-hidden shadow-xs">
                      <img src="/images/sponsors/access_bank.png" alt="Access Bank" className="max-h-full max-w-full object-contain mx-auto" />
                    </div>
                    <div className="h-8 rounded-none bg-white p-1 flex items-center justify-center overflow-hidden shadow-xs">
                      <img src="/images/sponsors/airtel.png" alt="Airtel" className="max-h-full max-w-full object-contain mx-auto" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Sponsor block strip */}
              <div className="w-full border-t border-white/20 pt-2 pb-1.5 bg-emerald-950/90 rounded-b-xl flex flex-col items-center justify-center shrink-0 mt-auto z-10">
                <span className="text-[6px] font-black text-emerald-300/80 uppercase tracking-widest leading-none mb-0.5">
                  Official Convention Partner
                </span>
                {assignedSponsor ? (
                  <div className="flex items-center justify-center gap-1 mt-0.5">
                    <span className="text-[9px] font-black tracking-tight text-white">
                      {assignedSponsor.logoText}
                    </span>
                    <span className="text-[8px] text-emerald-200 font-medium border-l border-emerald-700 pl-1.5 leading-none">
                      {assignedSponsor.slogan}
                    </span>
                  </div>
                ) : (
                  <span className="text-[8px] text-emerald-200 font-semibold">GOSA Secretariat</span>
                )}
              </div>

            </div>
          </div>

          <Button
            onClick={handleDownloadBadge}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-6 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            disabled={isDownloading}
          >
            {isDownloading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Downloading...
              </>
            ) : (
              <>📥 Download PNG Badge</>
            )}
          </Button>

          <div className="text-center">
            <Button
              onClick={() => {
                setGeneratedBadge(null);
                setSelectedFile(null);
                setPreviewUrl(null);
                setFormData({
                  attendeeName: "",
                  attendeeTitle: "ATTENDEE",
                  school: "BSS",
                  house: "aggrey",
                  year: "",
                });
              }}
              variant="ghost"
              className="text-slate-500 hover:text-slate-800 text-sm"
            >
              ← Create Another Badge
            </Button>
          </div>

        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto bg-white border border-slate-200 shadow-xl rounded-2xl overflow-hidden">
      <CardHeader className="bg-slate-50 border-b border-slate-100">
        <CardTitle className="text-slate-900 text-lg flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-emerald-600 shrink-0" />
          Generate Badge
        </CardTitle>
        <CardDescription className="text-slate-500 text-xs">
          Build your custom GOSA 2026 ID badge with co-ed school tag and official sponsorship details.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">

        {error && (
          <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-700 rounded-xl">
            <AlertDescription className="text-xs font-semibold">{error}</AlertDescription>
          </Alert>
        )}

        {/* Photo Upload Section */}
        <div className="space-y-2">
          <Label className="text-xs font-bold text-slate-700">Profile Photo *</Label>
          <div
            className="border-2 border-dashed border-slate-200 rounded-xl p-5 text-center cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-50/[0.15] transition-all"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            {previewUrl ? (
              <div className="space-y-2">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-24 h-24 object-cover rounded-full mx-auto border-2 border-emerald-200 shadow-md"
                />
                <p className="text-xs font-semibold text-emerald-600">
                  📸 Photo ready! Click to change
                </p>
              </div>
            ) : (
              <div className="space-y-2 py-2">
                <Upload className="h-10 w-10 mx-auto text-slate-400 animate-pulse" />
                <div>
                  <p className="text-xs font-bold text-slate-700">Upload profile image</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Drag-and-drop or click to select (Max 5MB)
                  </p>
                </div>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-bold text-slate-700">Full Name *</Label>
            <Input
              id="name"
              placeholder="e.g. John Nanle"
              value={formData.attendeeName}
              onChange={(e) => handleInputChange("attendeeName", e.target.value)}
              className="h-10 rounded-lg text-sm border-slate-200"
              maxLength={100}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="year" className="text-xs font-bold text-slate-700">Graduation Year *</Label>
              <Input
                id="year"
                placeholder="e.g. 2012"
                value={formData.year}
                onChange={(e) => handleInputChange("year", e.target.value)}
                className="h-10 rounded-lg text-sm border-slate-200"
                maxLength={4}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Title / Role</Label>
              <Input
                id="title"
                placeholder="e.g. ATTENDEE"
                value={formData.attendeeTitle}
                onChange={(e) => handleInputChange("attendeeTitle", e.target.value)}
                className="h-10 rounded-lg text-sm border-slate-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">School Attended</Label>
              <Select
                value={formData.school}
                onValueChange={(val) => handleInputChange("school", val)}
              >
                <SelectTrigger className="h-10 rounded-lg border-slate-200 text-slate-700 text-sm">
                  <SelectValue placeholder="Select school" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="BSS">BSS Gindiri (Boys)</SelectItem>
                  <SelectItem value="GHS">GHS Gindiri (Girls)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Class House</Label>
              <Select
                value={formData.house}
                onValueChange={(val) => handleInputChange("house", val)}
              >
                <SelectTrigger className="h-10 rounded-lg border-slate-200 text-slate-700 text-sm capitalize">
                  <SelectValue placeholder="Select house" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {getHousesForSchool(formData.school).map((house) => (
                    <SelectItem key={house.value} value={house.value} className="capitalize">
                      {house.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerateBadge}
          disabled={isGenerating || !selectedFile || !formData.attendeeName.trim() || !formData.year.trim()}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-6 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating Badge...
            </>
          ) : (
            <>✨ Generate GOSA Badge</>
          )}
        </Button>

        <div className="text-[10px] text-slate-500 text-center bg-slate-50 p-3 rounded-lg border border-slate-100 leading-relaxed">
          <p className="font-semibold text-slate-700">🛡️ GOSA 2026 Digital ID Credentials:</p>
          <p className="mt-1">Includes dynamic co-ed color codes, graduation details, and official convention sponsorship logos.</p>
        </div>

      </CardContent>
    </Card>
  );
}
