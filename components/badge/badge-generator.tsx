"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge, Share2 } from "lucide-react";
import {
  Upload,
  Image as ImageIcon,
  Loader2,
  CheckCircle,
  Calendar,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import html2canvas from "html2canvas";

interface BadgeGeneratorProps {
  userId: string;
  onBadgeGenerated?: (badge: any) => void;
  onPreviewUpdate?: (name: string, imageUrl: string) => void;
}

const CONVENTION_YEAR = new Date().getFullYear();

export function BadgeGenerator({
  userId,
  onBadgeGenerated,
  onPreviewUpdate,
}: BadgeGeneratorProps) {
  const [formData, setFormData] = useState({
    attendeeName: "",
    attendeeTitle: "ATTENDEE",
    year: "",
    house: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [generatedBadge, setGeneratedBadge] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const badgePreviewRef = useRef<HTMLDivElement>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (field === "attendeeName" && onPreviewUpdate) {
      onPreviewUpdate(value, previewUrl || "");
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      const errorMsg = "Please select a valid image file (JPG, PNG, etc.)";
      setError(errorMsg);
      toast.error("❌ Invalid File Type", {
        description: errorMsg,
        duration: 4000,
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      const errorMsg = "File size must be less than 5MB";
      setError(errorMsg);
      toast.error("📁 File Too Large", {
        description: errorMsg,
        duration: 4000,
      });
      return;
    }

    setSelectedFile(file);
    setError(null);

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    if (onPreviewUpdate) {
      onPreviewUpdate(formData.attendeeName, url);
    }

    toast.success("📸 Photo Uploaded!", {
      description: "Your profile photo is ready for the badge",
      duration: 3000,
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
        toast.error("📁 File Too Large", {
          description: errorMsg,
          duration: 4000,
        });
        return;
      }

      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setError(null);

      if (onPreviewUpdate) {
        onPreviewUpdate(formData.attendeeName, url);
      }

      toast.success("📸 Photo Uploaded!", {
        description: "Your profile photo is ready for the badge",
        duration: 3000,
      });
    } else {
      toast.error("❌ Invalid File", {
        description: "Please drop a valid image file (JPG, PNG, etc.)",
        duration: 4000,
      });
    }
  };

  const handleGenerateBadge = async () => {
    if (!selectedFile || !formData.attendeeName.trim()) {
      const errorMsg = "Please provide your name and upload a photo";
      setError(errorMsg);
      toast.error("⚠️ Missing Information", {
        description: errorMsg,
        duration: 4000,
      });
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("userId", userId);
      formDataToSend.append("attendeeName", formData.attendeeName.trim());
      formDataToSend.append("attendeeTitle", formData.attendeeTitle.trim());
      formDataToSend.append("profilePhoto", selectedFile);

      const response = await fetch("/api/v1/badge/generate", {
        method: "POST",
        body: formDataToSend,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to generate badge");
      }

      setGeneratedBadge(result.data);
      toast.success("🎉 Badge Generated Successfully!", {
        description:
          "Your GOSA Convention badge is ready to download and share!",
        duration: 5000,
      });

      if (onBadgeGenerated) {
        onBadgeGenerated(result.data);
      }
    } catch (error: any) {
      console.error("Badge generation error:", error);
      const errorMsg =
        error.message || "Failed to generate badge. Please try again.";
      setError(errorMsg);
      toast.error("❌ Generation Failed", {
        description: errorMsg,
        duration: 5000,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadBadge = async () => {
    if (!badgePreviewRef.current) {
      toast.error("❌ Badge preview not available");
      return;
    }

    try {
      setIsDownloading(true);

      // Wait a bit for any rendering to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Create canvas with higher quality
      const canvas = await html2canvas(badgePreviewRef.current, {
        scale: 3,
        logging: false,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        width: badgePreviewRef.current.offsetWidth,
        height: badgePreviewRef.current.offsetHeight,
      });

      // Create download link
      const link = document.createElement("a");
      const fileName = `${formData.attendeeName.replace(/\s+/g, "_")}_GOSA_Convention_${CONVENTION_YEAR}_Badge.png`;
      link.download = fileName;
      link.href = canvas.toDataURL("image/png", 1.0);

      // Append to body, click, then remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("✅ Badge downloaded successfully!", {
        description: `Saved as: ${fileName}`,
      });
    } catch (error) {
      console.error("Download error:", error);
      toast.error("❌ Failed to download badge", {
        description: "Please try again or check your browser permissions",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShareBadge = async () => {
    if (!badgePreviewRef.current) {
      toast.error("❌ Badge preview not available");
      return;
    }

    try {
      setIsSharing(true);

      const element = badgePreviewRef.current;
      // Get the actual rendered dimensions
      const rect = element.getBoundingClientRect();
      console.log("Element dimensions:", rect.width, rect.height);
      // Force a reflow and wait
      element.style.position = "relative";
      element.style.zIndex = "9999";
      // Wait a bit for any rendering to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      console.log({
        badgePreviewRef,
      });

      // Create canvas for sharing
      const canvas = await html2canvas(badgePreviewRef.current, {
        scale: 3, // Reduced scale to prevent memory issues
        logging: true, // Enable logging to debug
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        // Use actual dimensions instead of fixed ones
        width: Math.floor(rect.width),
        height: Math.floor(rect.height),
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        scrollX: 0,
        scrollY: 0,
        // Add these options to improve rendering
        // @ts-ignore
        letterRendering: true,
        // @ts-ignore
        foreignObjectRendering: true,
        // width: badgePreviewRef.current.offsetWidth,
        // height: badgePreviewRef.current.offsetHeight,
      });

      // Reset element styles
      element.style.position = "";
      element.style.zIndex = "";

      // Convert canvas to blob
      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            toast.error("❌ Failed to create shareable image");
            return;
          }

          try {
            const file = new File(
              [blob],
              `${formData.attendeeName}_GOSA_Badge.png`,
              { type: "image/png" },
            );

            // Check if Web Share API is available and supports files
            if (
              navigator.share &&
              navigator.canShare &&
              navigator.canShare({ files: [file] })
            ) {
              await navigator.share({
                title: `My GOSA Convention ${CONVENTION_YEAR} Badge`,
                text: `Check out my GOSA Convention ${CONVENTION_YEAR} badge! ${formData.attendeeName} will be attending.`,
                files: [file],
              });
              toast.success("🚀 Badge shared successfully!");
            } else {
              // Fallback: Copy image data URL to clipboard
              const dataUrl = canvas.toDataURL("image/png");

              // Try to copy to clipboard
              if (navigator.clipboard && navigator.clipboard.write) {
                try {
                  await navigator.clipboard.write([
                    new ClipboardItem({
                      "image/png": blob,
                    }),
                  ]);
                  toast.success("📋 Badge copied to clipboard!", {
                    description: "You can now paste it in any app",
                  });
                } catch (clipboardError) {
                  // If clipboard fails, open in new window
                  openBadgeInNewWindow(dataUrl);
                }
              } else {
                // Final fallback: open in new window
                openBadgeInNewWindow(dataUrl);
              }
            }
          } catch (shareError) {
            console.error("Share error:", shareError);
            // Fallback to download
            const dataUrl = canvas.toDataURL("image/png");
            openBadgeInNewWindow(dataUrl);
          }
        },
        "image/png",
        0.9,
      );
    } catch (error) {
      console.error("Share error:", error);
      toast.error("❌ Failed to share badge", {
        description: "Please try downloading instead",
      });
    } finally {
      setIsSharing(false);
    }
  };

  const openBadgeInNewWindow = (dataUrl: string) => {
    const newWindow = window.open("", "_blank");
    if (newWindow) {
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>GOSA Badge - ${formData.attendeeName}</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                font-family: Arial, sans-serif;
                padding: 20px;
                text-align: center;
                background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
                margin: 0;
                min-height: 100vh;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
              }
              .container {
                background: white;
                padding: 30px;
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                max-width: 600px;
                width: 100%;
              }
              img {
                max-width: 100%;
                height: auto;
                margin: 20px 0;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              }
              .buttons {
                margin-top: 20px;
                display: flex;
                gap: 10px;
                justify-content: center;
                flex-wrap: wrap;
              }
              button {
                padding: 12px 20px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 500;
                transition: all 0.2s;
              }
              .download-btn {
                background: #16a34a;
                color: white;
              }
              .download-btn:hover {
                background: #15803d;
              }
              .close-btn {
                background: #6b7280;
                color: white;
              }
              .close-btn:hover {
                background: #4b5563;
              }
              h1 {
                color: #16a34a;
                margin-bottom: 10px;
              }
              p {
                color: #6b7280;
                margin-bottom: 20px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>🎉 Your GOSA Convention ${CONVENTION_YEAR} Badge</h1>
              <p>Right-click the image below to save it, or use the download button</p>
              <img src="${dataUrl}" alt="GOSA Convention Badge for ${formData.attendeeName}" />
              <div class="buttons">
                <button class="download-btn" onclick="downloadImage()">📥 Download Badge</button>
                <button class="close-btn" onclick="window.close()">✕ Close</button>
              </div>
            </div>
            <script>
              function downloadImage() {
                const link = document.createElement('a');
                link.download = '${formData.attendeeName.replace(/\s+/g, "_")}_GOSA_Convention_${CONVENTION_YEAR}_Badge.png';
                link.href = '${dataUrl}';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }
            </script>
          </body>
        </html>
      `);
      newWindow.document.close();
      toast.success("🌐 Badge opened in new window!", {
        description: "You can download or share from there",
      });
    } else {
      toast.error("❌ Popup blocked", {
        description: "Please allow popups and try again",
      });
    }
  };

  if (generatedBadge) {
    return (
      <Card className="w-full max-w-2xl mx-auto bg-white/90 backdrop-blur-sm border border-primary-200 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-primary-50 to-secondary-50">
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Badge Generated Successfully!
          </CardTitle>
          <CardDescription className="text-gray-600">
            Your GOSA Convention badge has been created with official branding.
            Download it or share it on social media.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center">
            <div
              ref={badgePreviewRef}
              className="w-full max-w-xs rounded-xl bg-gradient-to-b from-green-100 to-yellow-50 p-6 text-center border-2 border-green-200 shadow-inner"
            >
              <div className="mb-6">
                <div className="flex gap-2 items-center flex-col justify-center mb-2">
                  <div className="w-12 h-12 flex items-center  justify-center">
                    <div className="w-12 h-12 object-contain rounded-full flex justify-center items-center">
                      <Image
                        src={"/images/gosa.png"}
                        alt="GOSA Logo"
                        width={48}
                        height={48}
                        className=" "
                      />
                    </div>
                  </div>
                  <p className="text-xs md:text-sm font-medium text-green-800">
                    GOSA Convention {CONVENTION_YEAR}
                  </p>
                </div>

                <div className="h-1 bg-gradient-to-r from-green-500 to-yellow-500 w-1/3  mx-auto mb-2 rounded-full"></div>
                <h3 className="text-sm font-semibold uppercase tracking-widest text-green-600">
                  {formData.attendeeTitle || "ATTENDEE"}
                </h3>
              </div>

              {/* Profile Image */}
              <div className="flex justify-center items-center overflow-hidden object-contain object-center relative w-32 h-32 rounded-full bg-gradient-to-br from-yellow-100 to-green-100  overflow-hidden mx-auto mb-4 shadow-md">
                <div className="w-32 h-32 overflow-hidden rounded-full flex justify-center items-center">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Badge Photo"
                      className="w-full  object-cover "
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <Upload className="w-8 h-8" />
                    </div>
                  )}
                </div>
              </div>

              {/* Name */}
              <div className="mb-6">
                <h2 className="text-lg font-bold text-green-900">
                  {formData.attendeeName}
                </h2>
                <p className="text-green-700 mt-2 font-medium text-sm">
                  WILL BE ATTENDING
                </p>
              </div>

              {/* Convention Info */}
              <div className="border-t border-green-200 pt-4 space-y-2">
                <div className="flex items-center h-4 justify-center gap-2 text-green-800">
                  <Calendar className="w-4 h-4" />
                  <p className="text-sm font-medium">
                    1st - 2nd November, {CONVENTION_YEAR}
                  </p>
                </div>
                <div className="flex items-center h-4 justify-center gap-2 text-green-800">
                  <MapPin className="w-4 h-4" />
                  <p className="text-sm font-medium">GOSA Convention Center</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleDownloadBadge}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              size="lg"
              disabled={isDownloading}
            >
              {isDownloading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>📥 Download Badge</>
              )}
            </Button>
            {/*<Button
              onClick={handleShareBadge}
              variant="outline"
              className="w-full border-green-600 text-green-600 hover:bg-green-50"
              size="lg"
              disabled={isSharing}
            >
              {isSharing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sharing...
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4 mr-2" />
                  🚀 Share Badge
                </>
              )}
            </Button>*/}
          </div>

          <div className="text-center">
            <Button
              onClick={() => {
                setGeneratedBadge(null);
                setSelectedFile(null);
                setPreviewUrl(null);
                setFormData({
                  attendeeName: "",
                  attendeeTitle: "ATTENDEE",
                  house: "",
                  year: "",
                });
                toast.success("🔄 Ready for New Badge!", {
                  description: "You can create another badge now",
                  duration: 3000,
                });
              }}
              variant="ghost"
              className="text-gray-600 hover:text-gray-800"
            >
              ← Create Another Badge
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto bg-white/90 backdrop-blur-sm border border-primary-200 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-primary-50 to-secondary-50">
        <CardTitle className="text-gray-900">
          <Badge className="inline-block mr-2 h-6 w-6 text-primary-600" />
          Generate Your GOSA Convention Badge
        </CardTitle>
        <CardDescription className="text-gray-600">
          Create a personalized badge with official GOSA branding. Upload your
          photo and provide your details.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col space-y-6 justify-center">
          {error && (
            <Alert
              variant="destructive"
              className="bg-red-100 border-red-400 text-red-700"
            >
              <AlertDescription className="text-inherit">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Photo Upload Section */}
          <div className="space-y-2">
            <Label htmlFor="photo">Profile Photo *</Label>
            <div
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              {previewUrl ? (
                <div className="space-y-2">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-32 h-32 object-cover rounded-full mx-auto border-2 border-green-200"
                  />
                  <p className="text-sm text-muted-foreground">
                    ✅ Photo ready! Click to change
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">📸 Upload your photo</p>
                    <p className="text-xs text-muted-foreground">
                      Drag and drop or click to select (Max 5MB, JPG/PNG)
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
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                placeholder="Enter your full name"
                value={formData.attendeeName}
                onChange={(e) =>
                  handleInputChange("attendeeName", e.target.value)
                }
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Year *</Label>
              <Input
                id="year"
                placeholder="Enter graduation year"
                value={formData.year}
                onChange={(e) => handleInputChange("year", e.target.value)}
                maxLength={100}
              />
            </div>
            {/*<div className="space-y-2">
              <Label htmlFor="name">House *</Label>

              <Select>
                <SelectItem value="aggrey">Aggrey</SelectItem>
                <SelectItem value="carver">Carver</SelectItem>
                <SelectItem value="crowther">Crowther</SelectItem>
                <SelectItem value="livingstone">Livingstone</SelectItem>
              </Select>
            </div>*/}
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerateBadge}
            disabled={
              isGenerating || !selectedFile || !formData.attendeeName.trim()
            }
            className="w-full bg-gradient-to-r from-primary-600 to-secondary-500 hover:from-primary-700 hover:to-secondary-600 text-white shadow-md"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                🎨 Generating Your Badge...
              </>
            ) : (
              <>
                <ImageIcon className="h-4 w-4 mr-2" />✨ Generate Your Badge
              </>
            )}
          </Button>
        </div>

        <div className="text-xs text-gray-600 text-center bg-gray-50 p-3 rounded-lg">
          <p className="font-medium">🏆 Your badge will include:</p>
          <p>• Official GOSA logo and branding</p>
          <p>• High-resolution format for printing and sharing</p>
          <p>• Instant download and share options</p>
        </div>
      </CardContent>
    </Card>
  );
}
