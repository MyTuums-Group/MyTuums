# Projet fil rouge

Statut : socle de dossier pret pour revue, a completer avec les captures finales.

Ce dossier rassemble les livrables du projet fil rouge pour MyTuums. Il est volontairement separe de `docs/rncp/` : le projet fil rouge evalue le projet Bachelor 3 DEV, tandis que le RNCP organise un portefeuille de preuves par blocs de competences.

## Source d'evaluation

- PDF source des attendus : `G:/RNCP/Autres/UF_DEV_B3.pdf`.
- Sujet choisi : sujet libre.
- Produit presente : MyTuums, plateforme sociale web-first pour joueurs, avec backend securise, base de donnees PostgreSQL, application web responsive et MVP mobile Flutter Android/iOS.

## Documents

- [Matrice de conformite du projet fil rouge](matrice-conformite-projet-fil-rouge.md) : correspondance attendu PDF -> preuve MyTuums -> statut.
- [Document fonctionnel jury](document-fonctionnel-jury.md) : presentation autonome du besoin, des utilisateurs, du perimetre, des parcours et des limites.
- [Architecture technique jury](architecture-technique-jury.md) : schema web/API/mobile/DB/blob/email, environnements et controles securite.
- [Modele de donnees jury](modele-donnees-jury.md) : schema DB simplifie, entites, relations, contraintes et flux metier.
- [Preuve responsive web #155](preuve-responsive-web-155.md) : captures desktop/tablette/mobile des parcours web principaux.
- [Pilotage et collaboration](pilotage-collaboration.md) : planning, traces GitHub, repartition ElCabrii/AcryTeryx, decisions et arbitrages.
- [Runbook de demo](runbook-demo.md) : sequence locale minutee, services, commandes, donnees, supports de repli et procedures de reprise.
- [Preuve mobile #157/#158](preuve-mobile-157-158.md) : validation Flutter, surfaces mobiles et checklist de capture Android/iOS.
- [Preuve pilotage #159](preuve-pilotage-159.md) : snapshot board, PR representatives et checks CI.
- [Scripts oraux](scripts-oraux.md) : scripts 10 minutes et 20 minutes, avec repartition speaker.
- [Diaporama fil rouge](diaporama-fil-rouge.md) : source Markdown du support oral.
- [Questions reponses jury](questions-reponses-jury.md) : questions probables et angles de reponse.
- [Index final des preuves](index-preuves-finales.md) : registre des preuves a valider avant rendu.

## Contrat documentaire des preuves

Chaque preuve fil rouge doit indiquer :

| Champ | Usage |
| --- | --- |
| Exigence | Attendu explicite du PDF de reference. |
| Preuve | Document, commande, capture, issue, PR, log ou demo associe. |
| Statut | `Couvert`, `Partiel`, `A produire` ou `Bloque`. |
| Responsable | `ElCabrii`, `AcryTeryx` ou `Equipe`. |
| Issue liee | Issue GitHub qui porte la production ou la validation. |
| Action restante | Derniere action concrete avant cloture. |

## Regle de maintenance

Le dossier fil rouge doit rester lisible sans obliger le jury a fouiller le depot. Les liens vers la documentation produit, les preuves RNCP, les workflows ou les issues servent de preuves secondaires, mais le recit principal du fil rouge reste ici.
