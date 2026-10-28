'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { LocalTicketDB, CachedMember } from '@/lib/utils/local-ticket-db';
import { toast } from 'sonner';

export function useLocalTicketSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [cachedCount, setCachedCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [checkinActive, setCheckinActive] = useState<boolean>(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isLocalReady, setIsLocalReady] = useState(false);

  const syncLockRef = useRef(false);
  const lastSyncTsRef = useRef<number>(0);

  /**
   * Run background sync with cloud MongoDB backend.
   */
  const performSync = useCallback(async (forceFull = false) => {
    if (syncLockRef.current) return;
    syncLockRef.current = true;
    setIsSyncing(true);
    setSyncError(null);

    try {
      const sinceParam = forceFull || lastSyncTsRef.current === 0 ? '' : `?since=${lastSyncTsRef.current}`;
      const res = await fetch(`/api/v1/admin/tickets/sync${sinceParam}`, {
        cache: 'no-store',
      });

      if (!res.ok) {
        throw new Error(`Sync failed with HTTP ${res.status}`);
      }

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'Sync returned failure');
      }

      // Upsert into local IndexedDB
      if (json.members && json.members.length > 0) {
        await LocalTicketDB.upsertMembers(json.members);
      }

      // Update sync timestamps
      const serverTs = json.serverTimestamp || Date.now();
      lastSyncTsRef.current = serverTs;
      setLastSyncTime(new Date(serverTs));
      await LocalTicketDB.setMeta('last_sync_timestamp', serverTs);

      // Update check-in active state
      if (typeof json.checkinActive === 'boolean') {
        setCheckinActive(json.checkinActive);
        await LocalTicketDB.setMeta('checkin_active', json.checkinActive);
      }

      // Refresh count
      const totalCount = await LocalTicketDB.countMembers();
      setCachedCount(totalCount);
      setIsLocalReady(true);
    } catch (err: any) {
      console.warn('Background sync error:', err);
      setSyncError(err?.message || 'Sync failed');
    } finally {
      setIsSyncing(false);
      syncLockRef.current = false;
    }
  }, []);

  /**
   * Toggle global check-in active status.
   */
  const toggleCheckInStatus = useCallback(async (active: boolean): Promise<boolean> => {
    try {
      const res = await fetch('/api/v1/admin/tickets/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkinActive: active, officialName: 'Check-In Desk' }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'Failed to update check-in status');
      }

      setCheckinActive(json.checkinActive);
      await LocalTicketDB.setMeta('checkin_active', json.checkinActive);
      return json.checkinActive;
    } catch (err: any) {
      toast.error('Failed to change check-in status: ' + err.message);
      throw err;
    }
  }, []);

  /**
   * Instant local search on IndexedDB.
   */
  const searchLocal = useCallback(async (query: string, limit = 10): Promise<CachedMember[]> => {
    try {
      return await LocalTicketDB.search(query, limit);
    } catch (err) {
      console.error('Local search error:', err);
      return [];
    }
  }, []);

  /**
   * Apply optimistic mutation locally.
   */
  const updateMemberLocally = useCallback(
    async (userId: string, updater: (m: CachedMember) => CachedMember): Promise<CachedMember | null> => {
      try {
        return await LocalTicketDB.updateMemberOptimistically(userId, updater);
      } catch (err) {
        console.error('Failed to update member in IndexedDB:', err);
        return null;
      }
    },
    []
  );

  // Initialize DB and load initial state
  useEffect(() => {
    let isCancelled = false;

    const initialize = async () => {
      try {
        const count = await LocalTicketDB.countMembers();
        if (!isCancelled) {
          setCachedCount(count);
          if (count > 0) setIsLocalReady(true);
        }

        const savedActive = await LocalTicketDB.getMeta<boolean>('checkin_active');
        if (!isCancelled && typeof savedActive === 'boolean') {
          setCheckinActive(savedActive);
        }

        const savedTs = await LocalTicketDB.getMeta<number>('last_sync_timestamp');
        if (!isCancelled && savedTs) {
          lastSyncTsRef.current = savedTs;
          setLastSyncTime(new Date(savedTs));
        }

        // Run full sync on startup
        await performSync(count === 0);
      } catch (err) {
        console.warn('Local database initialization error:', err);
        if (!isCancelled) performSync(true);
      }
    };

    initialize();

    // Auto delta-sync interval (every 25 seconds)
    const interval = setInterval(() => {
      performSync(false);
    }, 25000);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [performSync]);

  return {
    isSyncing,
    cachedCount,
    lastSyncTime,
    checkinActive,
    syncError,
    isLocalReady,
    syncNow: performSync,
    toggleCheckInStatus,
    searchLocal,
    updateMemberLocally,
  };
}
