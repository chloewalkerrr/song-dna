import { describe, expect, it } from "vitest";
import {
  attachFingerprints,
  HERO_VIEW_BOX,
  isValidPathData,
  parseFingerprintSummary,
  parseHero,
  parseThumbs,
  SUPPORTED_FINGERPRINT_VERSION,
  THUMB_VIEW_BOX,
} from "./songFingerprint";

const identity = {
  version: "E1B1/1",
  params_hash: "9e2c3876c5ed81c46b7c97987dc2b3eb90c812da9eb031bcda3fbf0ebaa5366b",
  librosa_version: "0.11.0",
  dref: 0.005909040273794664,
  corpus_id: "2e1a85551d734edfe264112a554a062d322a724b45676073e5cf7fb01a7b2d12",
};
const rawSummary = {
  ...identity,
  thumbs: "fingerprints/thumbs.json",
  thumb_view_box: "0 0 52 52",
  hero_view_box: "0 0 220 220",
};
const summary = parseFingerprintSummary(rawSummary);

const PATH = "M39.5 4.2L39.7 4.1M1.0 2.0L3.0 4.0L5.0 6.0";
const rawThumbs = { ...identity, view_box: "0 0 52 52", thumbs: { "dev-pulse": PATH } };

const drawn = { id: "dev-pulse", song_fingerprint: { artifact: "fingerprints/dev-pulse.json" } };
const silent = {
  id: "quiet",
  song_fingerprint: { artifact: null, unavailable_reason: "no_voiced_frames", voiced_frames: 0 },
};

// A JSON value whose string coercion throws ("Cannot convert object to
// primitive value"): a non-callable toString and an object valueOf.
const throwsOnCoercion = JSON.parse('{"toString": 1}');

const BAD_VIEW_BOXES = [
  undefined,
  null,
  52,
  ["0 0 52 52"],
  { value: "0 0 52 52" },
  throwsOnCoercion,
  "",
  "0 0 0 0",
  "0 0 -52 52",
  "0 0 52 -52",
  "0 0 220 220",
  "0 0 52.0 52.0",
  " 0 0 52 52",
  "0 0 52 52 ",
];

describe("isValidPathData", () => {
  it("accepts the generator's M/L path format", () => {
    expect(isValidPathData(PATH)).toBe(true);
    expect(isValidPathData("M-0.2 3.0L1.0 2.5")).toBe(true);
  });

  it("rejects anything else", () => {
    for (const bad of ["", "M1 2 L3 4", "M1.0 2.0Z", "L1.0 2.0", "M1.0", "<script>", 42, null, ["M1.0 2.0"]]) {
      expect(isValidPathData(bad)).toBe(false);
    }
  });
});

describe("parseFingerprintSummary", () => {
  it("accepts valid fingerprint metadata and keeps its identity", () => {
    expect(summary).toEqual({
      ok: true,
      thumbsPath: "fingerprints/thumbs.json",
      viewBox: THUMB_VIEW_BOX,
      identity,
    });
    expect(summary.identity.version).toBe(SUPPORTED_FINGERPRINT_VERSION);
  });

  it("accepts a library where no track has a fingerprint (dref is null)", () => {
    expect(parseFingerprintSummary({ ...rawSummary, dref: null }).ok).toBe(true);
  });

  it("reports missing metadata", () => {
    for (const missing of [undefined, null, "E1B1/1", [rawSummary]]) {
      expect(parseFingerprintSummary(missing)).toEqual({ ok: false, reason: "missing" });
    }
  });

  it("reports an unknown fingerprint version instead of guessing", () => {
    expect(parseFingerprintSummary({ ...rawSummary, version: "E2B1/1" })).toEqual({
      ok: false,
      reason: "unsupported_version",
    });
  });

  it("requires the thumbnail view box to be exactly the E1B1/1 value, without coercing or throwing", () => {
    expect(THUMB_VIEW_BOX).toBe("0 0 52 52");
    for (const viewBox of BAD_VIEW_BOXES) {
      expect(parseFingerprintSummary({ ...rawSummary, thumb_view_box: viewBox })).toEqual({
        ok: false,
        reason: "malformed",
      });
    }
  });

  it("reports a missing thumbs path as malformed", () => {
    expect(parseFingerprintSummary({ ...rawSummary, thumbs: "" }).reason).toBe("malformed");
    expect(parseFingerprintSummary({ ...rawSummary, thumbs: throwsOnCoercion }).reason).toBe("malformed");
  });

  it.each([
    ["params_hash", ["abc", "", 42, null, throwsOnCoercion, identity.params_hash.toUpperCase()]],
    ["corpus_id", ["def", "", 42, null, throwsOnCoercion]],
    ["librosa_version", ["", 11, null, throwsOnCoercion]],
    ["dref", [0, -0.1, Number.NaN, "0.0059", throwsOnCoercion, undefined]],
  ])("reports an invalid %s as malformed", (field, values) => {
    for (const value of values) {
      expect(parseFingerprintSummary({ ...rawSummary, [field]: value }).reason).toBe("malformed");
    }
  });
});

