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
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-primary-600 to-secondary-500 rounded-full mb-4 shadow-lg">
          <ImageIcon className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">GOSA Convention Badge Gallery</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Discover and download badges created by our convention attendees.
          Each badge showcases the official GOSA branding and community spirit.
        </p>
        {pagination && (
          <div className="flex items-center justify-center gap-4 mt-4 text-sm text-gray-500">
            <div className="flex items-center gap-1 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full border border-primary-200">
              <Users className="h-4 w-4 text-primary-600" />
              <span className="font-medium">{pagination.totalBadges} badges</span>
            </div>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="max-w-md mx-auto mb-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search badges by name, title, or organization..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white/80 backdrop-blur-sm border-primary-200 focus:border-primary-500 focus:ring-primary-500/20"
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
            <Card key={badge.badgeId} className="overflow-hidden bg-white/80 backdrop-blur-sm border border-primary-200 hover:shadow-xl hover:border-primary-300 transition-all duration-300 transform hover:scale-[1.02]">
              <div className="relative">
                <img
                  src={badge.badgeImageUrl}
                  alt={`${badge.attendeeName}'s Badge`}
                  className="w-full h-64 object-cover"
                />
                <div className="absolute top-2 right-2">
                  <Badge className="bg-primary-600 text-white text-xs shadow-lg">
                    <Download className="h-3 w-3 mr-1" />
                    {badge.downloadCount}
                  </Badge>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-lg mb-1 text-gray-900">{badge.attendeeName}</h3>
                {badge.attendeeTitle && (
                  <p className="text-sm text-primary-600 mb-1 font-medium">{badge.attendeeTitle}</p>
                )}
                {badge.organization && (
                  <p className="text-sm text-gray-600 mb-3">{badge.organization}</p>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {new Date(badge.createdAt).toLocaleDateString()}
                  </span>
                  <Button
                    onClick={() => handleDownload(badge)}
                    size="sm"
                    className="bg-gradient-to-r from-primary-600 to-secondary-500 hover:from-primary-700 hover:to-secondary-600 text-white shadow-md"
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


// 'use client';

// import { useState, useEffect, useCallback } from 'react';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { Badge } from '@/components/ui/badge';
// import { Skeleton } from '@/components/ui/skeleton';
// import { Alert, AlertDescription } from '@/components/ui/alert';
// import {
//   Search,
//   Download,
//   Share2,
//   ChevronLeft,
//   ChevronRight,
//   Users,
//   Image,
//   RefreshCw,
//   Calendar,
//   MapPin,
//   Eye,
//   Filter,
//   X,
//   ImageIcon
// } from 'lucide-react';
// import { toast } from 'sonner';

// interface BadgeData {
//   badgeId: string;
//   badgeImageUrl: string;
//   attendeeName: string;
//   attendeeTitle?: string;
//   organization?: string;
//   downloadCount: number;
//   viewCount?: number;
//   createdAt: string;
//   updatedAt?: string;
//   user?: {
//     name: string;
//     email: string;
//   };
// }

// interface PaginationData {
//   currentPage: number;
//   totalPages: number;
//   totalBadges: number;
//   hasNextPage: boolean;
//   hasPrevPage: boolean;
// }

// interface BadgeGalleryProps {
//   refreshTrigger?: number;
//   onBadgeView?: (badgeId: string) => void;
// }

// export function BadgeGallery({ refreshTrigger, onBadgeView }: BadgeGalleryProps) {
//   const [badges, setBadges] = useState<BadgeData[]>([]);
//   const [pagination, setPagination] = useState<PaginationData | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [searchTerm, setSearchTerm] = useState('');
//   const [currentPage, setCurrentPage] = useState(1);
//   const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'name'>('newest');
//   const [filterTitle, setFilterTitle] = useState<string>('');
  
//   // Auto refresh interval
//   const [autoRefresh, setAutoRefresh] = useState(true);
//   const AUTO_REFRESH_INTERVAL = 30000; // 30 seconds

//   const fetchBadges = useCallback(async (page: number = 1, showRefreshing: boolean = false) => {
//     try {
//       if (showRefreshing) {
//         setRefreshing(true);
//       } else {
//         setLoading(true);
//       }
//       setError(null);

//       const params = new URLSearchParams({
//         page: page.toString(),
//         limit: '12',
//         sortBy,
//         ...(searchTerm && { search: searchTerm }),
//         ...(filterTitle && { title: filterTitle })
//       });

//       const response = await fetch(`/api/v1/badge/gallery?${params}`);
      
//       if (!response.ok) {
//         throw new Error(`HTTP ${response.status}: ${response.statusText}`);
//       }

//       const result = await response.json();

//       if (!result.success) {
//         throw new Error(result.error || 'Failed to fetch badges');
//       }

//       setBadges(result.data.badges || []);
//       setPagination(result.data.pagination || null);

//       // Show success toast only on manual refresh
//       if (showRefreshing) {
//         toast.success('Gallery updated!', {
//           description: `Found ${result.data.pagination?.totalBadges || 0} badges`,
//           duration: 2000
//         });
//       }

//     } catch (error: any) {
//       console.error('Fetch badges error:', error);
//       const errorMessage = error.message || 'Failed to load badges';
//       setError(errorMessage);
      
//       // Show error toast
//       toast.error('Failed to load badges', {
//         description: errorMessage,
//         duration: 4000
//       });
//     } finally {
//       setLoading(false);
//       setRefreshing(false);
//     }
//   }, [searchTerm, sortBy, filterTitle]);

//   // Initial load and page changes
//   useEffect(() => {
//     fetchBadges(currentPage);
//   }, [currentPage, fetchBadges]);

//   // Handle external refresh trigger
//   useEffect(() => {
//     if (refreshTrigger) {
//       fetchBadges(currentPage, true);
//     }
//   }, [refreshTrigger, currentPage, fetchBadges]);

//   // Auto refresh effect
//   useEffect(() => {
//     if (!autoRefresh) return;

//     const interval = setInterval(() => {
//       // Only auto-refresh if not currently loading
//       if (!loading && !refreshing) {
//         fetchBadges(currentPage, false);
//       }
//     }, AUTO_REFRESH_INTERVAL);

//     return () => clearInterval(interval);
//   }, [autoRefresh, currentPage, fetchBadges, loading, refreshing]);

//   // Search and filter effects
//   useEffect(() => {
//     const timeoutId = setTimeout(() => {
//       if (currentPage !== 1) {
//         setCurrentPage(1);
//       } else {
//         fetchBadges(1);
//       }
//     }, 500);

//     return () => clearTimeout(timeoutId);
//   }, [searchTerm, sortBy, filterTitle]);

//   const handleDownload = async (badge: BadgeData) => {
//     try {
//       // Track download
//       const trackResponse = await fetch('/api/v1/badge/track', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json'
//         },
//         body: JSON.stringify({
//           badgeId: badge.badgeId,
//           action: 'download'
//         })
//       });

//       // Download the badge image
//       const response = await fetch(badge.badgeImageUrl);
//       const blob = await response.blob();
//       const url = window.URL.createObjectURL(blob);
      
//       const link = document.createElement('a');
//       link.href = url;
//       link.download = `${badge.attendeeName.replace(/\s+/g, '_')}_GOSA_Convention_2025_Badge.png`;
//       document.body.appendChild(link);
//       link.click();
//       document.body.removeChild(link);
      
//       // Clean up the URL
//       window.URL.revokeObjectURL(url);

//       // Update local state optimistically
//       setBadges(prev => prev.map(b =>
//         b.badgeId === badge.badgeId
//           ? { ...b, downloadCount: b.downloadCount + 1 }
//           : b
//       ));

//       toast.success('Badge downloaded!', {
//         description: `${badge.attendeeName}'s badge saved successfully`,
//         duration: 3000
//       });

//     } catch (error) {
//       console.error('Download error:', error);
//       toast.error('Download failed', {
//         description: 'Please try again or check your connection',
//         duration: 4000
//       });
//     }
//   };

//   const handleBadgeView = async (badge: BadgeData) => {
//     try {
//       // Track view
//       await fetch('/api/v1/badge/track', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json'
//         },
//         body: JSON.stringify({
//           badgeId: badge.badgeId,
//           action: 'view'
//         })
//       });

//       // Update local state optimistically
//       setBadges(prev => prev.map(b =>
//         b.badgeId === badge.badgeId
//           ? { ...b, viewCount: (b.viewCount || 0) + 1 }
//           : b
//       ));

//       // Call parent callback if provided
//       onBadgeView?.(badge.badgeId);

//     } catch (error) {
//       console.error('View tracking error:', error);
//     }
//   };

//   const handlePageChange = (page: number) => {
//     setCurrentPage(page);
//     window.scrollTo({ top: 0, behavior: 'smooth' });
//   };

//   const handleManualRefresh = () => {
//     fetchBadges(currentPage, true);
//   };

//   const clearFilters = () => {
//     setSearchTerm('');
//     setFilterTitle('');
//     setSortBy('newest');
//     setCurrentPage(1);
//   };

//   const filteredBadgesCount = badges.length;
//   const hasFilters = searchTerm || filterTitle || sortBy !== 'newest';

//   if (loading && badges.length === 0) {
//     return (
//       <div className="space-y-6">
//         <div className="text-center">
//           <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-600 to-yellow-500 rounded-full mb-4 shadow-lg animate-pulse">
//             <ImageIcon className="w-8 h-8 text-white" />
//           </div>
//           <h2 className="text-3xl font-bold mb-2">Loading Badge Gallery</h2>
//           <p className="text-muted-foreground">Fetching the latest convention badges...</p>
//         </div>
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
//           {Array.from({ length: 8 }).map((_, i) => (
//             <Card key={i} className="overflow-hidden">
//               <Skeleton className="h-64 w-full" />
//               <CardContent className="p-4">
//                 <Skeleton className="h-4 w-3/4 mb-2" />
//                 <Skeleton className="h-3 w-1/2 mb-2" />
//                 <Skeleton className="h-8 w-full" />
//               </CardContent>
//             </Card>
//           ))}
//         </div>
//       </div>
//     );
//   }

//   if (error && badges.length === 0) {
//     return (
//       <div className="space-y-6">
//         <Alert variant="destructive" className="max-w-2xl mx-auto">
//           <AlertDescription className="flex items-center justify-between">
//             <span>{error}</span>
//             <Button
//               onClick={handleManualRefresh}
//               variant="outline"
//               size="sm"
//               disabled={refreshing}
//             >
//               {refreshing ? (
//                 <RefreshCw className="h-4 w-4 animate-spin" />
//               ) : (
//                 <RefreshCw className="h-4 w-4" />
//               )}
//             </Button>
//           </AlertDescription>
//         </Alert>
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-6">
//       {/* Header */}
//       <div className="text-center mb-8">
//         <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-600 to-yellow-500 rounded-full mb-4 shadow-lg">
//           <Image className="w-8 h-8 text-white" />
//         </div>
//         <h2 className="text-3xl font-bold text-gray-900 mb-2">GOSA Convention Badge Gallery</h2>
//         <p className="text-gray-600 max-w-2xl mx-auto">
//           Discover and download badges created by our convention attendees.
//           Each badge showcases the official GOSA branding and community spirit.
//         </p>
        
//         {/* Stats */}
//         {pagination && (
//           <div className="flex items-center justify-center gap-4 mt-4 text-sm text-gray-500">
//             <div className="flex items-center gap-1 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full border border-green-200">
//               <Users className="h-4 w-4 text-green-600" />
//               <span className="font-medium">{pagination.totalBadges} badges</span>
//             </div>
//             <div className="flex items-center gap-1 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full border border-green-200">
//               <Calendar className="h-4 w-4 text-green-600" />
//               <span className="font-medium">Live Updates</span>
//             </div>
//           </div>
//         )}
//       </div>

//       {/* Controls */}
//       <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
//         {/* Search */}
//         <div className="flex-1 max-w-md">
//           <div className="relative">
//             <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
//             <Input
//               placeholder="Search by name, title, or organization..."
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//               className="pl-10 bg-white/80 backdrop-blur-sm border-green-200 focus:border-green-500 focus:ring-green-500/20"
//             />
//           </div>
//         </div>

//         {/* Controls */}
//         <div className="flex gap-2 items-center">
//           {/* Sort */}
//           <select
//             value={sortBy}
//             onChange={(e) => setSortBy(e.target.value as any)}
//             className="px-3 py-2 text-sm border border-green-200 rounded-lg bg-white/80 focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
//           >
//             <option value="newest">Newest First</option>
//             <option value="popular">Most Downloaded</option>
//             <option value="name">Name A-Z</option>
//           </select>

//           {/* Refresh */}
//           <Button
//             onClick={handleManualRefresh}
//             variant="outline"
//             size="sm"
//             disabled={refreshing}
//             className="border-green-200 hover:bg-green-50"
//           >
//             <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
//           </Button>

//           {/* Clear filters */}
//           {hasFilters && (
//             <Button
//               onClick={clearFilters}
//               variant="outline"
//               size="sm"
//               className="border-red-200 text-red-600 hover:bg-red-50"
//             >
//               <X className="h-4 w-4 mr-1" />
//               Clear
//             </Button>
//           )}
//         </div>
//       </div>

//       {/* Auto-refresh indicator */}
//       <div className="flex items-center justify-between text-xs text-gray-500">
//         <div className="flex items-center gap-2">
//           <div className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
//           <span>Auto-refresh: {autoRefresh ? 'ON' : 'OFF'}</span>
//           <Button
//             onClick={() => setAutoRefresh(!autoRefresh)}
//             variant="ghost"
//             size="sm"
//             className="h-auto p-1 text-xs"
//           >
//             {autoRefresh ? 'Disable' : 'Enable'}
//           </Button>
//         </div>
//         {refreshing && (
//           <div className="flex items-center gap-1">
//             <RefreshCw className="h-3 w-3 animate-spin" />
//             <span>Refreshing...</span>
//           </div>
//         )}
//       </div>

//       {/* Badges Grid */}
//       {filteredBadgesCount === 0 ? (
//         <div className="text-center py-12">
//           <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
//           <h3 className="text-lg font-semibold mb-2">No badges found</h3>
//           <p className="text-muted-foreground mb-4">
//             {hasFilters ? 'Try adjusting your search terms or filters' : 'No badges have been created yet'}
//           </p>
//           {hasFilters && (
//             <Button onClick={clearFilters} variant="outline" size="sm">
//               Clear Filters
//             </Button>
//           )}
//         </div>
//       ) : (
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
//           {badges.map((badge) => (
//             <Card 
//               key={badge.badgeId} 
//               className="overflow-hidden bg-white/80 backdrop-blur-sm border border-green-200 hover:shadow-xl hover:border-green-300 transition-all duration-300 transform hover:scale-[1.02] cursor-pointer"
//               onClick={() => handleBadgeView(badge)}
//             >
//               <div className="relative">
//                 <img
//                   src={badge.badgeImageUrl}
//                   alt={`${badge.attendeeName}'s Badge`}
//                   className="w-full h-64 object-cover"
//                   loading="lazy"
//                 />
//                 <div className="absolute top-2 right-2 flex gap-1">
//                   <Badge className="bg-green-600 text-white text-xs shadow-lg">
//                     <Download className="h-3 w-3 mr-1" />
//                     {badge.downloadCount}
//                   </Badge>
//                   {badge.viewCount && (
//                     <Badge className="bg-blue-600 text-white text-xs shadow-lg">
//                       <Eye className="h-3 w-3 mr-1" />
//                       {badge.viewCount}
//                     </Badge>
//                   )}
//                 </div>
//                 <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
//               </div>
//               <CardContent className="p-4">
//                 <h3 className="font-semibold text-lg mb-1 text-gray-900 truncate">
//                   {badge.attendeeName}
//                 </h3>
//                 {badge.attendeeTitle && (
//                   <p className="text-sm text-green-600 mb-1 font-medium truncate">
//                     {badge.attendeeTitle}
//                   </p>
//                 )}
//                 {badge.organization && (
//                   <p className="text-sm text-gray-600 mb-3 truncate">
//                     {badge.organization}
//                   </p>
//                 )}

//                 <div className="flex items-center justify-between">
//                   <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
//                     {new Date(badge.createdAt).toLocaleDateString()}
//                   </span>
//                   <Button
//                     onClick={(e) => {
//                       e.stopPropagation();
//                       handleDownload(badge);
//                     }}
//                     size="sm"
//                     className="bg-gradient-to-r from-green-600 to-yellow-500 hover:from-green-700 hover:to-yellow-600 text-white shadow-md"
//                   >
//                     <Download className="h-3 w-3 mr-1" />
//                     Download
//                   </Button>
//                 </div>
//               </CardContent>
//             </Card>
//           ))}
//         </div>
//       )}

//       {/* Pagination */}
//       {pagination && pagination.totalPages > 1 && (
//         <div className="flex items-center justify-center gap-2 mt-8">
//           <Button
//             onClick={() => handlePageChange(currentPage - 1)}
//             disabled={!pagination.hasPrevPage || loading}
//             variant="outline"
//             size="sm"
//             className="border-green-200 hover:bg-green-50"
//           >
//             <ChevronLeft className="h-4 w-4" />
//             Previous
//           </Button>

//           <div className="flex items-center gap-1">
//             {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
//               let page;
//               if (pagination.totalPages <= 5) {
//                 page = i + 1;
//               } else if (currentPage <= 3) {
//                 page = i + 1;
//               } else if (currentPage >= pagination.totalPages - 2) {
//                 page = pagination.totalPages - 4 + i;
//               } else {
//                 page = currentPage - 2 + i;
//               }

//               return (
//                 <Button
//                   key={page}
//                   onClick={() => handlePageChange(page)}
//                   variant={currentPage === page ? "default" : "outline"}
//                   size="sm"
//                   className={`w-8 h-8 p-0 ${
//                     currentPage === page 
//                       ? 'bg-green-600 hover:bg-green-700' 
//                       : 'border-green-200 hover:bg-green-50'
//                   }`}
//                 >
//                   {page}
//                 </Button>
//               );
//             })}
//           </div>

//           <Button
//             onClick={() => handlePageChange(currentPage + 1)}
//             disabled={!pagination.hasNextPage || loading}
//             variant="outline"
//             size="sm"
//             className="border-green-200 hover:bg-green-50"
//           >
//             Next
//             <ChevronRight className="h-4 w-4" />
//           </Button>
//         </div>
//       )}

//       {/* Loading overlay */}
//       {refreshing && (
//         <div className="fixed bottom-4 right-4 bg-white/90 backdrop-blur-sm border border-green-200 rounded-lg p-3 shadow-lg">
//           <div className="flex items-center gap-2 text-sm text-gray-600">
//             <RefreshCw className="h-4 w-4 animate-spin text-green-600" />
//             Updating gallery...
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }