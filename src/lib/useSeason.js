import { useSyncExternalStore } from 'react';
import { seasonResource, raceResource, circuitsResource } from './dataClient.js';

function useResource(r) {
  return useSyncExternalStore(r.subscribe, r.get, r.get);
}

export const useSeason = () => useResource(seasonResource());
export const useRace = (round) => useResource(raceResource(round));
export const useCircuits = () => useResource(circuitsResource());
