/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LIVEKIT_TOKEN_ENDPOINT?: string;
  readonly VITE_QUICK_ROOM_ENDPOINT?: string;
  readonly VITE_MEDIA_PROVIDER?: 'automatic' | 'livekit' | 'cloudflare';
  readonly VITE_REALTIME_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
