import { Types } from 'mongoose';
import { AttendeeBadge, IAttendeeBadge } from '../schema/badge.schema';
import { VercelBlobService } from '../services/vercel-blob.service';

// Dynamic import for Sharp to handle production environment issues
let sharp: any = null;
try {
  sharp = require('sharp');
} catch (error) {
  console.warn('[BADGE-UTILS] Sharp not available, badge generation will use fallback:', (error as Error).message);
}

export interface BadgeData {
  userId: string;
  profilePhoto: Buffer;
  profilePhotoFilename: string;
  attendeeName: string;
  attendeeTitle?: string;
  organization?: string;
}

export interface BadgeTemplate {
  width: number;
  height: number;
  backgroundColor: string;
  logoUrl: string;
  fontFamily: string;
  textColor: string;
  titleColor: string;
  orgColor: string;
}

export interface UserDetails {
  name: string;
  title?: string;
  organization?: string;
}

export class BadgeUtils {
  private static readonly DEFAULT_TEMPLATE: BadgeTemplate = {
    width: 800,
    height: 1000,
    backgroundColor: '#FFFFFF',
    logoUrl: '/images/gosa.png',
    fontFamily: 'Arial, sans-serif',
    textColor: '#16A34A',
    titleColor: '#374151',
    orgColor: '#6B7280'
  };

  /**
   * Create a new badge for an attendee
   */
  static async createBadge(data: BadgeData): Promise<IAttendeeBadge> {
    try {
      // Validate profile photo
      const validation = VercelBlobService.validateImageFile(data.profilePhoto, data.profilePhotoFilename);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Check if badge already exists for this user
      const existingBadge = await AttendeeBadge.findOne({ userId: new Types.ObjectId(data.userId) });
      if (existingBadge) {
        throw new Error('Badge already exists for this user');
      }

      // Upload profile photo to Vercel Blob
      const profilePhotoFilename = VercelBlobService.generateFilename(data.profilePhotoFilename, data.userId);
      const profilePhotoUrl = await VercelBlobService.uploadImage(data.profilePhoto, profilePhotoFilename);

      // Generate badge image
      const userDetails: UserDetails = {
        name: data.attendeeName,
        title: data.attendeeTitle,
        organization: data.organization
      };

      const badgeImageBuffer = await this.generateBadgeImage(data.profilePhoto, userDetails);

      // Upload badge image to Vercel Blob
      const badgeFilename = VercelBlobService.generateFilename(`badge_${data.attendeeName}.png`, data.userId);
      const badgeImageUrl = await VercelBlobService.uploadImage(badgeImageBuffer, badgeFilename);

      // Create badge record in database
      const badge = new AttendeeBadge({
        userId: new Types.ObjectId(data.userId),
        badgeImageUrl,
        profilePhotoUrl,
        attendeeName: data.attendeeName,
        attendeeTitle: data.attendeeTitle,
        organization: data.organization,
        socialMediaShared: false,
        downloadCount: 0
      });

      await badge.save();
      return badge;
    } catch (error) {
      console.error('Error creating badge:', error);
      throw error;
    }
  }

  /**
   * Generate badge image with user photo and details
   */
  static async generateBadgeImage(userPhoto: Buffer, userDetails: UserDetails): Promise<Buffer> {
    try {
      // If Sharp is available, use it for high-quality badge generation
      if (sharp) {
        return await this.generateBadgeImageWithSharp(userPhoto, userDetails);
      } else {
        // Fallback to SVG-only badge generation
        return await this.generateBadgeImageFallback(userDetails);
      }
    } catch (error) {
      console.error('Error generating badge image:', error);
      // Ultimate fallback to simple text badge
      return this.generateTextBadgeFallback(userDetails);
    }
  }

  /**
   * Generate badge image using Sharp (high quality)
   */
  private static async generateBadgeImageWithSharp(userPhoto: Buffer, userDetails: UserDetails): Promise<Buffer> {
    const template = this.DEFAULT_TEMPLATE;

    // Process user photo - resize and make circular
    const processedPhoto = await sharp(userPhoto)
      .resize(200, 200, { fit: 'cover' })
      .png()
      .toBuffer();

    // Create circular mask
    const circularMask = Buffer.from(
      `<svg width="200" height="200">
        <circle cx="100" cy="100" r="100" fill="white"/>
      </svg>`
    );

    const circularPhoto = await sharp(processedPhoto)
      .composite([{ input: circularMask, blend: 'dest-in' }])
      .png()
      .toBuffer();

    // Create badge background
    const badgeBackground = await sharp({
      create: {
        width: template.width,
        height: template.height,
        channels: 4,
        background: template.backgroundColor
      }
    })
      .png()
      .toBuffer();

    // Create SVG overlay with text
    const svgOverlay = this.createBadgeSVG(userDetails, template);

    // Composite all elements
    const finalBadge = await sharp(badgeBackground)
      .composite([
        // Add circular photo
        {
          input: circularPhoto,
          top: 150,
          left: 300
        },
        // Add text overlay
        {
          input: Buffer.from(svgOverlay),
          top: 0,
          left: 0
        }
      ])
      .png()
      .toBuffer();

    return finalBadge;
  }

