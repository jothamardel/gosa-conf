'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search, 
  Download, 
  Share2, 
  ChevronLeft, 
  ChevronRight,
  Users,
  Image as ImageIcon
} from 'lucide-react';
import { toast } from 'sonner';

interface BadgeData {
  badgeId: string;
  badgeImageUrl: string;
  attendeeName: string;
  attendeeTitle?: string;
  organization?: string;
  downloadCount: number;
  createdAt: string;
  user?: {
    name: string;
    email: string;
  };
}

interface PaginationData {
  currentPage: number;
  totalPages: number;
  totalBadges: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export function BadgeGallery() {
  const [badges, setBadges] = useState<BadgeData[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchBadges = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/v1/badge/gallery?page=${page}&limit=12`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch badges');
      }

      setBadges(result.data.badges);
      setPagination(result.data.pagination);
    } catch (error: any) {
      console.error('Fetch badges error:', error);
      setError(error.message || 'Failed to load badges');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBadges(currentPage);
  }, [currentPage]);

  const handleDownload = async (badge: BadgeData) => {
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

      // Update local state
      setBadges(prev => prev.map(b => 
        b.badgeId === badge.badgeId 
          ? { ...b, downloadCount: b.downloadCount + 1 }
          : b
      ));

      toast.success('Badge downloaded successfully!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download badge');
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const filteredBadges = badges.filter(badge =>
    badge.attendeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    badge.attendeeTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    badge.organization?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && badges.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Badge Gallery</h2>
          <p className="text-muted-foreground">Loading convention badges...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-64 w-full" />
              <CardContent className="p-4">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">Convention Badge Gallery</h2>
        <p className="text-muted-foreground">
          Discover badges created by our convention attendees
        </p>
        {pagination && (
          <div className="flex items-center justify-center gap-4 mt-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {pagination.totalBadges} badges
            </div>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="max-w-md mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search badges by name, title, or organization..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Badges Grid */}
      {filteredBadges.length === 0 ? (
        <div className="text-center py-12">
          <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No badges found</h3>
          <p className="text-muted-foreground">
            {searchTerm ? 'Try adjusting your search terms' : 'No badges have been shared yet'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredBadges.map((badge) => (
            <Card key={badge.badgeId} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative">
                <img
                  src={badge.badgeImageUrl}
                  alt={`${badge.attendeeName}'s Badge`}
                  className="w-full h-64 object-cover"
                />
                <div className="absolute top-2 right-2">
                  <Badge variant="secondary" className="text-xs">
                    <Download className="h-3 w-3 mr-1" />
                    {badge.downloadCount}
                  </Badge>
                </div>
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-lg mb-1">{badge.attendeeName}</h3>
                {badge.attendeeTitle && (
                  <p className="text-sm text-muted-foreground mb-1">{badge.attendeeTitle}</p>
                )}
                {badge.organization && (
                  <p className="text-sm text-muted-foreground mb-3">{badge.organization}</p>
                )}
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {new Date(badge.createdAt).toLocaleDateString()}
                  </span>
                  <Button
                    onClick={() => handleDownload(badge)}
                    size="sm"
                    variant="outline"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Download
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={!pagination.hasPrevPage || loading}
            variant="outline"
            size="sm"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              const page = i + 1;
              return (
                <Button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  className="w-8 h-8 p-0"
                >
                  {page}
                </Button>
              );
            })}
          </div>

          <Button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={!pagination.hasNextPage || loading}
            variant="outline"
            size="sm"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}