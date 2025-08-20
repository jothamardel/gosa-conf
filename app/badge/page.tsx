// 'use client';

// import { useState, useEffect } from 'react';
// import { BadgeGenerator } from '@/components/badge/badge-generator';
// import { BadgePreview } from '@/components/badge/badge-preview';
// import { SocialShareButtons } from '@/components/badge/social-share-buttons';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import { Alert, AlertDescription } from '@/components/ui/alert';
// import { Badge, Image as ImageIcon, Images } from 'lucide-react';

// // This would come from auth in a real app
// const DEMO_USER_ID = '';

// export default function BadgePage() {
//   const [existingBadge, setExistingBadge] = useState<any>(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     checkExistingBadge();
//   }, []);

//   const checkExistingBadge = async () => {
//     try {
//       const response = await fetch(`/api/v1/badge/generate?userId=${DEMO_USER_ID}`);
//       const result = await response.json();

//       if (result.success) {
//         setExistingBadge(result.data);
//       }
//     } catch (error) {
//       console.error('Error checking existing badge:', error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleBadgeGenerated = (badge: any) => {
//     setExistingBadge(badge);
//   };

//   const handleShareToggle = (shared: boolean) => {
//     if (existingBadge) {
//       setExistingBadge({
//         ...existingBadge,
//         socialMediaShared: shared
//       });
//     }
//   };

//   if (loading) {
//     return (
//       <div className="container mx-auto px-4 py-8">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
//           <p>Loading badge information...</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
//       <div className="container mx-auto px-4 py-8">
//         <div className="text-center mb-8">
//           <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-primary-600 to-secondary-500 rounded-full mb-4 shadow-lg">
//             <Badge className="w-8 h-8 text-white" />
//           </div>
//           <h1 className="text-4xl font-bold text-gray-900 mb-4">GOSA Convention Badge</h1>
//           <p className="text-lg text-gray-600 max-w-2xl mx-auto">
//             Create your personalized GOSA Convention badge with the official branding.
//             Show your participation and connect with fellow attendees.
//           </p>
//         </div>

//         {existingBadge ? (
//           <Tabs defaultValue="preview" className="max-w-4xl mx-auto">
//             <TabsList className="grid w-full grid-cols-3">
//               <TabsTrigger value="preview">Your Badge</TabsTrigger>
//               <TabsTrigger value="share">Share</TabsTrigger>
//               <TabsTrigger value="generate">Generate New</TabsTrigger>
//             </TabsList>

//             <TabsContent value="preview" className="mt-6">
//               <div className="flex justify-center">
//                 <BadgePreview
//                   badge={existingBadge}
//                   onShareToggle={handleShareToggle}
//                 />
//               </div>
//             </TabsContent>

//             <TabsContent value="share" className="mt-6">
//               <Card className="max-w-md mx-auto">
//                 <CardHeader>
//                   <CardTitle className="flex items-center gap-2">
//                     <ImageIcon className="h-5 w-5" />
//                     Share Your Badge
//                   </CardTitle>
//                 </CardHeader>
//                 <CardContent>
//                   <SocialShareButtons
//                     badgeImageUrl={existingBadge.badgeImageUrl}
//                     attendeeName={existingBadge.attendeeName}
//                   />
//                 </CardContent>
//               </Card>
//             </TabsContent>

//             <TabsContent value="generate" className="mt-6">
//               <Alert className="mb-6">
//                 <AlertDescription>
//                   You already have a badge. Generating a new one will replace your existing badge.
//                 </AlertDescription>
//               </Alert>
//               <BadgeGenerator
//                 userId={DEMO_USER_ID}
//                 onBadgeGenerated={handleBadgeGenerated}
//               />
//             </TabsContent>
//           </Tabs>
//         ) : (
//           <BadgeGenerator
//             userId={DEMO_USER_ID}
//             onBadgeGenerated={handleBadgeGenerated}
//           />
//         )}

//         {/* Info Section */}
//         <div className="mt-12 max-w-4xl mx-auto">
//           <div className="grid md:grid-cols-3 gap-6">
//             <Card className="bg-white/80 backdrop-blur-sm border border-primary-200 shadow-lg">
//               <CardHeader>
//                 <CardTitle className="flex items-center gap-2 text-lg text-primary-700">
//                   <Badge className="h-5 w-5" />
//                   Official GOSA Design
//                 </CardTitle>
//               </CardHeader>
//               <CardContent>
//                 <p className="text-sm text-gray-600">
//                   Your badge features the official GOSA logo and branding with a professional layout
//                   suitable for social media and professional networks.
//                 </p>
//               </CardContent>
//             </Card>

//             <Card className="bg-white/80 backdrop-blur-sm border border-secondary-200 shadow-lg">
//               <CardHeader>
//                 <CardTitle className="flex items-center gap-2 text-lg text-secondary-700">
//                   <ImageIcon className="h-5 w-5" />
//                   High Quality Output
//                 </CardTitle>
//               </CardHeader>
//               <CardContent>
//                 <p className="text-sm text-gray-600">
//                   Generated badges are high-resolution PNG images perfect for printing,
//                   sharing online, or using as profile pictures across platforms.
//                 </p>
//               </CardContent>
//             </Card>

