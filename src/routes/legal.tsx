import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/legal")({
  head: () => ({ meta: [{ title: "Conditions et confidentialité — TORQUE" }] }),
  component: Legal,
});

// À compléter : ces informations seront visibles publiquement.
const EDITEUR = "Bilal El Mesbahi";
const ADRESSE = "À COMPLÉTER (adresse postale en Belgique)";
const CONTACT = "bilal.elmesbahi.pro@gmail.com";

function Legal() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-5 py-6 pb-20 space-y-8 text-sm leading-relaxed">
        <Link to="/login" className="inline-flex items-center gap-2 text-muted-foreground">
          <ArrowLeft className="w-4 h-4" /> Retour
        </Link>

        <section className="space-y-3">
          <h1 className="text-2xl font-black">Conditions d'utilisation</h1>
          <p>TORQUE est un réseau social pour passionnés d'automobile, édité par {EDITEUR}, {ADRESSE}. Contact : {CONTACT}.</p>
          <p>En créant un compte, tu confirmes avoir au moins 13 ans (16 ans si tu n'as pas l'accord de tes parents) et tu acceptes ces conditions.</p>
          <p>Tu restes responsable de ce que tu publies. Sont interdits : les contenus illégaux, haineux, violents ou à caractère sexuel, le harcèlement, l'usurpation d'identité, le spam et la publication de contenus dont tu n'as pas les droits. Nous pouvons retirer un contenu ou suspendre un compte en cas de non-respect.</p>
          <p>Tu gardes tes droits sur tes publications et tu nous autorises à les afficher dans l'application pour fournir le service. Les rassemblements sont organisés par leurs organisateurs, qui en sont seuls responsables : TORQUE ne garantit ni leur tenue ni leur sécurité. L'application est fournie en version bêta, sans garantie de disponibilité continue.</p>
        </section>

        <section className="space-y-3">
          <h1 className="text-2xl font-black">Politique de confidentialité</h1>
          <p><b>Responsable du traitement :</b> {EDITEUR}, {ADRESSE}, {CONTACT}.</p>
          <p><b>Données collectées :</b> adresse e-mail, mot de passe (chiffré), nom affiché, nom d'utilisateur, photo, bio, ville, véhicules, publications, commentaires, j'aime, messages, participations aux rassemblements. Avec ton accord uniquement : ta position approximative (arrondie à environ 100 m) pour les alertes de rassemblements proches, et un identifiant d'appareil pour les notifications.</p>
          <p><b>Finalités :</b> fournir l'application (compte, publications, messages, rassemblements), t'envoyer les notifications que tu actives, assurer la sécurité et la modération. Base légale : exécution du service et ton consentement pour la position et les notifications.</p>
          <p><b>Messages et médias :</b> les photos et vidéos en « vue unique » sont supprimées après ouverture. Les discussions de rassemblement et leurs médias sont supprimés 24 h après la fin du rassemblement.</p>
          <p><b>Destinataires (sous-traitants) :</b> Supabase (base de données et stockage), Cloudflare (hébergement du site), Google (connexion avec Google, si tu l'utilises). Tes données ne sont ni vendues ni utilisées pour de la publicité.</p>
          <p><b>Conservation :</b> tant que ton compte existe. Si tu le supprimes, tes données sont effacées.</p>
          <p><b>Tes droits :</b> accès, rectification, effacement, portabilité, opposition et retrait du consentement. Dans Paramètres, tu peux télécharger tes données et supprimer ton compte. Pour toute demande : {CONTACT}. Tu peux aussi introduire une réclamation auprès de l'Autorité de protection des données (autoriteprotectiondonnees.be).</p>
          <p><b>Cookies :</b> TORQUE utilise uniquement le stockage technique nécessaire à la connexion et au fonctionnement, sans traceur publicitaire ni mesure d'audience.</p>
        </section>
      </div>
    </div>
  );
}