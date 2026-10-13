import type { Listen } from "../lectures/types";

const search = (l: Listen) => `https://www.youtube.com/results?search_query=${encodeURIComponent(`${l.artist} ${l.title}`)}`;

export function ListenList({ items }: { items: Listen[] }) {
  return (
    <ul className="listen">
      {items.map((l) => (
        <li key={l.artist + l.title}>
          <a href={search(l)} target="_blank" rel="noreferrer">
            <span className="listen-artist">{l.artist}</span> <span className="listen-title">{l.title}</span>
          </a>
          {l.hint && <span className="listen-hint">{l.hint}</span>}
        </li>
      ))}
    </ul>
  );
}
