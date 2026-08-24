import { useEffect, useRef } from 'react';

type ScreenWakeLockSentinel = Readonly<{
  release: () => Promise<void>;
  addEventListener: (type: 'release', listener: () => void) => void;
  removeEventListener: (type: 'release', listener: () => void) => void;
}>;

type WakeLockNavigator = Navigator &
  Readonly<{
    wakeLock?: Readonly<{
      request: (type: 'screen') => Promise<ScreenWakeLockSentinel>;
    }>;
  }>;

export function useScreenWakeLock(isWatching: boolean): void {
  const sentinelRef = useRef<ScreenWakeLockSentinel | null>(null);

  useEffect(() => {
    if (!isWatching) {
      return;
    }

    let isDisposed = false;
    let isRequestPending = false;
    const wakeLock = (navigator as WakeLockNavigator).wakeLock;

    const release = () => {
      const sentinel = sentinelRef.current;
      sentinelRef.current = null;
      if (sentinel) {
        void sentinel.release().catch(() => undefined);
      }
    };

    const acquire = async () => {
      if (
        !wakeLock ||
        document.visibilityState !== 'visible' ||
        sentinelRef.current ||
        isRequestPending
      ) {
        return;
      }

      isRequestPending = true;
      try {
        const sentinel = await wakeLock.request('screen');
        if (isDisposed || document.visibilityState !== 'visible') {
          void sentinel.release().catch(() => undefined);
          return;
        }

        const onRelease = () => {
          if (sentinelRef.current === sentinel) {
            sentinelRef.current = null;
          }
        };
        sentinel.addEventListener('release', onRelease);
        sentinelRef.current = sentinel;
      } catch {
        // Wake Lock is best-effort; media playback must continue if it is rejected.
      } finally {
        isRequestPending = false;
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void acquire();
      } else {
        release();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    void acquire();

    return () => {
      isDisposed = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      release();
    };
  }, [isWatching]);
}
