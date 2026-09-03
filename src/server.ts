import { Hono } from "hono";
import { serve } from "@hono/node-server";
import QRCode from "qrcode";
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
  slug: z.string().regex(/^[a-z0-9-]{2,40}$/).optional(),
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

function pickTargetUrl(link: Link, userAgent: string, hourUtc: number) {
  const inSchedule =
    !link.schedule ||
    (link.schedule.startHourUtc <= link.schedule.endHourUtc
      ? hourUtc >= link.schedule.startHourUtc && hourUtc < link.schedule.endHourUtc
      : hourUtc >= link.schedule.startHourUtc || hourUtc < link.schedule.endHourUtc);

  if (!inSchedule) {
    return link.url;
  }

  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent);

  if (mobile && link.mobileUrl) {
    return link.mobileUrl;
  }

  if (!mobile && link.desktopUrl) {
    return link.desktopUrl;
  }

  return link.url;
}

function toCsvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function analyticsCsv(store: Store) {
  const report = store.analytics();
  const rows = [
    ["link_id", "title", "slug", "clicks"],
    ...report.links.map((entry) => [entry.linkId, entry.title, entry.slug, entry.clicks]),
    ["", "", "total", report.totalClicks]
  ];

  return `${rows.map((row) => row.map((value) => toCsvCell(value)).join(",")).join("\n")}\n`;
}

export async function createApp(options?: { storePath?: string; adminToken?: string; publicBaseUrl?: string }) {
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

  app.get("/api/analytics.csv", (c) => {
    c.header("content-type", "text/csv; charset=utf-8");
    c.header("content-disposition", "attachment; filename=analytics.csv");
    return c.body(analyticsCsv(store));
  });

  app.get("/api/qr/:id", async (c) => {
    const link = store.findActiveById(c.req.param("id"));

    if (!link) {
      return c.text("Link not found", 404);
    }

    const origin = options?.publicBaseUrl ?? process.env.PUBLIC_BASE_URL ?? new URL(c.req.url).origin;
    const destination = link.slug ? `${origin}/s/${link.slug}` : `${origin}/go/${encodeURIComponent(link.id)}`;
    const svg = await QRCode.toString(destination, { type: "svg", margin: 1, width: 320 });

    c.header("content-type", "image/svg+xml; charset=utf-8");
    return c.body(svg);
  });

  app.get("/go/:id", async (c) => {
    const link = store.findActiveById(c.req.param("id"));

    if (!link) {
      return c.text("Link not found", 404);
    }

    const userAgent = c.req.header("user-agent") ?? "";
    const targetUrl = pickTargetUrl(link, userAgent, new Date().getUTCHours());

    await store.recordClick(link.id, targetUrl, c.req.header("referer") ?? "", userAgent);
    return c.redirect(targetUrl, 302);
  });

  app.get("/s/:slug", async (c) => {
    const link = store.findActiveBySlug(c.req.param("slug"));

    if (!link) {
      return c.text("Link not found", 404);
    }

    const userAgent = c.req.header("user-agent") ?? "";
    const targetUrl = pickTargetUrl(link, userAgent, new Date().getUTCHours());

    await store.recordClick(link.id, targetUrl, c.req.header("referer") ?? "", userAgent);
    return c.redirect(targetUrl, 302);
  });

  app.use("/api/admin/*", async (c, next) => {
    if ((c.req.header("x-admin-token") ?? "") !== (options?.adminToken ?? process.env.ADMIN_TOKEN ?? "change-me")) {
      return c.text("unauthorized", 401);
    }

    await next();
  });

  app.post("/api/admin/profile", async (c) => {
    await store.setProfile(profilePatchSchema.parse(await c.req.json()));
    return c.json({ ok: true });
  });

  app.post("/api/admin/theme", async (c) => {
    await store.setTheme(themePatchSchema.parse(await c.req.json()));
    return c.json({ ok: true });
  });

  app.post("/api/admin/link", async (c) => {
    const payload = linkSchema.parse(await c.req.json());

    if (payload.slug && store.hasConflictingSlug(payload.slug, payload.id)) {
      return c.json({ error: "slug already used" }, 409);
    }

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
    console.log(`LinkGrove listening on http://localhost:${info.port}`);
  });
}
