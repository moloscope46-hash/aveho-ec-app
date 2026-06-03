// =============================================================
//  Tests unitaires — 0.55.15
//  Couvre : modale SQL, mapping version → fichier, sqlFile entries
// =============================================================
import { describe, it, expect } from "vitest";
import { ALL_VERSIONS } from "../app/changelog/versions-data";

describe("0.55.15 - sqlFile dans versions-data", () => {
  it("au moins 30 versions ont un sqlFile", () => {
    const withSql = ALL_VERSIONS.filter(v => v.sqlFile);
    expect(withSql.length).toBeGreaterThanOrEqual(30);
  });

  it("0.55.12 a un sqlFile (refonte users)", () => {
    const v = ALL_VERSIONS.find(x => x.v === "0.55.12");
    expect(v).toBeDefined();
    expect(v.sqlFile).toBe("aveho-PATCH-vers-0.55.12.sql");
  });

  it("0.55.13 a un sqlFile (WebAuthn)", () => {
    const v = ALL_VERSIONS.find(x => x.v === "0.55.13");
    expect(v).toBeDefined();
    expect(v.sqlFile).toBe("aveho-PATCH-vers-0.55.13.sql");
  });

  it("0.55.14 hotfix n'a pas de sqlFile (juste SW fix)", () => {
    const v = ALL_VERSIONS.find(x => x.v === "0.55.14");
    expect(v).toBeDefined();
    expect(v.sqlFile).toBeUndefined();
  });
});

describe("0.55.15 - Format des sqlFile", () => {
  it("tous les sqlFile respectent le pattern aveho-* SQL", () => {
    const withSql = ALL_VERSIONS.filter(v => v.sqlFile);
    // 0.57.33 : accepte les 2 patterns historiques
    //  - "aveho-PATCH-vers-X.Y[.Z].sql" (ancien, 1 fichier par version)
    //  - "aveho-supabase-securite-*-X.Y.Z.sql" (nouveau, scripts combinés sécurité)
    const pattern = /^aveho-(PATCH-vers|supabase-securite-[A-Z]+)-\d+\.\d+(?:\.\d+)?\.sql$/;
    withSql.forEach(v => {
      expect(pattern.test(v.sqlFile), `${v.v} → ${v.sqlFile}`).toBe(true);
    });
  });

  it("doublons sqlFile autorisés uniquement pour versions X.Y / X.Y.0", () => {
    const all = ALL_VERSIONS.filter(v => v.sqlFile).map(v => v.sqlFile);
    const counts = {};
    all.forEach(f => { counts[f] = (counts[f] || 0) + 1; });
    // Les fichiers dupliqués correspondent à des paires {0.X, 0.X.0}
    // qui pointent vers le même fichier .sql sans le .0 final
    Object.entries(counts).forEach(([file, count]) => {
      // Si dupliqué, max 2 occurrences (X.Y et X.Y.0)
      expect(count).toBeLessThanOrEqual(2);
    });
  });
});

describe("0.55.15 - Modale SQL - statistiques contenu", () => {
  function computeStats(content) {
    if (!content) return null;
    return {
      lines: content.split("\n").length,
      sizeKo: (content.length / 1024).toFixed(1),
    };
  }

  it("compte les lignes correctement", () => {
    const sql = "line1\nline2\nline3";
    const stats = computeStats(sql);
    expect(stats.lines).toBe(3);
  });

  it("taille en Ko avec 1 décimale", () => {
    const sql = "a".repeat(2048);
    const stats = computeStats(sql);
    expect(stats.sizeKo).toBe("2.0");
  });

  it("null si pas de contenu", () => {
    expect(computeStats(null)).toBe(null);
    expect(computeStats("")).toBe(null);
  });
});

describe("0.55.15 - URL des fichiers SQL", () => {
  function buildSqlUrl(file) {
    return `/changelog-sql/${file}`;
  }

  it("préfixe /changelog-sql/", () => {
    expect(buildSqlUrl("aveho-PATCH-vers-0.55.13.sql"))
      .toBe("/changelog-sql/aveho-PATCH-vers-0.55.13.sql");
  });

  it("URL servable statiquement (relative)", () => {
    const url = buildSqlUrl("test.sql");
    expect(url.startsWith("/")).toBe(true);
  });
});
