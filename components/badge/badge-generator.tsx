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
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Badge Generated Successfully!
          </CardTitle>
          <CardDescription>
            Your convention badge has been created. You can download it or share it on social media.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center">
            <img
              src={generatedBadge.badgeImageUrl}
              alt="Generated Badge"
              className="max-w-sm rounded-lg shadow-lg"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={handleDownloadBadge} className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Download Badge
            </Button>
            <Button 
              variant="outline" 
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

          <div className="text-center text-sm text-muted-foreground">
            <p>Badge created on {new Date(generatedBadge.createdAt).toLocaleDateString()}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Generate Your Convention Badge</CardTitle>
        <CardDescription>
          Create a personalized badge for the GOSA Convention. Upload your photo and provide your details.
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
          className="w-full"
          size="lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating Badge...
            </>
          ) : (
            <>
              <ImageIcon className="h-4 w-4 mr-2" />
              Generate Badge
            </>
          )}
        </Button>

        <div className="text-xs text-muted-foreground text-center">
          <p>Your badge will be available for download immediately after generation.</p>
          <p>You can also choose to share it in our public gallery.</p>
        </div>
      </CardContent>
    </Card>
  );
}