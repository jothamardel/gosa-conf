import { connectToDatabase } from '@/lib/mongodb';
import { AppSetting } from '@/lib/schema/app-setting.schema';

const SETTING_KEY = 'checkin_active';

// Short in-memory cache to prevent redundant DB reads during rapid checks (3 seconds TTL)
let cachedStatus: boolean | null = null;
let cacheExpiry = 0;

export async function getCheckInActiveStatus(): Promise<boolean> {
  const now = Date.now();
  if (cachedStatus !== null && now < cacheExpiry) {
    return cachedStatus;
  }

  try {
    await connectToDatabase();
    const setting = (await AppSetting.findOne({ key: SETTING_KEY }).lean()) as { value?: unknown } | null;
    if (!setting) {
      // Default to true (active) if setting has never been explicitly toggled
      cachedStatus = true;
      cacheExpiry = now + 3000;
      return true;
    }

    cachedStatus = Boolean(setting.value);
    cacheExpiry = now + 3000;
    return cachedStatus;
  } catch (error) {
    console.error('Failed to read checkin_active setting:', error);
    return cachedStatus !== null ? cachedStatus : true;
  }
}

export async function setCheckInActiveStatus(
  active: boolean,
  updatedBy: string = 'Desk Admin',
): Promise<boolean> {
  await connectToDatabase();
  await AppSetting.findOneAndUpdate(
    { key: SETTING_KEY },
    {
      $set: {
        value: Boolean(active),
        updatedBy,
        metadata: {
          lastChangedAt: new Date(),
        },
      },
    },
    { upsert: true, new: true },
  );

  cachedStatus = Boolean(active);
  cacheExpiry = Date.now() + 5000;
  return cachedStatus;
}
