"use client";
// =============================================================
//  /collaborateurs-fournisseurs — Liste des users magasin (0.60.2)
//  Côté EC : voir tous les utilisateurs taggés "Utilisateur Magasin"
//  avec leur magasin de rattachement
// =============================================================
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, Btn } from "../ui";
import BackButton from "../components/BackButton";

export default function CollabFournisseursPage() {
  const router = useRouter();
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const [users, setUsers] = useState([]);
  const [magasins, setMagasins] = useState([]);
  const [etabs, setEtabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!auth.ready || !auth.structureId) return;
    reload();
  }, [auth.ready, auth.structureId]);

  async function reload() {
    setLoading(true);
    const tryFetch = async (q) => { try { const r = await q; return r.data || []; } catch { return []; } };
    const [usersData, magsData, etabsData] = await Promise.all([
      tryFetch(supabase.from("membres_structure")
        .select("user_id, prenom, nom, email, telephone, role_professionnel, magasin_fournisseur_id, photo_url, created_at")
        .eq("structure_id", auth.structureId)
        .eq("role_professionnel", "utilisateur_magasin")
        .order("nom")),
      tryFetch(supabase.from("magasins").select("id, nom, ville, code_postal, code, etablissement_rattache_id, actif").eq("structure_id", auth.structureId)),
      tryFetch(supabase.from("etablissements").select("id, nom, ville").eq("structure_id", auth.structureId)),
    ]);
    setUsers(usersData);
    setMagasins(magsData);
    setEtabs(etabsData);
    setLoading(false);
  }

  const filtered = users.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (u.nom || "").toLowerCase().includes(q) || (u.prenom || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q);
  });

  return (
    <div className="page-shell">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="page-content">
        <BackButton />
        <PageHead icon="ti-users" title="Collaborateurs fournisseurs" subtitle={`Utilisateurs tagués "Magasin Aveho" et leur entité de rattachement (${users.length})`} />

        <Panel>
          <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
            <input
              type="search" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 Rechercher par nom ou email..."
              style={{ flex: 1, minWidth: 240, padding: "8px 12px", border: "1px solid #cfd8e0", borderRadius: 8, fontFamily: "inherit", fontSize: 13 }}
            />
            <Btn variant="primary" icon="ti-plus" onClick={() => router.push("/collaborateurs")}>Créer un user magasin</Btn>
          </div>

          {loading ? (
            <div style={{ padding: 30, textAlign: "center" }}>Chargement...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#8a98a8" }}>
              <i className="ti ti-users-off" style={{ fontSize: 48, color: "#e3e9ee", display: "block", marginBottom: 10 }} />
              {search ? `Aucun user magasin trouvé pour "${search}"` : "Aucun utilisateur tagué Magasin Aveho."}
              <div style={{ fontSize: 12, marginTop: 8 }}>
                {!search && <>Va dans <a href="/collaborateurs" style={{ color: "#5a8f8f" }}>Collaborateurs</a> et assigne le rôle "🏬 Utilisateur Magasin" à un user.</>}
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,340px))", gap: 12, justifyContent: "start" }}>
              {filtered.map(u => {
                const magasin = magasins.find(m => m.id === u.magasin_fournisseur_id);
                const etab = magasin ? etabs.find(e => e.id === magasin.etablissement_rattache_id) : null;
                const isRattache = !!magasin;
                return (
                  <div key={u.user_id} onClick={() => router.push(`/collaborateurs?edit=${u.user_id}`)} style={{
                    background: "#fff",
                    border: isRattache ? "2px solid #5a8f8f" : "1px solid #EF9F2755",
                    borderLeft: `4px solid ${isRattache ? "#5a8f8f" : "#EF9F27"}`,
                    borderRadius: 12, padding: 14, cursor: "pointer",
                  }}>
                    {/* Header user */}
                    <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                      <div style={{ width: 44, height: 44, background: "rgba(94,143,143,.22)", color: "#5a8f8f", borderRadius: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, overflow: "hidden" }}>
                        {u.photo_url ? <img src={u.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (
                          (u.prenom || u.email || "?")[0].toUpperCase() + (u.nom?.[0] || "").toUpperCase()
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, color: "#142131", fontSize: 14 }}>
                          {u.prenom} {u.nom || <span style={{ color: "#8a98a8", fontWeight: 500 }}>{u.email}</span>}
                        </div>
                        <div style={{ fontSize: 11, color: "#5a6878", display: "flex", alignItems: "center", gap: 4 }}>
                          <i className="ti ti-building-warehouse" style={{ color: "#5a8f8f" }} /> Utilisateur Magasin
                        </div>
                      </div>
                    </div>

                    {/* Magasin rattaché */}
                    {magasin ? (
                      <div style={{ padding: 10, background: "rgba(94,143,143,.10)", borderRadius: 8, borderLeft: "3px solid #5a8f8f" }}>
                        <div style={{ fontSize: 11, color: "#5a8f8f", textTransform: "uppercase", fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>
                          🏬 Magasin rattaché
                        </div>
                        <div style={{ fontWeight: 700, color: "#142131", fontSize: 13 }}>{magasin.nom}</div>
                        {magasin.code && <div style={{ fontFamily: "Consolas,monospace", fontSize: 10.5, color: "#8a98a8" }}>{magasin.code}</div>}
                        {magasin.ville && <div style={{ fontSize: 11, color: "#5a6878" }}>{magasin.ville}{magasin.code_postal && ` · ${magasin.code_postal}`}</div>}
                        {/* Agence rattachée */}
                        {etab ? (
                          <div style={{ marginTop: 6, padding: "4px 8px", background: "rgba(24,95,165,.10)", borderRadius: 4, fontSize: 11, color: "#185FA5" }}>
                            <i className="ti ti-link" /> Agence : <b>{etab.nom}</b>
                          </div>
                        ) : (
                          <div style={{ marginTop: 6, padding: "4px 8px", background: "rgba(239,159,39,.10)", borderRadius: 4, fontSize: 11, color: "#d48820", fontStyle: "italic" }}>
                            ⚠ Magasin pas encore rattaché à une agence
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ padding: 10, background: "rgba(239,159,39,.10)", borderRadius: 8, borderLeft: "3px solid #EF9F27", fontSize: 12, color: "#d48820" }}>
                        ⚠ Pas de magasin rattaché.<br/>
                        <span style={{ fontSize: 10.5 }}>Édite ce user pour lui assigner un magasin.</span>
                      </div>
                    )}

                    {/* Contact */}
                    {(u.email || u.telephone) && (
                      <div style={{ marginTop: 8, fontSize: 11, color: "#5a6878" }}>
                        {u.email && <div><i className="ti ti-mail" /> {u.email}</div>}
                        {u.telephone && <div><i className="ti ti-phone" /> {u.telephone}</div>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        {/* Stats globales */}
        <Panel style={{ marginTop: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 220px))", gap: 10, justifyContent: "start" }}>
            <StatTile icon="ti-users" color="#5a8f8f" lbl="Users magasin" val={users.length} />
            <StatTile icon="ti-link" color="#5aa05a" lbl="Rattachés" val={users.filter(u => u.magasin_fournisseur_id).length} />
            <StatTile icon="ti-alert-triangle" color="#EF9F27" lbl="Sans magasin" val={users.filter(u => !u.magasin_fournisseur_id).length} />
            <StatTile icon="ti-building-warehouse" color="#185FA5" lbl="Magasins définis" val={magasins.length} />
          </div>
        </Panel>
      </div>
    </div>
  );
}

function StatTile({ icon, color, lbl, val }) {
  return (
    <div style={{
      background: "#fff", border: `1px solid ${color}33`, borderLeft: `4px solid ${color}`,
      borderRadius: 10, padding: 14,
      display: "flex", alignItems: "center", gap: 10,
    }}>
      <i className={`ti ${icon}`} style={{ color, fontSize: 26 }} />
      <div>
        <div style={{ fontSize: 10.5, color, textTransform: "uppercase", fontWeight: 700, letterSpacing: 1 }}>{lbl}</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#142131", fontFamily: "Consolas,monospace" }}>{val}</div>
      </div>
    </div>
  );
}
