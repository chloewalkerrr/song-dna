import { Skeleton } from "@/components/ui/skeleton";
import SongFingerprint from "@/components/SongFingerprint";
import { formatDuration } from "@/format";
import { useFingerprintHero } from "@/hooks/use-fingerprint-hero";
import { unavailableText } from "@/lib/songFingerprint";

// The hero is traced on a 220 x 220 view and drawn at exactly that many CSS
// pixels, so its 1.35-unit strokes land as drawn rather than being rescaled.
const HERO_BOX = "size-[220px]";

function Fact({ label, children }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate tabular-nums">{children}</dd>
    </>
  );
}

// The four edges of the fingerprint's measurement space (see
// song_fingerprint/measure.py): up is brighter (log spectral centroid), right
// is more spread across the 12 pitch classes (chroma entropy). Only the edges
// are named: the mark has no scale or grid to read values from.
function EdgeLabels({ children }) {
  const label = "text-xs text-muted-foreground";
  return (
    <div className="grid w-fit grid-cols-[auto_auto_auto] items-center gap-2">
      <span className={`${label} col-start-2 row-start-1 text-center`}>bright</span>
      <span className={`${label} col-start-1 row-start-2 rotate-180 [writing-mode:vertical-rl]`}>tonal</span>
      <div className="col-start-2 row-start-2">{children}</div>
      <span className={`${label} col-start-3 row-start-2 [writing-mode:vertical-rl]`}>spread</span>
      <span className={`${label} col-start-2 row-start-3 text-center`}>dark</span>
    </div>
  );
}

// "Fig. 1": the current track's Song Fingerprint at its native hero size. It
// is a whole-track identity mark, separate from the timeline in Fig. 2, and
// stays neutral like the library thumbnails.
function FingerprintFigure({ track }) {
  const load = useFingerprintHero(track);
  const frames = load.status === "ready" ? load.hero.frames : null;

  return (
    <figure aria-busy={load.status === "loading"}>
      <figcaption className="mb-4 font-serif text-lg">
        Fig. 1 <span className="text-muted-foreground">· Song Fingerprint</span>
      </figcaption>

      {load.status === "unavailable" ? (
        <div>
          <SongFingerprint fingerprint={null} variant="hero" className={HERO_BOX} />
          <p className="mt-3 max-w-[220px] text-sm text-muted-foreground">
            {unavailableText(load.reason)}
          </p>
        </div>
      ) : (
        <EdgeLabels>
          {load.status === "loading" ? (
            <Skeleton className={HERO_BOX} />
          ) : (
            <div
              role="img"
              aria-label={`Song Fingerprint of ${track.title}: higher is brighter, further right is spread across more pitch classes.`}
            >
              <SongFingerprint fingerprint={load.hero} variant="hero" className={`${HERO_BOX} text-foreground`} />
            </div>
          )}
        </EdgeLabels>
      )}

      <dl className="mt-5 grid lg:mt-3 grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-sm">
        <Fact label="Track">{track.title}</Fact>
        <Fact label="Duration">{formatDuration(track.duration_seconds)}</Fact>
        {load.status === "loading" && (
          <Fact label="Voiced frames">
            <Skeleton className="mt-0.5 h-4 w-24" />
          </Fact>
        )}
        {frames && (
          <Fact label="Voiced frames">
            {frames.voicedFrames.toLocaleString("en-US")} of{" "}
            {frames.totalFrames.toLocaleString("en-US")}
          </Fact>
        )}
      </dl>

      <p className="mt-3 max-w-[18rem] text-xs lg:mt-2.5 lg:max-w-none leading-relaxed text-muted-foreground">
        The whole track as one mark, with no time axis: the lines outline where its sound
        spends its time, from tonal to spread across pitch and from dark to bright. Only
        voiced (non-silent) frames count.
      </p>
    </figure>
  );
}

export default FingerprintFigure;
