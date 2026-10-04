import { useState } from "react";
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import DnaKey from "@/components/DnaKey";
import FingerprintStrands from "@/FingerprintStrands";
import { SEGMENT_COUNT, getSegmentLayout } from "@/fingerprintLayout";
import { formatDuration } from "@/format";
import { useAudioPlayhead } from "@/hooks/use-audio-playhead";
import { useElementWidth } from "@/hooks/use-element-width";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  formatClock,
  formatHz,
  formatRms,
  readSlice,
  sliceIndexAt,
  sliceSpan,
} from "@/specimen";

// Taller than Compare's 160px charts: on Home the figure is the page's main
// visual. On phones it is shorter so the notes and readout stay close by.
const FIGURE_HEIGHT = 240;
const FIGURE_HEIGHT_MOBILE = 168;

function Note({ kind, label, children }) {
  return (
    <div>
      <dt className="flex items-center gap-2 text-sm font-medium">
        <DnaKey kind={kind} />
        {label}
      </dt>
      <dd className="mt-0.5 text-sm leading-snug text-muted-foreground">{children}</dd>
    </div>
  );
}

function readoutText(slice) {
  return `${formatClock(slice.start)}–${formatClock(slice.end)}  ·  energy ${formatRms(slice.energy)}  ·  brightness ${formatHz(slice.brightnessHz)}`;
}

// The page's shared scale, beside the chart: a full-height energy bar is
// `rmsMax` (the loudest frame in the library) and a full-length brightness bar
// is `centroidMax` (the library's 95th-percentile centroid; brighter slices
// stop at full length). Both come from getLibraryScale, never fixed values.
function ScaleGutter({ scale, height }) {
  return (
    <div
      aria-hidden="true"
      className="relative hidden text-right text-xs leading-none text-muted-foreground tabular-nums sm:block"
      style={{ height }}
    >
      {/* Each ceiling sits on the edge it describes: energy's on the top edge,
          brightness's on the bottom edge, with its qualifier hanging below. */}
      <span className="absolute top-0 right-0">{formatRms(scale.rmsMax)}</span>
      <span className="absolute top-1/2 right-0 -translate-y-1/2">0</span>
      <span className="absolute right-0 bottom-0">{formatHz(scale.centroidMax)}</span>
      <span className="absolute top-full right-0 mt-1">95th pct.</span>
    </div>
  );
}

