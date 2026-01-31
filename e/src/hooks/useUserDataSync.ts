import { useEffect, useRef } from 'react';
import bus from '../utils/eventBus';
import { getUserData, setUserData, subscribeUserData } from '../utils/userData';

// Keys we intend to sync. The hook will also collect any keys present in localStorage when initializing.
const DEFAULT_KEYS = [
  'psirData',
  'vsri-records',
  'inHouseIssueData',
  'vendorIssueData',
  'purchaseData',
  'itemMasterData',
  'vendorDeptData',
  'stock-records',
  'purchaseOrders'
];

const collectLocalData = (keys: string[]) => {
  const o: Record<string, any> = {};
  keys.forEach(k => {
    const v = localStorage.getItem(k);
    if (v !== null) {
      try { o[k] = JSON.parse(v); } catch { o[k] = v; }
    }
  });
  return o;
};

const applyLocalData = (data: any) => {
  if (!data) return;
  Object.keys(data).forEach(k => {
    try { localStorage.setItem(k, JSON.stringify(data[k])); } catch { localStorage.setItem(k, String(data[k])); }
  });
};

export const useUserDataSync = (user: any) => {
  const saveRef = useRef<{ lastSaved: string | null, intervalId: any | null }>({ lastSaved: null, intervalId: null });

  useEffect(() => {
    if (!user) return;
    let unsubRemote: (() => void) | null = null;
    let stopped = false;

    (async () => {
      const uid = user.uid;

      // Load remote data
      const remote = await getUserData(uid);

      // If remote missing, create from localStorage snapshot (so current device becomes canonical)
      const keysPresent = Object.keys(localStorage).length > 0 ? Array.from({ length: 0 }) : [];
      const initialKeys = DEFAULT_KEYS.concat(keysPresent).filter(Boolean);

      if (!remote) {
        const snapshot = collectLocalData(initialKeys);
        await setUserData(uid, snapshot);
        saveRef.current.lastSaved = JSON.stringify(snapshot);
      } else {
        applyLocalData(remote);
        saveRef.current.lastSaved = JSON.stringify(collectLocalData(Object.keys(remote)));
      }

      // Subscribe to remote changes
      unsubRemote = subscribeUserData(uid, remoteData => {
        if (!remoteData) return;
        // Apply remote data to localStorage
        applyLocalData(remoteData);
      });

      // Periodically check localStorage changes and save (debounced-ish)
      const checkAndSave = async () => {
        if (stopped) return;
        try {
          // collect keys to sync by scanning known keys + localStorage keys
          const keys = Array.from(new Set([...DEFAULT_KEYS, ...Object.keys(localStorage)]));
          const current = JSON.stringify(collectLocalData(keys));
          if (saveRef.current.lastSaved !== current) {
            await setUserData(uid, collectLocalData(keys));
            saveRef.current.lastSaved = current;
          }
        } catch (e) {
          console.error('[userDataSync] save failed', e);
        }
      };

      saveRef.current.intervalId = setInterval(checkAndSave, 2500);

    })();

    return () => {
      stopped = true;
      if (unsubRemote) try { unsubRemote(); } catch {}
      if (saveRef.current.intervalId) clearInterval(saveRef.current.intervalId);
    };
  }, [user]);
};
