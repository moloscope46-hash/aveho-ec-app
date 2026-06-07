"use client";
// =============================================================
//  MarketplaceChat — Chat temps réel marketplace (0.62.0)
//  Utilise Supabase Realtime channels pour live messaging
// =============================================================
import { useEffect, useState, useRef } from "react";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";

export function MarketplaceChat({ offre, magasinId, onClose }) {
  const supabase = createClient();
  const auth = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!offre?.id) return;

    // Charger l'historique
    (async () => {
      const r = await supabase.from("marketplace_messages")
        .select("*")
        .eq("offre_id", offre.id)
        .order("created_at");
      setMessages(r.data || []);
    })();

    // Subscribe Realtime channel
    const channel = supabase.channel(`mkt-chat-${offre.id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "marketplace_messages",
        filter: `offre_id=eq.${offre.id}`,
      }, (payload) => {
        setMessages((prev) => {
          if (prev.find(m => m.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });
      })
      .subscribe((status) => setConnected(status === "SUBSCRIBED"));

    return () => { supabase.removeChannel(channel); };
  }, [offre?.id]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  async function send() {
    if (!newMsg.trim()) return;
    setSending(true);
    try {
      await supabase.from("marketplace_messages").insert({
        offre_id: offre.id,
        user_id: auth.user?.id,
        magasin_id: magasinId,
        message: newMsg.trim(),
      });
      // 0.62.4 : Notif push à l'AUTRE partie (émetteur si je suis répondeur, ou inverse)
      try {
        const autreMagasinId = offre.magasin_emetteur_id === magasinId
          ? offre.magasin_repondeur_id
          : offre.magasin_emetteur_id;
        if (autreMagasinId) {
          const membres = await supabase.from("membres_structure")
            .select("user_id")
            .eq("magasin_fournisseur_id", autreMagasinId);
          const notifs = (membres.data || []).map(m => ({
            user_id: m.user_id,
            type: "marketplace_message",
            titre: `💬 Nouveau message marketplace`,
            message: `Sur l'offre "${offre.libelle?.slice(0, 50)}" : ${newMsg.trim().slice(0, 100)}`,
            url: `/magasin/marketplace?offre=${offre.id}`,
            lue: false,
          }));
          if (notifs.length > 0) await supabase.from("notifications").insert(notifs);
        }
      } catch (e) { console.warn("[notif marketplace msg]", e); }
      setNewMsg("");
    } catch (e) { alert("Erreur envoi : " + e.message); }
    finally { setSending(false); }
  }

  return (
    <div onClick={(e) => e.stopPropagation()} style={{
      background: "#fff", borderRadius: 14, padding: 0,
      maxWidth: 500, width: "100%", maxHeight: "85vh",
      display: "flex", flexDirection: "column",
    }}>
      <div style={{
        padding: "14px 16px", borderBottom: "1px solid #e3e9ee",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: "linear-gradient(135deg, #7a6fb0, #5a8f8f)", color: "#fff",
        borderRadius: "14px 14px 0 0",
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>💬 Négociation : {offre.libelle?.slice(0, 30)}</div>
          <div style={{ fontSize: 10.5, opacity: 0.9 }}>
            <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: 3, background: connected ? "#7CC8C8" : "#EF9F27", marginRight: 4 }} />
            {connected ? "Connexion temps réel" : "Connexion en cours..."}
          </div>
        </div>
        <button onClick={onClose} style={{ background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", padding: "6px 10px", borderRadius: 6, cursor: "pointer", fontFamily: "inherit", fontSize: 12 }}>✕</button>
      </div>
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 14, background: "#fafbfc", minHeight: 300 }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: "center", color: "#8a98a8", padding: 30, fontSize: 12 }}>
            <i className="ti ti-message-circle" style={{ fontSize: 36, opacity: 0.3, display: "block", marginBottom: 6 }} />
            Aucun message · Envoie le premier pour démarrer la négociation
          </div>
        ) : messages.map(m => {
          const isMine = m.magasin_id === magasinId;
          return (
            <div key={m.id} style={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start", marginBottom: 8 }}>
              <div style={{
                maxWidth: "75%",
                background: isMine ? "linear-gradient(135deg, #7a6fb0, #5a8f8f)" : "#fff",
                color: isMine ? "#fff" : "#142131",
                padding: "8px 12px", borderRadius: 12,
                borderBottomRightRadius: isMine ? 4 : 12,
                borderBottomLeftRadius: isMine ? 12 : 4,
                border: isMine ? "none" : "1px solid #e3e9ee",
                fontSize: 13, lineHeight: 1.5,
              }}>
                <div>{m.message}</div>
                <div style={{ fontSize: 9.5, opacity: 0.7, marginTop: 4, textAlign: "right" }}>
                  {new Date(m.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ padding: 12, borderTop: "1px solid #e3e9ee", display: "flex", gap: 8 }}>
        <input value={newMsg} onChange={(e) => setNewMsg(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Tape ton message..." style={{ flex: 1, padding: "10px 12px", border: "1px solid #cfd8e0", borderRadius: 8, fontFamily: "inherit", fontSize: 13 }} />
        <button onClick={send} disabled={sending || !newMsg.trim()} style={{
          background: "linear-gradient(135deg, #7a6fb0, #5a8f8f)", color: "#fff", border: "none",
          padding: "10px 16px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700,
          opacity: (sending || !newMsg.trim()) ? 0.5 : 1,
        }}>{sending ? "⏳" : "📤"}</button>
      </div>
    </div>
  );
}
