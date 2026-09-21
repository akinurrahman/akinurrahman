// Generates one banner per project into assets/project-<slug>.svg
// Edit the list below, then run: node scripts/project-banners.mjs
import { writeFileSync, mkdirSync } from "node:fs";

const projects = [
  {
    slug: "hrms",
    title: "HRMS",
    tagline: "A fullstack HR platform for small teams.",
    features: ["Employees", "Attendance", "Leave"],
    stack: ["React", "TypeScript", "NestJS", "Prisma", "PostgreSQL"],
    colors: ["#001a57", "#0036ac"], // gradient: dark → light
  },
  // Add the next project here, e.g.
  // {
  //   slug: "approvals",
  //   title: "Project name",
  //   tagline: "One line on what it does.",
  //   features: ["Feature", "Feature", "Feature"],
  //   stack: ["Next.js", "NestJS", "PostgreSQL"],
  //   colors: ["#0b3b2e", "#0f766e"],
  // },
];

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const chipWidth = (t) => Math.round(t.length * 7.4 + 30);

function banner(p) {
  const W = 880, H = 240;
  let x = 0;
  const chips = p.features.map((f) => {
    const w = chipWidth(f);
    const out = `<rect x="${x}" width="${w}" height="30" rx="15" fill="#fff" fill-opacity="0.12" stroke="#fff" stroke-opacity="0.2"/><text x="${x + w / 2}" y="20" class="chip" text-anchor="middle">${esc(f)}</text>`;
    x += w + 10;
    return out;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(p.title)}: ${esc(p.tagline)}">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.colors[0]}"/><stop offset="1" stop-color="${p.colors[1]}"/></linearGradient>
  <pattern id="dots" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.2" fill="#fff" opacity="0.08"/></pattern>
  <clipPath id="c"><rect width="${W}" height="${H}" rx="16"/></clipPath>
</defs>
<style>
  text { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif; }
  .title { font-size: 40px; font-weight: 800; fill: #fff; letter-spacing: -1px; }
  .tag { font-size: 17px; fill: #fff; fill-opacity: 0.78; }
  .chip { font-size: 13px; font-weight: 500; fill: #fff; }
  .stack { font-size: 13px; fill: #fff; fill-opacity: 0.6; }
</style>
<g clip-path="url(#c)">
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#dots)"/>
  <circle cx="830" cy="-60" r="200" fill="#fff" opacity="0.07"/>
  <text x="40" y="78" class="title">${esc(p.title)}</text>
  <text x="40" y="110" class="tag">${esc(p.tagline)}</text>
  <g transform="translate(40,134)">${chips}</g>
  <text x="40" y="206" class="stack">${p.stack.map(esc).join("  ·  ")}</text>
  <g transform="translate(560,36) rotate(-4) scale(0.8)">
    <rect width="330" height="226" rx="12" fill="#0d1117" stroke="#fff" stroke-opacity="0.15"/>
    <rect width="330" height="26" rx="12" fill="#161b22"/><rect y="14" width="330" height="12" fill="#161b22"/>
    <circle cx="16" cy="13" r="4" fill="#ff5f57"/><circle cx="30" cy="13" r="4" fill="#febc2e"/><circle cx="44" cy="13" r="4" fill="#28c840"/>
    <rect y="26" width="70" height="200" fill="#11161d"/>
    <rect x="12" y="42" width="46" height="8" rx="4" fill="#58a6ff"/>
    <rect x="12" y="60" width="38" height="6" rx="3" fill="#30363d"/><rect x="12" y="74" width="42" height="6" rx="3" fill="#30363d"/>
    <rect x="12" y="88" width="34" height="6" rx="3" fill="#30363d"/><rect x="12" y="102" width="40" height="6" rx="3" fill="#30363d"/>
    <g transform="translate(84,40)">
      <rect width="72" height="44" rx="6" fill="#161b22"/><rect x="8" y="10" width="30" height="5" rx="2.5" fill="#484f58"/><rect x="8" y="24" width="40" height="10" rx="3" fill="#e6edf3"/>
      <rect x="80" width="72" height="44" rx="6" fill="#161b22"/><rect x="88" y="10" width="30" height="5" rx="2.5" fill="#484f58"/><rect x="88" y="24" width="32" height="10" rx="3" fill="#3fb950"/>
      <rect x="160" width="72" height="44" rx="6" fill="#161b22"/><rect x="168" y="10" width="30" height="5" rx="2.5" fill="#484f58"/><rect x="168" y="24" width="24" height="10" rx="3" fill="#d29922"/>
      <rect y="54" width="232" height="120" rx="6" fill="#161b22"/><rect x="16" y="66" width="60" height="6" rx="3" fill="#484f58"/>
      <g fill="#3b7be0"><rect x="16" y="130" width="16" height="30" rx="3"/><rect x="42" y="112" width="16" height="48" rx="3"/><rect x="68" y="120" width="16" height="40" rx="3"/><rect x="94" y="96" width="16" height="64" rx="3"/><rect x="120" y="106" width="16" height="54" rx="3"/><rect x="146" y="86" width="16" height="74" rx="3" fill="#58a6ff"/><rect x="172" y="100" width="16" height="60" rx="3"/><rect x="198" y="92" width="16" height="68" rx="3"/></g>
    </g>
  </g>
</g>
</svg>`;
}

mkdirSync("assets", { recursive: true });
for (const p of projects) {
  writeFileSync(`assets/project-${p.slug}.svg`, banner(p));
  console.log(`assets/project-${p.slug}.svg`);
}
