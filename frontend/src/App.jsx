import { useState } from "react";
import SongPanel from "./SongPanel";
import { getSharedMax } from "./scaling";
import { Button } from "@/components/ui/button";

function App() {
  const [songAFeatures, setSongAFeatures] = useState(null);
  const [songBFeatures, setSongBFeatures] = useState(null);

  const rmsMax = getSharedMax([
    songAFeatures?.rms_energy,
    songBFeatures?.rms_energy,
  ]);
  const centroidMax = getSharedMax([
    songAFeatures?.spectral_centroid,
    songBFeatures?.spectral_centroid,
  ]);

  return (
    <div
      style={{
        fontFamily: "'Inter', sans-serif",
        color: "#0a0a0a",
        background: "#ffffff",
        minHeight: "100vh",
        padding: "40px 32px",
      }}
    >
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        <h1 style={{ fontWeight: 600, fontSize: 28, letterSpacing: "-0.01em", marginBottom: 4 }}>
          Song DNA
        </h1>
        <p style={{ color: "#6b6b6b", fontSize: 14, marginBottom: 24 }}>
          Upload two tracks to compare their energy and brightness over time.
        </p>

        {/* Tailwind + shadcn/ui smoke test only — remove once real styling work begins */}
        <Button variant="default" style={{ marginBottom: 24 }}>
          Tailwind/shadcn test button
        </Button>

        <SongPanel
          label="Song A"
          rmsMax={rmsMax}
          centroidMax={centroidMax}
          onFeaturesChange={setSongAFeatures}
        />
        <SongPanel
          label="Song B"
          rmsMax={rmsMax}
          centroidMax={centroidMax}
          onFeaturesChange={setSongBFeatures}
        />
      </div>
    </div>
  );
}

export default App;