describe("parseThumbs", () => {
  it("returns thumbnail paths by track id", () => {
    expect(parseThumbs(rawThumbs, summary)).toEqual({ "dev-pulse": PATH });
  });

  it.each([
    ["version", "E1B1/2"],
    ["params_hash", "0".repeat(64)],
    ["librosa_version", "0.10.2"],
    ["dref", 0.0047684981540850255],
    ["corpus_id", "f".repeat(64)],
  ])("rejects thumbnails from a different build (%s differs)", (field, value) => {
    expect(parseThumbs({ ...rawThumbs, [field]: value }, summary)).toBeNull();
  });

  it("rejects thumbnails missing an identity field", () => {
    for (const field of Object.keys(identity)) {
      const withoutField = { ...rawThumbs };
      delete withoutField[field];
      expect(parseThumbs(withoutField, summary)).toBeNull();
    }
  });

  it("requires the thumbnail view box to be exactly the E1B1/1 value, without coercing or throwing", () => {
    for (const viewBox of BAD_VIEW_BOXES) {
      expect(parseThumbs({ ...rawThumbs, view_box: viewBox }, summary)).toBeNull();
    }
  });

  it("rejects a payload that isn't a thumbs object", () => {
    expect(parseThumbs(null, summary)).toBeNull();
    expect(parseThumbs("M1.0 2.0", summary)).toBeNull();
    expect(parseThumbs([rawThumbs], summary)).toBeNull();
    expect(parseThumbs({ ...rawThumbs, thumbs: [PATH] }, summary)).toBeNull();
    expect(parseThumbs({ ...rawThumbs, thumbs: undefined }, summary)).toBeNull();
    expect(parseThumbs({ ...rawThumbs, thumbs: null }, summary)).toBeNull();
  });

  it("drops individual malformed paths but keeps valid ones", () => {
    const payload = { ...rawThumbs, thumbs: { "dev-pulse": PATH, broken: "M1 2 <path>", number: 7 } };
    expect(parseThumbs(payload, summary)).toEqual({ "dev-pulse": PATH });
  });
});

describe("attachFingerprints", () => {
  const thumbs = parseThumbs(rawThumbs, summary);

  it("marks drawable tracks available with their path, view box, hero file and build identity", () => {
    const [track] = attachFingerprints([drawn], summary, thumbs);
    expect(track).toEqual({
      ...drawn,
      fingerprint: {
        status: "available",
        path: PATH,
        viewBox: "0 0 52 52",
        heroArtifact: "fingerprints/dev-pulse.json",
        identity,
      },
    });
  });

  it("still shows the thumbnail when the hero reference isn't a usable path", () => {
    for (const artifact of [
      "", " ", "../library.json", "fingerprints/other-track.json", "features/dev-pulse.json",
      42, ["fingerprints/dev-pulse.json"], { path: "x" }, throwsOnCoercion,
    ]) {
      const [track] = attachFingerprints([{ ...drawn, song_fingerprint: { artifact } }], summary, thumbs);
      expect(track.fingerprint).toMatchObject({ status: "available", path: PATH, heroArtifact: null });
    }
  });

  it("gives unavailable fingerprints no hero file or identity", () => {
    const [silentTrack] = attachFingerprints([silent], summary, thumbs);
    const [noThumb] = attachFingerprints([drawn], summary, null);
    for (const { fingerprint } of [silentTrack, noThumb]) {
      expect(fingerprint).not.toHaveProperty("heroArtifact");
      expect(fingerprint).not.toHaveProperty("identity");
    }
  });

  it("keeps the build's reason for a track with no fingerprint", () => {
    const [track] = attachFingerprints([silent], summary, thumbs);
    expect(track.fingerprint).toEqual({ status: "unavailable", reason: "no_voiced_frames" });
  });

  it("treats a track without a fingerprint reference as missing", () => {
    const [track] = attachFingerprints([{ id: "old" }], summary, thumbs);
    expect(track.fingerprint).toEqual({ status: "unavailable", reason: "missing" });
  });

  it("applies a summary problem to every track", () => {
    const unsupported = parseFingerprintSummary({ ...rawSummary, version: "E9B9/9" });
    const tracks = attachFingerprints([drawn, silent], unsupported, thumbs);
    expect(tracks.map((t) => t.fingerprint.reason)).toEqual(["unsupported_version", "unsupported_version"]);
  });

  it("treats unusable thumbs or a missing thumbnail as malformed", () => {
    expect(attachFingerprints([drawn], summary, null)[0].fingerprint.reason).toBe("malformed");
    expect(attachFingerprints([drawn], summary, {})[0].fingerprint.reason).toBe("malformed");
  });

  it("doesn't modify the original tracks", () => {
    const original = { ...drawn };
    attachFingerprints([original], summary, thumbs);
    expect(original).toEqual(drawn);
  });
});

