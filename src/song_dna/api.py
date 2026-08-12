import shutil
from pathlib import Path

from fastapi import FastAPI, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from src.song_dna.features import extract_features

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("data/audio")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

@app.post("/analyze")
def analyze(file: UploadFile):
    destination = UPLOAD_DIR / file.filename

    with destination.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    result = extract_features(str(destination))

    return {
        "file_path": result.file_path,
        "sample_rate": result.sample_rate,
        "duration_seconds": result.duration_seconds,
        "times": result.times.tolist(),
        "rms_energy": result.rms_energy.tolist(),
        "spectral_centroid": result.spectral_centroid.tolist(),
    }