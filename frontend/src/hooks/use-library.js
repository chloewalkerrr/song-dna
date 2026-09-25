import { createContext, useContext } from "react";

// { status: "loading" | "ready" | "error", tracks: [], error: string | null }
export const LibraryContext = createContext(null);

export function useLibrary() {
  const context = useContext(LibraryContext);
  if (!context) throw new Error("useLibrary must be used inside <LibraryProvider>");
  return context;
}
