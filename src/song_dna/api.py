import shutil
import uuid
from pathlib import Path

import numpy as np
from audioread.exceptions import NoBackendError
from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from song_dna.features import AudioFeatures, extract_features
from song_dna.findings import generate_findings
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

    try:
        with destination.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        result = extract_features(str(destination))
    except NoBackendError:
        raise HTTPException(
            status_code=400,
            detail="Couldn't read this file as audio. Make sure it's a valid, supported audio file (e.g. mp3 or wav).",
        )
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Something went wrong while analyzing this file.",
        )

    return {
        "file_path": result.file_path,
        "audio_url": f"http://127.0.0.1:8000/audio/{destination.name}",
        "sample_rate": result.sample_rate,
        "duration_seconds": result.duration_seconds,
        "times": result.times.tolist(),
        "rms_energy": result.rms_energy.tolist(),
        "spectral_centroid": result.spectral_centroid.tolist(),
    }


class SongComparisonInput(BaseModel):
    """
    The subset of a song's /analyze response that findings are actually
    computed from. Findings only make sense once both songs are already
    analyzed, so /compare takes each song's already-known feature arrays
    rather than re-uploading and re-analyzing audio files.
    """

    rms_energy: list[float] = Field(min_length=1)
    spectral_centroid: list[float] = Field(min_length=1)


class CompareRequest(BaseModel):
    song_a: SongComparisonInput
    song_b: SongComparisonInput


@app.post("/compare")
def compare(request: CompareRequest):
    song_a = AudioFeatures(
        file_path="",
        sample_rate=0,
        duration_seconds=0.0,
        times=np.array([]),
        rms_energy=np.array(request.song_a.rms_energy),
        spectral_centroid=np.array(request.song_a.spectral_centroid),
    )
    song_b = AudioFeatures(
        file_path="",
        sample_rate=0,
        duration_seconds=0.0,
        times=np.array([]),
        rms_energy=np.array(request.song_b.rms_energy),
        spectral_centroid=np.array(request.song_b.spectral_centroid),
    )

    return {"findings": generate_findings(song_a, song_b)}