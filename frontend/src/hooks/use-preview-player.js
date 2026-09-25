import { useCallback, useEffect, useRef, useState } from "react";
import { libraryUrl } from "@/lib/library";

// One shared <audio> for library previews, so only one track plays at a time.
// Clicking the playing track pauses it; clicking another switches to it.
export function usePreviewPlayer() {
  const audioRef = useRef(null);
  const requestRef = useRef(0);
  const [playingId, setPlayingId] = useState(null);

  // Stop playback when leaving the page.
  useEffect(() => {
    const audio = audioRef;
    return () => audio.current?.pause();
  }, []);

  const toggle = useCallback(
    (track) => {
      if (!audioRef.current) {
        const audio = new Audio();
        audio.addEventListener("ended", () => setPlayingId(null));
        audioRef.current = audio;
      }
      const audio = audioRef.current;

      if (playingId === track.id) {
        audio.pause();
        setPlayingId(null);
        return;
      }

      // Switching tracks interrupts the previous play() promise, which rejects
      // with an AbortError. Only the latest request may clear the playing state,
      // otherwise that stale rejection would wrongly reset the new track.
      const requestId = ++requestRef.current;
      audio.src = libraryUrl(track.audio);
      setPlayingId(track.id);
      audio.play().catch(() => {
        if (requestRef.current === requestId) setPlayingId(null);
      });
    },
    [playingId]
  );

  return { playingId, toggle };
}
