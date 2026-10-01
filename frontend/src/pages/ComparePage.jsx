import { useMemo, useState } from "react";
import SongPanel from "@/SongPanel";
import Findings from "@/Findings";
import { CENTROID_SCALE_PERCENTILE, getSharedMax, getSharedScaleMax } from "@/scaling";
import { useLibrary } from "@/hooks/use-library";
import { useSelection } from "@/hooks/use-selection";
import { getCompareTracks } from "@/selection";

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
