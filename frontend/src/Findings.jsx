import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { API_BASE } from "@/lib/config";
import { resultForPair } from "@/compareResult";

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

    fetch(`${API_BASE}/compare`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        song_a: {
          rms_energy: songAFeatures.rms_energy,
          spectral_centroid: songAFeatures.spectral_centroid,
        },
        song_b: {
          rms_energy: songBFeatures.rms_energy,
          spectral_centroid: songBFeatures.spectral_centroid,
        },
      }),
    })
      .then((response) => {
        if (!response.ok) throw new Error("compare request failed");
        return response.json();
      })
      .then((data) => {
        if (!cancelled) {
          setResult({ a: songAFeatures, b: songBFeatures, findings: data.findings, error: null });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResult({
            a: songAFeatures,
            b: songBFeatures,
            findings: null,
            error: "Couldn't generate findings for these songs.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [songAFeatures, songBFeatures]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Sparkles className="size-4" />
        </div>
        <CardTitle>Findings</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {loading && (
          <p className="font-mono text-sm text-muted-foreground">Comparing...</p>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {findings && (
          <ul className="flex flex-col gap-2">
            {findings.map((finding) => (
              <li key={finding.category} className="text-sm text-foreground">
                {finding.text}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default Findings;
