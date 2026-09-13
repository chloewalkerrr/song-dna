from src.song_dna.api import generate_unique_filename


def test_generate_unique_filename_keeps_extension():
    result = generate_unique_filename("song.mp3")
    assert result.endswith(".mp3")


def test_generate_unique_filename_differs_for_repeated_same_name():
    first = generate_unique_filename("song.mp3")
    second = generate_unique_filename("song.mp3")
    assert first != second
