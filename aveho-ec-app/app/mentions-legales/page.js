"use client";
// =============================================================
//  /mentions-legales — Mentions légales & RGPD
//  Alpha 0.53.0 (BL)
//  Page publique accessible depuis le footer et la page login
// =============================================================
import TopBar from "../TopBar";
import { useAuth } from "../../lib/useAuth";
import { useCart } from "../useCart";
import { PageHead, Panel } from "../ui";

export default function MentionsLegalesPage() {
  const auth = useAuth();
  const cart = useCart();

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead
          eyebrow="INFORMATIONS LÉGALES"
          icon="ti-gavel"
          title="Mentions"
          accent="légales & RGPD"
          sub="Conditions d'utilisation, traitement des données personnelles, et coordonnées de l'éditeur"
        />

        <Panel style={{ marginBottom: 16 }}>
          <h2 style={{ marginTop: 0, fontSize: 18, color: "#142131" }}>
            <i className="ti ti-info-circle" style={{ color: "#185FA5", marginRight: 6 }} /> Éditeur
          </h2>
          <p style={{ fontSize: 14, color: "#2a3a48", lineHeight: 1.6 }}>
            L'Espace Pro Aveho est édité par <b>Aveho Soft &amp; Services</b>, filiale du <b>Groupe Fidéciel</b>, 
            éditeur de logiciels métier pour le secteur de la santé.
          </p>
          <ul style={{ fontSize: 14, color: "#2a3a48", lineHeight: 1.8 }}>
            <li><b>Raison sociale :</b> Aveho Soft &amp; Services</li>
            <li><b>Forme juridique :</b> SAS</li>
            <li><b>Adresse :</b> à compléter (siège social)</li>
            <li><b>Contact :</b> support@aveho.fr</li>
            <li><b>Directeur de la publication :</b> à compléter</li>
          </ul>
        </Panel>

        <Panel style={{ marginBottom: 16 }}>
          <h2 style={{ marginTop: 0, fontSize: 18, color: "#142131" }}>
            <i className="ti ti-shield-lock" style={{ color: "#8c2a23", marginRight: 6 }} /> Protection des données (RGPD)
          </h2>
          <p style={{ fontSize: 14, color: "#2a3a48", lineHeight: 1.6 }}>
            L'Espace Pro Aveho traite des données personnelles dans le cadre de la gestion des prestations 
            de santé à domicile. En tant que responsable de traitement, votre structure doit respecter 
            les obligations du Règlement Général sur la Protection des Données (RGPD) et de la loi 
            Informatique et Libertés.
          </p>

          <h3 style={{ fontSize: 15, color: "#142131", marginTop: 16 }}>Données traitées</h3>
          <ul style={{ fontSize: 14, color: "#2a3a48", lineHeight: 1.8 }}>
            <li><b>Données patient :</b> état civil, données de santé strictement nécessaires à la prestation</li>
            <li><b>Données utilisateur :</b> identifiants, adresse email professionnelle, rôle dans la structure</li>
            <li><b>Données d'usage :</b> journal d'audit des actions sur les données (qui a fait quoi, quand)</li>
            <li><b>Données techniques :</b> logs applicatifs anonymes pour le débogage</li>
          </ul>

          <h3 style={{ fontSize: 15, color: "#142131", marginTop: 16 }}>Base légale</h3>
          <p style={{ fontSize: 14, color: "#2a3a48", lineHeight: 1.6 }}>
            Les traitements reposent sur l'<b>exécution d'un contrat</b> (entre votre structure et le patient/résident),
            sur l'<b>obligation légale</b> (traçabilité sanitaire) et sur l'<b>intérêt légitime</b> (gestion 
            opérationnelle, sécurité).
          </p>

          <h3 style={{ fontSize: 15, color: "#142131", marginTop: 16 }}>Vos droits</h3>
          <p style={{ fontSize: 14, color: "#2a3a48", lineHeight: 1.6 }}>
            Conformément aux articles 15 à 22 du RGPD, vous disposez d'un droit d'accès, de rectification, 
            d'effacement, d'opposition, de limitation et de portabilité. Pour exercer ces droits, 
            adressez-vous à votre DPO ou à <b>dpo@aveho.fr</b>.
          </p>
          <p style={{ fontSize: 13, color: "#6c7a89", lineHeight: 1.6, fontStyle: "italic" }}>
            En cas de manquement à vos droits, vous pouvez introduire une réclamation auprès de la 
            <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" style={{ color: "#185FA5", marginLeft: 4 }}>
              Commission Nationale de l'Informatique et des Libertés (CNIL)
            </a>.
          </p>

          <h3 style={{ fontSize: 15, color: "#142131", marginTop: 16 }}>Hébergement</h3>
          <p style={{ fontSize: 14, color: "#2a3a48", lineHeight: 1.6 }}>
            Les données sont hébergées dans l'<b>Union Européenne</b> par Supabase Inc. 
            (hébergeur de données certifié) et Vercel Inc. (plateforme applicative). 
            Aucun transfert de données vers des pays tiers ne survient sans garanties appropriées (clauses contractuelles types).
          </p>

          <h3 style={{ fontSize: 15, color: "#142131", marginTop: 16 }}>Durée de conservation</h3>
          <p style={{ fontSize: 14, color: "#2a3a48", lineHeight: 1.6 }}>
            Les données de patient sont conservées tant que la prestation est active, puis archivées 
            selon les durées légales applicables au secteur médical (typiquement 20 ans à compter du 
            dernier acte). Les logs d'audit sont conservés <b>90 jours en ligne</b>, puis purgés 
            automatiquement.
          </p>
        </Panel>

        <Panel style={{ marginBottom: 16 }}>
          <h2 style={{ marginTop: 0, fontSize: 18, color: "#142131" }}>
            <i className="ti ti-cookie" style={{ color: "#EF9F27", marginRight: 6 }} /> Cookies &amp; stockage local
          </h2>
          <p style={{ fontSize: 14, color: "#2a3a48", lineHeight: 1.6 }}>
            L'application utilise du stockage local navigateur (localStorage) pour conserver vos 
            <b> préférences personnelles</b> (mode sombre, mode compact, filtres sauvegardés, snooze 
            d'annonces). Aucun cookie tiers de publicité ou de tracking n'est posé.
          </p>
          <p style={{ fontSize: 14, color: "#2a3a48", lineHeight: 1.6 }}>
            Un cookie de session est utilisé pour maintenir votre connexion. Il est strictement 
            nécessaire au fonctionnement et ne requiert pas votre consentement.
          </p>
        </Panel>

        <Panel style={{ marginBottom: 16 }}>
          <h2 style={{ marginTop: 0, fontSize: 18, color: "#142131" }}>
            <i className="ti ti-file-text" style={{ color: "#5aa05a", marginRight: 6 }} /> Conditions d'utilisation
          </h2>
          <p style={{ fontSize: 14, color: "#2a3a48", lineHeight: 1.6 }}>
            L'accès à l'Espace Pro est réservé aux utilisateurs autorisés par leur structure. 
            Chaque action effectuée dans l'application est tracée dans un journal d'audit immuable.
          </p>
          <p style={{ fontSize: 14, color: "#2a3a48", lineHeight: 1.6 }}>
            En vous connectant, vous vous engagez à :
          </p>
          <ul style={{ fontSize: 14, color: "#2a3a48", lineHeight: 1.8 }}>
            <li>Ne pas partager vos identifiants</li>
            <li>Respecter la confidentialité des données patients (secret professionnel)</li>
            <li>Signaler toute anomalie de fonctionnement ou de sécurité à votre administrateur</li>
            <li>Ne pas utiliser les données à des fins autres que la prestation pour laquelle vous êtes habilité</li>
          </ul>
        </Panel>

        <Panel style={{ marginBottom: 16 }}>
          <h2 style={{ marginTop: 0, fontSize: 18, color: "#142131" }}>
            <i className="ti ti-mail" style={{ color: "#1c5454", marginRight: 6 }} /> Contact
          </h2>
          <p style={{ fontSize: 14, color: "#2a3a48", lineHeight: 1.6 }}>
            <b>Support technique :</b> support@aveho.fr<br/>
            <b>Demande RGPD / exercice de droits :</b> dpo@aveho.fr<br/>
            <b>Signalement d'incident de sécurité :</b> security@aveho.fr
          </p>
        </Panel>

        <p style={{ textAlign: "center", fontSize: 11, color: "#8a98a8", marginTop: 24 }}>
          Dernière mise à jour : 31 mai 2026 · Alpha 0.53.0
        </p>
      </div>
    </div>
  );
}
