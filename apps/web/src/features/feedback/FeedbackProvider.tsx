import { useCallback, useRef, useState } from 'react';
import type { PropsWithChildren } from 'react';

import { FeedbackContext, type FeedbackTone } from '@/features/feedback/feedback-context';
type FeedbackItem = Readonly<{
  id: number;
  message: string;
  tone: FeedbackTone;
}>;

export function FeedbackProvider({ children }: PropsWithChildren) {
  const [feedback, setFeedback] = useState<readonly FeedbackItem[]>([]);
  const nextFeedbackId = useRef(0);
  const showFeedback = useCallback((message: string, tone: FeedbackTone = 'success') => {
    const id = nextFeedbackId.current;
    nextFeedbackId.current += 1;
    setFeedback((items) => [...items, { id, message, tone }]);
    window.setTimeout(() => setFeedback((items) => items.filter((item) => item.id !== id)), 3600);
  }, []);

  return (
    <FeedbackContext.Provider value={{ showFeedback }}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-2 sm:inset-x-6">
        {feedback.map((item) => (
          <p
            key={item.id}
            role={item.tone === 'error' ? 'alert' : 'status'}
            className={`max-w-sm rounded-lg border px-4 py-3 text-sm shadow-xl ${
              item.tone === 'error'
                ? 'border-danger/50 bg-surface-raised text-foreground'
                : 'border-border bg-surface-raised text-foreground'
            }`}
          >
            {item.message}
          </p>
        ))}
      </div>
    </FeedbackContext.Provider>
  );
}
