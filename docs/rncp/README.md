# Portefeuille de preuves RNCP

Statut : socle initial.

Ce dossier rassemble les preuves à utiliser pour le dossier de validation RNCP 36463 "Concepteur Développeur d'Applications Numériques".

Il ne remplace pas la documentation produit MyTuums. Il sert de carte de lecture pour relier le projet aux blocs de compétences RNCP, aux preuves du dépôt et à la soutenance orale.

## Objectif

Rendre les preuves de compétence explicites, classées et défendables :

- BC01 : concevoir des applications numériques en intégrant les recommandations de sécurité.
- BC02 : piloter un projet DevOps de développement d'application numérique.
- BC03 : développer des applications numériques.
- BC04 : réaliser une interface d'échange de données informatisées.

## Documents

- [Matrice de preuves](matrice-preuves.md) : entrée principale, compétence par compétence.
- [Cahier des charges](cahier-des-charges.md) : besoin, objectifs, contraintes et limites.
- [Spécifications fonctionnelles](specifications-fonctionnelles.md) : attendus fonctionnels et critères de validation.
- [Plan d'assurance qualité](plan-assurance-qualite.md) : qualité, tests, CI, non-régression.
- [Pilotage DevOps](bc02-pilotage-devops.md) : workflow, backlog, planning, recette, intégration.
- [Échanges de données](bc04-echanges-donnees.md) : rétro-documentation, correspondances, flux, environnement de test.
- [Sécurité, accessibilité et charge](securite-accessibilite-charge.md) : risques, RGAA/WCAG, performance.
- [PV de recette et bon à intégrer](pv-recette-bon-integrer.md) : critères d'acceptation et go/no-go.
- [Journal de bord](journal-de-bord.md) : décisions, difficultés, arbitrages et suivi.
- [Annexes RNCP](annexes.md) : index des preuves à joindre au dossier final.
- [Préparation orale](preparation-oral.md) : trame de soutenance de 20 minutes.

## Sources techniques principales

- [Scope v1](../prd/v1-scope.md)
- [PRD v1](../prd/v1-prd.md)
- [Architecture et déploiement Azure](../deployment/azure.md)
- [Contexte coding practices](../context/coding-practices/CONTEXT.md)
- [Contexte legal/i18n](../context/legal/CONTEXT.md)
- ADR : [identités supprimées](../adr/0001-release-deleted-usernames-after-30-days.md), [médias publics sans scan automatique](../adr/0002-launch-public-media-without-automated-scanning.md), [application de documentation](../adr/0003-custom-developer-documentation-app.md)
- [CI GitHub Actions](https://github.com/MyTuums-Group/MyTuums/blob/main/.github/workflows/ci.yml)
- [Déploiement GitHub Actions](https://github.com/MyTuums-Group/MyTuums/blob/main/.github/workflows/deploy.yml)
- [Nettoyage média planifié](https://github.com/MyTuums-Group/MyTuums/blob/main/.github/workflows/media-cleanup.yml)

## Règle de maintenance

Chaque preuve doit être exploitable sans demander au jury de fouiller dans le dépôt :

1. nommer la compétence ;
2. décrire le contexte ;
3. citer la preuve principale ;
4. expliquer ce que la preuve démontre ;
5. indiquer ce qui reste à compléter si la preuve est partielle.
