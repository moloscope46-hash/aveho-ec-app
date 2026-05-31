// Edge Function Supabase — Relais de notifications vers Teams / Slack
// Déploiement : supabase functions deploy send-webhook
//
// Appel depuis l'app :
//   await supabase.functions.invoke("send-webhook", {
//     body: {
//       structure_id: "...",
//       channels: ["teams", "slack"], // optionnel : envoyer aux deux
//       event_type: "di_urgente" | "achat_a_valider" | "signalement",
//       title: "DI urgente créée",
//       message: "DI-1234 — Lit médicalisé en panne",
//       url: "https://app.aveho.fr/interventions",
//       fields: { Établissement: "EHPAD Les Tilleuls", Urgence: "Critique" }
//     }
//   })

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Format Teams (MessageCard simplifié)
function buildTeamsPayload({ title, message, url, fields, color }: any) {
  return {
    "@type": "MessageCard",
    "@context": "https://schema.org/extensions",
    themeColor: color || "7CC8C8",
    summary: title,
    sections: [
      {
        activityTitle: title,
        activitySubtitle: message,
        facts: Object.entries(fields || {}).map(([name, value]) => ({ name, value: String(value) })),
        markdown: true,
      },
    ],
    potentialAction: url ? [
      { "@type": "OpenUri", name: "Ouvrir dans Aveho", targets: [{ os: "default", uri: url }] }
    ] : [],
  };
}

// Format Slack (Block Kit simplifié)
function buildSlackPayload({ title, message, url, fields, color }: any) {
  const blocks: any[] = [
    {
      type: "section",
      text: { type: "mrkdwn", text: `*${title}*\n${message}` },
    },
  ];
  if (fields && Object.keys(fields).length > 0) {
    blocks.push({
      type: "section",
      fields: Object.entries(fields).map(([k, v]) => ({
        type: "mrkdwn",
        text: `*${k}:*\n${v}`,
      })),
    });
  }
  if (url) {
    blocks.push({
      type: "actions",
      elements: [
        { type: "button", text: { type: "plain_text", text: "Ouvrir dans Aveho" }, url },
      ],
    });
  }
  return {
    attachments: [{
      color: "#" + (color || "7CC8C8"),
      blocks,
    }],
  };
}

async function postWebhook(url: string, payload: any) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    const body = await req.json();
    const { structure_id, channels, event_type, title, message, url, fields, color } = body;

    if (!structure_id || !title || !message) {
      return new Response(JSON.stringify({ error: "structure_id, title, message requis" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Récupérer les URLs webhook de la structure
    const { data: struct, error: e1 } = await admin
      .from("structures")
      .select("webhook_teams_url, webhook_slack_url, webhook_filters")
      .eq("id", structure_id)
      .single();
    if (e1) throw e1;

    // Vérifier le filtre par event_type
    const filters = struct.webhook_filters || {};
    if (event_type && filters[event_type] === false) {
      return new Response(JSON.stringify({ sent: 0, reason: "filtered_out" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const requestedChannels = channels || ["teams", "slack"];
    const results: any = {};

    if (requestedChannels.includes("teams") && struct.webhook_teams_url) {
      try {
        await postWebhook(struct.webhook_teams_url, buildTeamsPayload({ title, message, url, fields, color }));
        results.teams = "sent";
      } catch (e: any) {
        results.teams = "error: " + e.message;
      }
    }

    if (requestedChannels.includes("slack") && struct.webhook_slack_url) {
      try {
        await postWebhook(struct.webhook_slack_url, buildSlackPayload({ title, message, url, fields, color }));
        results.slack = "sent";
      } catch (e: any) {
        results.slack = "error: " + e.message;
      }
    }

    return new Response(JSON.stringify({ ok: true, ...results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("send-webhook error:", e);
    return new Response(JSON.stringify({ error: e.message || "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
