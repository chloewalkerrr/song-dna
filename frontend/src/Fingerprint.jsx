import FingerprintStrands from "./FingerprintStrands";
import { useElementWidth } from "@/hooks/use-element-width";

// Shorter than Home's 240px figure: Compare stacks two of these, and at 160px
// both songs and the start of the findings fit on one desktop screen. Checked
// visually at 1440 x 1000.
const HEIGHT = 160;

// One song's Song DNA in Compare, drawn in Home's neutral "instrument" style
// on the pair's shared scale. Draws at the width of its container (measured,
// not fixed). The legend is drawn once for the page by ComparePage, not here.
function Fingerprint({ features, currentTime, rmsMax, centroidMax }) {
  const [containerRef, width] = useElementWidth();

  // `contain-inline-size`: the SVG is drawn at a measured pixel width, and
  // without containment that width would stop the column from shrinking when
  // the window narrows (so it would never be re-measured smaller).
  return (
    <div ref={containerRef} className="w-full contain-inline-size" style={{ height: HEIGHT }}>
      {width > 0 && (
        <FingerprintStrands
          features={features}
          width={width}
          height={HEIGHT}
          rmsMax={rmsMax}
          centroidMax={centroidMax}
          currentTime={currentTime}
          // Hidden at 0:00: a line parked on the left edge reads as an axis.
          showPlayhead={currentTime > 0}
          variant="instrument"
        />
      )}
    </div>
  );
}

export default Fingerprint;
