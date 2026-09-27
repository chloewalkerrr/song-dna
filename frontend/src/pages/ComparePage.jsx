import { useMemo, useState } from "react";
import SongPanel from "@/SongPanel";
import Findings from "@/Findings";
import { getSharedMax, getSharedScaleMax } from "@/scaling";
import { useLibrary } from "@/hooks/use-library";
import { useSelection } from "@/hooks/use-selection";
import { getCompareTracks } from "@/selection";

// Spectral centroid has rare outlier frames (e.g. a single transient/click)
// that sit far above the vast majority of the song's real range - a true
// max lets one such frame flatten the entire visual scale. RMS energy
// doesn't show this problem (confirmed against real extracted audio: its
// 90th percentile sits at 64-100% of its true max, vs centroid's 33-87%),
// so only centroid uses percentile-based scaling; RMS keeps the true max.
const CENTROID_SCALE_PERCENTILE = 95;

function ComparePage() {
  const [songAFeatures, setSongAFeatures] = useState(null);
  const [songBFeatures, setSongBFeatures] = useState(null);
  const { tracks } = useLibrary();
  const { selection } = useSelection();

  // Two tracks picked in the Library start pre-loaded; otherwise both slots
  // start empty for uploads.
  const compareTracks = useMemo(() => getCompareTracks(selection, tracks), [selection, tracks]);

  const rmsMax = getSharedMax([
    songAFeatures?.rms_energy,
    songBFeatures?.rms_energy,
  ]);
  const centroidMax = getSharedScaleMax(
    [songAFeatures?.spectral_centroid, songBFeatures?.spectral_centroid],
    CENTROID_SCALE_PERCENTILE
  );

  return (
    <div className="mx-auto max-w-[920px]">
      <h1 className="mb-1 text-3xl font-semibold tracking-tight">Compare</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Compare the energy and brightness of two tracks over time. Upload a file to add or
        replace either song.
      </p>

      <SongPanel
        label="Song A"
        key={`A-${compareTracks.a?.id ?? "upload"}`}
        track={compareTracks.a}
        rmsMax={rmsMax}
        centroidMax={centroidMax}
        onFeaturesChange={setSongAFeatures}
      />
      <SongPanel
        label="Song B"
        key={`B-${compareTracks.b?.id ?? "upload"}`}
        track={compareTracks.b}
        rmsMax={rmsMax}
        centroidMax={centroidMax}
        onFeaturesChange={setSongBFeatures}
      />

      {songAFeatures && songBFeatures && (
        <Findings songAFeatures={songAFeatures} songBFeatures={songBFeatures} />
      )}
    </div>
  );
}

export default ComparePage;
