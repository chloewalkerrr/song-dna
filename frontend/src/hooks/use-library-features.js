import { useEffect, useState } from "react";
import { fetchTrackFeatures, resolveFeatureLoad } from "@/lib/library";

// Loads every library track's full feature file, which Home needs all at once:
// the page draws each track and scales them all against one shared scale.
// The files are small (a few thousand numbers each), so they load in parallel.
// A track whose file fails to load is reported in `failedIds` instead of
// failing the whole page.
//
// Returns { status: "loading" | "ready", byId: Map<id, features>, failedIds: [] }.
export function useLibraryFeatures(tracks) {
  const [result, setResult] = useState({ tracks: null, byId: new Map(), failedIds: [] });

  useEffect(() => {
    if (tracks.length === 0) return;
    let cancelled = false;

    Promise.allSettled(tracks.map((track) => fetchTrackFeatures(track))).then((outcomes) => {
      if (cancelled) return;
      const byId = new Map();
      const failedIds = [];
      outcomes.forEach((outcome, i) => {
        if (outcome.status === "fulfilled") byId.set(tracks[i].id, outcome.value);
        else failedIds.push(tracks[i].id);
      });
      setResult({ tracks, byId, failedIds });
    });

    return () => {
      cancelled = true;
    };
  }, [tracks]);

  // Empty list: ready at once. Results for an older track list: still loading.
  return resolveFeatureLoad(tracks, result);
}
