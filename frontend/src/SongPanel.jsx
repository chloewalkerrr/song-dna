import { useRef, useEffect, useId, useLayoutEffect, useReducer } from "react";
import { Pause, Play, Upload } from "lucide-react";
import Fingerprint from "./Fingerprint";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import SlotBadge from "@/components/SlotBadge";
import SongFingerprint from "@/components/SongFingerprint";
import { formatDuration } from "@/format";
import { useAudioPlayhead } from "@/hooks/use-audio-playhead";
import {
  ANALYSIS_FAILED,
  UPLOAD_ACCEPT,
  UPLOAD_FORMATS,
  analyzeFile,
  displayTitle,
  errorCopy,
} from "@/lib/analysis";
import { fetchTrackFeatures } from "@/lib/library";
import { LIBRARY_LOAD_ID, initialPanelState, panelLoadReducer } from "@/panelLoad";

// The slot's Song Fingerprint thumbnail at its native 52 px. It is read from
// the features on screen, never from the `track` prop, so an upload that
// replaces a library track never shows that track's mark. Library features
// always carry a fingerprint (available or not: SongFingerprint draws the
// dashed "none" box for the latter); uploads carry none, and get a plain
// dashed box of the same size so A and B stay aligned.
function SlotMark({ fingerprint }) {
  if (!fingerprint) {
    // The border token nearly vanishes on the dark background, so dark mode
    // uses a faint muted-foreground dash instead (light mode reads fine as is).
    return (
      <div
        aria-hidden="true"
        className="size-13 rounded-md border border-dashed border-border dark:border-muted-foreground/40"
      />
    );
  }
  return <SongFingerprint fingerprint={fingerprint} className="size-13 text-foreground" />;
}

// `slot` is "A" or "B". `track` (optional) is a library track to start with,
// loaded from its precomputed features instead of being uploaded. Uploading a
// file replaces it. ComparePage keys panels by track, so `track` never changes
// for one panel.
function SongPanel({ slot, track, rmsMax, centroidMax, onFeaturesChange }) {
  const inputId = useId();
  const inputRef = useRef(null);
  const [{ features, loading, error }, dispatch] = useReducer(
    panelLoadReducer,
    track,
    initialPanelState
  );
  // Playback of whatever the slot currently shows (the same hook as Home's
  // Fig. 2). A new source - a replacement upload, or none after a failed
  // one - stops the old audio and reads as stopped at 0:00, and the button
  // returns to Play when a track ends or play() is refused.
  const { isPlaying, currentTime, toggle } = useAudioPlayhead(features?.audio_url);
  // The id the next upload will use; see panelLoad.js.
  const lastLoadId = useRef(LIBRARY_LOAD_ID);

  useEffect(() => {
    if (!track) return;
    fetchTrackFeatures(track)
      .then((data) => dispatch({ type: "succeed", id: LIBRARY_LOAD_ID, features: data }))
      .catch((loadError) =>
        dispatch({ type: "fail", id: LIBRARY_LOAD_ID, error: loadError.message })
      );
  }, [track]);

  // Whichever load wins, ComparePage sees the slot's current features. A layout
  // effect, so React applies the parent's update before the browser paints:
  // a new song never appears here while Findings still shows the old pair.
  useLayoutEffect(() => {
    onFeaturesChange(features);
  }, [features, onFeaturesChange]);

  async function handleFileChange(event) {
    const file = event.target.files[0];
    // Clear the picker so choosing the same file again (e.g. after starting
    // the server) still fires a change.
    event.target.value = "";
    if (!file) return;

    const id = ++lastLoadId.current;
    dispatch({ type: "start", id, message: "Analysing..." });

    try {
      dispatch({ type: "succeed", id, features: await analyzeFile(file) });
    } catch (analysisError) {
      dispatch({ type: "fail", id, error: errorCopy(analysisError, ANALYSIS_FAILED) });
    }
  }

  const headingId = `${inputId}-heading`;
  const title = features ? displayTitle(features) : null;

  return (
    <section aria-labelledby={headingId} className="border-t pt-5">
      {features ? (
        <div className="grid grid-cols-[3.25rem_minmax(0,1fr)] items-center gap-x-4 gap-y-3 sm:grid-cols-[3.25rem_minmax(0,1fr)_auto]">
          <SlotMark fingerprint={features.fingerprint} />
          <div className="min-w-0">
            <h2 id={headingId} className="flex min-w-0 items-center gap-2 text-sm">
              <span className="sr-only">Song </span>
              <SlotBadge slot={slot} tone="ink" />
              <span className="sr-only">:</span>
              <span className="truncate font-medium">{title}</span>
              <span className="shrink-0 text-muted-foreground tabular-nums">
                {formatDuration(features.duration_seconds)}
              </span>
            </h2>
            {/* Uploads have no Song Fingerprint: it is only generated for the library. */}
            {!features.fingerprint && (
              <p className="mt-1 text-xs text-muted-foreground">
                Song Fingerprint is available for library tracks only.
              </p>
            )}
          </div>
          <div className="col-start-2 flex gap-2 sm:col-start-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              aria-label={`Replace song ${slot} with an audio file`}
            >
              <Upload />
              Replace…
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept={UPLOAD_ACCEPT}
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              type="button"
              size="sm"
              onClick={toggle}
              aria-label={`${isPlaying ? "Pause" : "Play"} ${title}`}
            >
              {isPlaying ? <Pause /> : <Play />}
              {isPlaying ? "Pause" : "Play"}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <h2 id={headingId} className="mb-3 flex items-center gap-2 text-sm font-medium">
            <span className="sr-only">Song </span>
            <SlotBadge slot={slot} tone="ink" />
            <span aria-hidden="true">Song {slot}</span>
          </h2>
          <Label
            htmlFor={inputId}
            className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-input px-4 py-8 text-center transition-colors hover:bg-accent/50"
          >
            <Upload className="size-5 text-muted-foreground" />
            <span className="text-sm font-medium">Click to choose an audio file</span>
            <span className="text-xs text-muted-foreground">{UPLOAD_FORMATS}</span>
            <input
              id={inputId}
              type="file"
              accept={UPLOAD_ACCEPT}
              onChange={handleFileChange}
              className="sr-only"
            />
          </Label>
        </>
      )}

      {loading && <p className="mt-3 font-mono text-sm text-muted-foreground">{loading}</p>}

      {error && (
        <Alert variant="destructive" className="mt-3">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {features && (
        <div className="mt-5">
          <Fingerprint
            features={features}
            currentTime={currentTime}
            rmsMax={rmsMax}
            centroidMax={centroidMax}
          />
        </div>
      )}
    </section>
  );
}

export default SongPanel;
