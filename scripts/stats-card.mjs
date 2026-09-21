// Generates assets/stats-light.svg and assets/stats-dark.svg from your GitHub contributions.
// Run: GH_TOKEN=xxx GH_USER=akinurrahman node scripts/stats-card.mjs
// Preview with fake data: node scripts/stats-card.mjs --mock
import { writeFileSync, mkdirSync } from "node:fs";

const USER = process.env.GH_USER || "akinurrahman";
const TOKEN = process.env.GH_TOKEN;
const MOCK = process.argv.includes("--mock");
const WEEKS_SHOWN = 30;

const THEMES = {
  light: {
    bg: "#ffffff", border: "#d0d7de", text: "#1f2328", muted: "#656d76",
    levels: ["#eef1f6", "#c3d0ee", "#7e99da", "#3a62c4", "#0036ac"],
  },
  dark: {
    bg: "#0d1117", border: "#30363d", text: "#e6edf3", muted: "#8b949e",
    levels: ["#161b22", "#0e2a5c", "#1b4a9e", "#3b7be0", "#58a6ff"],
  },
};

const LEVEL = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };
const DAYS = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

async function fetchCalendar() {
  const query = `query($login: String!) {
    user(login: $login) {
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks { contributionDays { date contributionCount contributionLevel weekday } }
        }
      }
    }
  }`;
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { login: USER } }),
  });
  const json = await res.json();
  if (json.errors || !json.data?.user) throw new Error(JSON.stringify(json.errors || json));
  const cal = json.data.user.contributionsCollection.contributionCalendar;
  return {
    total: cal.totalContributions,
    weeks: cal.weeks.map((w) =>
      w.contributionDays.map((d) => ({
        date: d.date, count: d.contributionCount, level: LEVEL[d.contributionLevel] ?? 0, weekday: d.weekday,
      }))
    ),
  };
}

function mockCalendar() {
  const weeks = [];
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - 364 - end.getDay());
  let week = [];
  let total = 0;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const wd = d.getDay();
    const busy = wd > 0 && wd < 6 ? 0.8 : 0.35;
    const count = Math.random() < busy ? Math.ceil(Math.random() * 9) : 0;
    total += count;
    const level = count === 0 ? 0 : count < 3 ? 1 : count < 5 ? 2 : count < 8 ? 3 : 4;
    week.push({ date: d.toISOString().slice(0, 10), count, level, weekday: wd });
    if (wd === 6) { weeks.push(week); week = []; }
  }
  if (week.length) weeks.push(week);
  return { total, weeks };
}

function stats(weeks) {
  const days = weeks.flat();
  let longest = 0, run = 0;
  for (const d of days) { run = d.count > 0 ? run + 1 : 0; longest = Math.max(longest, run); }

  let i = days.length - 1;
  if (days[i]?.count === 0) i--; // today not counted until you commit
  let current = 0;
  while (i >= 0 && days[i].count > 0) { current++; i--; }

  const lastActive = [...days].reverse().find((d) => d.count > 0)?.date;
  const byDay = Array(7).fill(0);
  days.forEach((d) => (byDay[d.weekday] += d.count));
  const busiest = DAYS[byDay.indexOf(Math.max(...byDay))];
  return { longest, current, lastActive, busiest };
}

const fmtDate = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}`;
};
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

const r2 = (n) => Number(n.toFixed(2));

// Two size variants. The README serves `wide` above 768px and `narrow` below, so
// the card can span the full column on a monitor without the type collapsing on a
// phone. Both snap every element to two vertical rules: `pad` and `W - pad`.
//   wide:   text column on the left, grid on the right, short and full-bleed.
//   narrow: text stacked above a grid that spans the whole card.
const LAYOUTS = {
  // `gutter` on the split layout also has to hold the Mon/Wed/Fri labels.
  wide: { W: 760, pad: 28, weeks: 30, split: true, textCol: 215, gutter: 56 },
  narrow: { W: 460, pad: 24, weeks: 30, split: false },
};

function render({ total, weeks }, s, t, L) {
  const { W, pad, split } = L;
  const gap = 3;

  const shown = weeks.slice(-L.weeks);
  const gridX = split ? pad + L.textCol + L.gutter : pad;
  // Derive the cell size from the space left over, so the grid always ends
  // exactly on the right rule regardless of the week count.
  const step = (W - pad - gridX + gap) / shown.length;
  const cell = step - gap;
  const gridY = split ? 48 : 174;
  const monthY = split ? 38 : gridY - 10;
  const legendY = gridY + (7 * step - gap) + (split ? 18 : 20);
  // In the split layout the left text column can outrun the grid, so the card
  // height is whichever column ends lower.
  const H = Math.round(Math.max(legendY + cell, split ? 160 : 0) + pad);
  const font = `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif`;

  let cells = "";
  let monthLabels = "";
  let lastMonth = -1;
  let lastLabelX = -Infinity;
  shown.forEach((week, wi) => {
    const x = r2(gridX + wi * step);
    const m = Number(week[0].date.slice(5, 7)) - 1;
    if (m !== lastMonth) {
      // Skip labels that would crowd the previous one or run off the right rule.
      if (lastMonth !== -1 && wi < shown.length - 2 && x - lastLabelX >= 30) {
        monthLabels += `<text x="${x}" y="${monthY}" class="m">${MONTHS[m]}</text>`;
        lastLabelX = x;
      }
      lastMonth = m;
    }
    week.forEach((d) => {
      const y = r2(gridY + d.weekday * step);
      // Staggered by week so the grid sweeps in left to right. Only the cells carry
      // a style attribute, so the `rect[style]` rule never touches the legend swatches.
      const delay = (wi * 0.02).toFixed(2);
      cells += `<rect x="${x}" y="${y}" width="${r2(cell)}" height="${r2(cell)}" rx="2" fill="${t.levels[d.level]}" style="animation-delay:${delay}s"><title>${d.count} on ${fmtDate(d.date)}</title></rect>`;
    });
  });

  const streakLine = s.current > 0
    ? `On a ${s.current}-day streak right now`
    : s.lastActive ? `Last shipped something on ${fmtDate(s.lastActive)}` : `Quiet stretch right now`;

  // The narrow card has the full width for one long line; the split card's text
  // column is only `textCol` wide, so the same copy is broken across two lines.
  const tail = split
    ? `<text x="${pad}" y="134" class="line">Longest run: ${s.longest} days</text>
