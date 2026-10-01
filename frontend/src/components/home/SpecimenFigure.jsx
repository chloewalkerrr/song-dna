import { useState } from "react";
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import FingerprintStrands from "@/FingerprintStrands";
import { SEGMENT_COUNT } from "@/fingerprintLayout";
import { formatDuration } from "@/format";
import { useAudioPlayhead } from "@/hooks/use-audio-playhead";
import { useElementWidth } from "@/hooks/use-element-width";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  formatClock,
  formatHz,
  readSlice,
  sliceIndexAt,
  sliceSpan,
} from "@/specimen";

// Taller than Compare's 200px chart: on Home the figure is the page's main
// visual. On phones it is shorter so the notes and readout stay close by.
const FIGURE_HEIGHT = 240;
const FIGURE_HEIGHT_MOBILE = 168;


function Swatch({ kind }) {
  // Full class strings for Tailwind. Beats are drawn as dots in the figure,
  // so their key is a dot; the strands are bars, so theirs are squares.
  const classes = {
    beats: "size-1.5 rounded-full bg-foreground/50",
    energy: "size-2 bg-violet-500",
    brightness: "size-2 bg-cyan-500",
  };
  return <span aria-hidden="true" className={`inline-block shrink-0 ${classes[kind]}`} />;
}

function Note({ kind, label, children }) {
  return (
    <div>
      <dt className="flex items-center gap-2 text-sm font-medium">
        <Swatch kind={kind} />
        {label}
      </dt>
      <dd className="mt-0.5 text-sm leading-snug text-muted-foreground">{children}</dd>
    </div>
  );
}

function readoutText(slice) {
  return `${formatClock(slice.start)}–${formatClock(slice.end)}  ·  energy ${slice.energy.toFixed(3)} RMS  ·  brightness ${formatHz(slice.brightnessHz)}`;
}

// "Fig. 1": one real library track drawn large, with short notes beside the
// strands they explain. Moving across the figure (pointer, or arrow keys once
// it has focus) reads the averaged values of the slice under the cursor;
// clicking moves playback there. The reading cursor is dashed so it never
// looks like the solid playhead.
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
  const cursorX = slice ? ((slice.start + slice.end) / 2 / duration) * width : 0;

  return (
    <figure className="grid gap-x-10 lg:grid-cols-[minmax(0,1fr)_13rem]">
      <figcaption className="mb-3 flex items-center justify-between gap-4 lg:col-start-1">
        <p className="min-w-0 truncate text-sm">
          <span className="font-medium">Fig. 1</span>
          <span className="text-muted-foreground"> · </span>
          <span className="font-medium">{track.title}</span>
          <span className="text-muted-foreground"> · {formatDuration(duration)}</span>
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

      <div className="lg:col-start-1">
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
            />
          )}
          {slice && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 border-l border-dashed border-foreground/50"
              style={{ left: cursorX }}
            />
          )}
        </div>

        <div className="mt-2 flex justify-between text-xs text-muted-foreground tabular-nums">
          <span>{formatDuration(0)}</span>
          <span>{formatDuration(duration / 2)}</span>
          <span>{formatDuration(duration)}</span>
        </div>

        <p className="mt-3 min-h-5 text-sm tabular-nums" aria-hidden="true">
          {slice ? (
            readoutText(slice)
          ) : (
            <span className="text-muted-foreground">
              Move across the figure to read any moment; click, or press Enter, to move playback there.
            </span>
          )}
        </p>
        {track.description && (
          <p className="mt-1 max-w-prose text-xs text-muted-foreground">{track.description}</p>
        )}
      </div>

      {/* Beside the figure on wide screens, the notes share its height in three
          rows: beats at the top edge, energy in the upper half, brightness
          starting at the centre line (h-60 is FIGURE_HEIGHT). Narrower, they
          follow the readout as a short list. */}
      <dl className="mt-8 grid gap-4 sm:grid-cols-3 lg:col-start-2 lg:row-start-2 lg:mt-0 lg:h-60 lg:grid-cols-1 lg:grid-rows-[auto_1fr_1fr] lg:gap-0">
        <Note kind="beats" label="Beats">
          Each dot marks a detected beat
          {tempoBpm !== null && <>, about {tempoBpm} BPM (estimated)</>}.
        </Note>
        <div className="lg:self-end lg:pb-3">
          <Note kind="energy" label="Energy">
            How loud each moment is. Taller bars are louder.
          </Note>
        </div>
        <div className="lg:pt-3">
          <Note kind="brightness" label="Brightness">
            How bright or trebly the sound is. Longer bars mean more high frequencies.
          </Note>
        </div>
      </dl>
    </figure>
  );
}

export default SpecimenFigure;
