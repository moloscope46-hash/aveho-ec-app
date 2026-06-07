// =============================================================
//  useMagasinContext — Hook pour récupérer le magasin du user (0.60.2)
//  Cantonne les vues : un user magasin ne voit que ses données.
// =============================================================
"use client";
import { useEffect, useState } from "react";
import { createClient } from "./supabase";
import { useAuth } from "./useAuth";

export function useMagasinContext() {
  const supabase = createClient();
  const auth = useAuth();
  const [magasin, setMagasin] = useState(null);
  const [etablissement, setEtablissement] = useState(null);
  const [isUserMagasin, setIsUserMagasin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.ready || !auth.user) { setLoading(false); return; }
    (async () => {
      try {
        // Récupère le membre
        const r = await supabase
          .from("membres_structure")
          .select("role_professionnel, magasin_fournisseur_id")
          .eq("user_id", auth.user.id)
          .maybeSingle();
        if (!r.data) { setLoading(false); return; }
        const isMag = r.data.role_professionnel === "utilisateur_magasin";
        setIsUserMagasin(isMag);
        if (isMag && r.data.magasin_fournisseur_id) {
          // Récupère le magasin
          const rm = await supabase
            .from("magasins")
            .select("*")
            .eq("id", r.data.magasin_fournisseur_id)
            .maybeSingle();
          if (rm.data) {
            setMagasin(rm.data);
            // Récupère l'agence rattachée au magasin
            if (rm.data.etablissement_rattache_id) {
              const re = await supabase
                .from("etablissements")
                .select("*")
                .eq("id", rm.data.etablissement_rattache_id)
                .maybeSingle();
              if (re.data) setEtablissement(re.data);
            }
          }
        }
      } catch (e) { console.warn("[useMagasinContext]", e); }
      finally { setLoading(false); }
    })();
  }, [auth.ready, auth.user?.id]);

  return {
    magasin,                               // l'entité magasin rattachée
    etablissement,                         // l'agence à laquelle le magasin est rattaché
    magasinId: magasin?.id,
    etablissementId: etablissement?.id,
    isUserMagasin,                         // true si role = utilisateur_magasin
    isRattache: !!magasin,                 // true si le user a bien un magasin
    loading,
  };
}
