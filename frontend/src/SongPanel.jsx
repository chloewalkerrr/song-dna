import { useState, useRef, useEffect } from "react";
import Fingerprint from "./Fingerprint";
import { Button } from "@/components/ui/button";

function SongPanel({ label, rmsMax, centroidMax, onFeaturesChange }) {
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
    <div style={{ marginBottom: 40 }}>
      <h2 style={{ fontWeight: 600, fontSize: 18, marginBottom: 8 }}>{label}</h2>
      <input type="file" accept="audio/*" onChange={handleFileChange} />

      {loading && (
        <p style={{ fontFamily: "monospace", fontSize: 13, color: "#6b6b6b", marginTop: 16 }}>
          Analyzing...
        </p>
      )}

      {error && (
        <p style={{ fontFamily: "monospace", fontSize: 13, color: "#c0392b", marginTop: 16 }}>
          {error}
        </p>
      )}

      {features && (
        <div style={{ marginTop: 24 }}>
          <p style={{ fontFamily: "monospace", fontSize: 12, color: "#6b6b6b", marginBottom: 12 }}>
            {features.file_path} — {features.duration_seconds.toFixed(1)}s
          </p>

          <audio ref={audioRef} src={features.audio_url} />
          <Button onClick={togglePlay} className="mt-3 mb-3">
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
    </div>
  );
}

export default SongPanel;
