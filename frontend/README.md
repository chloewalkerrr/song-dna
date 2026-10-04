# SongDNA frontend

The React + Vite frontend for SongDNA: the Home, Library and Compare pages, the
Song DNA and Song Fingerprint drawings, and the static track library in
`public/library/`. Built with React 19, Vite, Tailwind CSS v4 and shadcn/ui.

For what SongDNA does, how it measures audio and how to run the whole project,
see the [main README](../README.md).

## Commands

Run from this folder, with Node 22:

```sh
npm ci          # install dependencies
npm run dev     # start the dev server at http://localhost:5173
npm test        # run the unit tests (Vitest)
npm run lint    # run ESLint
npm run build   # production build into dist/
```

Home and the Library work from the static files alone. Uploads and Compare
findings need the local FastAPI backend running at `http://127.0.0.1:8000`
(set `VITE_API_URL` to use another address); see the main README for how to
start it.