<text x="${pad}" y="156" class="line">Most active on ${s.busiest}</text>`
    : `<text x="${pad}" y="134" class="line">Longest run: ${s.longest} days, most active on ${s.busiest}</text>`;

  // Day labels only exist on the split layout, where they sit in the gutter. On
  // the stacked card they would push the grid off the card's own left rule.
  const dayLabels = split
    ? [[1, "Mon"], [3, "Wed"], [5, "Fri"]]
        .map(([i, l]) => `<text x="${gridX - 8}" y="${r2(gridY + i * step + cell * 0.85)}" class="m" text-anchor="end">${l}</text>`)
        .join("")
    : "";

  // Legend is laid out right-to-left off the right rule: [Less] [swatches] [More].
  const swatchEnd = W - pad - 38; // reserve room for the "More" label inside the right rule
  const swatchStart = swatchEnd - (5 * step - gap);
  const legendBase = r2(legendY + 9);
  const legend = t.levels
    .map((c, i) => `<rect x="${r2(swatchStart + i * step)}" y="${r2(legendY)}" width="${r2(cell)}" height="${r2(cell)}" rx="2" fill="${c}"/>`)
    .join("");

  const today = new Date().toISOString().slice(0, 10);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(USER)}: ${total} contributions in the past year, current streak ${s.current} days, longest ${s.longest} days">
<style>
  text { font-family: ${font}; fill: ${t.text}; }
  .m { font-size: 12px; fill: ${t.muted}; }
  .h { font-size: 13px; fill: ${t.muted}; }
  .big { font-size: 36px; font-weight: 700; letter-spacing: -0.5px; }
  .unit { font-size: 15px; font-weight: 400; fill: ${t.muted}; }
  .line { font-size: 14px; }
  rect[style] { animation: in 0.4s ease-out backwards; }
  @keyframes in { from { opacity: 0; } }
  @media (prefers-reduced-motion: reduce) { rect[style] { animation: none; } }
</style>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="12" fill="${t.bg}" stroke="${t.border}"/>
<text x="${pad}" y="38" class="h">@${esc(USER)}, past 12 months</text>
<text x="${pad}" y="84" class="big">${total.toLocaleString("en-US")}<tspan class="unit" dx="9">contributions</tspan></text>
<text x="${pad}" y="112" class="line">${esc(streakLine)}</text>
${tail}
${monthLabels}${dayLabels}${cells}
<text x="${split ? gridX : pad}" y="${legendBase}" class="m">Updated ${fmtDate(today)}</text>
<text x="${r2(swatchStart - 6)}" y="${legendBase}" class="m" text-anchor="end">Less</text>
${legend}
<text x="${r2(swatchEnd + 6)}" y="${legendBase}" class="m">More</text>
</svg>`;
}

const data = MOCK ? mockCalendar() : await fetchCalendar();
const s = stats(data.weeks);
mkdirSync("assets", { recursive: true });
for (const [themeName, theme] of Object.entries(THEMES)) {
  for (const [layoutName, layout] of Object.entries(LAYOUTS)) {
    const suffix = layoutName === "narrow" ? "" : `-${layoutName}`;
    writeFileSync(`assets/stats-${themeName}${suffix}.svg`, render(data, s, theme, layout));
  }
}
console.log(`Done: ${data.total} contributions, streak ${s.current}, longest ${s.longest}`);
