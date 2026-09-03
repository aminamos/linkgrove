import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export type Profile = {
  title: string;
  handle: string;
  bio: string;
  avatarUrl: string;
};

export type Theme = {
  bg: string;
  fg: string;
  accent: string;
  card: string;
};

export type Link = {
  id: string;
  title: string;
  url: string;
  description: string;
  icon: string;
  order: number;
  active: boolean;
  mobileUrl?: string;
  desktopUrl?: string;
  schedule?: {
    startHourUtc: number;
    endHourUtc: number;
  };
};

export type Click = {
  id: string;
  linkId: string;
  at: string;
  referer: string;
  ua: string;
  chosenUrl: string;
};

export type StoreData = {
  profile: Profile;
  theme: Theme;
  links: Link[];
  clicks: Click[];
};

const DEFAULT_DATA: StoreData = {
  profile: {
    title: "Your Name",
    handle: "@username",
    bio: "One link for everything.",
    avatarUrl: ""
  },
  theme: {
    bg: "#0b1020",
    fg: "#f8fafc",
    accent: "#7dd3fc",
    card: "#111827"
  },
  links: [],
  clicks: []
};

function normalize(input: Partial<StoreData>): StoreData {
  return {
    profile: { ...DEFAULT_DATA.profile, ...(input.profile ?? {}) },
    theme: { ...DEFAULT_DATA.theme, ...(input.theme ?? {}) },
    links: [...(input.links ?? DEFAULT_DATA.links)].sort((a, b) => a.order - b.order),
    clicks: input.clicks ?? []
  };
}

export class Store {
  private data: StoreData = DEFAULT_DATA;

  constructor(private readonly filePath: string) {}

  async init() {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    const fromDisk = await this.readJson(this.filePath);
    const fromConfig = await this.readJson(path.resolve("profile.config.json"));

    if (fromDisk) {
      this.data = normalize(fromDisk);
      return;
    }

    if (fromConfig) {
      this.data = normalize(fromConfig);
      await this.persist();
      return;
    }

    this.data = DEFAULT_DATA;
    await this.persist();
  }

  snapshot(): StoreData {
    return structuredClone(this.data);
  }

  async setProfile(profile: Partial<Profile>) {
    this.data.profile = { ...this.data.profile, ...profile };
    await this.persist();
  }

  async setTheme(theme: Partial<Theme>) {
    this.data.theme = { ...this.data.theme, ...theme };
    await this.persist();
  }

  async upsertLink(link: Link) {
    const idx = this.data.links.findIndex((entry) => entry.id === link.id);
    if (idx >= 0) {
      this.data.links[idx] = link;
    } else {
      this.data.links.push(link);
    }
    this.data.links.sort((a, b) => a.order - b.order);
    await this.persist();
  }

  async removeLink(id: string) {
    this.data.links = this.data.links.filter((entry) => entry.id !== id);
    await this.persist();
  }

  async recordClick(linkId: string, chosenUrl: string, referer: string, ua: string) {
    this.data.clicks.push({
      id: randomUUID(),
      linkId,
      at: new Date().toISOString(),
      referer,
      ua,
      chosenUrl
    });
    if (this.data.clicks.length > 10_000) {
      this.data.clicks = this.data.clicks.slice(-10_000);
    }
    await this.persist();
  }

  analytics() {
    const clicksByLink = new Map<string, number>();
    const clicksByDay = new Map<string, number>();

    for (const click of this.data.clicks) {
      clicksByLink.set(click.linkId, (clicksByLink.get(click.linkId) ?? 0) + 1);
      const day = click.at.slice(0, 10);
      clicksByDay.set(day, (clicksByDay.get(day) ?? 0) + 1);
    }

    return {
      totalClicks: this.data.clicks.length,
      links: this.data.links.map((link) => ({
        linkId: link.id,
        title: link.title,
        clicks: clicksByLink.get(link.id) ?? 0
      })),
      days: Array.from(clicksByDay.entries())
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([day, clicks]) => ({ day, clicks }))
    };
  }

  private async persist() {
    const tmpPath = `${this.filePath}.tmp`;
    await writeFile(tmpPath, `${JSON.stringify(this.data, null, 2)}\n`, "utf8");
    await rename(tmpPath, this.filePath);
  }

  private async readJson(filePath: string): Promise<Partial<StoreData> | null> {
    try {
      const raw = await readFile(filePath, "utf8");
      return JSON.parse(raw) as Partial<StoreData>;
    } catch {
      return null;
    }
  }
}
