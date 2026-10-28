import { connectToDatabase } from '@/lib/mongodb';
import { BroadcastCampaign, IBroadcastCampaign } from '@/lib/schema';
import { Wasender } from '@/lib/wasender-api';
import { personalizeMessage } from './broadcast-spintax';
import { normalizeBroadcastPhone } from './broadcast-audience';

// In-memory set of currently running campaign IDs to prevent duplicate concurrent loops
const activeRunningCampaigns = new Set<string>();

/**
 * Sends a single test message to an admin phone number to verify template & delivery.
 */
export async function sendBroadcastTest(
  rawPhone: string,
  template: string,
): Promise<{ success: boolean; previewText: string; error?: string }> {
  const formatted = normalizeBroadcastPhone(rawPhone);
  if (!formatted) {
    return {
      success: false,
      previewText: '',
      error: 'Invalid phone number format. Please enter a valid 11-digit or international number.',
    };
  }

  const previewText = personalizeMessage(template, {
    fullName: 'GOSA Admin (Test Preview)',
    phoneNumber: formatted,
    year: '2026',
  });

  try {
    const result = await Wasender.httpSenderMessage({
      to: formatted,
      text: previewText,
    });

    if (result.success) {
      return { success: true, previewText };
    } else {
      return {
        success: false,
        previewText,
        error: result.error || 'WhatsApp provider was unable to deliver message.',
      };
    }
  } catch (err: any) {
    return {
      success: false,
      previewText,
      error: err?.message || 'Failed to dispatch test message.',
    };
  }
}

/**
 * Starts or resumes a background campaign loop with humanized jitter & anti-spam protections.
 */
export async function runCampaignBackground(campaignId: string): Promise<void> {
  if (activeRunningCampaigns.has(campaignId)) {
    console.log(`[Broadcast Runner] Campaign ${campaignId} is already executing.`);
    return;
  }

  activeRunningCampaigns.add(campaignId);

  // Run asynchronously without blocking the caller
  (async () => {
    try {
      await connectToDatabase();
      const campaign = await BroadcastCampaign.findById(campaignId);
      if (!campaign) {
        console.error(`[Broadcast Runner] Campaign ${campaignId} not found.`);
        return;
      }

      if (campaign.status === 'completed' || campaign.status === 'cancelled') {
        console.log(`[Broadcast Runner] Campaign ${campaignId} is already in state: ${campaign.status}`);
        return;
      }

      campaign.status = 'running';
      if (!campaign.startedAt) {
        campaign.startedAt = new Date();
      }
      await campaign.save();

      console.log(
        `[Broadcast Runner] Starting execution for campaign "${campaign.title}" from cursor ${campaign.currentCursor}/${campaign.totalRecipients}`,
      );

      const minDelay = campaign.minDelaySeconds || 8;
      const maxDelay = campaign.maxDelaySeconds || 18;

      while (campaign.currentCursor < campaign.recipients.length) {
        // Re-read campaign from DB on every iteration to respect external Pause or Cancel requests
        const currentRecord = await BroadcastCampaign.findById(campaignId);
        if (!currentRecord) break;

        if (currentRecord.status === 'paused' || currentRecord.status === 'cancelled') {
          console.log(`[Broadcast Runner] Campaign ${campaignId} stopped by admin (status: ${currentRecord.status}).`);
          break;
        }

        const index = currentRecord.currentCursor;
        const recipient = currentRecord.recipients[index];

        if (!recipient) {
          currentRecord.currentCursor += 1;
          await currentRecord.save();
          continue;
        }

        // Apply humanized jitter delay (minDelay to maxDelay seconds)
        // Skip delay on the very first message if starting from 0
        if (index > 0) {
          const jitterSeconds = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
          console.log(`[Broadcast Runner] Jitter delay ${jitterSeconds}s before recipient #${index + 1}`);
          await new Promise((resolve) => setTimeout(resolve, jitterSeconds * 1000));
        }

        // Double check status again after sleep
        const checkAfterSleep = await BroadcastCampaign.findById(campaignId);
        if (!checkAfterSleep || checkAfterSleep.status !== 'running') {
          break;
        }

        // Format recipient phone number
        const formattedPhone = normalizeBroadcastPhone(recipient.phoneNumber);
        if (!formattedPhone) {
          recipient.status = 'skipped';
          recipient.error = 'Invalid phone number format';
          recipient.sentAt = new Date();
          currentRecord.failedCount += 1;
          currentRecord.currentCursor += 1;
          await currentRecord.save();
          continue;
        }

        // Personalize message with Spintax and member data
        const personalizedText = personalizeMessage(currentRecord.template, {
          fullName: recipient.fullName,
          phoneNumber: formattedPhone,
        });

        try {
          const sendResult = await Wasender.httpSenderMessage({
            to: formattedPhone,
            text: personalizedText,
          });

          if (sendResult.success) {
            recipient.status = 'sent';
            recipient.sentAt = new Date();
            recipient.msgId = sendResult.data?.msgId;
            recipient.previewText = personalizedText;
            currentRecord.sentCount += 1;
          } else {
            recipient.status = 'failed';
            recipient.sentAt = new Date();
            recipient.error = sendResult.error || 'Delivery failed';
            recipient.previewText = personalizedText;
            currentRecord.failedCount += 1;
          }
        } catch (dispatchErr: any) {
          recipient.status = 'failed';
          recipient.sentAt = new Date();
          recipient.error = dispatchErr?.message || 'Transport error';
          recipient.previewText = personalizedText;
          currentRecord.failedCount += 1;
        }

        currentRecord.currentCursor += 1;

        // If last recipient reached, mark as completed
        if (currentRecord.currentCursor >= currentRecord.recipients.length) {
          currentRecord.status = 'completed';
          currentRecord.completedAt = new Date();
        }

        await currentRecord.save();
      }

      console.log(`[Broadcast Runner] Finished loop for campaign ${campaignId}.`);
    } catch (err: any) {
      console.error(`[Broadcast Runner] Fatal error in campaign ${campaignId}:`, err);
      try {
        await BroadcastCampaign.findByIdAndUpdate(campaignId, {
          status: 'failed',
          lastError: err?.message || 'Unknown runner exception',
        });
      } catch (dbErr) {
        // ignore
      }
    } finally {
      activeRunningCampaigns.delete(campaignId);
    }
  })();
}
