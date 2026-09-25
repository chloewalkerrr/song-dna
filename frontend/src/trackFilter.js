// Case-insensitive search over title and genre, plus an exact genre filter.
// `genre` of null/"" means "All".
export function filterTracks(tracks, { query = "", genre = null } = {}) {
  const needle = query.trim().toLowerCase();

  return tracks.filter((track) => {
    if (genre && track.genre !== genre) return false;
    if (!needle) return true;
    return (
      track.title.toLowerCase().includes(needle) ||
      track.genre.toLowerCase().includes(needle)
    );
  });
}

// Distinct genres, alphabetical, for the filter chips.
export function getGenres(tracks) {
  return [...new Set(tracks.map((track) => track.genre))].sort((a, b) => a.localeCompare(b));
}
