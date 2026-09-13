const WIDTH = 900;
const HEIGHT = 200;

// Builds an SVG path string plotting `values` left-to-right, scaled against
// `max` (not each array's own max) so two fingerprints can share one scale.
export function buildPath(values, width, height, max) {
  const stepX = width / (values.length - 1);

  return values
    .map((v, i) => {
      const x = i * stepX;
      const y = height - (v / max) * height;
      return `${i === 0 ? "M" : "L"} ${x},${y}`;
    })
    .join(" ");
}

function LegendItem({ color, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "#6b6b6b" }}>
      <span style={{ width: 14, height: 2, background: color, display: "inline-block", borderRadius: 2 }} />
      {label}
    </div>
  );
}

function Fingerprint({ features, currentTime, rmsMax, centroidMax }) {
  return (
    <div
      style={{
        background: "#fbfbfb",
        border: "1px solid #e6e6e6",
        borderRadius: 6,
        padding: 20,
      }}
    >
      <svg width={WIDTH} height={HEIGHT} style={{ display: "block" }}>
        <line x1="0" y1={HEIGHT / 2} x2={WIDTH} y2={HEIGHT / 2} stroke="#e6e6e6" strokeWidth="1" />
        <line
          x1={(currentTime / features.duration_seconds) * WIDTH}
          y1={0}
          x2={(currentTime / features.duration_seconds) * WIDTH}
          y2={HEIGHT}
          stroke="#0a0a0a"
          strokeWidth="1"
        />
        <path
          d={buildPath(features.rms_energy, WIDTH, HEIGHT, rmsMax)}
          fill="none"
          stroke="#2f6bf0"
          strokeWidth="1.6"
        />
        <path
          d={buildPath(features.spectral_centroid, WIDTH, HEIGHT, centroidMax)}
          fill="none"
          stroke="#1f9d55"
          strokeWidth="1.6"
        />
      </svg>

      <div style={{ display: "flex", gap: 20, marginTop: 16 }}>
        <LegendItem color="#2f6bf0" label="Energy" />
        <LegendItem color="#1f9d55" label="Brightness" />
      </div>
    </div>
  );
}

export default Fingerprint;
