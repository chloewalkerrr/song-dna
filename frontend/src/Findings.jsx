import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { COMPARE_FAILED, compareSongs, errorCopy } from "@/lib/analysis";
import { resultForPair } from "@/compareResult";

// Short labels for the categories /compare returns (src/song_dna/findings.py,
// always in this order). An unknown category falls back to its raw name.
const CATEGORY_LABELS = {
  average_energy: "Energy",
  dynamic_range: "Dynamic range",
  energy_trend: "Energy trend",
  brightness: "Brightness",
};

// Findings only make sense once both songs are analyzed, so this always
// renders with both feature sets already present - App only mounts it
// once songAFeatures and songBFeatures are both non-null.
function Findings({ songAFeatures, songBFeatures }) {
  // The latest response, tagged with the pair it answers (see compareResult.js).
  // Loading isn't stored: it is simply "no result for the current pair yet",
  // so findings for a previous pair are never shown next to a new song.
  const [result, setResult] = useState(null);
  const current = resultForPair(result, songAFeatures, songBFeatures);
  const loading = current === null;
  const findings = current?.findings ?? null;
  const error = current?.error ?? null;

  useEffect(() => {
    let cancelled = false;

    compareSongs(songAFeatures, songBFeatures)
      .then((data) => {
        if (!cancelled) {
          setResult({ a: songAFeatures, b: songBFeatures, findings: data.findings, error: null });
        }
      })
      .catch((compareError) => {
        if (!cancelled) {
          setResult({
            a: songAFeatures,
            b: songBFeatures,
            findings: null,
            error: errorCopy(compareError, COMPARE_FAILED),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [songAFeatures, songBFeatures]);

  return (
    <section aria-labelledby="findings-heading" className="border-t pt-5">
      <h2 id="findings-heading" className="text-lg font-semibold tracking-tight">
        Findings
      </h2>
      <p className="mt-1 mb-4 max-w-prose text-sm text-muted-foreground">
        Rule-based, from the measured energy and brightness of both songs. Small differences
        are reported as similar.
      </p>

      {loading && <p className="font-mono text-sm text-muted-foreground">Comparing...</p>}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {findings && (
        <ol className="border-t">
          {findings.map((finding) => (
            <li
              key={finding.category}
              className="grid gap-x-6 gap-y-0.5 border-b py-2.5 text-sm sm:grid-cols-[8rem_minmax(0,1fr)]"
            >
              <span className="text-muted-foreground">
                {CATEGORY_LABELS[finding.category] ?? finding.category}
              </span>
              <span>{finding.text}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export default Findings;
