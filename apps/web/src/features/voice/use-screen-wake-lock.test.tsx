import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useScreenWakeLock } from '@/features/voice/use-screen-wake-lock';

function WakeLockHarness({ isWatching }: Readonly<{ isWatching: boolean }>) {
  useScreenWakeLock(isWatching);
  return <p>{isWatching ? 'assistindo' : 'disponÃ­vel'}</p>;
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'wakeLock');
  vi.restoreAllMocks();
});

describe('screen Wake Lock', () => {
  it('keeps viewing usable when the browser rejects Wake Lock', async () => {
    const request = vi.fn().mockRejectedValue(new Error('not allowed'));
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: { request },
    });

    render(<WakeLockHarness isWatching />);

    expect(screen.getByText('assistindo')).toBeInTheDocument();
    await waitFor(() => expect(request).toHaveBeenCalledWith('screen'));
  });

  it('releases the lock when intentional viewing stops', async () => {
    const release = vi.fn().mockResolvedValue(undefined);
    const request = vi.fn().mockResolvedValue({
      release,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: { request },
    });

    const { rerender } = render(<WakeLockHarness isWatching />);
    await waitFor(() => expect(request).toHaveBeenCalledWith('screen'));

    rerender(<WakeLockHarness isWatching={false} />);
    await waitFor(() => expect(release).toHaveBeenCalledTimes(1));
  });
});
