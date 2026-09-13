import { useState } from "react";
import SongPanel from "./SongPanel";
import { getSharedMax, getSharedScaleMax } from "./scaling";

// Spectral centroid has rare outlier frames (e.g. a single transient/click)
// that sit far above the vast majority of the song's real range - a true
// max lets one such frame flatten the entire visual scale. RMS energy
// doesn't show this problem (confirmed against real extracted audio: its
// 90th percentile sits at 64-100% of its true max, vs centroid's 33-87%),
// so only centroid uses percentile-based scaling; RMS keeps the true max.
const CENTROID_SCALE_PERCENTILE = 95;

function App() {
  const [songAFeatures, setSongAFeatures] = useState(null);
  const [songBFeatures, setSongBFeatures] = useState(null);

  const rmsMax = getSharedMax([
    songAFeatures?.rms_energy,
    songBFeatures?.rms_energy,
  ]);
  const centroidMax = getSharedScaleMax(
    [songAFeatures?.spectral_centroid, songBFeatures?.spectral_centroid],
    CENTROID_SCALE_PERCENTILE
  );

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
        <h1 className="mb-1 text-3xl font-semibold tracking-tight">
          Song DNA
        </h1>
        <p className="mb-6 text-sm text-neutral-500">
          Upload two tracks to compare their energy and brightness over time.
        </p>

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
