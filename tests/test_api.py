import io

import pytest
from fastapi import HTTPException, UploadFile

from src.song_dna import api
from src.song_dna.api import generate_unique_filename


def test_generate_unique_filename_keeps_extension():
    result = generate_unique_filename("song.mp3")
    assert result.endswith(".mp3")


def test_generate_unique_filename_differs_for_repeated_same_name():
    first = generate_unique_filename("song.mp3")
    second = generate_unique_filename("song.mp3")
    assert first != second


def test_analyze_returns_400_for_non_audio_file(tmp_path, monkeypatch):
    monkeypatch.setattr(api, "UPLOAD_DIR", tmp_path)

    fake_file = io.BytesIO(b"this is not an audio file, just plain text")
    upload = UploadFile(file=fake_file, filename="not_audio.mp3")

    with pytest.raises(HTTPException) as exc_info:
        api.analyze(upload)

    assert exc_info.value.status_code == 400
    assert "audio" in exc_info.value.detail.lower()


def test_analyze_returns_500_for_unexpected_error(tmp_path, monkeypatch):
    monkeypatch.setattr(api, "UPLOAD_DIR", tmp_path)

    def broken_extract_features(_path):
        raise ValueError("something unrelated to audio decoding went wrong")

    monkeypatch.setattr(api, "extract_features", broken_extract_features)

    fake_file = io.BytesIO(b"irrelevant bytes")
    upload = UploadFile(file=fake_file, filename="song.wav")

    with pytest.raises(HTTPException) as exc_info:
        api.analyze(upload)

    assert exc_info.value.status_code == 500
