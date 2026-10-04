import { useMemo, useState } from "react";
import SongPanel from "@/SongPanel";
import Findings from "@/Findings";
import DnaKey from "@/components/DnaKey";
import { CENTROID_SCALE_PERCENTILE, getSharedMax, getSharedScaleMax } from "@/scaling";
import { formatHz, formatRms } from "@/specimen";
import { useLibrary } from "@/hooks/use-library";
import { useSelection } from "@/hooks/use-selection";
import { getCompareTracks } from "@/selection";

function LegendItem({ kind, label }) {
  return (
    <span className="flex items-center gap-2">
      <DnaKey kind={kind} />
      {label}
    </span>
  );
}

// How to read both charts, drawn once for the page: the marks, then the
// scale they share. The ceilings are the pair's real values (the same ones
// the bars are drawn against), so they change when either song does. With
// one song loaded, the scale is that song's own.
function ChartKey({ rmsMax, centroidMax, shared }) {
  return (
    <div className="flex flex-col gap-1 text-sm text-muted-foreground">
      <div className="flex flex-wrap gap-x-5 gap-y-1">
        <LegendItem kind="energy" label="Energy" />
        <LegendItem kind="brightness" label="Brightness" />
        <LegendItem kind="beats" label="Beats" />
      </div>
      <p className="text-xs tabular-nums">
        {shared ? "Shared scale for A and B" : "Scale"}: full height {formatRms(rmsMax)} (loudest
        frame) · full length {formatHz(centroidMax)} ({CENTROID_SCALE_PERCENTILE}th-percentile
        brightness; brighter moments stop at full length).
      </p>
    </div>
  );
}

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

      {(songAFeatures || songBFeatures) && (
        <div className="mb-6">
          <ChartKey
            rmsMax={rmsMax}
            centroidMax={centroidMax}
            shared={Boolean(songAFeatures && songBFeatures)}
          />
        </div>
      )}

      <div className="flex flex-col gap-10">
        <SongPanel
          slot="A"
          key={`A-${compareTracks.a?.id ?? "upload"}`}
          track={compareTracks.a}
          rmsMax={rmsMax}
          centroidMax={centroidMax}
          onFeaturesChange={setSongAFeatures}
        />
        <SongPanel
          slot="B"
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
    </div>
  );
}

export default ComparePage;
