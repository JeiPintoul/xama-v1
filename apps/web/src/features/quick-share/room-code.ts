const quickRoomAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const quickRoomCodePattern = new RegExp(`^[${quickRoomAlphabet}]{8}$`);

export function normalizeQuickRoomCode(value: string): string | null {
  const normalized = value.toUpperCase().replace(/[\s-]/g, '');
  return quickRoomCodePattern.test(normalized) ? normalized : null;
}

export function formatQuickRoomCode(code: string): string {
  const normalized = normalizeQuickRoomCode(code);
  return normalized ? `${normalized.slice(0, 4)}-${normalized.slice(4)}` : code;
}

export function getQuickRoomName(code: string): string {
  return `quick:${code}`;
}
