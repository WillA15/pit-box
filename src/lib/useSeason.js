import { useSyncExternalStore } from 'react';
import { seasonResource, raceResource } from './dataClient.js';

function useResource(r) {
  return useSyncExternalStore(r.subscribe, r.get, r.get);
}

export const useSeason = () => useResource(seasonResource());
export const useRace = (round) => useResource(raceResource(round));
