import { BadgeGallery } from '@/components/badge/badge-gallery';

export default function BadgeGalleryPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      <div className="container mx-auto px-4 py-8">
        <BadgeGallery />
      </div>
    </div>
  );
}