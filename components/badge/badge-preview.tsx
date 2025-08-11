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
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{badge.attendeeName}</CardTitle>
        {badge.attendeeTitle && (
          <p className="text-sm text-muted-foreground">{badge.attendeeTitle}</p>
        )}
        {badge.organization && (
          <p className="text-sm text-muted-foreground">{badge.organization}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <img
            src={badge.badgeImageUrl}
            alt={`${badge.attendeeName}'s Badge`}
            className="w-full rounded-lg shadow-md"
          />
          <div className="absolute top-2 right-2 flex gap-1">
            {isShared && (
              <Badge variant="secondary" className="text-xs">
                <Share2 className="h-3 w-3 mr-1" />
                Shared
              </Badge>
            )}
          </div>
        </div>

        {showActions && (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Button
                onClick={handleDownload}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button
                onClick={handleShareToggle}
                variant={isShared ? "default" : "outline"}
                size="sm"
                className="flex-1"
              >
                <Share2 className="h-4 w-4 mr-2" />
                {isShared ? 'Unshare' : 'Share'}
              </Button>
            </div>
            
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Download className="h-3 w-3" />
                {downloadCount} downloads
              </span>
              <span>
                Created {new Date(badge.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}