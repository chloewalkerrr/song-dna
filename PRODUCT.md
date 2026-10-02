# Product

<!-- impeccable:product-schema 1 -->

Durable product context for anyone (human or coding agent) designing or building
SongDNA. Engineering rules, commands and data invariants live in AGENTS.md; what is
currently built lives in README.md. This file records who the product is for, what
it must prove, and the commitments future work must keep.

## Platform

web

## Users

- **Curious visitors, including recruiters and people with no audio background.**
  They arrive to understand what the project is and whether it is interesting. They
  must grasp, quickly and without jargon, that SongDNA turns measurable audio
  properties into visual fingerprints, that there is a library to explore, that two
  tracks can be compared, and that they can upload their own audio.
- **Technical readers** (developers, people who know some DSP). They look closer and
  should be rewarded: which measurement drives which mark, how scales are chosen,
  what is and is not inferred.
- **The owner**, a single local user, running it on localhost as a learning project.

## Product Purpose

SongDNA is an interactive music-analysis playground. It draws each track in three
distinct layers:

- **Song Fingerprint**: a whole-track identity summary with no time axis, based on
  chroma entropy (tonal to spread) and spectral centroid (dark to bright). An
  identity mark, not a unique identifier, and not a genre, mood, quality or
  similarity score.
- **Song DNA**: how the track changes over time. Loudness (RMS energy) and
  brightness (spectral centroid) are averaged into 40 display segments, with beat
  markers, and the track can be played back. On Home every track shares one
  library-wide scale.
- **Comparison**: two tracks on the same scale. Compare adds rule-based findings
  that describe measured differences, with no overall similarity score and no
  machine learning.

Success: a visitor understands the idea from the real visualisation within a minute,
then explores the library, compares two tracks, and trusts every claim because each
one traces to a number.

## Positioning

Every visual mark and every sentence is traceable to a documented audio measurement.
There is no machine learning, no similarity score and no inferred genre, emotion or
quality. The real data and its visualisation are the interesting part, not styling.

## Operating Context

- Localhost only, single user, no accounts. Frontend at `localhost:5173`, analysis
  backend at `127.0.0.1:8000`.
- Library browsing and previews work from static precomputed files with no backend;
  uploads and findings need the backend running.
- Routes today:
  - Home: a concise visual introduction built around one selected library track.
    An intro, Fig. 1 Song Fingerprint beside a library index that chooses the
    track, Fig. 2 Song DNA (interactive, playable), Fig. 3 a same-scale comparison
    preview that opens Compare, and a short methodology.
  - Library: browse, search, preview, pick Song A / Song B.
  - Compare: two Song DNA charts on a shared scale, playback, findings.

## Capabilities and Constraints

- Measured per track for Song DNA: RMS energy and spectral centroid
  (frame-aligned), beat times, an estimated tempo, and duration.
- Measured per library track for the Song Fingerprint (at library build time):
  per-frame chroma entropy, log spectral centroid and loudness. Uploads have no
  fingerprint yet.
- Detected tempo is an estimate and can be wrong on the placeholder audio; present it
  as an estimate.
- Scales: Compare shares them across its two songs; Home shares one scale across
  the whole library. The older per-track 48-segment previews are still generated
  but no longer shown.
- Out of scope unless explicitly approved: accounts, streaming-service APIs, cloud
  deployment, deep-learning embeddings, generative AI (see PROJECT_CONTEXT.md).
- No new dependencies without the owner's approval.

## Brand Commitments

Confirmed by the owner as binding:

- It should feel like an intentionally designed music-analysis playground, not an AI
  or SaaS product. Originality, hierarchy, typography, spacing and information design
  matter more than visual effects.
- Excluded devices: gradients and gradient text, glow, decorative blobs or circles,
  fake or decorative data visualisation, generic SaaS heroes, grids of generic
  feature cards, pill overload, emojis, decorative animation or scroll effects,
  heavy drop shadows, invented artwork. One consistent radius system.
- Light mode is coherently light and dark mode coherently dark: the shell and page
  share one surface per theme. Dark is the default.
- The Song Fingerprint provides the visual identity. Prefer whitespace and hairlines
  to cards; keep radius and shadows restrained.
- Colour is restrained and carries information:
  - The base is neutral black and white. One warm accent, a restrained ochre, marks
    the current or interaction state (current track, playhead, the slice being
    read). It is never a data series.
  - Home uses no violet, cyan or blue. Song DNA there is drawn in neutral ink and
    told apart by form: energy as solid bars rising, brightness as open bars hanging,
    beats as ticks. A and B are told apart by solid and outlined letter badges.
  - Compare and Library still use the original colours: violet for energy and cyan
    for brightness in Compare's charts, and violet / blue for Song A / Song B
    selection. A/B identity comes from explicit markers or labels, never from
    recolouring the data.
  - Song Fingerprints are always monochrome, including when a track is selected.
- Typography: Geist for body, controls and UI text. Source Serif 4, at a restrained
  weight, only for Home's editorial headline and figure labels.
- The name is written "SongDNA" as a plain wordmark.

## Evidence on Hand

- Library: five tracks in `frontend/public/library/`, currently synthetic
  development placeholders generated by `scripts/generate_dev_tracks.py`. Say so
  wherever it matters; no real, licensed tracks have been added yet.
- Precomputed features per track in `frontend/public/library/features/*.json`
  (duration, tempo estimate, RMS, centroid, beat times), and Song Fingerprints in
  `frontend/public/library/fingerprints/` (all thumbnails in `thumbs.json`, one
  hero per track with its frame counts).
- No testimonials, users, benchmarks or accuracy figures exist. Do not invent any
  number: everything displayed must come from SongDNA's own data.

## Product Principles

1. Show the measurement, then explain it. The real fingerprint and DNA are the main
   visuals; explanation sits beside the data it describes.
2. Understandable first, rewarding on a closer look. Plain language leads;
   implementation details (frame sizes, libraries, "no ML") stay available but
   visually secondary.
3. Honest about limits: say "similar" for small differences, label estimates and
   placeholders, and never infer genre, emotion or quality.
4. A playground, not a dashboard: exploring real data (switching tracks, playing,
   comparing) is the experience.

## Accessibility & Inclusion

Interactive elements need accessible names, visible keyboard focus and correct
pressed/status semantics (see AGENTS.md "UI and design"). Colour is never the only
carrier of meaning: A/B slots always have letter markers, data strands have a
legend, and on Home energy and brightness differ by form (solid / open) as well as
direction.
