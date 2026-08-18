export interface CorpusQuestion {
  id: string;
  category: string;
  question: string;
  expectFactual: boolean;
}

export const CORPUS: CorpusQuestion[] = [
  { id: "ai-sme-01", category: "IA & PME", question: "Quels sont les avantages et risques d'adopter l'IA générative dans une PME ?", expectFactual: true },
  { id: "ai-sme-02", category: "IA & PME", question: "Quel est le coût moyen annuel d'un abonnement d'IA générative pour une équipe de 10 personnes ?", expectFactual: true },
  { id: "ai-sme-03", category: "IA & PME", question: "Quelles compétences sont les plus demandées pour déployer l'IA en entreprise ?", expectFactual: true },
  { id: "ai-sme-04", category: "IA & PME", question: "L'IA générative réduit-elle réellement le temps de production de contenus marketing ?", expectFactual: false },
  { id: "ai-sme-05", category: "IA & PME", question: "Quels secteurs adoptent le plus l'IA générative en 2025 ?", expectFactual: true },
  { id: "ai-sme-06", category: "IA & PME", question: "Quelle est la différence entre un LLM open source et un modèle propriétaire ?", expectFactual: true },
  { id: "ai-sme-07", category: "IA & PME", question: "Comment mesurer le retour sur investissement d'un projet d'IA ?", expectFactual: true },
  { id: "ai-sme-08", category: "IA & PME", question: "Quels sont les risques juridiques de l'IA générative en Europe ?", expectFactual: true },

  { id: "tech-01", category: "Tech & Web", question: "Quels sont les avantages et inconvénients de Next.js App Router par rapport à une SPA ?", expectFactual: true },
  { id: "tech-02", category: "Tech & Web", question: "Quelle est la meilleure stratégie de cache pour un site e-commerce à fort trafic ?", expectFactual: false },
  { id: "tech-03", category: "Tech & Web", question: "PostgreSQL est-il un bon choix pour une application de chat temps réel ?", expectFactual: true },
  { id: "tech-04", category: "Tech & Web", question: "Quelle est la différence entre edge computing et serverless ?", expectFactual: true },
  { id: "tech-05", category: "Tech & Web", question: "TypeScript est-il indispensable pour un projet JavaScript moderne ?", expectFactual: false },
  { id: "tech-06", category: "Tech & Web", question: "Quels sont les coûts d'infrastructure cloud pour une startup en phase de lancement ?", expectFactual: true },
  { id: "tech-07", category: "Tech & Web", question: "Comment sécuriser une API publique ?", expectFactual: true },
  { id: "tech-08", category: "Tech & Web", question: "Quelle est la meilleure approche pour gérer les migrations de base de données ?", expectFactual: false },

  { id: "data-01", category: "Data & Sécurité", question: "Quels sont les risques liés au stockage des données personnelles en Europe ?", expectFactual: true },
  { id: "data-02", category: "Data & Sécurité", question: "Le chiffrement AES-256-GCM est-il suffisant pour protéger des secrets applicatifs ?", expectFactual: true },
  { id: "data-03", category: "Data & Sécurité", question: "Quelle est la meilleure stratégie de sauvegarde pour une petite entreprise ?", expectFactual: true },
  { id: "data-04", category: "Data & Sécurité", question: "Quels sont les points clés du RGPD pour les entreprises françaises ?", expectFactual: true },
  { id: "data-05", category: "Data & Sécurité", question: "L'authentification par mot de passe est-elle encore adaptée en 2025 ?", expectFactual: false },
  { id: "data-06", category: "Data & Sécurité", question: "Comment prévenir les attaques par injection dans une API ?", expectFactual: true },
  { id: "data-07", category: "Data & Sécurité", question: "Quels sont les avantages du stockage en base de données chiffrée ?", expectFactual: true },
  { id: "data-08", category: "Data & Sécurité", question: "Quelles bonnes pratiques pour la gestion des secrets en CI/CD ?", expectFactual: true },

  { id: "strat-01", category: "Stratégie", question: "Quels sont les avantages et risques du passage au télétravail complet ?", expectFactual: false },
  { id: "strat-02", category: "Stratégie", question: "Quelle est la meilleure stratégie de pricing pour un SaaS en croissance ?", expectFactual: false },
  { id: "strat-03", category: "Stratégie", question: "Quels sont les indicateurs clés pour évaluer la santé d'une startup ?", expectFactual: true },
  { id: "strat-04", category: "Stratégie", question: "Faut-il préférer la croissance rapide ou la rentabilité durable ?", expectFactual: false },
  { id: "strat-05", category: "Stratégie", question: "Quels sont les avantages du modèle open source pour une entreprise ?", expectFactual: true },
  { id: "strat-06", category: "Stratégie", question: "Comment évaluer le potentiel de marché d'une nouvelle idée produit ?", expectFactual: true },
  { id: "strat-07", category: "Stratégie", question: "Quels sont les risques de la diversification des revenus ?", expectFactual: false },
  { id: "strat-08", category: "Stratégie", question: "Quelle est la meilleure approche pour définir une feuille de route produit ?", expectFactual: false },
];
