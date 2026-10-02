import { useCallback, useEffect, useRef, useState } from "react";

// Plays one audio file and reports where playback is, for a playhead.
// Changing `src` stops the old audio and starts the new one from zero.
//
// State is stored together with the src it belongs to, so a new src reads as
// "stopped at 0" straight away without resetting state inside an effect.
export function useAudioPlayhead(src) {
  const audioRef = useRef(null);
  const [playback, setPlayback] = useState({ src: null, time: 0, playing: false });

  useEffect(() => {
    if (!src) return;
    const audio = new Audio(src);
    audioRef.current = audio;

    const update = (changes) => setPlayback((current) => ({ ...current, src, ...changes }));
    const onTime = () => update({ time: audio.currentTime });
    const onPlay = () => update({ playing: true });
    const onPause = () => update({ playing: false });
    const onEnded = () => update({ playing: false, time: 0 });

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      if (audioRef.current === audio) audioRef.current = null;
    };
  }, [src]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    // A rejected play() (e.g. the file failed to load) just leaves it paused.
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  }, []);

  // Moves playback to `time` without starting it; the playhead follows.
  const seek = useCallback(
    (time) => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.currentTime = time;
      setPlayback((current) => ({ ...current, src, time }));
    },
    [src]
  );

  const current = playback.src === src;
  return {
    isPlaying: current && playback.playing,
    currentTime: current ? playback.time : 0,
    toggle,
    seek,
  };
}
