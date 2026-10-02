import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import FingerprintFigure from "@/components/home/FingerprintFigure";
import PairStudy from "@/components/home/PairStudy";
import SpecimenFigure from "@/components/home/SpecimenFigure";
import TrackIndex from "@/components/home/TrackIndex";
import { SEGMENT_COUNT } from "@/fingerprintLayout";
import { useLibrary } from "@/hooks/use-library";
import { useLibraryFeatures } from "@/hooks/use-library-features";
import { useSelection } from "@/hooks/use-selection";
import { getLibraryScale, measurementInterval } from "@/specimen";

// The track the page opens with (Fig. 1 and Fig. 2). The page uses one scale for every track, and
// Dev Sweep is the loudest in the library (its slice averages reach ~0.34 RMS
// against Dev Sections' ~0.11), so it is the one that fills the figure on that
// shared scale: two slow swells in energy, repeating chirps in brightness.
// Its tempo estimate (~92 BPM) is also plausible, unlike Dev Slow Build's.
// Falls back to the first track that loaded if it is missing.
const DEFAULT_SPECIMEN_ID = "dev-sweep";

function MethodNote({ term, figure, children }) {
  return (
    <div>
      <dt className="mb-1 text-sm font-medium">
        {term} <span className="font-normal text-muted-foreground">· {figure}</span>
      </dt>
      <dd className="text-xs leading-relaxed text-muted-foreground">{children}</dd>
    </div>
  );
}

// How each figure is made, kept short: one note per figure, with the
// measurement rate taken from the current track's own data.
function Methodology({ features }) {
  const { intervalMs } = measurementInterval(features);
  return (
    <section aria-labelledby="method-heading" className="mt-20 border-t pt-6">
      <h2 id="method-heading" className="mb-4 text-sm font-medium">
        How it&apos;s measured
      </h2>
      <dl className="grid gap-5 sm:grid-cols-3 sm:gap-8">
        <MethodNote term="Song Fingerprint" figure="Fig. 1">
          The whole track as one mark, with no time axis: where it sits between tonal and
          spread (chroma entropy) and dark and bright (spectral centroid). An identity mark,
          not a unique identifier or a judgement of genre, mood or quality.
        </MethodNote>
        <MethodNote term="Song DNA" figure="Fig. 2">
          Energy (RMS) and brightness (spectral centroid), measured about every{" "}
          {Math.round(intervalMs)} ms and averaged into {SEGMENT_COUNT} segments; beat ticks
          from librosa&apos;s beat tracker. Home uses one scale for the whole library: its loudest frame
          and its 95th-percentile brightness (brighter segments stop at full length).
        </MethodNote>
        <MethodNote term="Comparison" figure="Fig. 3">
          Two tracks on that same scale. Compare adds rule-based findings from the
          measurements, with no overall similarity score and no machine learning. Your own
          audio needs the local analysis server.
        </MethodNote>
      </dl>
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
      {/* Intro: a serif headline (headings and figure labels only use serif),
          then two links styled as actions. */}
      <h1 className="mb-3 font-serif text-3xl font-normal tracking-tight">
        See how a track is measured
      </h1>
      <p className="max-w-[62ch] text-sm leading-relaxed text-muted-foreground">
        SongDNA draws each track two ways from the same audio. Its{" "}
        <span className="text-foreground">Song Fingerprint</span> summarises the whole track in
        one mark, with no time axis. Its <span className="text-foreground">Song DNA</span> shows
        how loudness and brightness change from moment to moment.
      </p>
      <div className="mt-5 mb-14 flex flex-wrap items-center gap-3 lg:mb-10">
        <Button asChild size="sm">
          <Link to="/library">Browse library</Link>
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link to="/compare">
            Analyse your own audio
            <ArrowRight />
          </Link>
        </Button>
      </div>

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
          {/* Top row: the current track's Song Fingerprint beside the index
              that chooses it. Stacked (figure first) below lg. */}
          <div className="grid gap-x-12 gap-y-14 lg:grid-cols-[20rem_minmax(0,1fr)] lg:gap-x-16">
            <FingerprintFigure track={specimen} />

            <section aria-labelledby="library-heading">
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
                currentId={specimen.id}
                onSelect={setSpecimenId}
              />
            </section>
          </div>

          <div className="mt-20">
            <SpecimenFigure
              track={specimen}
              features={features.byId.get(specimen.id)}
              scale={scale}
            />
          </div>

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
