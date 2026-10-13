import { useEffect, useState } from "react";
import { Hub } from "./hub/Hub";
import { LectureView } from "./lectures/LectureView";
import { RefresherView } from "./lectures/RefresherView";
import { lectureById } from "./lectures/registry";
import { stopAll } from "./audio/player";
import { Credits } from "./Credits";

function useHash() {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const f = () => {
      stopAll();
      setHash(location.hash);
    };
    window.addEventListener("hashchange", f);
    return () => window.removeEventListener("hashchange", f);
  }, []);
  return hash;
}

export function App() {
  const hash = useHash();
  const [, kind, id, part] = hash.split("/");
  const def = id ? lectureById(id)?.def : undefined;
  if (kind === "l" && def) return <LectureView key={hash} lecture={def} startPart={part ? Number(part) - 1 : undefined} />;
  if (kind === "r" && def?.refresher) return <RefresherView key={def.id} lecture={def} />;
  if (kind === "credits") return <Credits />;
  return <Hub />;
}
