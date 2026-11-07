// Verifica que cada t("...") del front tenga traducción al portugués.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const dict = readFileSync("src/i18n.tsx", "utf8");
const keys = new Set([...dict.matchAll(/^\s*"((?:[^"\\]|\\.)*)":/gm)].map((m) => m[1].replace(/\\"/g, '"')));
const files = [];
(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.tsx?$/.test(f)) files.push(p);
  }
})("src");

const used = new Set();
for (const f of files) {
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(/\bt\(\s*"((?:[^"\\]|\\.)*)"/g)) used.add(m[1].replace(/\\"/g, '"'));
}
// textos que pasan por t() de forma indirecta
for (const f of ["src/lib/push.ts", "src/screens/Me.tsx", "src/ui.tsx"]) {
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(/(?:: |return )"((?:[^"\\]|\\.)*)"[,;]/g)) if (keys.has(m[1]) === false && /[a-záéíóú]/i.test(m[1]) && /\s/.test(m[1])) used.add(m[1]);
}
const missing = [...used].filter((k) => !keys.has(k));
if (missing.length) {
  console.log("Faltan en PT:\n" + missing.map((k) => "  " + k).join("\n"));
  process.exit(1);
}
console.log(`i18n OK (${used.size} textos)`);
