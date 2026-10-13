import manifest from "./audio/samples.json";

interface Source {
  url: string;
  title: string;
  author: string;
  license: string;
}

const data = manifest as unknown as { sources: Record<string, Source>; instruments: Record<string, { source: string }> };

export function Credits() {
  return (
    <div className="lecture">
      <header className="lecture-top">
        <a className="btn quiet small" href="#/" aria-label="Back to all lectures">
          ✕
        </a>
        <span className="lecture-title">Sounds</span>
        <span />
      </header>
      <main className="lecture-stage">
        <div className="col credits fade-in">
          <h1 className="intro-title">Sounds</h1>
          <ul className="credit-list">
            {Object.entries(data.sources).map(([key, s]) => (
              <li key={key}>
                <a href={s.url} target="_blank" rel="noreferrer">
                  {s.title}
                </a>
                <span className="credit-by">{s.author}</span>
                <span className="credit-license mono">{s.license}</span>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}
