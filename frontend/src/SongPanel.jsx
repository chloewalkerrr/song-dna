import { useState, useRef, useEffect, useId, useReducer } from "react";
import { Music, Upload } from "lucide-react";
import Fingerprint from "./Fingerprint";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { API_BASE } from "@/lib/config";
import { fetchTrackFeatures } from "@/lib/library";
import { LIBRARY_LOAD_ID, initialPanelState, panelLoadReducer } from "@/panelLoad";

// `track` (optional) is a library track to start with, loaded from its
// precomputed features instead of being uploaded. Uploading a file replaces it.
// ComparePage keys panels by track, so `track` never changes for one panel.
function SongPanel({ label, track, rmsMax, centroidMax, onFeaturesChange }) {
  const inputId = useId();
  const [{ features, loading, error }, dispatch] = useReducer(
    panelLoadReducer,
    track,
    initialPanelState
  );
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
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

  // Whichever load wins, ComparePage sees the slot's current features.
  useEffect(() => {
    onFeaturesChange(features);
  }, [features, onFeaturesChange]);

  function togglePlay() {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    function handleTimeUpdate() {
      setCurrentTime(audio.currentTime);
    }

    audio.addEventListener("timeupdate", handleTimeUpdate);
    return () => audio.removeEventListener("timeupdate", handleTimeUpdate);
  }, [features]);

  async function handleFileChange(event) {
    const file = event.target.files[0];
    if (!file) return;

    const id = ++lastLoadId.current;
    dispatch({ type: "start", id, message: "Analyzing..." });
    const failure = "Couldn't analyze this file — try a different one.";

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_BASE}/analyze`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        dispatch({ type: "fail", id, error: errorBody?.detail || failure });
        return;
      }

      const data = await response.json();
      dispatch({ type: "succeed", id, features: data });
    } catch {
      dispatch({ type: "fail", id, error: failure });
    }
  }

  return (
    <Card className="mb-10">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Music className="size-4" />
          </div>
          <CardTitle>{label}</CardTitle>
        </div>
        {features && (
          <Badge variant="secondary">{features.duration_seconds.toFixed(1)}s</Badge>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Label
          htmlFor={inputId}
          className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-input px-4 py-8 text-center transition-colors hover:bg-accent/50"
        >
          <Upload className="size-5 text-muted-foreground" />
          <span className="text-sm font-medium">Click to choose an audio file</span>
          <span className="text-xs text-muted-foreground">MP3 or WAV</span>
          <input
            id={inputId}
            type="file"
            accept="audio/*"
            onChange={handleFileChange}
            className="sr-only"
          />
        </Label>

        {loading && (
          <p className="font-mono text-sm text-muted-foreground">{loading}</p>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {features && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <span className="truncate font-mono text-xs text-muted-foreground">
                {features.title ?? features.file_path}
              </span>
              <Button onClick={togglePlay} className="shrink-0">
                {isPlaying ? "Pause" : "Play"}
              </Button>
            </div>

            <audio ref={audioRef} src={features.audio_url} />

            <Fingerprint
              features={features}
              currentTime={currentTime}
              rmsMax={rmsMax}
              centroidMax={centroidMax}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default SongPanel;
