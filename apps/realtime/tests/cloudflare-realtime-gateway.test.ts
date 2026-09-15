import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  CloudflareRealtimeGateway,
  CloudflareRealtimeRequestError,
} from '../src/cloudflare-realtime-gateway';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('CloudflareRealtimeGateway', () => {
  it('uses the App Secret only as a backend authorization header', async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ sessionId: 'session-one' }, { status: 201 }));
    const gateway = new CloudflareRealtimeGateway({
      appId: 'app-one',
      appSecret: 'server-secret',
      fetchImplementation,
    });

    const sessionId = await gateway.createSession('room:participant');

    expect(sessionId).toBe('session-one');
    expect(fetchImplementation).toHaveBeenCalledWith(
      expect.stringContaining('/apps/app-one/sessions/new'),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer server-secret' }),
      }),
    );
    expect(JSON.stringify({ sessionId })).not.toContain('server-secret');
  });

  it('returns a confirmed close without reconciling Session state', async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ tracks: [{ mid: 'remote-mid' }] }));
    const gateway = new CloudflareRealtimeGateway({
      appId: 'app-one',
      appSecret: 'server-secret',
      fetchImplementation,
    });

    const result = await gateway.closeTrackIdempotently('session-one', 'remote-mid');

    expect(result).toMatchObject({ status: 'closed' });
    expect(fetchImplementation).toHaveBeenCalledTimes(1);
  });

  it('treats a 404 from Session state reconciliation as confirmed Session absence', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ errorCode: 'not_found' }, { status: 404 }));
    const gateway = new CloudflareRealtimeGateway({
      appId: 'app-one',
      appSecret: 'server-secret',
      fetchImplementation,
    });

    await expect(gateway.closeTrackIdempotently('session-one', 'remote-mid')).resolves.toEqual({
      status: 'already-absent',
      absence: 'session',
    });
    expect(fetchImplementation).toHaveBeenCalledTimes(2);
    expect(fetchImplementation.mock.calls[1]?.[1]).toMatchObject({ method: 'GET' });
  });

  it('treats a valid Session state without the target mid as confirmed track absence', async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({ tracks: [{ mid: 'remote-mid', errorCode: 'track_not_found' }] }),
      )
      .mockResolvedValueOnce(Response.json({ tracks: [{ mid: 'other-mid', status: 'active' }] }));
    const gateway = new CloudflareRealtimeGateway({
      appId: 'app-one',
      appSecret: 'server-secret',
      fetchImplementation,
    });

    await expect(gateway.closeTrackIdempotently('session-one', 'remote-mid')).resolves.toEqual({
      status: 'already-absent',
      absence: 'track',
    });
  });

  it('keeps a close failure ambiguous while Session state still contains the target mid', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ errorCode: 'temporary' }, { status: 503 }))
      .mockResolvedValueOnce(Response.json({ tracks: [{ mid: 'remote-mid', status: 'active' }] }));
    const gateway = new CloudflareRealtimeGateway({
      appId: 'app-one',
      appSecret: 'server-secret',
      fetchImplementation,
    });

    await expect(gateway.closeTrackIdempotently('session-one', 'remote-mid')).rejects.toMatchObject<
      Partial<CloudflareRealtimeRequestError>
    >({
      kind: 'http',
      status: 503,
    });
  });

  it('does not infer track absence from malformed Session state', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ errorCode: 'temporary' }, { status: 503 }))
      .mockResolvedValueOnce(Response.json({ tracks: [{}] }));
    const gateway = new CloudflareRealtimeGateway({
      appId: 'app-one',
      appSecret: 'server-secret',
      fetchImplementation,
    });

    await expect(gateway.closeTrackIdempotently('session-one', 'remote-mid')).rejects.toMatchObject<
      Partial<CloudflareRealtimeRequestError>
    >({
      kind: 'invalid-response',
    });
  });
});
