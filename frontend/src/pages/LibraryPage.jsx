function LibraryPage() {
  return (
    <div className="mx-auto max-w-[920px]">
      <h1 className="mb-1 text-3xl font-semibold tracking-tight">Song library</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Choose two tracks to compare their audio fingerprints.
      </p>
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        The library isn't built yet. For now, upload your own tracks under Compare.
      </p>
    </div>
  );
}

export default LibraryPage;