  /**
   * Generate badge image fallback (SVG only, no photo processing)
   */
  private static async generateBadgeImageFallback(userDetails: UserDetails): Promise<Buffer> {
    console.log('[BADGE-UTILS] Using SVG fallback for badge generation');

    const template = this.DEFAULT_TEMPLATE;
    const svgBadge = this.createCompleteBadgeSVG(userDetails, template);

    return Buffer.from(svgBadge, 'utf-8');
  }

  /**
   * Generate simple text badge as ultimate fallback
   */
  private static generateTextBadgeFallback(userDetails: UserDetails): Buffer {
    console.log('[BADGE-UTILS] Using text fallback for badge generation');

    const textBadge = `
GOSA CONVENTION 2025
ATTENDEE BADGE

Name: ${userDetails.name}
${userDetails.title ? `Title: ${userDetails.title}` : ''}
${userDetails.organization ? `Organization: ${userDetails.organization}` : ''}

Welcome to GOSA Convention
www.gosa.org
    `;

    return Buffer.from(textBadge, 'utf-8');
  }

  /**
   * Create SVG overlay with text and logo
   */
  private static createBadgeSVG(userDetails: UserDetails, template: BadgeTemplate): string {
    const { name, title, organization } = userDetails;

    return `
      <svg width="${template.width}" height="${template.height}" xmlns="http://www.w3.org/2000/svg">
        <!-- Header with logo -->
        <rect x="0" y="0" width="${template.width}" height="120" fill="${template.textColor}"/>
        <text x="400" y="40" text-anchor="middle" fill="white" font-size="24" font-weight="bold">GOSA CONVENTION 2024</text>
        <text x="400" y="70" text-anchor="middle" fill="white" font-size="16">ATTENDEE BADGE</text>
        
        <!-- Name -->
        <text x="400" y="420" text-anchor="middle" fill="${template.textColor}" font-size="36" font-weight="bold">${this.escapeXml(name)}</text>
        
        ${title ? `<text x="400" y="460" text-anchor="middle" fill="${template.titleColor}" font-size="20">${this.escapeXml(title)}</text>` : ''}
        
        ${organization ? `<text x="400" y="${title ? '490' : '460'}" text-anchor="middle" fill="${template.orgColor}" font-size="18">${this.escapeXml(organization)}</text>` : ''}
        
        <!-- Footer -->
        <rect x="0" y="920" width="${template.width}" height="80" fill="${template.textColor}"/>
        <text x="400" y="950" text-anchor="middle" fill="white" font-size="14">Welcome to GOSA Convention</text>
        <text x="400" y="975" text-anchor="middle" fill="white" font-size="12">www.gosa.org</text>
      </svg>
    `;
  }

