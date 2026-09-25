import { useEffect, useState } from "react";
import { LibraryContext } from "@/hooks/use-library";
import { fetchLibrary } from "@/lib/library";

// Loads the song library manifest once for the whole app, so the Library and
// (later) Compare pages share it instead of each fetching it.
export function LibraryProvider({ children }) {
  const [state, setState] = useState({ status: "loading", tracks: [], error: null });

  useEffect(() => {
    let cancelled = false;

    fetchLibrary()
      .then((tracks) => {
        if (!cancelled) setState({ status: "ready", tracks, error: null });
      })
      .catch((error) => {
        if (!cancelled) setState({ status: "error", tracks: [], error: error.message });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return <LibraryContext.Provider value={state}>{children}</LibraryContext.Provider>;
}
