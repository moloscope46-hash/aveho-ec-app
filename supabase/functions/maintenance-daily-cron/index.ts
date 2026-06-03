// Edge Function : maintenance-daily-cron (Alpha 0.12)
//
// Fonction à déployer dans Supabase et à appeler une fois par jour
// (via pg_cron ou un service externe type cron-job.org).
//
// Rôle :
// 1. Pour chaque maintenance dans la fenêtre [aujourd'hui ; +7 jours]
//    qui n'a pas encore eu sa notif J-7, envoyer la notif et marquer le flag
// 2. Pour chaque maintenance en retard sans DI liée, créer la DI et lier
//
// Cette fonction reproduit côté serveur ce que fait aujourd'hui la page
// Maintenance au load (0.11). Avantage : les notifs partent même si
// personne n'ouvre l'app pendant plusieurs jours.
//
// Déploiement :
//   supabase functions deploy maintenance-daily-cron
//
// Programmation (dans Supabase SQL Editor, une seule fois) :
//   select cron.schedule(
//     'maintenance-daily-cron',
//     '0 6 * * *',   -- tous les jours à 6h UTC
//     $$ select net.http_post(
//          url := 'https://VOTRE_PROJET.supabase.co/functions/v1/maintenance-daily-cron',
//          headers := jsonb_build_object('Authorization', 'Bearer VOTRE_SERVICE_ROLE_KEY')
//        ); $$
//   );

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders, requireCronSecret } from "../_shared/auth.ts";

