'use client';

import { Button } from '@/components/ui/button';
import { 
  Facebook, 
  Twitter, 
  Linkedin, 
  Instagram, 
  Share2, 
  Copy,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';

interface SocialShareButtonsProps {
  badgeImageUrl: string;
  attendeeName: string;
  shareText?: string;
}

export function SocialShareButtons({ 
  badgeImageUrl, 
  attendeeName, 
  shareText = "Check out my GOSA Convention badge!" 
}: SocialShareButtonsProps) {
  
  const shareUrl = typeof window !== 'undefined' ? window.location.origin + '/badge-gallery' : '';
  const fullShareText = `${shareText} #GOSAConvention #ConventionBadge`;

  const handleFacebookShare = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(fullShareText)}`;
    window.open(url, '_blank', 'width=600,height=400');
  };

  const handleTwitterShare = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(fullShareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'width=600,height=400');
  };

  const handleLinkedInShare = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(`${attendeeName}'s Convention Badge`)}&summary=${encodeURIComponent(fullShareText)}`;
    window.open(url, '_blank', 'width=600,height=400');
  };

  const handleInstagramShare = () => {
    // Instagram doesn't support direct URL sharing, so we'll copy the image URL
    navigator.clipboard.writeText(badgeImageUrl).then(() => {
      toast.success('Badge image URL copied! You can now paste it in Instagram.');
    }).catch(() => {
      toast.error('Failed to copy image URL');
    });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast.success('Gallery link copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy link');
    });
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${attendeeName}'s Convention Badge`,
          text: fullShareText,
          url: shareUrl
        });
      } catch (error) {
        console.error('Native share failed:', error);
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium">Share your badge</h4>
      
      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={handleFacebookShare}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <Facebook className="h-4 w-4 text-blue-600" />
          Facebook
        </Button>
        
        <Button
          onClick={handleTwitterShare}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <Twitter className="h-4 w-4 text-blue-400" />
          Twitter
        </Button>
        
        <Button
          onClick={handleLinkedInShare}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <Linkedin className="h-4 w-4 text-blue-700" />
          LinkedIn
        </Button>
        
        <Button
          onClick={handleInstagramShare}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <Instagram className="h-4 w-4 text-pink-600" />
          Instagram
        </Button>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={handleCopyLink}
          variant="outline"
          size="sm"
          className="flex-1 flex items-center gap-2"
        >
          <Copy className="h-4 w-4" />
          Copy Link
        </Button>
        
        {typeof navigator !== 'undefined' && navigator.share && (
          <Button
            onClick={handleNativeShare}
            variant="outline"
            size="sm"
            className="flex-1 flex items-center gap-2"
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        )}
      </div>

      <div className="text-xs text-muted-foreground text-center">
        <p>Share your badge to show your participation in the GOSA Convention!</p>
      </div>
    </div>
  );
}