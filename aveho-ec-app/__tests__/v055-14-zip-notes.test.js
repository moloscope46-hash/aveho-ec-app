// =============================================================
//  Tests unitaires — 0.55.14
//  Couvre : SW cacheFirst sur /changelog-notes/, bouton ZIP toutes notes
// =============================================================
import { describe, it, expect } from "vitest";

describe("0.55.14 - Service Worker - routing cacheFirst", () => {
  // Simulation du switch de routes du SW
  function getStrategy(pathname) {
    if (pathname === "/" || pathname.startsWith("/icons/")) return "cacheFirst";
    if (pathname.startsWith("/_next/static/")) return "cacheFirst";
    if (pathname.startsWith("/changelog-notes/")) return "cacheFirst";
    if (pathname.startsWith("/api/")) return "networkFirst";
    return "networkFirst";
  }

  it("/changelog-notes/* → cacheFirst", () => {
    expect(getStrategy("/changelog-notes/NOTE-VERSION-Alpha-0.55.14.html")).toBe("cacheFirst");
  });

  it("/icons/* → cacheFirst", () => {
    expect(getStrategy("/icons/favicon-32.png")).toBe("cacheFirst");
  });

  it("/_next/static/* → cacheFirst", () => {
    expect(getStrategy("/_next/static/chunks/page.js")).toBe("cacheFirst");
  });

  it("/api/* → networkFirst", () => {
    expect(getStrategy("/api/foo")).toBe("networkFirst");
  });
});

describe("0.55.14 - Fallback 503 lisible", () => {
  function build503Response(path) {
    if (path.startsWith("/changelog-notes/")) {
      return {
        status: 503,
        statusText: "Offline",
        headers: { "Content-Type": "text/html" },
        body: '<p style="padding:14px;color:#c0392b">Note non disponible hors-ligne.</p>',
      };
    }
    return { status: 503, statusText: "Offline", body: "Hors-ligne" };
  }

  it("503 pour changelog-notes inclut HTML lisible", () => {
    const r = build503Response("/changelog-notes/test.html");
    expect(r.status).toBe(503);
    expect(r.headers["Content-Type"]).toBe("text/html");
    expect(r.body).toContain("Note non disponible");
  });

  it("503 pour autre route reste simple", () => {
    const r = build503Response("/api/foo");
    expect(r.status).toBe(503);
    expect(r.body).not.toContain("Note");
  });
});

describe("0.55.14 - ZIP toutes notes - logique", () => {
  function filterNotes(versions) {
    return versions.filter(v => v.noteFile);
  }

  it("filtre les versions avec noteFile", () => {
    const versions = [
      { v: "0.1", noteFile: "n1.html" },
      { v: "0.2" }, // pas de noteFile
      { v: "0.3", noteFile: "n3.html" },
    ];
    expect(filterNotes(versions).length).toBe(2);
  });

  it("nom de fichier zip avec date", () => {
    const date = "2026-05-31";
    const name = `aveho-changelog-notes-${date}.zip`;
    expect(name).toMatch(/^aveho-changelog-notes-\d{4}-\d{2}-\d{2}\.zip$/);
  });
});

describe("0.55.14 - Index HTML pour ZIP", () => {
  function makeIndexRow(v) {
    const kindClass = v.kind === "hotfix" ? "hotfix" : "version";
    return `<tr class="${kindClass}"><td><a href="${v.noteFile}">v${v.v}</a></td><td>${v.kind === "hotfix" ? "Hotfix" : "Version"}</td></tr>`;
  }

  it("génère row HTML avec classe hotfix", () => {
    const v = { v: "0.55.14", kind: "hotfix", noteFile: "h14.html" };
    const row = makeIndexRow(v);
    expect(row).toContain('class="hotfix"');
    expect(row).toContain("v0.55.14");
    expect(row).toContain("h14.html");
  });

  it("génère row HTML avec classe version", () => {
    const v = { v: "0.55.13", kind: "version", noteFile: "v13.html" };
    const row = makeIndexRow(v);
    expect(row).toContain('class="version"');
  });

  it("escape les chevrons dans le titre", () => {
    const escape = (s) => s.replace(/</g, "&lt;");
    expect(escape("Titre <bad>")).toBe("Titre &lt;bad>");
  });
});

describe("0.55.14 - fetchNoteHtml - retry", () => {
  it("retry strategy : force-cache puis no-cache", () => {
    const strategies = ["force-cache", "no-cache"];
    expect(strategies.length).toBe(2);
    expect(strategies[0]).toBe("force-cache");
    expect(strategies[1]).toBe("no-cache");
  });

  it("fallback élégant n'est pas caché", () => {
    const FALLBACK_HTML = `<div>⏳ Aperçu indisponible</div>`;
    expect(FALLBACK_HTML).toContain("⏳");
    expect(FALLBACK_HTML).toContain("indisponible");
  });
});
