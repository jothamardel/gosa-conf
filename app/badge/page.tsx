'use client';

import { useState, useEffect } from 'react';
import { BadgeGenerator } from '@/components/badge/badge-generator';
import { BadgePreview } from '@/components/badge/badge-preview';
import { SocialShareButtons } from '@/components/badge/social-share-buttons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge, Image as ImageIcon, Images } from 'lucide-react';

// This would come from auth in a real app
const DEMO_USER_ID = '';

export default function BadgePage() {
  const [existingBadge, setExistingBadge] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkExistingBadge();
  }, []);

  const checkExistingBadge = async () => {
    try {
      const response = await fetch(`/api/v1/badge/generate?userId=${DEMO_USER_ID}`);
      const result = await response.json();

      if (result.success) {
        setExistingBadge(result.data);
      }
    } catch (error) {
      console.error('Error checking existing badge:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBadgeGenerated = (badge: any) => {
    setExistingBadge(badge);
  };

  const handleShareToggle = (shared: boolean) => {
    if (existingBadge) {
      setExistingBadge({
        ...existingBadge,
        socialMediaShared: shared
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading badge information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-primary-600 to-secondary-500 rounded-full mb-4 shadow-lg">
            <Badge className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">GOSA Convention Badge</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Create your personalized GOSA Convention badge with the official branding.
            Show your participation and connect with fellow attendees.
          </p>
        </div>

        {existingBadge ? (
          <Tabs defaultValue="preview" className="max-w-4xl mx-auto">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="preview">Your Badge</TabsTrigger>
              <TabsTrigger value="share">Share</TabsTrigger>
              <TabsTrigger value="generate">Generate New</TabsTrigger>
            </TabsList>

            <TabsContent value="preview" className="mt-6">
              <div className="flex justify-center">
                <BadgePreview
                  badge={existingBadge}
                  onShareToggle={handleShareToggle}
                />
              </div>
            </TabsContent>

            <TabsContent value="share" className="mt-6">
              <Card className="max-w-md mx-auto">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    Share Your Badge
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <SocialShareButtons
                    badgeImageUrl={existingBadge.badgeImageUrl}
                    attendeeName={existingBadge.attendeeName}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="generate" className="mt-6">
              <Alert className="mb-6">
                <AlertDescription>
                  You already have a badge. Generating a new one will replace your existing badge.
                </AlertDescription>
              </Alert>
              <BadgeGenerator
                userId={DEMO_USER_ID}
                onBadgeGenerated={handleBadgeGenerated}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <BadgeGenerator
            userId={DEMO_USER_ID}
            onBadgeGenerated={handleBadgeGenerated}
          />
        )}

        {/* Info Section */}
        <div className="mt-12 max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="bg-white/80 backdrop-blur-sm border border-primary-200 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-primary-700">
                  <Badge className="h-5 w-5" />
                  Official GOSA Design
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Your badge features the official GOSA logo and branding with a professional layout
                  suitable for social media and professional networks.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border border-secondary-200 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-secondary-700">
                  <ImageIcon className="h-5 w-5" />
                  High Quality Output
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Generated badges are high-resolution PNG images perfect for printing,
                  sharing online, or using as profile pictures across platforms.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border border-primary-200 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-primary-700">
                  <Images className="h-5 w-5" />
                  Community Gallery
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Share your badge in our community gallery to connect with other
                  attendees and showcase your participation in the convention.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}