# Design — Outil de déclaration ADAGP

**Date :** 2026-06-05
**Projet :** SuiviDAGP
**Statut :** Approuvé

---

## Contexte

La cliente est adhérente ADAGP (Association pour la Diffusion des Arts Graphiques et Plastiques). Elle doit déclarer ses passages médias (TV et presse) pour percevoir ses droits. Elle dispose de captures d'écran (TV) et scans (presse) dans un dossier Google Drive, et veut que ces passages soient structurés dans un Google Sheet pour faciliter la déclaration ADAGP.

**Volume :** 20–100 passages/an.
**Déclenchement :** manuel, à la demande (elle lance le traitement quand elle le souhaite).

---

## Architecture

```
[Dossier Google Drive — fichiers non traités]
       ↓ (liste les fichiers non traités)
[Google Apps Script — menu "ADAGP" dans Google Sheets]
       ↓ (envoie chaque image à l'API IA)
[Gemini Flash / OpenAI — vision, extraction des champs]
       ↓ (retourne les champs extraits)
[Sidebar HTML de validation — dans Google Sheets]
       ↓ (cliente corrige si besoin, clique "Valider")
[Onglet "Déclarations" — ligne insérée + fichier Drive marqué traité]
```

---

## Structure du Google Sheet

### Onglet `Déclarations`

| Colonne | Description |
|---|---|
| Date du passage | Date de diffusion/publication |
| Type de média | TV / Presse / Web |
| Nom du média | Ex : France 5, Le Monde |
| Titre de l'œuvre | Sélectionné depuis la liste des œuvres |
| Description / Contexte | Résumé extrait par l'IA |
| Lien fichier Drive | URL directe vers la capture/scan |
| Statut | `validé` / `brouillon` |
| Date de saisie | Date d'insertion dans le Sheet |

> **Note :** Les colonnes seront affinées une fois le formulaire officiel ADAGP disponible.

### Onglet `⚙️ Config`

| Paramètre | Valeur par défaut | Description |
|---|---|---|
| `DRIVE_FOLDER_ID` | *(à renseigner)* | ID du dossier Google Drive source |
| `AI_PROVIDER` | `gemini` | `gemini` ou `openai` |
| `AI_MODEL` | `gemini-2.0-flash` | Nom du modèle IA |
| `PROMPT_EXTRACTION` | *(voir ci-dessous)* | Prompt envoyé à l'IA, modifiable |

La clé API est stockée dans les **Script Properties** (jamais visible dans le Sheet).

### Onglet `🎨 Œuvres`

Liste des œuvres de la cliente :

| Titre | Année | Technique | Notes |
|---|---|---|---|
| *(à remplir)* | | | |

L'IA utilise cette liste pour matcher l'œuvre visible sur l'image. Si aucun match clair, elle laisse le champ vide pour saisie manuelle.

---

## Composants Apps Script

| Fichier | Rôle |
|---|---|
| `Menu.gs` | Ajoute le menu `ADAGP` à l'ouverture du Sheet (`onOpen`) |
| `DriveService.gs` | Liste les fichiers du dossier Drive non encore traités (ceux sans propriété `adagp_traite`) |
| `AIService.gs` | Appel générique vers Gemini ou OpenAI selon `AI_PROVIDER`, retourne un objet JSON avec les champs extraits |
| `Sidebar.html` | Interface de validation : image + formulaire côte à côte, navigation entre images |
| `SheetService.gs` | Insère les lignes validées dans l'onglet `Déclarations`, marque le fichier Drive comme traité |
| `Config.gs` | Lit les paramètres depuis l'onglet Config et les Script Properties |

---

## Sidebar de validation

S'ouvre dans le panneau latéral de Google Sheets. Affiche **un passage à la fois** :

```
┌─────────────────────────────────────────────┐
│  📎 passage_tv_20260312.jpg                 │
│  [Image affichée]                           │
├─────────────────────────────────────────────┤
│  Date du passage    [12/03/2026        ]    │
│  Type de média      [📺 TV    ▼        ]    │
│  Nom du média       [France 5          ]    │
│  Titre de l'œuvre   [Sans titre, 2021 ▼]    │
│  Description        [Reportage sur...  ]    │
├─────────────────────────────────────────────┤
│  [⏭ Ignorer]  [💾 Valider →]  1 / 4       │
└─────────────────────────────────────────────┘
```

- Champs pré-remplis par l'IA, tous éditables
- "Titre de l'œuvre" : dropdown alimenté par l'onglet `🎨 Œuvres`
- **Ignorer** : laisse le fichier non traité, passe au suivant
- **Valider** : insère la ligne dans le Sheet, marque le fichier Drive avec propriété `adagp_traite=true`, passe au suivant
- Compteur de progression `X / N`

---

## Prompt d'extraction (défaut)

```
Tu analyses une image qui est soit une capture d'écran de télévision, soit un scan de presse.
Extrais les informations suivantes au format JSON :
{
  "date_passage": "DD/MM/YYYY ou vide si non visible",
  "type_media": "TV ou Presse ou Web",
  "nom_media": "nom du média ou vide",
  "titre_oeuvre": "titre le plus proche parmi cette liste : [LISTE_OEUVRES], ou vide si aucun match",
  "description": "résumé en 1-2 phrases du contexte de l'apparition de l'œuvre"
}
Réponds uniquement avec le JSON, sans commentaire.
```

---

## Gestion du marquage "traité"

Les fichiers Drive sont marqués via les **propriétés de fichier Drive** (`DriveApp.getFileById(id).setProperty('adagp_traite', 'true')`). Cela évite de les retraiter à chaque lancement, sans déplacer ni renommer les fichiers.

---

## Flux d'installation (une seule fois)

1. Copier le Google Sheet template partagé par Flavien
2. Extensions → Apps Script → Script Properties → ajouter `AI_API_KEY`
3. Renseigner `DRIVE_FOLDER_ID` dans l'onglet Config
4. Remplir l'onglet `🎨 Œuvres`
5. Recharger le Sheet → menu `ADAGP` apparaît

---

## Ce qui est hors périmètre (v1)

- Envoi automatique à ADAGP (le Sheet sert de préparation, pas de soumission)
- Déduplication automatique des passages similaires
- Export PDF formaté pour ADAGP
- Multi-utilisateur / partage entre plusieurs adhérentes
