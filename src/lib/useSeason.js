import { useSyncExternalStore } from 'react';
import { useMemo } from 'react';
import { seasonResource, raceResource, circuitsResource, careersResource, newsLiveResource, newsArchiveResource } from './dataClient.js';
import { mergeArchive } from './news.js';

function useResource(r) {
  return useSyncExternalStore(r.subscribe, r.get, r.get);
}

export const useSeason = () => useResource(seasonResource());
export const useRace = (round) => useResource(raceResource(round));
export const useCircuits = () => useResource(circuitsResource());
export const useCareers = () => useResource(careersResource());

/** Live news merged with the bundled archive, so quieter drivers still get recent stories. */
export function useNews() {
  const live = useResource(newsLiveResource());
  const archive = useResource(newsArchiveResource());
  const items = useMemo(() => mergeArchive(archive.data?.items ?? [], live.data?.items ?? [], { days: 30 }), [live.data, archive.data]);
  return {
    items,
    loading: live.loading && archive.loading,
    error: live.error && archive.error,
    source: live.data?.source === 'live' ? 'live' : 'snapshot',
    generatedAt: live.data?.generatedAt ?? archive.data?.generatedAt,
  };
}
