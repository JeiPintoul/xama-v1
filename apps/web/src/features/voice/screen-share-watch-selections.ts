export type ScreenShareWatchSelections = Map<string, Set<string>>;

export function addScreenShareWatchSelection(
  selections: ScreenShareWatchSelections,
  participantIdentity: string,
  screenShareId: string,
): void {
  const watchedScreenShareIds = selections.get(participantIdentity) ?? new Set<string>();
  watchedScreenShareIds.add(screenShareId);
  selections.set(participantIdentity, watchedScreenShareIds);
}

export function removeScreenShareWatchSelection(
  selections: ScreenShareWatchSelections,
  participantIdentity: string,
  screenShareId: string,
): void {
  const watchedScreenShareIds = selections.get(participantIdentity);
  if (!watchedScreenShareIds) return;

  watchedScreenShareIds.delete(screenShareId);
  if (watchedScreenShareIds.size === 0) selections.delete(participantIdentity);
}

export function replaceScreenShareWatchSelections(
  selections: ScreenShareWatchSelections,
  participantIdentity: string,
  screenShareIds: Iterable<string>,
): void {
  const watchedScreenShareIds = new Set(screenShareIds);
  if (watchedScreenShareIds.size === 0) {
    selections.delete(participantIdentity);
    return;
  }

  selections.set(participantIdentity, watchedScreenShareIds);
}

export function getScreenShareWatchSelections(
  selections: ScreenShareWatchSelections,
  participantIdentity: string,
): ReadonlySet<string> {
  return selections.get(participantIdentity) ?? new Set<string>();
}

export function getScreenShareViewerIdentities(
  selections: ScreenShareWatchSelections,
  screenShareId: string,
): readonly string[] {
  return Array.from(selections.entries()).flatMap(([identity, watchedScreenShareIds]) =>
    watchedScreenShareIds.has(screenShareId) ? [identity] : [],
  );
}