describe("parseHero", () => {
  const HERO_PATH = "M110.0 35.2L112.4 36.0M60.5 80.0L61.0 82.5";
  const frames = { total_frames: 1292, voiced_frames: 1081, in_domain_frames: 1081 };
  const rawHero = {
    id: "dev-pulse",
    ...identity,
    audio_sha256: "a".repeat(64),
    frames,
    view_box: "0 0 220 220",
    hero: HERO_PATH,
  };
  const track = { id: "dev-pulse" };

  it("returns the hero path, its view box and the frame counts", () => {
    expect(HERO_VIEW_BOX).toBe("0 0 220 220");
    expect(parseHero(rawHero, track, identity)).toEqual({
      path: HERO_PATH,
      viewBox: "0 0 220 220",
      frames: { totalFrames: 1292, voicedFrames: 1081, inDomainFrames: 1081 },
    });
  });

  it.each([
    ["version", "E1B1/2"],
    ["params_hash", "0".repeat(64)],
    ["librosa_version", "0.10.2"],
    ["dref", 0.0047684981540850255],
    ["corpus_id", "f".repeat(64)],
  ])("rejects a hero from a different build than the thumbnails (%s differs)", (field, value) => {
    expect(parseHero({ ...rawHero, [field]: value }, track, identity)).toBeNull();
  });

  it("rejects a hero missing an identity field", () => {
    for (const field of Object.keys(identity)) {
      const withoutField = { ...rawHero };
      delete withoutField[field];
      expect(parseHero(withoutField, track, identity)).toBeNull();
    }
  });

  it("rejects a hero when there is no build identity to match", () => {
    for (const missing of [undefined, null, "E1B1/1", [identity]]) {
      expect(parseHero(rawHero, track, missing)).toBeNull();
    }
  });

  it("rejects another track's hero", () => {
    expect(parseHero(rawHero, { id: "dev-sweep" }, identity)).toBeNull();
    expect(parseHero({ ...rawHero, id: undefined }, track, identity)).toBeNull();
    expect(parseHero(rawHero, {}, identity)).toBeNull();
    expect(parseHero(rawHero, null, identity)).toBeNull();
  });

  it("rejects an empty expected identity even when the hero also lacks identity fields", () => {
    const withoutIdentity = { ...rawHero };
    for (const field of Object.keys(identity)) delete withoutIdentity[field];
    expect(parseHero(withoutIdentity, track, {})).toBeNull();
  });

  it.each([
    ["version", "E1B1/2"],
    ["params_hash", "invalid"],
    ["corpus_id", "invalid"],
    ["librosa_version", ""],
    ["dref", -1],
  ])("rejects an invalid expected %s even when the hero matches it", (field, value) => {
    expect(parseHero({ ...rawHero, [field]: value }, track, { ...identity, [field]: value })).toBeNull();
  });

  it("requires the hero view box to be exactly the E1B1/1 value, without coercing or throwing", () => {
    const badHeroViewBoxes = [
      ...BAD_VIEW_BOXES.filter((viewBox) => viewBox !== "0 0 220 220"),
      "0 0 52 52",
      "0 0 220.0 220.0",
      " 0 0 220 220",
      "0 0 220 220 ",
    ];
    for (const viewBox of badHeroViewBoxes) {
      expect(parseHero({ ...rawHero, view_box: viewBox }, track, identity)).toBeNull();
    }
  });

  it("rejects hero path data the generator wouldn't write", () => {
    for (const hero of [undefined, "", "M1 2 L3 4", "M1.0 2.0Z", "<path>", 42, [HERO_PATH], throwsOnCoercion]) {
      expect(parseHero({ ...rawHero, hero }, track, identity)).toBeNull();
    }
  });

  it.each([
    ["missing", undefined],
    ["not an object", 1292],
    ["an array", [1292, 1081, 1081]],
    ["a string count", { ...frames, total_frames: "1292" }],
    ["a fractional count", { ...frames, voiced_frames: 1080.5 }],
    ["a NaN count", { ...frames, in_domain_frames: Number.NaN }],
    ["a missing count", { total_frames: 1292, voiced_frames: 1081 }],
    ["a count that throws when coerced", { ...frames, total_frames: throwsOnCoercion }],
    ["no frames in the domain", { ...frames, in_domain_frames: 0 }],
    ["negative counts", { total_frames: -1, voiced_frames: -1, in_domain_frames: -1 }],
    ["more in-domain than voiced frames", { ...frames, in_domain_frames: 1082 }],
    ["more voiced than total frames", { ...frames, voiced_frames: 1293, in_domain_frames: 1293 }],
  ])("rejects frame counts that are %s", (_name, badFrames) => {
    expect(parseHero({ ...rawHero, frames: badFrames }, track, identity)).toBeNull();
  });

  it("rejects a payload that isn't a hero object", () => {
    for (const payload of [null, undefined, HERO_PATH, [rawHero], throwsOnCoercion]) {
      expect(parseHero(payload, track, identity)).toBeNull();
    }
  });
});
