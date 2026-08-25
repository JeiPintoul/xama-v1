import { Navigate, Route, Routes, useParams } from 'react-router';

import { AppShell } from '@/app/AppShell';
import { QuickShareLanding } from '@/features/quick-share/QuickShareLanding';
import { QuickShareRoom } from '@/features/quick-share/QuickShareRoom';
import { normalizeQuickRoomCode } from '@/features/quick-share/room-code';
import { getChannelPath, resolveNavigation } from '@/features/navigation/navigation';

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

export function App() {
  return (
    <Routes>
      <Route path="/" element={<QuickShareLanding />} />
      <Route path="/r/:code" element={<QuickShareRoomRoute />} />
      <Route
        path="/communities/:communityId/channels/:channelId"
        element={<CommunityChannelRoute />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
