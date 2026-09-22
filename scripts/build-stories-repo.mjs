/**
 * One-shot: catalog Cursor skills, write docs/README.md,
 * and copy user stories into ../dating-stories for a personal reading repo.
 */
import fs from "fs";
import path from "path";

const root = path.resolve(import.meta.dirname, "..");
const storiesRoot = path.resolve(root, "..", "dating-stories");

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text.endsWith("\n") ? text : `${text}\n`, "utf8");
}

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name === "handoffs") continue;
      walk(full, acc);
    } else acc.push(full);
  }
  return acc;
}

function descriptionFrom(text) {
  const lines = text.split(/\r?\n/);
  const i = lines.findIndex((line) => line.startsWith("description:"));
  if (i < 0) return "";
  const first = lines[i].slice("description:".length).trim();
  if (first === ">-" || first === ">" || first === "|" || first === "") {
    const parts = [];
    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j].startsWith(" ") || lines[j].startsWith("\t")) parts.push(lines[j].trim());
      else break;
    }
    return parts.join(" ");
  }
  return first.replace(/^["']|["']$/g, "");
}

function skillMeta(file) {
  const text = read(file);
  const name = text.match(/^name:\s*(.+)$/m)?.[1]?.trim() ?? path.basename(path.dirname(file));
  const description = descriptionFrom(text);
  const rel = path.relative(path.join(root, ".cursor", "skills"), file).replaceAll("\\", "/");
  return { name, description, rel };
}

function skillBucket(rel) {
  if (rel.startsWith("dating-agent-run/")) return "Sprint agents";
  if (rel.startsWith("dating-first-upload")) return "First AWS upload";
  if (rel.startsWith("dating-push/")) return "Ship";
  return "Review and delivery";
}

function sprintRank(name) {
  let m = name.match(/^sprint-(\d+)/);
  if (m) return [0, Number(m[1]), name];
  m = name.match(/^fe-sprint-(\d+)/);
  if (m) return [1, Number(m[1]), name];
  m = name.match(/expansion-(\d+)/);
  if (m) return [2, Number(m[1]), name];
  return [3, 0, name];
}

function storyRank(file) {
  const base = path.basename(file);
  const m = base.match(/STORY_(\d+)/i);
  return m ? Number(m[1]) : 999;
}

function titleOf(text, fallback) {
  const h = text.match(/^#\s+(.+)$/m);
  return (h?.[1] ?? fallback).trim();
}

function statusOf(text) {
  const s = text.match(/^\*\*Status:\*\*\s*(.+)$/m);
  return (s?.[1] ?? "").trim();
}

const areas = [
  {
    key: "api",
    title: "API",
    src: path.join(root, "dating-api", "docs", "sprints"),
  },
  {
    key: "ui",
    title: "UI",
    src: path.join(root, "dating-ui", "docs", "sprints"),
  },
  {
    key: "signals",
    title: "Compatibility signals",
    src: path.join(root, "docs", "sprints"),
  },
];

if (fs.existsSync(storiesRoot)) {
  fs.rmSync(storiesRoot, { recursive: true, force: true });
}
fs.mkdirSync(storiesRoot, { recursive: true });

const areaIndexes = [];

for (const area of areas) {
  const sprints = fs
    .readdirSync(area.src, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort((a, b) => {
      const ra = sprintRank(a);
      const rb = sprintRank(b);
      return ra[0] - rb[0] || ra[1] - rb[1] || ra[2].localeCompare(rb[2]);
    });

  const lines = [`# ${area.title} stories`, "", "Source of truth stays in the Dating app repo. This folder is a reading copy.", ""];
  let storyCount = 0;
  let sprintCount = 0;

  for (const sprint of sprints) {
    const sprintDir = path.join(area.src, sprint);
    const stories = fs
      .readdirSync(sprintDir)
      .filter((f) => /^STORY_.*\.md$/i.test(f))
      .sort((a, b) => storyRank(a) - storyRank(b) || a.localeCompare(b));
    const readme = path.join(sprintDir, "README.md");
    if (stories.length === 0 && !fs.existsSync(readme)) continue;

    const destSprint = path.join(storiesRoot, area.key, sprint);
    fs.mkdirSync(destSprint, { recursive: true });
    if (fs.existsSync(readme)) {
      fs.copyFileSync(readme, path.join(destSprint, "README.md"));
    }
    sprintCount += 1;

    lines.push(`## ${sprint}`, "");
    if (fs.existsSync(readme)) {
      const sprintTitle = titleOf(read(readme), sprint);
      lines.push(`[${sprintTitle}](./${sprint}/README.md)`, "");
    }

    for (const file of stories) {
      fs.copyFileSync(path.join(sprintDir, file), path.join(destSprint, file));
      const text = read(path.join(sprintDir, file));
      const title = titleOf(text, file.replace(/\.md$/, ""));
      const status = statusOf(text);
      const statusBit = status ? ` — ${status}` : "";
      lines.push(`- [${title}](./${sprint}/${file})${statusBit}`);
      storyCount += 1;
    }
    lines.push("");
  }

  write(path.join(storiesRoot, area.key, "README.md"), lines.join("\n"));
  areaIndexes.push({ ...area, storyCount, sprintCount });
}

const total = areaIndexes.reduce((n, a) => n + a.storyCount, 0);
const rootReadme = [
  "# Dating stories",
  "",
  "Personal reading copy of the user stories from [shacharon/dating](https://github.com/shacharon/dating).",
  "The app repo stays the source of truth. This repo is only the stories, grouped so they can be read without the code.",
  "",
  `| Area | Sprints | Story files | Start here |`,
  `| --- | ---: | ---: | --- |`,
  ...areaIndexes.map(
    (a) =>
      `| ${a.title} | ${a.sprintCount} | ${a.storyCount} | [${a.key}/README.md](./${a.key}/README.md) |`,
  ),
  "",
  `**${total}** story files.`,
  "",
  "## Layout",
  "",
  "- `api/` — `dating-api/docs/sprints`",
  "- `ui/` — `dating-ui/docs/sprints`",
  "- `signals/` — compatibility-signal expansion sprints in `docs/sprints`",
  "",
  "Each sprint folder has its `README.md` when the sprint had one, plus any `STORY_*.md` files. Signal sprints keep the story breakdown inside the sprint README. Agent handoffs are not included.",
  "",
].join("\n");
write(path.join(storiesRoot, "README.md"), rootReadme);

const skillsDir = path.join(root, ".cursor", "skills");
const skills = walk(skillsDir)
  .filter((f) => f.endsWith(`${path.sep}SKILL.md`))
  .map(skillMeta)
  .sort((a, b) => a.rel.localeCompare(b.rel));

const groups = new Map();
for (const skill of skills) {
  const top = skillBucket(skill.rel);
  if (!groups.has(top)) groups.set(top, []);
  groups.get(top).push(skill);
}

const skillLines = [
  "# Dating Cursor skills",
  "",
  "Agent playbooks for this repo. Open the skill file when the task matches its description.",
  "",
];
const bucketOrder = ["Sprint agents", "Review and delivery", "First AWS upload", "Ship"];
for (const group of bucketOrder) {
  const items = groups.get(group);
  if (!items) continue;
  skillLines.push(`## ${group}`, "");
  for (const item of items) {
    const desc = item.description.replace(/\|/g, "/");
    skillLines.push(`- [\`${item.name}\`](./${item.rel}) — ${desc}`);
  }
  skillLines.push("");
}
write(path.join(skillsDir, "README.md"), skillLines.join("\n"));

const docsReadme = [
  "# Dating documentation",
  "",
  "Where to read things in this repo.",
  "",
  "## Start here",
  "",
  "- [DEV.md](../DEV.md) — local development",
  "- [DEPLOY_AWS_DEV.md](../DEPLOY_AWS_DEV.md) — AWS dev deploy",
  "- [Cursor skills](../.cursor/skills/README.md) — agent playbooks",
  "- [Stories (personal repo)](https://github.com/shacharon/dating-stories) — reading copy of every user story, grouped by API, UI, and compatibility signals",
  "",
  "## Product and matching",
  "",
  "- [HOLY_GRAIL_MATCHING.md](./HOLY_GRAIL_MATCHING.md)",
  "- [Compatibility signals summary](../COMPATIBILITY_SIGNALS_SUMMARY.md)",
  "- [Signals expansion index](./sprints/INDEX.md)",
  "",
  "## First upload",
  "",
  "- [Plan](./DATING_FIRST_UPLOAD_PLAN.md)",
  "- [Conclusion](./DATING_FIRST_UPLOAD_CONCLUSION.md)",
  "- [AWS go-live readiness](./DATING_AWS_GOLIVE_READINESS.md)",
  "- [Open issues](./first-upload/OPEN_ISSUES.md)",
  "- [Phase handoffs](./first-upload/handoffs/README.md)",
  "",
  "## Audits",
  "",
  "- [codex-audit-scale-and-formula.md](./codex-audit-scale-and-formula.md)",
  "- [formula-drift-fix.md](./formula-drift-fix.md)",
  "- [formula-drift-revert.md](./formula-drift-revert.md)",
  "",
  "## Stories in this repo",
  "",
  "Implementation stories stay next to the code:",
  "",
  "- `dating-api/docs/sprints/`",
  "- `dating-ui/docs/sprints/`",
  "- `docs/sprints/` (compatibility-signal expansion)",
  "",
  "A grouped reading copy is published in the personal [dating-stories](https://github.com/shacharon/dating-stories) repo.",
  "",
].join("\n");
write(path.join(root, "docs", "README.md"), docsReadme);

console.log(
  JSON.stringify(
    { storiesRoot, total, skills: skills.length, areas: areaIndexes.map((a) => [a.key, a.storyCount]) },
    null,
    2,
  ),
);
