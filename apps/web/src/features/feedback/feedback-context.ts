import { createContext, useContext } from 'react';

export type FeedbackTone = 'success' | 'error';

type FeedbackContextValue = Readonly<{
  showFeedback: (message: string, tone?: FeedbackTone) => void;
}>;

export const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function useFeedback(): FeedbackContextValue {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used within FeedbackProvider.');
  }
  return context;
}
