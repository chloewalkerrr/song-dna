import { useState, useRef, useEffect, useId } from "react";
import { Music, Upload } from "lucide-react";
import Fingerprint from "./Fingerprint";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { API_BASE } from "@/lib/config";

function SongPanel({ label, rmsMax, centroidMax, onFeaturesChange }) {
  const inputId = useId();
  const [features, setFeatures] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

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

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_BASE}/analyze`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        setFeatures(null);
        onFeaturesChange(null);
        setError(errorBody?.detail || "Couldn't analyze this file — try a different one.");
        return;
      }

      const data = await response.json();
      setFeatures(data);
      onFeaturesChange(data);
    } catch {
      setFeatures(null);
      onFeaturesChange(null);
      setError("Couldn't analyze this file — try a different one.");
    } finally {
      setLoading(false);
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
          <p className="font-mono text-sm text-muted-foreground">Analyzing...</p>
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
                {features.file_path}
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
