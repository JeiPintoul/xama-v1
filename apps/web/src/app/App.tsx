import { Navigate, Route, Routes, useParams } from 'react-router';

import { AppShell } from '@/app/AppShell';
import { CloudflareRealtimeProof } from '@/features/quick-share/CloudflareRealtimeProof';
import { QuickShareLanding } from '@/features/quick-share/QuickShareLanding';
import { QuickShareRoom } from '@/features/quick-share/QuickShareRoom';
import { normalizeQuickRoomCode } from '@/features/quick-share/room-code';
import { getChannelPath, resolveNavigation } from '@/features/navigation/navigation';
import { resolveMediaProviderMode } from '@/features/voice/media-provider-config';

const configuredMediaProvider = resolveMediaProviderMode(import.meta.env.VITE_MEDIA_PROVIDER);

function CommunityChannelRoute() {
  const { channelId, communityId } = useParams();
  const navigation = resolveNavigation(communityId, channelId);
  const canonicalPath = getChannelPath(navigation.community, navigation.channel);

  if (communityId !== navigation.community.id || channelId !== navigation.channel.id) {
    return <Navigate to={canonicalPath} replace />;
  }

  return <AppShell community={navigation.community} channel={navigation.channel} />;
}

function QuickShareRoomRoute() {
  const { code } = useParams();
  const normalizedCode = normalizeQuickRoomCode(code ?? '');

  if (!normalizedCode) {
    return <Navigate to={`/?room=${encodeURIComponent(code ?? '')}`} replace />;
  }

  return <QuickShareRoom code={normalizedCode} />;
}

function CloudflareRealtimeProofRoute() {
  const { roomId } = useParams();
  return <CloudflareRealtimeProof roomId={roomId} />;
}

export function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          configuredMediaProvider === 'cloudflare' ? (
            <CloudflareRealtimeProof />
          ) : (
            <QuickShareLanding />
          )
        }
      />
      <Route path="/cf0" element={<CloudflareRealtimeProofRoute />} />
      <Route path="/cf0/:roomId" element={<CloudflareRealtimeProofRoute />} />
      <Route path="/r/:code" element={<QuickShareRoomRoute />} />
      <Route
        path="/communities/:communityId/channels/:channelId"
        element={<CommunityChannelRoute />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
