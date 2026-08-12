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

  return (
    <div>
      <h1>Song DNA</h1>
      <input type="file" accept="audio/*" onChange={handleFileChange} />

      {loading && <p>Analyzing...</p>}

      {features && (
        <div>
          <p>File: {features.file_path}</p>
          <p>Duration: {features.duration_seconds.toFixed(1)}s</p>
          <p>RMS energy frames: {features.rms_energy.length}</p>
        </div>
      )}
    </div>
  );
}

export default App;