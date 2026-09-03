import type { Link, Profile, Theme } from "./store.js";

function esc(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderHome(profile: Profile, theme: Theme, links: Link[]) {
  const cards = links
    .filter((entry) => entry.active)
    .sort((left, right) => left.order - right.order)
    .map(
      (entry) => `
      <a class="link-card" href="${entry.slug ? `/s/${encodeURIComponent(entry.slug)}` : `/go/${encodeURIComponent(entry.id)}`}" rel="noopener noreferrer">
        <div class="icon">${esc(entry.icon || "↗")}</div>
        <div>
          <div class="title">${esc(entry.title)}</div>
          <div class="desc">${esc(entry.description || "")}</div>
        </div>
      </a>`
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${esc(profile.title)}</title>
  <style>
    :root {
      --bg: ${esc(theme.bg)};
      --fg: ${esc(theme.fg)};
      --accent: ${esc(theme.accent)};
      --card: ${esc(theme.card)};
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      background: radial-gradient(circle at top, color-mix(in srgb, var(--accent), var(--bg) 75%), var(--bg));
      color: var(--fg);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 24px;
    }
    main {
      width: min(760px, 100%);
      display: grid;
      gap: 16px;
    }
    .profile {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 14px;
      align-items: center;
      padding: 16px;
      border-radius: 14px;
      background: color-mix(in srgb, var(--card), black 15%);
      border: 1px solid color-mix(in srgb, var(--accent), transparent 82%);
    }
    .avatar {
      width: 58px;
      height: 58px;
      border-radius: 999px;
      object-fit: cover;
      border: 2px solid color-mix(in srgb, var(--accent), white 35%);
      background: color-mix(in srgb, var(--card), white 9%);
    }
    .handle { opacity: .8; font-size: 14px; margin-top: 2px; }
    .bio { opacity: .9; font-size: 14px; margin-top: 6px; }
    .links { display: grid; gap: 10px; }
    .link-card {
      background: color-mix(in srgb, var(--card), black 5%);
      border: 1px solid color-mix(in srgb, var(--accent), transparent 85%);
      border-radius: 14px;
      color: inherit;
      text-decoration: none;
      display: grid;
      grid-template-columns: 40px 1fr;
      gap: 10px;
      padding: 14px;
      transition: transform .12s ease, border-color .12s ease;
    }
    .link-card:hover {
      transform: translateY(-1px);
      border-color: color-mix(in srgb, var(--accent), transparent 55%);
    }
    .icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: grid;
      place-items: center;
      background: color-mix(in srgb, var(--accent), var(--card) 80%);
      font-size: 20px;
    }
    .title { font-size: 16px; font-weight: 600; }
    .desc { font-size: 13px; opacity: .8; margin-top: 2px; }
    .footer { font-size: 12px; opacity: .65; text-align: center; margin-top: 8px; }
  </style>
</head>
<body>
  <main>
    <section class="profile">
      ${profile.avatarUrl ? `<img class="avatar" src="${esc(profile.avatarUrl)}" alt="avatar"/>` : '<div class="avatar"></div>'}
      <div>
        <div style="font-size:22px;font-weight:650;line-height:1.1">${esc(profile.title)}</div>
        <div class="handle">${esc(profile.handle)}</div>
        <div class="bio">${esc(profile.bio)}</div>
      </div>
    </section>
    <section class="links">${cards}</section>
    <div class="footer">Powered by OpenLinkHub · self-hosted</div>
  </main>
</body>
</html>`;
}

export function renderAdmin() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>OpenLinkHub Admin</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #0b1020;
      color: #f8fafc;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
      padding: 18px;
    }
    .wrap { max-width: 1080px; margin: 0 auto; display: grid; gap: 14px; }
    .panel {
      background: #121931;
      border: 1px solid #1e2a52;
      border-radius: 12px;
      padding: 12px;
    }
    .row { display: grid; gap: 8px; margin-bottom: 8px; }
    .row.two { grid-template-columns: repeat(2, minmax(0,1fr)); }
    .row.four { grid-template-columns: repeat(4, minmax(0,1fr)); }
    input, textarea, button {
      width: 100%;
      background: #0f162c;
      border: 1px solid #2a3868;
      color: #f8fafc;
      border-radius: 8px;
      padding: 10px;
      font: inherit;
    }
    button { cursor: pointer; background: #19316e; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { border-bottom: 1px solid #27365f; text-align: left; padding: 8px 6px; vertical-align: top; }
    .hint { opacity: .75; font-size: 13px; }
    .top { display: grid; grid-template-columns: 1fr auto; align-items: end; gap: 8px; }
    .pill { display:inline-block; padding:2px 8px; border-radius:999px; background:#172449; font-size:12px; }
    .actions { display:flex; gap:8px; flex-wrap:wrap; }
    .actions a { color:#7dd3fc; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="top">
      <h1 style="margin:0">OpenLinkHub Admin</h1>
      <div class="actions">
        <a href="/" style="color:#7dd3fc">View page</a>
        <a href="/api/analytics.csv" style="color:#7dd3fc">Download analytics CSV</a>
      </div>
    </div>
    <div class="panel">
      <div class="row"><label>Admin token</label><input id="token" placeholder="x-admin-token"/></div>
      <div class="hint">Token lives in ADMIN_TOKEN env var. Keep this page private.</div>
    </div>

    <div class="panel">
      <h2 style="margin-top:0">Profile</h2>
      <div class="row two">
        <input id="profileTitle" placeholder="Title" />
        <input id="profileHandle" placeholder="@handle" />
      </div>
      <div class="row"><textarea id="profileBio" placeholder="Bio" rows="3"></textarea></div>
      <div class="row"><input id="profileAvatar" placeholder="Avatar URL" /></div>
      <button id="saveProfile">Save profile</button>
    </div>

    <div class="panel">
      <h2 style="margin-top:0">Theme</h2>
      <div class="row four">
        <input id="themeBg" placeholder="#0b1020" />
        <input id="themeFg" placeholder="#f8fafc" />
        <input id="themeAccent" placeholder="#7dd3fc" />
        <input id="themeCard" placeholder="#111827" />
      </div>
      <button id="saveTheme">Save theme</button>
    </div>

    <div class="panel">
      <h2 style="margin-top:0">Link</h2>
      <div class="row four">
        <input id="linkId" placeholder="id (stable key)" />
        <input id="linkSlug" placeholder="short slug (optional)" />
        <input id="linkTitle" placeholder="Title" />
        <input id="linkIcon" placeholder="Icon" />
      </div>
      <div class="row two">
        <input id="linkUrl" placeholder="Default URL" />
        <input id="linkDescription" placeholder="Description" />
      </div>
      <div class="row four">
        <input id="linkOrder" type="number" placeholder="Order" />
        <input id="linkMobile" placeholder="Mobile URL (optional)" />
        <input id="linkDesktop" placeholder="Desktop URL (optional)" />
        <label style="display:flex;align-items:center;gap:8px"><input id="linkActive" type="checkbox" checked style="width:auto"/> Active</label>
      </div>
      <div class="row two">
        <input id="linkStart" type="number" placeholder="UTC start hour (0-23)" />
        <input id="linkEnd" type="number" placeholder="UTC end hour (0-23)" />
      </div>
      <div class="hint">Slug pattern: lowercase letters, digits, dashes.</div>
      <button id="saveLink">Upsert link</button>
    </div>

    <div class="panel">
      <h2 style="margin-top:0">Current links</h2>
      <table>
        <thead><tr><th>ID</th><th>Slug</th><th>Title</th><th>Clicks</th><th>Actions</th><th></th></tr></thead>
        <tbody id="linksTable"></tbody>
      </table>
    </div>

    <div class="panel">
      <h2 style="margin-top:0">Analytics</h2>
      <div id="analytics"></div>
    </div>
  </div>

<script>
const api = async (path, opts = {}) => {
  const token = document.getElementById('token').value.trim();
  const headers = { 'content-type': 'application/json', ...(opts.headers || {}) };
  if (token) headers['x-admin-token'] = token;
  const res = await fetch(path, { ...opts, headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || res.statusText);
  }
  return res.status === 204 ? null : res.json();
};

const clicksById = (analytics) => {
  const table = {};
  for (const entry of analytics.links) {
    table[entry.linkId] = entry.clicks;
  }
  return table;
};

const load = async () => {
  const profileData = await api('/api/profile');
  const analyticsData = await api('/api/analytics');
  const clickLookup = clicksById(analyticsData);

  profileTitle.value = profileData.profile.title;
  profileHandle.value = profileData.profile.handle;
  profileBio.value = profileData.profile.bio;
  profileAvatar.value = profileData.profile.avatarUrl;
  themeBg.value = profileData.theme.bg;
  themeFg.value = profileData.theme.fg;
  themeAccent.value = profileData.theme.accent;
  themeCard.value = profileData.theme.card;

  linksTable.innerHTML = '';
  for (const link of profileData.links) {
    const actionUrl = link.slug ? '/s/' + encodeURIComponent(link.slug) : '/go/' + encodeURIComponent(link.id);
    const qrUrl = '/api/qr/' + encodeURIComponent(link.id);
    const row = document.createElement('tr');
    row.innerHTML = '<td><span class="pill">' + link.id + '</span></td>' +
      '<td>' + (link.slug || '') + '</td>' +
      '<td>' + link.title + '</td>' +
      '<td>' + (clickLookup[link.id] || 0) + '</td>' +
      '<td><a href="' + actionUrl + '" target="_blank" style="color:#7dd3fc">Open</a> · <a href="' + qrUrl + '" target="_blank" style="color:#7dd3fc">QR</a></td>' +
      '<td><button data-id="' + link.id + '">Delete</button></td>';

    row.querySelector('button').onclick = async () => {
      await api('/api/admin/links/' + encodeURIComponent(link.id), { method: 'DELETE' });
      await load();
    };

    linksTable.appendChild(row);
  }

  document.getElementById('analytics').innerHTML = '<div>Total clicks: ' + analyticsData.totalClicks + '</div>' +
    analyticsData.links.map((x) => '<div>' + x.title + ' (' + x.linkId + (x.slug ? ' / ' + x.slug : '') + '): ' + x.clicks + '</div>').join('');
};

saveProfile.onclick = async () => {
  await api('/api/admin/profile', {
    method: 'POST',
    body: JSON.stringify({ title: profileTitle.value, handle: profileHandle.value, bio: profileBio.value, avatarUrl: profileAvatar.value })
  });
  await load();
};

saveTheme.onclick = async () => {
  await api('/api/admin/theme', {
    method: 'POST',
    body: JSON.stringify({ bg: themeBg.value, fg: themeFg.value, accent: themeAccent.value, card: themeCard.value })
  });
  await load();
};

saveLink.onclick = async () => {
  const schedule = linkStart.value === '' || linkEnd.value === ''
    ? undefined
    : { startHourUtc: Number(linkStart.value), endHourUtc: Number(linkEnd.value) };

  await api('/api/admin/link', {
    method: 'POST',
    body: JSON.stringify({
      id: linkId.value,
      slug: linkSlug.value || undefined,
      title: linkTitle.value,
      url: linkUrl.value,
      description: linkDescription.value,
      icon: linkIcon.value,
      order: Number(linkOrder.value || 0),
      active: linkActive.checked,
      mobileUrl: linkMobile.value || undefined,
      desktopUrl: linkDesktop.value || undefined,
      schedule
    })
  });
  await load();
};

window.addEventListener('load', () => {
  load().catch((err) => alert(err.message));
});
</script>
</body>
</html>`;
}