// 0.57.33 : check CRON_SECRET (anti-déclenchement non autorisé)
Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 204, headers: corsHeaders });
  }

  // 0.57.33 : vérification du secret CRON
  const cronCheck = requireCronSecret(req);
  if (cronCheck) return cronCheck;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return new Response("Configuration manquante", { status: 500, headers: corsHeaders });
  }
  const supabase = createClient(supabaseUrl, serviceKey);

  const aujourdhui = new Date().toISOString().slice(0, 10);
  const dansSeptJours = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  let notifsEnvoyees = 0;
  let disCreees = 0;
  let maintenancesGenerees = 0;
  const erreurs = [];

  try {
    // 1) Maintenances à 7 jours sans notif envoyée
    const { data: aNotifier } = await supabase.from("maintenances")
      .select("id, type, date_prevue, structure_id, etablissement_id, materiel_id, materiels(libelle)")
      .gte("date_prevue", aujourdhui)
      .lte("date_prevue", dansSeptJours)
      .eq("notif_j7_envoyee", false)
      .neq("statut", "Faite")
      .neq("statut", "Annulée");

    for (const m of aNotifier || []) {
      try {
        // Trouver les membres de la structure pour envoyer une notif par membre
        const { data: membres } = await supabase.from("membres_structure")
          .select("user_id")
          .eq("structure_id", m.structure_id);
        const matLabel = m.materiels?.libelle || "matériel";
        for (const membre of membres || []) {
          await supabase.from("notifications").insert({
            user_id: membre.user_id,
            structure_id: m.structure_id,
            type: "maintenance",
            titre: "Maintenance proche",
            message: `${m.type} sur ${matLabel} prévue le ${m.date_prevue}.`,
            lien: "/maintenance",
            lue: false,
          });
          // Alpha 0.47.0 : push browser best-effort
          try {
            await fetch(`${supabaseUrl}/functions/v1/send-push`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${serviceKey}`,
              },
              body: JSON.stringify({
                userId: membre.user_id,
                title: "Maintenance proche",
                body: `${m.type} sur ${matLabel} prévue le ${m.date_prevue}`,
                url: "/maintenance",
              }),
            });
          } catch (e) {
            // Push best-effort, ne pas bloquer
          }
        }
        await supabase.from("maintenances").update({ notif_j7_envoyee: true }).eq("id", m.id);
        notifsEnvoyees++;
      } catch (e) { erreurs.push(`Notif maint ${m.id}: ${e.message}`); }
    }

    // 2) Maintenances en retard sans DI
    const { data: enRetard } = await supabase.from("maintenances")
      .select("id, type, date_prevue, structure_id, etablissement_id, materiel_id, intervenant, materiels(libelle)")
      .lt("date_prevue", aujourdhui)
      .is("di_id", null)
      .neq("statut", "Faite")
      .neq("statut", "Annulée");

    for (const m of enRetard || []) {
      try {
        const numero = `DI-${Date.now().toString().slice(-6)}-${m.id.slice(0, 4)}`;
        const { data: di } = await supabase.from("interventions").insert({
          structure_id: m.structure_id,
          etablissement_id: m.etablissement_id,
          materiel_id: m.materiel_id,
          numero,
          type: "Maintenance en retard",
          urgence: "Normal",
          statut: "Nouvelle",
          description: `Maintenance "${m.type}" prévue le ${m.date_prevue} en retard. Intervenant prévu : ${m.intervenant || "non précisé"}.`,
        }).select().single();
        if (di) {
          await supabase.from("maintenances").update({ di_id: di.id }).eq("id", m.id);
          // Notif aux membres
          const { data: membres } = await supabase.from("membres_structure")
            .select("user_id").eq("structure_id", m.structure_id);
          for (const membre of membres || []) {
            await supabase.from("notifications").insert({
              user_id: membre.user_id,
              structure_id: m.structure_id,
              type: "di",
              titre: "DI auto : maintenance en retard",
              message: `${m.type} sur ${m.materiels?.libelle || "matériel"} est en retard. DI ${numero} créée.`,
              lien: "/interventions",
              lue: false,
            });
          }
          disCreees++;
        }
      } catch (e) { erreurs.push(`DI maint ${m.id}: ${e.message}`); }
    }

    // ============================================================
    // Alpha 0.44.0 : 3) Récurrences maintenance — génération auto
    // ============================================================
    // Pour chaque récurrence active dont la prochaine_due est dans la fenêtre [aujourd'hui ; +7j]
    // ET qui n'a pas encore de maintenance planifiée correspondante,
    // créer la maintenance planifiée correspondante.
    let maintenancesGenerees = 0;
    const { data: recurrences } = await supabase.from("maintenance_recurrences")
      .select("id, structure_id, materiel_id, type, libelle, frequence_jours, derniere_realisee, prochaine_due, notes, materiels(libelle, etablissement_id)")
      .eq("actif", true)
      .not("prochaine_due", "is", null)
      .gte("prochaine_due", aujourdhui)
      .lte("prochaine_due", dansSeptJours);

    for (const r of recurrences || []) {
      try {
        // Vérifier qu'aucune maintenance planifiée n'existe déjà pour ce matériel et cette date
        const { data: existante } = await supabase.from("maintenances")
          .select("id")
          .eq("materiel_id", r.materiel_id)
          .eq("date_prevue", r.prochaine_due)
          .eq("type", r.type)
          .limit(1);

        if (existante && existante.length > 0) continue; // Déjà créée

        // Créer la maintenance planifiée
        const { error: errMaint } = await supabase.from("maintenances").insert({
          structure_id: r.structure_id,
          etablissement_id: r.materiels?.etablissement_id || null,
          materiel_id: r.materiel_id,
          type: r.type,
          date_prevue: r.prochaine_due,
          statut: "Planifiée",
          notes: r.libelle 
            ? `Généré auto depuis récurrence : ${r.libelle}` + (r.notes ? `\n${r.notes}` : "")
            : "Généré auto depuis récurrence" + (r.notes ? `\n${r.notes}` : ""),
        });

        if (!errMaint) {
          maintenancesGenerees++;
        } else {
          erreurs.push(`Recur ${r.id}: ${errMaint.message}`);
        }
      } catch (e) {
        erreurs.push(`Recur ${r.id}: ${e.message}`);
      }
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({
    ok: true,
    notifsEnvoyees,
    disCreees,
    maintenancesGenerees,
    erreurs,
    timestamp: new Date().toISOString(),
  }), { headers: { "Content-Type": "application/json" } });
});
