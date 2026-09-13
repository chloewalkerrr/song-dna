import { useState, useRef, useEffect, useId } from "react";
import Fingerprint from "./Fingerprint";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
      const response = await fetch("http://127.0.0.1:8000/analyze", {
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
      <CardHeader>
        <CardTitle>{label}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor={inputId}>Audio file</Label>
          <Input id={inputId} type="file" accept="audio/*" onChange={handleFileChange} />
        </div>

        {loading && (
          <p className="font-mono text-sm text-neutral-500">Analyzing...</p>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {features && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-neutral-500">{features.file_path}</span>
              <Badge variant="secondary">{features.duration_seconds.toFixed(1)}s</Badge>
            </div>

            <audio ref={audioRef} src={features.audio_url} />
            <Button onClick={togglePlay} className="w-fit">
              {isPlaying ? "Pause" : "Play"}
            </Button>

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
