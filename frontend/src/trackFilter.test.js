import { describe, it, expect } from "vitest";
import { filterTracks, getGenres } from "./trackFilter";

const tracks = [
  { id: "1", title: "Neon Run", genre: "Electronic" },
  { id: "2", title: "Slow Burn", genre: "Indie" },
  { id: "3", title: "Afterglow", genre: "Electronic" },
  { id: "4", title: "Low Tide", genre: "Ambient" },
];

const ids = (list) => list.map((t) => t.id);

describe("filterTracks", () => {
  it("returns every track for an empty query and no genre", () => {
    expect(ids(filterTracks(tracks, {}))).toEqual(["1", "2", "3", "4"]);
    expect(ids(filterTracks(tracks))).toEqual(["1", "2", "3", "4"]);
  });

  it("matches titles case-insensitively and ignores surrounding whitespace", () => {
    expect(ids(filterTracks(tracks, { query: "  SLOW " }))).toEqual(["2"]);
  });

  it("also matches against the genre", () => {
    expect(ids(filterTracks(tracks, { query: "electr" }))).toEqual(["1", "3"]);
  });

  it("filters by exact genre", () => {
    expect(ids(filterTracks(tracks, { genre: "Electronic" }))).toEqual(["1", "3"]);
  });

  it("combines search and genre filter", () => {
    expect(ids(filterTracks(tracks, { query: "glow", genre: "Electronic" }))).toEqual(["3"]);
    expect(ids(filterTracks(tracks, { query: "glow", genre: "Indie" }))).toEqual([]);
  });

  it("returns an empty list when nothing matches", () => {
    expect(filterTracks(tracks, { query: "zzz" })).toEqual([]);
  });
});

describe("getGenres", () => {
  it("returns each genre once, alphabetically", () => {
    expect(getGenres(tracks)).toEqual(["Ambient", "Electronic", "Indie"]);
  });

  it("returns an empty list for no tracks", () => {
    expect(getGenres([])).toEqual([]);
  });
});
