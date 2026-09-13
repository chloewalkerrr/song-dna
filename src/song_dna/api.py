import shutil
import uuid
from pathlib import Path

from fastapi import FastAPI, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from src.song_dna.features import extract_features
from fastapi.staticfiles import StaticFiles

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("data/audio")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/audio", StaticFiles(directory=UPLOAD_DIR), name="audio")

def generate_unique_filename(original_filename: str) -> str:
    """
    Build a unique filename that keeps the original file's extension,
    so repeated uploads (even ones sharing a name) never overwrite an
    earlier upload on disk.
    """
    extension = Path(original_filename).suffix
    return f"{uuid.uuid4().hex}{extension}"


@app.post("/analyze")
def analyze(file: UploadFile):
    destination = UPLOAD_DIR / generate_unique_filename(file.filename)

    with destination.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    result = extract_features(str(destination))

    return {
        "file_path": result.file_path,
        "audio_url": f"http://127.0.0.1:8000/audio/{destination.name}",
        "sample_rate": result.sample_rate,
        "duration_seconds": result.duration_seconds,
        "times": result.times.tolist(),
        "rms_energy": result.rms_energy.tolist(),
        "spectral_centroid": result.spectral_centroid.tolist(),
    }