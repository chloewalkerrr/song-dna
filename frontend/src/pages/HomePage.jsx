import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import PairStudy from "@/components/home/PairStudy";
import SpecimenFigure from "@/components/home/SpecimenFigure";
import TrackIndex from "@/components/home/TrackIndex";
import { SEGMENT_COUNT } from "@/fingerprintLayout";
import { useLibrary } from "@/hooks/use-library";
import { useLibraryFeatures } from "@/hooks/use-library-features";
import { useSelection } from "@/hooks/use-selection";
import { getLibraryScale, measurementInterval } from "@/specimen";

// The track Fig. 1 opens with. The page uses one scale for every track, and
// Dev Sweep is the loudest in the library (its slice averages reach ~0.34 RMS
// against Dev Sections' ~0.11), so it is the one that fills the figure on that
// shared scale: two slow swells in energy, repeating chirps in brightness.
// Its tempo estimate (~92 BPM) is also plausible, unlike Dev Slow Build's.
// Falls back to the first track that loaded if it is missing.
const DEFAULT_SPECIMEN_ID = "dev-sweep";

function Methodology({ features }) {
  const { frames, intervalMs } = measurementInterval(features);
  return (
    <section aria-labelledby="method-heading" className="mt-20 border-t pt-6">
      <h2 id="method-heading" className="mb-2 text-sm font-medium">
        How it&apos;s measured
      </h2>
      <p className="max-w-prose text-xs leading-relaxed text-muted-foreground">
        Each track is analysed
        {Number.isFinite(features.sample_rate) &&
          ` at ${features.sample_rate.toLocaleString("en-US")} Hz`}
        , with a measurement about every {Math.round(intervalMs)} ms (
        {frames.toLocaleString("en-US")}{" "}
        for this {Math.round(features.duration_seconds)}-second clip). Energy is the RMS
        (root mean square) of each frame, computed directly with NumPy; brightness is the
        spectral centroid and beats come from librosa&apos;s beat tracker. The figure averages
        those measurements into {SEGMENT_COUNT} slices for display only. Every strand on
        this page shares one scale: bar heights are relative to the loudest moment and the
        95th-percentile brightness across the whole library (Compare applies the same rules to
        its pair), so heights compare directly. There is no machine learning, and SongDNA
        doesn&apos;t infer genre or mood from the audio. Uploading your own audio in Compare
        needs the local analysis server running.
      </p>
    </section>
  );
}

function HomePage() {
  const navigate = useNavigate();
  const { status, tracks, error } = useLibrary();
  const features = useLibraryFeatures(tracks);
  const { setPair } = useSelection();
  const [specimenId, setSpecimenId] = useState(null);

  const loaded = useMemo(
    () => tracks.filter((track) => features.byId.has(track.id)),
    [tracks, features.byId]
  );
  const scale = useMemo(
    () => getLibraryScale(loaded.map((track) => features.byId.get(track.id))),
    [loaded, features.byId]
  );

  const specimen =
    loaded.find((track) => track.id === specimenId) ??
    loaded.find((track) => track.id === DEFAULT_SPECIMEN_ID) ??
    loaded[0];

  function openPair(a, b) {
    setPair(a, b);
    navigate("/compare");
  }

  const ready = status === "ready" && features.status === "ready";

  return (
    <div className="mx-auto max-w-[920px]">
      <h1 className="mb-1 text-3xl font-semibold tracking-tight">See how a track is measured</h1>
      <p className="mb-10 max-w-[60ch] text-sm text-muted-foreground">
        SongDNA measures how loud and how bright a short audio clip is, moment by moment,
        and draws it as a fingerprint.
      </p>

      {status === "error" && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {status !== "error" && !ready && (
        <div aria-busy="true">
          <Skeleton className="mb-3 h-5 w-64" />
          <Skeleton className="h-60 w-full" />
        </div>
      )}

      {/* A valid but empty library is not a failure: say so plainly. */}
      {ready && tracks.length === 0 && (
        <p className="text-sm text-muted-foreground">The library has no tracks yet.</p>
      )}

      {ready && tracks.length > 0 && !specimen && (
        <Alert variant="destructive">
          <AlertDescription>Couldn&apos;t load the analysis for any library track.</AlertDescription>
        </Alert>
      )}

      {ready && specimen && (
        <>
          <SpecimenFigure
            track={specimen}
            features={features.byId.get(specimen.id)}
            scale={scale}
          />

          <section aria-labelledby="library-heading" className="mt-20">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <h2 id="library-heading" className="text-lg font-semibold tracking-tight">
                The library
              </h2>
              <Link
                to="/library"
                className="rounded-sm text-sm text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring"
              >
                Browse, search and pick tracks →
              </Link>
            </div>
            <p className="mb-5 max-w-[60ch] text-sm text-muted-foreground">
              {tracks.length} synthetic test tracks, generated for development. Choose one to
              make it Fig. 1.
            </p>
            <TrackIndex
              tracks={tracks}
              featuresById={features.byId}
              scale={scale}
              currentId={specimen.id}
              onSelect={setSpecimenId}
            />
          </section>

          <section aria-label="Comparing two tracks" className="mt-20">
            <PairStudy
              tracks={tracks}
              featuresById={features.byId}
              scale={scale}
              aId={specimen.id}
              onOpen={openPair}
            />
          </section>

          <Methodology features={features.byId.get(specimen.id)} />
        </>
      )}
    </div>
  );
}

export default HomePage;
