import { Navigate, Route, Routes, useParams } from 'react-router';

import { AppShell } from '@/app/AppShell';
import {
  defaultNavigationPath,
  getChannelPath,
  resolveNavigation,
} from '@/features/navigation/navigation';

function CommunityChannelRoute() {
  const { channelId, communityId } = useParams();
  const navigation = resolveNavigation(communityId, channelId);
  const canonicalPath = getChannelPath(navigation.community, navigation.channel);

  if (communityId !== navigation.community.id || channelId !== navigation.channel.id) {
    return <Navigate to={canonicalPath} replace />;
  }

  return <AppShell community={navigation.community} channel={navigation.channel} />;
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to={defaultNavigationPath} replace />} />
      <Route
        path="/communities/:communityId/channels/:channelId"
        element={<CommunityChannelRoute />}
      />
      <Route path="*" element={<Navigate to={defaultNavigationPath} replace />} />
    </Routes>
  );
}