  /**
   * Create complete badge SVG (fallback when Sharp is not available)
   */
  private static createCompleteBadgeSVG(userDetails: UserDetails, template: BadgeTemplate): string {
    const { name, title, organization } = userDetails;

    return `
      <svg width="${template.width}" height="${template.height}" xmlns="http://www.w3.org/2000/svg">
        <!-- Background -->
        <rect x="0" y="0" width="${template.width}" height="${template.height}" fill="${template.backgroundColor}"/>
        
        <!-- Header with logo -->
        <rect x="0" y="0" width="${template.width}" height="120" fill="${template.textColor}"/>
        <text x="400" y="40" text-anchor="middle" fill="white" font-size="24" font-weight="bold">GOSA CONVENTION 2025</text>
        <text x="400" y="70" text-anchor="middle" fill="white" font-size="16">ATTENDEE BADGE</text>
        
        <!-- Placeholder for photo -->
        <circle cx="400" cy="250" r="100" fill="#E5E7EB" stroke="${template.textColor}" stroke-width="3"/>
        <text x="400" y="260" text-anchor="middle" fill="${template.textColor}" font-size="16" font-weight="bold">PHOTO</text>
        
        <!-- Name -->
        <text x="400" y="420" text-anchor="middle" fill="${template.textColor}" font-size="36" font-weight="bold">${this.escapeXml(name)}</text>
        
        ${title ? `<text x="400" y="460" text-anchor="middle" fill="${template.titleColor}" font-size="20">${this.escapeXml(title)}</text>` : ''}
        
        ${organization ? `<text x="400" y="${title ? '490' : '460'}" text-anchor="middle" fill="${template.orgColor}" font-size="18">${this.escapeXml(organization)}</text>` : ''}
        
        <!-- Footer -->
        <rect x="0" y="920" width="${template.width}" height="80" fill="${template.textColor}"/>
        <text x="400" y="950" text-anchor="middle" fill="white" font-size="14">Welcome to GOSA Convention</text>
        <text x="400" y="975" text-anchor="middle" fill="white" font-size="12">www.gosa.org</text>
      </svg>
    `;
  }

  /**
   * Escape XML special characters
   */
  private static escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Get all badges for gallery
   */
  static async getAllBadges(): Promise<IAttendeeBadge[]> {
    try {
      return await AttendeeBadge.find({ socialMediaShared: true })
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .exec();
    } catch (error) {
      console.error('Error getting all badges:', error);
      throw new Error('Failed to retrieve badges');
    }
  }

  /**
   * Get badge by user ID
   */
  static async getBadgeByUserId(userId: string): Promise<IAttendeeBadge | null> {
    try {
      return await AttendeeBadge.findOne({ userId: new Types.ObjectId(userId) })
        .populate('user', 'name email')
        .exec();
    } catch (error) {
      console.error('Error getting badge by user ID:', error);
      throw new Error('Failed to retrieve badge');
    }
  }

  /**
   * Increment download count for a badge
   */
  static async incrementDownloadCount(badgeId: string): Promise<void> {
    try {
      await AttendeeBadge.findByIdAndUpdate(
        badgeId,
        { $inc: { downloadCount: 1 } },
        { new: true }
      );
    } catch (error) {
      console.error('Error incrementing download count:', error);
      throw new Error('Failed to update download count');
    }
  }

  /**
   * Update social media shared status
   */
  static async updateSocialMediaShared(badgeId: string, shared: boolean): Promise<IAttendeeBadge | null> {
    try {
      return await AttendeeBadge.findByIdAndUpdate(
        badgeId,
        { socialMediaShared: shared },
        { new: true }
      );
    } catch (error) {
      console.error('Error updating social media shared status:', error);
      throw new Error('Failed to update badge');
    }
  }

  /**
   * Delete badge and associated images
   */
  static async deleteBadge(badgeId: string): Promise<boolean> {
    try {
      const badge = await AttendeeBadge.findById(badgeId);
      if (!badge) {
        throw new Error('Badge not found');
      }

      // Delete images from Vercel Blob
      await Promise.all([
        VercelBlobService.deleteImage(badge.badgeImageUrl),
        VercelBlobService.deleteImage(badge.profilePhotoUrl)
      ]);

      // Delete badge record
      await AttendeeBadge.findByIdAndDelete(badgeId);

      return true;
    } catch (error) {
      console.error('Error deleting badge:', error);
      throw new Error('Failed to delete badge');
    }
  }

  /**
   * Get badge statistics
   */
  static async getBadgeStatistics(): Promise<{
    totalBadges: number;
    sharedBadges: number;
    totalDownloads: number;
    recentBadges: IAttendeeBadge[];
  }> {
    try {
      const [totalBadges, sharedBadges, downloadStats, recentBadges] = await Promise.all([
        AttendeeBadge.countDocuments(),
        AttendeeBadge.countDocuments({ socialMediaShared: true }),
        AttendeeBadge.aggregate([
          { $group: { _id: null, totalDownloads: { $sum: '$downloadCount' } } }
        ]),
        AttendeeBadge.find()
          .populate('user', 'name email')
          .sort({ createdAt: -1 })
          .limit(5)
          .exec()
      ]);

      return {
        totalBadges,
        sharedBadges,
        totalDownloads: downloadStats[0]?.totalDownloads || 0,
        recentBadges
      };
    } catch (error) {
      console.error('Error getting badge statistics:', error);
      throw new Error('Failed to retrieve badge statistics');
    }
  }
}