import { useState } from "react";

function App() {
  const [features, setFeatures] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleFileChange(event) {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("http://127.0.0.1:8000/analyze", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    setFeatures(data);
    setLoading(false);
  }

  function buildPath(values, width, height) {
    const max = Math.max(...values);
    const stepX = width / (values.length - 1);

    return values
      .map((v, i) => {
        const x = i * stepX;
        const y = height - (v / max) * height;
        return `${i === 0 ? "M" : "L"} ${x},${y}`;
      })
      .join(" ");
  }

  const width = 900;
  const height = 200;

  return (
    <div
      style={{
        fontFamily: "'Inter', sans-serif",
        color: "#0a0a0a",
        background: "#ffffff",
        minHeight: "100vh",
        padding: "40px 32px",
      }}
    >
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        <h1 style={{ fontWeight: 600, fontSize: 28, letterSpacing: "-0.01em", marginBottom: 4 }}>
          Song DNA
        </h1>
        <p style={{ color: "#6b6b6b", fontSize: 14, marginBottom: 24 }}>
          Upload a track to see its energy and brightness over time.
        </p>

        <input type="file" accept="audio/*" onChange={handleFileChange} />

        {loading && (
          <p style={{ fontFamily: "monospace", fontSize: 13, color: "#6b6b6b", marginTop: 16 }}>
            Analyzing...
          </p>
        )}

        {features && (
          <div style={{ marginTop: 24 }}>
            <p style={{ fontFamily: "monospace", fontSize: 12, color: "#6b6b6b", marginBottom: 12 }}>
              {features.file_path} — {features.duration_seconds.toFixed(1)}s
            </p>

            <div
              style={{
                background: "#fbfbfb",
                border: "1px solid #e6e6e6",
                borderRadius: 6,
                padding: 20,
              }}
            >
              <svg width={width} height={height} style={{ display: "block" }}>
                <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="#e6e6e6" strokeWidth="1" />
                <path
                  d={buildPath(features.rms_energy, width, height)}
                  fill="none"
                  stroke="#2f6bf0"
                  strokeWidth="1.6"
                />
                <path
                  d={buildPath(features.spectral_centroid, width, height)}
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
          </div>
        )}
      </div>
    </div>
  );
}

function LegendItem({ color, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "#6b6b6b" }}>
      <span style={{ width: 14, height: 2, background: color, display: "inline-block", borderRadius: 2 }} />
      {label}
    </div>
  );
}

export default App;