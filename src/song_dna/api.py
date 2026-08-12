from fastapi import FastAPI
from src.song_dna.features import extract_features

app = FastAPI()

TEST_FILE = "data/audio/JoshWoodward-NQC-11-RiverWentDry.mp3"


@app.get("/analyze")
def analyze():
    result = extract_features(TEST_FILE)
    return {
        "file_path": result.file_path,
        "sample_rate": result.sample_rate,
        "duration_seconds": result.duration_seconds,
        "times": result.times.tolist(),
        "rms_energy": result.rms_energy.tolist(),
        "spectral_centroid": result.spectral_centroid.tolist(),
    }