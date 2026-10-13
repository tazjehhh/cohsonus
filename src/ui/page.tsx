import type { ReactNode } from "react";

/** Pictures the owner draws or picks: src/lectures/<lecture>/art/<name>.<ext>, any image format. */
const ART: Record<string, string> = Object.fromEntries(
  Object.entries(import.meta.glob<string>("../lectures/*/art/*.{png,jpg,jpeg,gif,webp,avif,svg}", { eager: true, query: "?url", import: "default" })).map(
    ([path, url]) => {
      const m = path.match(/lectures\/([^/]+)\/art\/([^/]+)\.\w+$/)!;
      return [`${m[1]}/${m[2]}`, url];
    },
  ),
);

/** A composed page: text beside pictures, moving pictures and sound. */
export function Page({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <article className="page">
      <h2 className="prompt">{title}</h2>
      {children}
    </article>
  );
}

/** A figure on one side, the text that goes with it on the other. */
export function Spread({ figure, flip, children }: { figure: ReactNode; flip?: boolean; children: ReactNode }) {
  return (
    <section className={`spread ${flip ? "flip" : ""}`}>
      <div className="spread-figure">{figure}</div>
      <div className="prose">{children}</div>
    </section>
  );
}

export function Figure({ caption, children }: { caption?: ReactNode; children: ReactNode }) {
  return (
    <figure className="figure">
      {children}
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

/**
 * A picture by the owner, `name` as "<lecture>/<file name>". Until the file exists,
 * an empty frame names the file, its size and what it shows.
 */
export function Art({ name, w, h, alt }: { name: string; w: number; h: number; alt: string }) {
  const url = ART[name];
  if (url) return <img className="art" src={url} width={w} height={h} alt={alt} draggable={false} />;
  const [lecture, file] = name.split("/");
  return (
    <div className="art art-empty" style={{ width: w, height: h }} role="img" aria-label={alt}>
      <span className="mono">
        {lecture}/art/{file}.png
      </span>
      <span className="mono dim">
        {w * 2} × {h * 2}
      </span>
      <span className="art-alt">{alt}</span>
    </div>
  );
}
