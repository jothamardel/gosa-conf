'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Upload, Image as ImageIcon, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface BadgeGeneratorProps {
  userId: string;
  onBadgeGenerated?: (badge: any) => void;
}

export function BadgeGenerator({ userId, onBadgeGenerated }: BadgeGeneratorProps) {
  const [formData, setFormData] = useState({
    attendeeName: '',
    attendeeTitle: '',
    organization: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedBadge, setGeneratedBadge] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setSelectedFile(file);
    setError(null);

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setError(null);
    }
  };

  const handleGenerateBadge = async () => {
    if (!selectedFile || !formData.attendeeName.trim()) {
      setError('Please provide your name and upload a photo');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('userId', userId);
      formDataToSend.append('attendeeName', formData.attendeeName.trim());
      formDataToSend.append('attendeeTitle', formData.attendeeTitle.trim());
      formDataToSend.append('organization', formData.organization.trim());
      formDataToSend.append('profilePhoto', selectedFile);

      const response = await fetch('/api/v1/badge/generate', {
        method: 'POST',
        body: formDataToSend
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate badge');
      }

      setGeneratedBadge(result.data);
      toast.success('Badge generated successfully!');

      if (onBadgeGenerated) {
        onBadgeGenerated(result.data);
      }

    } catch (error: any) {
      console.error('Badge generation error:', error);
      setError(error.message || 'Failed to generate badge. Please try again.');
      toast.error('Failed to generate badge');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadBadge = async () => {
    if (!generatedBadge) return;

    try {
      // Increment download count
      await fetch('/api/v1/badge/gallery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          badgeId: generatedBadge.badgeId,
          action: 'download'
        })
      });

      // Download the badge
      const link = document.createElement('a');
      link.href = generatedBadge.badgeImageUrl;
      link.download = `${formData.attendeeName.replace(/\s+/g, '_')}_badge.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Badge downloaded successfully!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download badge');
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
            Your GOSA Convention badge has been created with official branding. Download it or share it on social media.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enhanced Badge Preview */}
          <div className="flex justify-center">
            <div className="relative bg-gradient-to-br from-primary-600 to-secondary-500 p-6 rounded-xl shadow-lg max-w-sm w-full">
              {/* GOSA Logo */}
              <div className="absolute top-4 left-4">
                <img
                  src="/images/gosa.png"
                  alt="GOSA Logo"
                  className="w-12 h-12 object-contain"
                />
              </div>

              {/* Convention Title */}
              <div className="text-center mb-4 pt-8">
                <h3 className="text-white font-bold text-lg">GOSA CONVENTION</h3>
                <p className="text-white/90 text-sm">2024</p>
              </div>

              {/* Badge Image */}
              <div className="relative mx-auto mb-4">
                <img
                  src={generatedBadge.badgeImageUrl}
                  alt="Generated Badge"
                  className="w-full rounded-lg shadow-md border-4 border-white/20"
                />
              </div>

              {/* Attendee Info */}
              <div className="text-center text-white">
                <h4 className="font-bold text-lg mb-1">{formData.attendeeName}</h4>
                {formData.attendeeTitle && (
                  <p className="text-white/90 text-sm mb-1">{formData.attendeeTitle}</p>
                )}
                {formData.organization && (
                  <p className="text-white/80 text-xs">{formData.organization}</p>
                )}
              </div>

              {/* Decorative Elements */}
              <div className="absolute bottom-4 right-4 opacity-20">
                <div className="w-16 h-16 border-2 border-white rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">2024</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={handleDownloadBadge}
              className="flex items-center gap-2 bg-gradient-to-r from-primary-600 to-secondary-500 hover:from-primary-700 hover:to-secondary-600 text-white shadow-md"
            >
              <ImageIcon className="h-4 w-4" />
              Download Badge
            </Button>
            <Button
              variant="outline"
              className="border-primary-300 text-primary-600 hover:bg-primary-50"
              onClick={() => {
                setGeneratedBadge(null);
                setSelectedFile(null);
                setPreviewUrl(null);
                setFormData({ attendeeName: '', attendeeTitle: '', organization: '' });
              }}
            >
              Generate Another
            </Button>
          </div>

          <div className="text-center text-sm bg-gray-50 p-3 rounded-lg">
            <p className="text-gray-600">Badge created on {new Date(generatedBadge.createdAt).toLocaleDateString()}</p>
            <p className="text-gray-500 text-xs mt-1">High-resolution PNG format • Perfect for social media</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto bg-white/90 backdrop-blur-sm border border-primary-200 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-primary-50 to-secondary-50">
        <CardTitle className="text-gray-900">Generate Your GOSA Convention Badge</CardTitle>
        <CardDescription className="text-gray-600">
          Create a personalized badge with official GOSA branding. Upload your photo and provide your details.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
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
                  className="w-32 h-32 object-cover rounded-full mx-auto"
                />
                <p className="text-sm text-muted-foreground">
                  Click to change photo or drag a new one here
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Upload your photo</p>
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
              onChange={(e) => handleInputChange('attendeeName', e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title/Position (Optional)</Label>
            <Input
              id="title"
              placeholder="e.g., Pastor, Elder, Deacon"
              value={formData.attendeeTitle}
              onChange={(e) => handleInputChange('attendeeTitle', e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="organization">Church/Organization (Optional)</Label>
            <Input
              id="organization"
              placeholder="e.g., First Baptist Church"
              value={formData.organization}
              onChange={(e) => handleInputChange('organization', e.target.value)}
              maxLength={150}
            />
          </div>
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerateBadge}
          disabled={isGenerating || !selectedFile || !formData.attendeeName.trim()}
          className="w-full bg-gradient-to-r from-primary-600 to-secondary-500 hover:from-primary-700 hover:to-secondary-600 text-white shadow-md"
          size="lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating Your Badge...
            </>
          ) : (
            <>
              <ImageIcon className="h-4 w-4 mr-2" />
              Generate GOSA Badge
            </>
          )}
        </Button>

        <div className="text-xs text-gray-600 text-center bg-gray-50 p-3 rounded-lg">
          <p className="font-medium">Your badge will include:</p>
          <p>• Official GOSA logo and branding</p>
          <p>• High-resolution format for printing and sharing</p>
          <p>• Option to share in our community gallery</p>
        </div>
      </CardContent>
    </Card>
  );
}