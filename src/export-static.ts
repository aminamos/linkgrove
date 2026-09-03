import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderHome } from "./render.js";
import type { Link, Profile, Theme } from "./store.js";

type ConfigShape = {
  profile?: Partial<Profile>;
  theme?: Partial<Theme>;
  links?: Link[];
};

const defaultProfile: Profile = {
  title: "Your Name",
  handle: "@username",
  bio: "One link for everything.",
  avatarUrl: ""
};

const defaultTheme: Theme = {
  bg: "#0b1020",
  fg: "#f8fafc",
  accent: "#7dd3fc",
  card: "#111827"
};

const filePath = path.resolve("profile.config.json");
const outputPath = path.resolve("dist", "index.html");
const config = JSON.parse(await readFile(filePath, "utf8")) as ConfigShape;

const html = renderHome(
  { ...defaultProfile, ...(config.profile ?? {}) },
  { ...defaultTheme, ...(config.theme ?? {}) },
  config.links ?? []
);
await mkdir(path.resolve("dist"), { recursive: true });

await writeFile(outputPath, html, "utf8");
console.log(`Wrote ${outputPath}`);
