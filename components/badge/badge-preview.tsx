'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Share2, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface BadgePreviewProps {
  badge: {
    badgeId: string;
    badgeImageUrl: string;
    attendeeName: string;
    attendeeTitle?: string;
    organization?: string;
    socialMediaShared: boolean;
    downloadCount: number;
    createdAt: string;
  };
  onShareToggle?: (shared: boolean) => void;
  showActions?: boolean;
}

export function BadgePreview({ badge, onShareToggle, showActions = true }: BadgePreviewProps) {
  const [isShared, setIsShared] = useState(badge.socialMediaShared);
  const [downloadCount, setDownloadCount] = useState(badge.downloadCount);

  useEffect(() => {
    setIsShared(badge.socialMediaShared);
    setDownloadCount(badge.downloadCount);
  }, [badge]);

  const handleDownload = async () => {
    try {
      // Increment download count
      await fetch('/api/v1/badge/gallery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          badgeId: badge.badgeId,
          action: 'download'
        })
      });

      // Download the badge
      const link = document.createElement('a');
      link.href = badge.badgeImageUrl;
      link.download = `${badge.attendeeName.replace(/\s+/g, '_')}_badge.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloadCount(prev => prev + 1);
      toast.success('Badge downloaded successfully!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download badge');
    }
  };

  const handleShareToggle = async () => {
    try {
      const newSharedState = !isShared;

      const response = await fetch(`/api/v1/badge/${badge.badgeId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          socialMediaShared: newSharedState
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error);
      }

      setIsShared(newSharedState);

      if (onShareToggle) {
        onShareToggle(newSharedState);
      }

      toast.success(
        newSharedState
          ? 'Badge shared to gallery!'
          : 'Badge removed from gallery'
      );
    } catch (error) {
      console.error('Share toggle error:', error);
      toast.error('Failed to update sharing status');
    }
  };

  return (
    <Card className="w-full max-w-md bg-white/90 backdrop-blur-sm border border-primary-200 shadow-xl">
      <CardHeader className="pb-3 bg-gradient-to-r from-primary-50 to-secondary-50">
        <CardTitle className="text-lg text-gray-900">{badge.attendeeName}</CardTitle>
        {badge.attendeeTitle && (
          <p className="text-sm text-primary-600 font-medium">{badge.attendeeTitle}</p>
        )}
        {badge.organization && (
          <p className="text-sm text-gray-600">{badge.organization}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Badge Preview with GOSA Branding */}
        <div className="relative bg-gradient-to-br from-primary-600 to-secondary-500 p-6 rounded-xl shadow-lg">
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
            <p className="text-white/90 text-sm">2025</p>
          </div>

          {/* Badge Image */}
          <div className="relative mx-auto mb-4">
            <img
              src={badge.badgeImageUrl}
              alt={`${badge.attendeeName}'s Badge`}
              className="w-full max-w-sm rounded-lg shadow-md border-4 border-white/20"
            />
            <div className="absolute top-2 right-2 flex gap-1">
              {isShared && (
                <Badge className="bg-white/20 text-white text-xs backdrop-blur-sm">
                  <Share2 className="h-3 w-3 mr-1" />
                  Shared
                </Badge>
              )}
            </div>
          </div>

          {/* Attendee Info */}
          <div className="text-center text-white">
            <h3>I WILL BE ATTENDING</h3>
            <h4 className="font-bold text-lg mb-1">{badge.attendeeName}</h4>
            {badge.attendeeTitle && (
              <p className="text-white/90 text-sm mb-1">{badge.attendeeTitle}</p>
            )}
            {badge.organization && (
              <p className="text-white/80 text-xs">{badge.organization}</p>
            )}
          </div>

          {/* Decorative Elements */}
          <div className="absolute bottom-4 right-4 opacity-20">
            <div className="w-16 h-16 border-2 border-white rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">2025</span>
            </div>
          </div>
        </div>

        {showActions && (
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <Button
                onClick={handleDownload}
                size="sm"
                className="flex-1 bg-gradient-to-r from-primary-600 to-secondary-500 hover:from-primary-700 hover:to-secondary-600 text-white shadow-md"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Badge
              </Button>
              <Button
                onClick={handleShareToggle}
                variant={isShared ? "default" : "outline"}
                size="sm"
                className={`flex-1 ${isShared ? 'bg-primary-600 hover:bg-primary-700' : 'border-primary-300 text-primary-600 hover:bg-primary-50'}`}
              >
                <Share2 className="h-4 w-4 mr-2" />
                {isShared ? 'Unshare' : 'Share'}
              </Button>
            </div>

            <div className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded-lg">
              <span className="flex items-center gap-1 text-gray-600">
                <Download className="h-3 w-3" />
                <span className="font-medium">{downloadCount}</span> downloads
              </span>
              <span className="text-gray-500">
                Created {new Date(badge.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}