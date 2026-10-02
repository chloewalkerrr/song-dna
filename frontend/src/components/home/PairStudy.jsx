import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import SlotBadge from "@/components/SlotBadge";
import SongFingerprint from "@/components/SongFingerprint";
import FingerprintStrands from "@/FingerprintStrands";
import { formatDuration } from "@/format";
import { useElementWidth } from "@/hooks/use-element-width";
import { cn } from "@/lib/utils";

const STRAND_HEIGHT = 56;

// One side of the pair: its Song Fingerprint thumbnail (native 52 px) beside
// its Song DNA strip on the page's shared scale. Below sm the strip takes the
// full width under the thumbnail and title, so its open brightness bars keep
// as much room as the page allows.
function PairRow({ slot, track, features, scale }) {
  const [ref, width] = useElementWidth();
  return (
    <div className="grid grid-cols-[3.25rem_minmax(0,1fr)] items-center gap-x-4 gap-y-2">
      <SongFingerprint
        fingerprint={track.fingerprint}
        className="size-13 text-foreground/75 sm:row-span-2 sm:self-end"
      />
      <p className="flex min-w-0 items-center gap-2 text-sm">
        <SlotBadge slot={slot} tone="ink" />
        <span className="truncate">{track.title}</span>
        <span className="shrink-0 text-muted-foreground tabular-nums">
          {formatDuration(track.duration_seconds)}
        </span>
      </p>
      <div
        ref={ref}
        className="col-span-2 w-full contain-inline-size sm:col-span-1 sm:col-start-2"
        style={{ height: STRAND_HEIGHT }}
      >
        {width > 0 && (
          <FingerprintStrands
            features={features}
            width={width}
            height={STRAND_HEIGHT}
            rmsMax={scale.rmsMax}
            centroidMax={scale.centroidMax}
            showBeats={false}
            showPlayhead={false}
            variant="instrument"
          />
        )}
      </div>
    </div>
  );
}

// "Fig. 3": the current track (A) next to a second track (B) on the same
// scale, as a preview of why Compare exists. It shows no findings; Compare
// computes those. "Open in Compare" fills both slots and goes there.
function PairStudy({ tracks, featuresById, scale, aId, onOpen }) {
  const others = tracks.filter((track) => track.id !== aId && featuresById.has(track.id));
  const [chosenB, setChosenB] = useState(null);
  // Default B: the next track after A in library order, so the pair changes
  // with the specimen without anyone having to rank tracks by "difference".
  const aIndex = tracks.findIndex((track) => track.id === aId);
  const fallbackB =
    tracks.slice(aIndex + 1).find((track) => featuresById.has(track.id)) ?? others[0];
  const b = others.find((track) => track.id === chosenB) ?? fallbackB;
  const a = tracks.find((track) => track.id === aId);

  if (!a || !b) return null;

  return (
    <figure>
      <figcaption className="mb-4 font-serif text-lg">
        Fig. 3 <span className="text-muted-foreground">· Comparison</span>
      </figcaption>

      <div className="grid gap-x-12 gap-y-8 lg:grid-cols-[13rem_minmax(0,1fr)]">
        {/* The chosen B is marked by its badge and a heavier name, not colour. */}
        <div role="group" aria-labelledby="compare-against">
          <p id="compare-against" className="mb-2 text-sm font-medium">
            Compare against
          </p>
          <ul className="border-t">
            {others.map((track) => {
              const chosen = track.id === b.id;
              return (
                <li key={track.id} className="border-b">
                  <button
                    type="button"
                    aria-pressed={chosen}
                    onClick={() => setChosenB(track.id)}
                    className={cn(
                      "grid w-full grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-x-2 px-1 py-2 text-left text-sm outline-none transition-colors",
                      "hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring",
                      chosen ? "font-medium text-foreground" : "text-muted-foreground"
                    )}
                  >
                    <span aria-hidden="true">
                      {chosen && <SlotBadge slot="B" tone="ink" />}
                    </span>
                    <span className="truncate">{track.title}</span>
                    <span className="font-normal text-muted-foreground tabular-nums">
                      {formatDuration(track.duration_seconds)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <div className="flex flex-col gap-6 lg:gap-9">
            <PairRow slot="A" track={a} features={featuresById.get(a.id)} scale={scale} />
            <PairRow slot="B" track={b} features={featuresById.get(b.id)} scale={scale} />
          </div>
          <p className="mt-5 max-w-prose text-sm text-muted-foreground">
            Both strips share Fig. 2&apos;s scale, so heights compare directly. Compare plays
            each track and adds measured findings in words.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => onOpen(a.id, b.id)}
          >
            Open in Compare
            <ArrowRight />
          </Button>
        </div>
      </div>
    </figure>
  );
}

export default PairStudy;
