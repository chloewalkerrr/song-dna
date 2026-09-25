import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import SelectionBar from "@/components/SelectionBar";
import SongCard from "@/components/SongCard";
import { useLibrary } from "@/hooks/use-library";
import { usePreviewPlayer } from "@/hooks/use-preview-player";
import { useSelection } from "@/hooks/use-selection";
import { getSlot, isBlocked } from "@/selection";
import { filterTracks, getGenres } from "@/trackFilter";

const HINT_DURATION_MS = 3000;
const SKELETON_COUNT = 8;

function LibraryPage() {
  const navigate = useNavigate();
  const { status, tracks, error } = useLibrary();
  const { selection, toggle, remove, clear } = useSelection();
  const { playingId, toggle: togglePreview } = usePreviewPlayer();

  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState(null);
  const [showHint, setShowHint] = useState(false);
  const hintTimer = useRef(null);

  useEffect(() => () => clearTimeout(hintTimer.current), []);

  const tracksById = useMemo(() => new Map(tracks.map((track) => [track.id, track])), [tracks]);
  const genres = useMemo(() => getGenres(tracks), [tracks]);
  const visibleTracks = useMemo(() => filterTracks(tracks, { query, genre }), [tracks, query, genre]);

  function handleSelect(track) {
    if (isBlocked(selection, track.id)) {
      setShowHint(true);
      clearTimeout(hintTimer.current);
      hintTimer.current = setTimeout(() => setShowHint(false), HINT_DURATION_MS);
      return;
    }
    setShowHint(false);
    toggle(track.id);
  }

  return (
    <div className="mx-auto max-w-[920px]">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="mb-1 text-3xl font-semibold tracking-tight">Song library</h1>
          <p className="text-sm text-muted-foreground">
            Choose two tracks to compare their audio fingerprints.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label="Search tracks"
            placeholder="Search tracks..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {status === "ready" && genres.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter by genre">
          {[null, ...genres].map((value) => (
            <Button
              key={value ?? "all"}
              type="button"
              size="sm"
              variant={genre === value ? "default" : "outline"}
              aria-pressed={genre === value}
              onClick={() => setGenre(value)}
            >
              {value ?? "All"}
            </Button>
          ))}
        </div>
      )}

      {status === "loading" && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4" aria-busy="true">
          {Array.from({ length: SKELETON_COUNT }, (_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      )}

      {status === "error" && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {status === "ready" && visibleTracks.length === 0 && (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No tracks match your search.
        </p>
      )}

      {status === "ready" && visibleTracks.length > 0 && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {visibleTracks.map((track) => (
            <SongCard
              key={track.id}
              track={track}
              slot={getSlot(selection, track.id)}
              blocked={isBlocked(selection, track.id)}
              playing={playingId === track.id}
              onSelect={() => handleSelect(track)}
              onTogglePlay={() => togglePreview(track)}
            />
          ))}
        </div>
      )}

      <SelectionBar
        selection={selection}
        tracksById={tracksById}
        hint={showHint}
        onRemove={remove}
        onClear={clear}
        onCompare={() => navigate("/compare")}
      />
    </div>
  );
}

export default LibraryPage;
