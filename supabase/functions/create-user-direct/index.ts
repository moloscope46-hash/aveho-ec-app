// =============================================================
// supabase/functions/create-user-direct/index.ts
// Création directe d'un utilisateur SANS passer par invitation/mail
// → retourne email + password générés que l'admin transmet manuellement
//
// Déploiement :
//   supabase functions deploy create-user-direct
// =============================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface CreatePayload {
  email: string;
  password?: string;          // si fourni, utilisé tel quel. Sinon généré
  prenom?: string;
  nom?: string;
  telephone?: string;
  fonction_detail?: string;
  role_professionnel?: string;
  // Rattachement
  structure_id: string;
  etablissement_id?: string;
  batiment_id?: string;
  service_id?: string;
  magasin_fournisseur_id?: string;
  pharmacie_id?: string;
  // Méta
  type_compte?: "etablissement" | "magasin";  // pour l'affichage
}

function generatePassword(length = 12) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  let pwd = "";
  for (let i = 0; i < length; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  return pwd;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const payload: CreatePayload = await req.json();
    if (!payload.email || !payload.structure_id) {
      return new Response(JSON.stringify({ error: "email + structure_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Génère le mot de passe si pas fourni
    const password = payload.password || generatePassword(12);
    const email = payload.email.toLowerCase().trim();

    // 1. Crée le user dans auth.users avec email_confirm = true (skip confirmation email)
    const { data: userData, error: userErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,        // ← skip mail confirmation
      user_metadata: {
        prenom: payload.prenom || null,
        nom: payload.nom || null,
        telephone: payload.telephone || null,
        created_directly: true,
        created_via: "admin_direct",
      },
    });

    if (userErr) {
      return new Response(JSON.stringify({ error: "Auth error : " + userErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "User ID manquant après création" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Crée le membre dans membres_structure
    const { error: memErr } = await supabase.from("membres_structure").insert({
      user_id: userId,
      structure_id: payload.structure_id,
      email,
      prenom: payload.prenom || null,
      nom: payload.nom || null,
      nom_affiche: payload.prenom && payload.nom ? `${payload.prenom} ${payload.nom}` : (payload.prenom || payload.nom || null),
      telephone: payload.telephone || null,
      fonction_detail: payload.fonction_detail || null,
      role_professionnel: payload.role_professionnel || (payload.type_compte === "magasin" ? "utilisateur_magasin" : "utilisateur"),
      etablissement_id: payload.etablissement_id || null,
      batiment_id: payload.batiment_id || null,
      service_id: payload.service_id || null,
      magasin_fournisseur_id: payload.magasin_fournisseur_id || null,
      pharmacie_id: payload.pharmacie_id || null,
      actif: true,
      date_arrivee: new Date().toISOString(),
    });

    if (memErr) {
      console.warn("[create-user-direct] membres_structure error:", memErr);
      // Pas critique : retourne quand même les credentials
    }

    return new Response(JSON.stringify({
      ok: true,
      user_id: userId,
      email,
      password,                  // ← le mot de passe en clair, à transmettre manuellement
      type_compte: payload.type_compte || "etablissement",
      app_url: Deno.env.get("APP_URL") || "https://aveho-ec-app.vercel.app",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
