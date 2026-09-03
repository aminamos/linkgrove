import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createApp, type LinkHubApp } from "../src/server.js";

async function withTempApp(run: (input: { app: LinkHubApp }) => Promise<void>) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "openlinkhub-test-"));
  try {
    const app = await createApp({ storePath: path.join(dir, "store.json"), adminToken: "token" });
    await run({ app });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("loads profile and links", async () => {
  await withTempApp(async ({ app }) => {
    const res = await app.request("/api/profile");
    assert.equal(res.status, 200);

    const body = (await res.json()) as {
      profile: { title: string };
      links: unknown[];
    };

    assert.equal(body.profile.title, "Amin Amos");
    assert.ok(body.links.length > 0);
  });
});

test("blocks admin writes without token", async () => {
  await withTempApp(async ({ app }) => {
    const res = await app.request("/api/admin/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Nope" })
    });

    assert.equal(res.status, 401);
  });
});

test("redirects with mobile override and records click", async () => {
  await withTempApp(async ({ app }) => {
    const createRes = await app.request("/api/admin/link", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-admin-token": "token"
      },
      body: JSON.stringify({
        id: "site",
        title: "Site",
        url: "https://example.com/desktop",
        description: "Main",
        icon: "🌐",
        order: 0,
        active: true,
        mobileUrl: "https://example.com/mobile"
      })
    });

    assert.equal(createRes.status, 200);

    const redirectRes = await app.request("/go/site", {
      headers: { "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)" }
    });

    assert.equal(redirectRes.status, 302);
    assert.equal(redirectRes.headers.get("location"), "https://example.com/mobile");

    const analytics = await app.request("/api/analytics");
    const analyticsBody = (await analytics.json()) as { totalClicks: number };
    assert.ok(analyticsBody.totalClicks > 0);
  });
});
