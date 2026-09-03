import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { z } from "zod";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Store, type Link } from "./store.js";
import { renderAdmin, renderHome } from "./render.js";
export type LinkHubApp = Hono;

const linkSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().min(1).max(120),
  url: z.url(),
  description: z.string().max(180).default(""),
  icon: z.string().max(8).default("↗"),
  order: z.number().int().min(0).max(999).default(0),
  active: z.boolean().default(true),
  mobileUrl: z.url().optional(),
  desktopUrl: z.url().optional(),
  schedule: z
    .object({
      startHourUtc: z.number().int().min(0).max(23),
      endHourUtc: z.number().int().min(0).max(23)
    })
    .optional()
});

const profilePatchSchema = z
  .object({
    title: z.string().min(1).max(120).optional(),
    handle: z.string().min(1).max(80).optional(),
    bio: z.string().max(280).optional(),
    avatarUrl: z.url().or(z.literal("")).optional()
  })
  .strict();

const themePatchSchema = z
  .object({
    bg: z.string().regex(/^#[a-fA-F0-9]{6}$/).optional(),
    fg: z.string().regex(/^#[a-fA-F0-9]{6}$/).optional(),
    accent: z.string().regex(/^#[a-fA-F0-9]{6}$/).optional(),
    card: z.string().regex(/^#[a-fA-F0-9]{6}$/).optional()
  })
  .strict();

function pickTargetUrl(target: Link, ua: string, hourUtc: number) {
  const inSchedule =
    !target.schedule ||
    (target.schedule.startHourUtc <= target.schedule.endHourUtc
      ? hourUtc >= target.schedule.startHourUtc && hourUtc < target.schedule.endHourUtc
      : hourUtc >= target.schedule.startHourUtc || hourUtc < target.schedule.endHourUtc);

  if (!inSchedule) {
    return target.url;
  }

  if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua) && target.mobileUrl) {
    return target.mobileUrl;
  }

  if (!/Android|iPhone|iPad|iPod|Mobile/i.test(ua) && target.desktopUrl) {
    return target.desktopUrl;
  }

  return target.url;
}

export async function createApp(options?: { storePath?: string; adminToken?: string }) {
  const store = new Store(options?.storePath ?? path.resolve("data", "store.json"));
  await store.init();

  const app = new Hono();

  app.get("/", (c) => {
    const data = store.snapshot();
    return c.html(renderHome(data.profile, data.theme, data.links));
  });

  app.get("/admin", (c) => c.html(renderAdmin()));

  app.get("/api/profile", (c) => {
    const data = store.snapshot();
    return c.json({
      profile: data.profile,
      theme: data.theme,
      links: data.links
    });
  });

  app.get("/api/analytics", (c) => c.json(store.analytics()));

  app.get("/go/:id", async (c) => {
    const linkId = c.req.param("id");
    const data = store.snapshot();
    const target = data.links.find((entry) => entry.id === linkId && entry.active);

    if (!target) {
      return c.text("Link not found", 404);
    }

    const ua = c.req.header("user-agent") ?? "";
    const chosenUrl = pickTargetUrl(target, ua, new Date().getUTCHours());

    await store.recordClick(linkId, chosenUrl, c.req.header("referer") ?? "", ua);
    return c.redirect(chosenUrl, 302);
  });

  app.use("/api/admin/*", async (c, next) => {
    const token = c.req.header("x-admin-token");

    if (token !== (options?.adminToken ?? process.env.ADMIN_TOKEN ?? "change-me")) {
      return c.text("unauthorized", 401);
    }

    await next();
  });

  app.post("/api/admin/profile", async (c) => {
    const payload = profilePatchSchema.parse(await c.req.json());
    await store.setProfile(payload);
    return c.json({ ok: true });
  });

  app.post("/api/admin/theme", async (c) => {
    const payload = themePatchSchema.parse(await c.req.json());
    await store.setTheme(payload);
    return c.json({ ok: true });
  });

  app.post("/api/admin/link", async (c) => {
    const payload = linkSchema.parse(await c.req.json());
    await store.upsertLink(payload);
    return c.json({ ok: true });
  });

  app.delete("/api/admin/links/:id", async (c) => {
    await store.removeLink(c.req.param("id"));
    return c.body(null, 204);
  });

  return app;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const app = await createApp();
  const port = Number(process.env.PORT || "8787");

  serve({ fetch: app.fetch, port }, (info) => {
    console.log(`OpenLinkHub listening on http://localhost:${info.port}`);
  });
}