// "Fig. 2": one real library track's Song DNA drawn large in the instrument
// style, with short notes on how to read it. Moving across the figure
// (pointer, or arrow keys once it has focus) reads the averaged values of the
// slice under the cursor, which a soft ochre band marks; clicking moves
// playback there. The band fills the slice's whole cell, so it never looks
// like the thin ochre playhead.
function SpecimenFigure({ track, features, scale }) {
  const isMobile = useIsMobile();
  const height = isMobile ? FIGURE_HEIGHT_MOBILE : FIGURE_HEIGHT;
  const [containerRef, width] = useElementWidth();
  const { isPlaying, currentTime, toggle, seek } = useAudioPlayhead(features.audio_url);
  // The slice under the cursor, stored with the track it belongs to so that
  // switching specimen clears it without an effect.
  const [cursor, setCursor] = useState({ trackId: null, index: null });

  const duration = features.duration_seconds;
  // The pipeline's tempo estimate; it can be missing (and can be wrong on
  // synthetic audio), so it is always labelled as an estimate.
  const tempoBpm = Number.isFinite(features.tempo_bpm) ? Math.round(features.tempo_bpm) : null;
  const cursorIndex = cursor.trackId === track.id ? cursor.index : null;
  const slice = cursorIndex === null ? null : readSlice(features, cursorIndex);

  function indexFromPointer(event) {
    const box = event.currentTarget.getBoundingClientRect();
    return sliceIndexAt(((event.clientX - box.left) / box.width) * duration, duration);
  }

  function moveTo(index) {
    setCursor({ trackId: track.id, index: Math.min(Math.max(index, 0), SEGMENT_COUNT - 1) });
  }

  function handleKeyDown(event) {
    const current = cursorIndex ?? sliceIndexAt(currentTime, duration);
    // Enter/Space do for the keyboard what a click does: move playback to the
    // slice being read.
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      seek(sliceSpan(current, duration).start);
      return;
    }
    const steps = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: SEGMENT_COUNT - 1 };
    if (!(event.key in steps)) return;
    event.preventDefault();
    // The first key press shows the slice at the playhead before moving.
    moveTo(cursorIndex === null ? current : steps[event.key]);
  }

  // The chart containers below use `contain-inline-size`: the SVG is drawn at
  // a measured pixel width, and without containment that width would stop the
  // page column from shrinking when the window narrows (so it would never be
  // re-measured smaller).
  // The read band covers exactly the cell the strands draw that slice in.
  const { cellWidth } = getSegmentLayout(width, SEGMENT_COUNT);

  return (
    <figure>
      {/* The caption wraps rather than truncating, so the duration stays
          visible on phones. */}
      <figcaption className="mb-4 flex items-start justify-between gap-4">
        <p className="min-w-0 pt-0.5">
          <span className="font-serif text-lg">Fig. 2</span>
          <span className="font-serif text-lg text-muted-foreground"> · Song DNA</span>
          <span className="text-sm text-muted-foreground"> · </span>
          <span className="text-sm font-medium">{track.title}</span>
          <span className="text-sm text-muted-foreground tabular-nums"> · {formatDuration(duration)}</span>
        </p>
        <Button
          type="button"
          size="sm"
          onClick={toggle}
          aria-label={`${isPlaying ? "Pause" : "Play"} ${track.title}`}
        >
          {isPlaying ? <Pause /> : <Play />}
          {isPlaying ? "Pause" : "Play"}
        </Button>
      </figcaption>

      {/* On phones the gutter would take width the open brightness bars need,
          so the scale is a line above the chart instead. */}
      <p className="mb-2 text-xs text-muted-foreground tabular-nums sm:hidden">
        Full scale: {formatRms(scale.rmsMax)} up · {formatHz(scale.centroidMax)} down (95th pct.)
      </p>
      {/* The gutter is visual only, so from sm up the same ceilings are spoken
          here. Hidden (not just visually) below sm, where the line above is
          read instead, so they are never announced twice. */}
      <p className="sr-only hidden sm:block">
        Scale: a full-height energy bar is {formatRms(scale.rmsMax)}, the loudest frame in the
        library. A full-length brightness bar is {formatHz(scale.centroidMax)}, the
        library&apos;s 95th-percentile brightness; brighter moments stop at full length.
      </p>

      <div className="grid gap-x-2 sm:grid-cols-[4rem_minmax(0,1fr)]">
        <ScaleGutter scale={scale} height={height} />

        <div
          ref={containerRef}
          role="slider"
          tabIndex={0}
          aria-label={`Moments in ${track.title}`}
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={slice ? Math.round(slice.start) : 0}
          aria-valuetext={slice ? readoutText(slice) : "Use the arrow keys to read the figure"}
          onPointerMove={(event) => moveTo(indexFromPointer(event))}
          // Touch "leaves" as soon as the finger lifts; keep that reading visible.
          onPointerLeave={(event) => {
            if (event.pointerType === "mouse") setCursor({ trackId: null, index: null });
          }}
          // click, not pointerdown: on touch screens a scroll that starts on the
          // figure also fires pointerdown, and shouldn't move playback.
          onClick={(event) => seek(sliceSpan(indexFromPointer(event), duration).start)}
          onKeyDown={handleKeyDown}
          className="relative cursor-crosshair touch-pan-y outline-none contain-inline-size focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
          style={{ height }}
        >
          {slice && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 bg-now-soft"
              style={{ left: slice.index * cellWidth, width: cellWidth }}
            />
          )}
          {width > 0 && (
            <FingerprintStrands
              features={features}
              width={width}
              height={height}
              rmsMax={scale.rmsMax}
              centroidMax={scale.centroidMax}
              currentTime={currentTime}
              // Hidden at 0:00: a line parked on the left edge reads as an axis.
              showPlayhead={currentTime > 0}
              variant="instrument"
            />
          )}
        </div>

        <div className="sm:col-start-2">
          <div className="mt-2 flex justify-between text-xs text-muted-foreground tabular-nums">
            <span>{formatDuration(0)}</span>
            <span>{formatDuration(duration / 2)}</span>
            <span>{formatDuration(duration)}</span>
          </div>

          <p className="mt-3 min-h-5 text-sm" aria-hidden="true">
            {slice ? (
              <span className="flex flex-wrap gap-x-4 gap-y-0.5 tabular-nums">
                <span>
                  {formatClock(slice.start)}–{formatClock(slice.end)}
                </span>
                <span>
                  <span className="text-muted-foreground">Energy </span>
                  {formatRms(slice.energy)}
                </span>
                <span>
                  <span className="text-muted-foreground">Brightness </span>
                  {formatHz(slice.brightnessHz)}
                </span>
              </span>
            ) : (
              <span className="text-muted-foreground">
                Move across the figure to read any moment; click, or press Enter, to move playback there.
              </span>
            )}
          </p>
          {track.description && (
            <p className="mt-1 max-w-prose text-xs text-muted-foreground">{track.description}</p>
          )}

          <dl className="mt-8 grid gap-4 sm:grid-cols-3 sm:gap-6">
            <Note kind="energy" label="Energy">
              Solid, rising. Taller is louder.
            </Note>
            <Note kind="brightness" label="Brightness">
              Open, hanging. Longer is more high-frequency content.
            </Note>
            <Note kind="beats" label="Beats">
              A tick is a detected beat
              {tempoBpm !== null && <>; about {tempoBpm} BPM (estimated)</>}.
            </Note>
          </dl>
        </div>
      </div>
    </figure>
  );
}

export default SpecimenFigure;
