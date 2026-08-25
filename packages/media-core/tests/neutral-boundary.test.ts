import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const sourceDirectory = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const forbiddenTerms = [
  "from 'react'",
  'navigator.',
  'RTCPeerConnection',
  'HTMLVideoElement',
  "from 'livekit",
  'cloudflare:workers',
  'DurableObject',
];

describe('media-core boundary', () => {
  it('does not import provider, browser, React, or Worker APIs', () => {
    const source = ['index.ts', 'media.ts', 'provider-routing.ts']
      .map((fileName) => readFileSync(join(sourceDirectory, fileName), 'utf8'))
      .join('\n');

    for (const forbiddenTerm of forbiddenTerms) {
      expect(source).not.toContain(forbiddenTerm);
    }
  });
});
