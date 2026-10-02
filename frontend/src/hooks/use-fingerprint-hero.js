import { useEffect, useState } from "react";
import { fetchFingerprintHero } from "@/lib/library";
import { resolveHeroLoad, UNAVAILABLE } from "@/lib/songFingerprint";

// Loads the large (hero) Song Fingerprint for one track - Home's current
// track only, fetched again when the selection changes.
//
// Returns { status: "loading" } | { status: "ready", hero } |
// { status: "unavailable", reason }. Never throws: a failed load is just
// "unavailable", and a late result for a previously selected track is ignored.
export function useFingerprintHero(track) {
  const [result, setResult] = useState({ trackId: null, hero: null });

  useEffect(() => {
    if (!track) return;
    let cancelled = false;

    // fetchFingerprintHero doesn't reject; the catch is a backstop so a bug
    // there shows "unavailable" rather than an endless skeleton.
    fetchFingerprintHero(track)
      .catch(() => ({ status: "unavailable", reason: UNAVAILABLE.malformed }))
      .then((hero) => {
        if (!cancelled) setResult({ trackId: track.id, hero });
      });

    return () => {
      cancelled = true;
    };
  }, [track]);

  return resolveHeroLoad(track, result);
}
