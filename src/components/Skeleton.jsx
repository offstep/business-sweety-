// Emplacements gris animés pendant le chargement (plus agréable qu'un simple « Chargement… »).
export function GridSkeleton({ n = 4 }) {
  return (
    <div className="pgrid" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="float-card sk-card">
          <div className="sk sk-img" />
          <div className="sk sk-line" /><div className="sk sk-line sk-short" />
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div role="status" aria-label="Chargement">
      <div className="sk sk-hero" />
      <section className="float-section"><div className="sk sk-title" /><GridSkeleton n={4} /></section>
    </div>
  );
}

export function ProductSkeleton() {
  return (
    <section className="float-section" role="status" aria-label="Chargement">
      <div className="sk sk-gal" /><div className="sk sk-title" style={{ marginTop: 16 }} /><div className="sk sk-line" /><div className="sk sk-line sk-short" />
    </section>
  );
}
