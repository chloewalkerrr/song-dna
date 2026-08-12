# Song DNA — Project Context

## Project overview

Song DNA is an interactive application that analyses the hidden structure of songs and converts each song into a distinctive visual DNA fingerprint.

Users will be able to upload songs, explore their musical structure and visually compare the DNA of two songs.

The project should feel futuristic, visually striking and easy to explore. However, every part of the visual fingerprint should correspond to a real audio measurement rather than being an arbitrary animation.

## Core idea

A song contains changing patterns of rhythm, energy, frequency and repetition.

Song DNA extracts those patterns and represents them as a visual genome.

Two songs can then be placed beside each other to reveal:

- Structural similarities
- Differences in energy progression
- Repeated musical patterns
- Similar rhythmic sections
- Differences in frequency composition
- Significant transitions
- Approximate matching sections

## Core user experience

A user should eventually be able to:

1. Upload one audio file.
2. Play and pause the song.
3. View its visual DNA fingerprint.
4. Move through the fingerprint alongside the song’s playback.
5. View the audio measurements used to create the fingerprint.
6. Upload a second song.
7. Compare the two fingerprints.
8. View meaningful similarities and differences between them.

## Visual concept

Each song will be represented by a horizontal, luminous DNA-like structure.

Possible visual mappings include:

- Horizontal position represents time.
- Segment width represents duration.
- Height represents energy or loudness.
- Texture represents frequency composition.
- Markers represent beats or major transitions.
- Repeated shapes represent repeated musical patterns.
- Separate strands represent different audio characteristics.
- Connections between two songs represent structurally similar regions.

These mappings are initial ideas and should be evaluated before implementation.

Every visual property must have a documented relationship to an audio feature.

## Candidate audio features

Potential features include:

- Song duration
- Tempo
- Beat positions
- RMS energy or loudness over time
- Frequency distribution
- Spectral centroid
- Spectral contrast
- Chroma features
- Repetition
- Approximate section boundaries
- Structural similarity

These are candidates rather than requirements for the first version.

Each feature should be understood before it is added.

## Song comparison

The comparison experience could support:

- Two songs by the same artist
- Original song versus cover
- Studio recording versus live performance
- Songs from different genres
- Songs that sound unexpectedly similar
- Songs from different stages of an artist’s career

The application should explain specific similarities and differences instead of relying only on one overall similarity score.

For example:

> Both songs build gradually toward a high-energy final section, but Song B has stronger rhythmic variation and less repetition.

Any generated explanation must be supported by measured audio features.

## First milestone

The first milestone should answer one question:

> Can the application analyse one audio file and convert its changing energy and frequency characteristics into a meaningful visual fingerprint?

The first milestone should:

- Accept one local audio file.
- Extract a small number of reliable audio features.
- Store the extracted features in a clear internal structure.
- Produce one meaningful visual fingerprint.
- Provide basic audio playback.
- Connect playback position to the visual.
- Include tests for important analysis logic.
- Document how each measurement affects the visual.

## Second milestone

After the single-song fingerprint works, the next milestone can:

- Accept two audio files.
- Display their fingerprints together.
- Align their timelines appropriately.
- Compare selected audio features.
- Highlight similar and different regions.
- Produce a small number of evidence-based findings.

## Initial scope boundaries

The first version does not need:

- User accounts
- Authentication
- A database
- Spotify integration
- Cloud infrastructure
- Mobile applications
- Generative AI
- Emotion detection
- Instrument separation
- Perfect verse and chorus recognition
- Full 3D environments
- Automatic music-video generation

These features should not be added unless they are deliberately approved in a later phase.

## Technical learning goals

The project should help develop knowledge of:

- Python
- Audio signal processing
- Numerical computing
- Feature extraction
- Time-series analysis
- Similarity algorithms
- Interactive data visualisation
- Frontend development
- Testing numerical code
- Full-stack integration
- Communicating mathematical findings clearly

## Development principles

- Explain concepts before implementing them.
- Work in small, independently testable steps.
- Understand every major dependency.
- Compare architectural options before selecting them.
- Validate extracted audio features.
- Avoid unsupported claims about songs.
- Distinguish objective measurements from subjective interpretation.
- Add type hints, tests and documentation.
- Commit each completed unit of work.
- Finish the small version before expanding the project.
- Do not generate the entire application at once.

## Git workflow

The repository uses the following branch structure:

- `main` contains stable releases.
- `dev` is the default integration branch.
- `feature/...` branches contain individual changes.

Development work should follow:

```text
feature/... → dev → main