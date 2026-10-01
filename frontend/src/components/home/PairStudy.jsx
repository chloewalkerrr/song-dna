import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import SlotBadge from "@/components/SlotBadge";
import FingerprintStrands from "@/FingerprintStrands";
import { useElementWidth } from "@/hooks/use-element-width";
import { cn } from "@/lib/utils";

const STRAND_HEIGHT = 56;

function PairStrand({ slot, track, features, scale }) {
  const [ref, width] = useElementWidth();
  return (
    <div>
      <p className="mb-1.5 flex min-w-0 items-center gap-2 text-sm">
        <SlotBadge slot={slot} />
        <span className="truncate">{track.title}</span>
      </p>
      <div ref={ref} className="w-full contain-inline-size" style={{ height: STRAND_HEIGHT }}>
        {width > 0 && (
          <FingerprintStrands
            features={features}
            width={width}
            height={STRAND_HEIGHT}
            rmsMax={scale.rmsMax}
            centroidMax={scale.centroidMax}
            showBeats={false}
            showPlayhead={false}
          />
        )}
      </div>
    </div>
  );
}

// A small preview of why Compare exists: the current specimen (A) next to a
// second track (B) on the same scale. It shows no findings; Compare computes
// those. "Open in Compare" fills both slots and goes there.
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
    <div className="grid gap-x-10 gap-y-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <div>
        <h2 className="mb-2 text-lg font-semibold tracking-tight">Two tracks, one scale</h2>
        <p className="text-sm text-muted-foreground">
          Compare draws two tracks on the same scale so their heights line up, plays each
          one, and describes the measured differences in words.
        </p>

        <div className="mt-4 text-sm" role="group" aria-label={`Track to compare with ${a.title}`}>
          <span className="text-muted-foreground">Against: </span>
          {others.map((track, i) => (
            <span key={track.id}>
              <button
                type="button"
                aria-pressed={track.id === b.id}
                onClick={() => setChosenB(track.id)}
                className={cn(
                  "rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring",
                  track.id === b.id ? "font-medium text-foreground underline" : "text-muted-foreground"
                )}
              >
                {track.title}
              </button>
              {i < others.length - 1 && <span className="text-muted-foreground"> · </span>}
            </span>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-3 text-sm">
          <span className="font-medium">Fig. 2</span>
          <span className="text-muted-foreground"> · Fig. 1 against a second track</span>
        </p>
        <div className="flex flex-col gap-4">
          <PairStrand slot="A" track={a} features={featuresById.get(a.id)} scale={scale} />
          <PairStrand slot="B" track={b} features={featuresById.get(b.id)} scale={scale} />
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpen(a.id, b.id)}>
            Open in Compare
            <ArrowRight />
          </Button>
          <Link
            to="/compare"
            className="rounded-sm text-sm text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          >
            Or upload your own audio
          </Link>
        </div>
      </div>
    </div>
  );
}

export default PairStudy;
