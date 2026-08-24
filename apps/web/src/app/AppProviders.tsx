import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { BrowserRouter } from 'react-router';

import { FeedbackProvider } from '@/features/feedback/FeedbackProvider';
import { VoiceSessionProvider } from '@/features/voice/VoiceSessionProvider';

const queryClient = new QueryClient();

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <FeedbackProvider>
        <VoiceSessionProvider>
          <BrowserRouter>{children}</BrowserRouter>
        </VoiceSessionProvider>
      </FeedbackProvider>
    </QueryClientProvider>
  );
}