//             <Card className="bg-white/80 backdrop-blur-sm border border-primary-200 shadow-lg">
//               <CardHeader>
//                 <CardTitle className="flex items-center gap-2 text-lg text-primary-700">
//                   <Images className="h-5 w-5" />
//                   Community Gallery
//                 </CardTitle>
//               </CardHeader>
//               <CardContent>
//                 <p className="text-sm text-gray-600">
//                   Share your badge in our community gallery to connect with other
//                   attendees and showcase your participation in the convention.
//                 </p>
//               </CardContent>
//             </Card>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
'use client';

import { useState } from 'react';
import { BadgeGenerator } from '@/components/badge/badge-generator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, Calendar, ImageIcon, MapPin, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';

const DEMO_USER_ID = '';
const CONVENTION_YEAR = '2025';

export default function BadgePage() {
  const [previewData, setPreviewData] = useState({
    name: '',
    imageUrl: '',
    title: 'ATTENDEE' // Default title
  });
  const [showPreview, setShowPreview] = useState(true); // New state to control preview visibility

  const handleBadgeGenerated = (badge: any) => {
    setShowPreview(false); // Hide preview when badge is generated
    triggerDownload();
  };

  const handlePreviewUpdate = (name: string, imageUrl: string) => {
    setPreviewData(prev => ({
      ...prev,
      name,
      imageUrl
    }));
    setShowPreview(true); // Show preview when data is being updated
  };

  const triggerDownload = () => {
    if (!previewData.imageUrl || !previewData.name) return;
   
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-50 to-green-50">
      {/* Header */}
      <header className="text-black">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-4 mb-4 md:mb-0">
            <Link href="/">
            <Image 
                src="/images/gosa.png" 
                alt="GOSA Logo" 
                width={48} 
                height={48} 
                className="rounded-full border-2 border-white"
              />
</Link>
              <div>
                <h1 className="text-2xl font-bold">GOSA Convention {CONVENTION_YEAR}</h1>
                <p className="text-yellow-800">Create Your Digital Badge</p>
              </div>
            </div>
            <Button variant="outline" className="bg-white/10 hover:bg-white/20 hidden md-flex border-green-600">
              <Badge className="mr-2 h-4 w-4" />
              My Badges
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left side - Form */}
          <div className={showPreview ? "lg:w-1/2" : "lg:w-full"}>
            <Card className="border-none shadow-none bg-transparent">
              <CardContent className="bg-white rounded-lg p-6 shadow-md">
                <BadgeGenerator
                  userId={DEMO_USER_ID}
                  onBadgeGenerated={handleBadgeGenerated}
                  onPreviewUpdate={handlePreviewUpdate}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right side - Preview - Only shown when showPreview is true */}
          {showPreview && (
            <div className="lg:w-1/2 sticky top-4 h-fit">
              <Card className="border border-gray-200 bg-white shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg font-medium text-gray-700 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-green-600" />
                    Badge Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-center">
                    <div className="w-full max-w-xs rounded-xl bg-gradient-to-b from-green-100 to-yellow-50 p-6 text-center border-2 border-green-200 shadow-inner">
                      {/* Badge Design */}
                      <div className="mb-6">
                        <div className='flex gap-2 items-center justify-center mb-4'>
                          <Image 
                            src={'/images/gosa.png'} 
                            alt="GOSA Logo" 
                            width={48} 
                            height={48} 
                            className="rounded-full border-2 border-green-500"
                          />
                          <p className="text-xl font-medium text-green-800">
                            GOSA Convention 2025
                          </p>
                        </div>
                        
                        <div className="h-1 bg-gradient-to-r from-green-500 to-yellow-500 w-16 mx-auto mb-4 rounded-full"></div>
                        <h3 className="text-sm font-semibold uppercase tracking-widest text-green-600">
                          {previewData.title}
                        </h3>
                      </div>

                      {/* Profile Image */}
                      <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-yellow-100 to-green-100 border-4 border-yellow-300 overflow-hidden mx-auto mb-4 shadow-md">
                        {previewData.imageUrl ? (
                          <img 
                            src={previewData.imageUrl} 
                            alt="Preview" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <Upload className="w-8 h-8" />
                          </div>
                        )}
                      </div>

                      {/* Name */}
                      <div className="mb-6">
                        <h2 className="text-2xl font-bold text-green-900">
                          {previewData.name || 'Your Name'}
                        </h2>
                        <p className="text-green-700 mt-2 font-medium">
                          WILL BE ATTENDING
                        </p>
                      </div>

                      {/* Convention Info */}
                      <div className="border-t border-green-200 pt-4 space-y-2">
                        <div className="flex items-center justify-center gap-2 text-green-800">
                          <Calendar className="w-4 h-4" />
                          <p className="text-sm font-medium">
                            23rd - 25th August {CONVENTION_YEAR}
                          </p>
                        </div>
                        <div className="flex items-center justify-center gap-2 text-green-800">
                          <MapPin className="w-4 h-4" />
                          <p className="text-sm font-medium">
                            GOSA Convention Center
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}