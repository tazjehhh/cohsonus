import type { ReactNode } from "react";

/** The written explanation that follows an attempt: textbook text, terms in bold where they are defined. */
export function Explain({ children }: { children: ReactNode }) {
  return <section className="explain prose fade-in">{children}</section>;
}
