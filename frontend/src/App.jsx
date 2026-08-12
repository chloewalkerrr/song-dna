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
    <div>
      <h1>Song DNA</h1>
      <input type="file" accept="audio/*" onChange={handleFileChange} />

      {loading && <p>Analyzing...</p>}

      {features && (
        <div>
          <p>{features.file_path} — {features.duration_seconds.toFixed(1)}s</p>

          <svg width={width} height={height} style={{ background: "#111" }}>
            <path
              d={buildPath(features.rms_energy, width, height)}
              fill="none"
              stroke="#4fc3f7"
              strokeWidth="1.5"
            />
          </svg>
        </div>
      )}
    </div>
  );
}

export default App;