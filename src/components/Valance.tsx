/** Borde de toldo a rayas: lleva el mundo Feira a los encabezados de cada sección. */
export function Valance({ color }: { color: string }) {
  return <div className="valance" style={{ ["--stripe" as string]: color }} aria-hidden />;
}
