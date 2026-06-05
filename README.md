# Outil de déclaration ADAGP

Outil Google Apps Script pour déclarer les passages médias d'une adhérente ADAGP.
Analyse les captures TV et scans presse par IA (Gemini Flash gratuit ou OpenAI), valide les champs
dans un panneau latéral, et enregistre les déclarations dans un Google Sheet.

---

## Prérequis

- Un compte Google avec accès à Google Drive et Google Sheets
- Une clé API **Gemini** (gratuit) : https://aistudio.google.com/apikey
  *(ou une clé OpenAI si vous préférez ce modèle)*

---

## Installation (une seule fois, ~10 minutes)

### Étape 1 — Préparer le Google Sheet

1. Créer un nouveau Google Sheet vide.
2. Lui donner un nom, par exemple : `Déclarations ADAGP 2026`.

### Étape 2 — Ouvrir l'éditeur Apps Script

1. Dans le Sheet : **Extensions → Apps Script**.
2. L'éditeur s'ouvre dans un nouvel onglet.

### Étape 3 — Copier le code depuis `docs/SCRIPT.md`

Pour chaque fichier décrit dans `docs/SCRIPT.md` :

**Pour les fichiers `.gs` (Script) :**
1. Dans l'éditeur, cliquer `+` à côté de "Fichiers" → choisir **Script**.
2. Nommer le fichier exactement comme indiqué (sans extension `.gs`).
3. Supprimer le contenu par défaut et coller le code correspondant.

**Pour `Sidebar.html` :**
1. Cliquer `+` → choisir **HTML** (pas Script).
2. Nommer le fichier `Sidebar`.
3. Remplacer le contenu par le code HTML correspondant.

**Pour `appsscript.json` :**
1. Dans l'éditeur, cliquer l'icône ⚙️ **Paramètres du projet**.
2. Cocher **"Afficher le fichier manifeste appsscript.json"**.
3. Revenir sur le fichier `appsscript.json` qui apparaît dans la liste.
4. Remplacer son contenu entier par le JSON fourni.

Ordre de création recommandé :
1. `Config` (Script)
2. `SheetService` (Script)
3. `DriveService` (Script)
4. `AIService` (Script)
5. `Menu` (Script)
6. `Sidebar` (HTML)

### Étape 4 — Enregistrer la clé API

La clé API ne doit **jamais** être collée dans le Sheet — elle se stocke de façon sécurisée
dans les paramètres du script.

> 💡 Vous le ferez plus facilement via le menu ADAGP après l'étape 5.
> Mais si vous préférez le faire maintenant :
> 1. Dans l'éditeur Apps Script : icône ⚙️ → **Propriétés du script**.
> 2. Cliquer **"Ajouter une propriété"**.
> 3. Nom : `AI_API_KEY` — Valeur : votre clé Gemini ou OpenAI.
> 4. Cliquer **Enregistrer**.

### Étape 5 — Initialiser le Sheet

1. Retourner dans le Google Sheet et **recharger la page** (F5 ou ⌘R).
2. Un menu **ADAGP** apparaît dans la barre de menus.
   *(Si le menu n'apparaît pas, attendre quelques secondes et recharger à nouveau.)*
3. Cliquer **ADAGP → Initialiser les onglets**.
4. Une fenêtre d'autorisation peut apparaître → accepter les accès demandés
   (Drive, Sheets, appels URL externes pour l'IA).
5. Trois onglets sont créés : `Déclarations`, `⚙️ Config`, `🎨 Œuvres`.

### Étape 6 — Configurer la clé API via le menu

1. Cliquer **ADAGP → Configurer la clé API**.
2. Coller votre clé Gemini (ou OpenAI).
3. Cliquer OK → message de confirmation.

### Étape 7 — Renseigner le dossier Drive source

1. Aller dans l'onglet **⚙️ Config**.
2. Trouver la ligne `DRIVE_FOLDER_ID`.
3. Coller l'ID de votre dossier Google Drive dans la colonne **Valeur**.
   - L'ID se trouve dans l'URL du dossier Drive :
     `https://drive.google.com/drive/folders/**VOTRE_ID_ICI**`

### Étape 8 — Ajouter vos œuvres

1. Aller dans l'onglet **🎨 Œuvres**.
2. Remplir la liste de vos créations (une par ligne, colonne "Titre").
3. L'IA utilisera cette liste pour identifier l'œuvre visible sur chaque capture.

---

## Utilisation au quotidien

### 1. Déposer vos fichiers

Glissez vos captures TV (JPG, PNG) ou scans presse (PDF, JPG) dans le dossier Google Drive
que vous avez configuré.

Formats acceptés : **JPG, PNG, PDF, GIF, WEBP**

### 2. Lancer le traitement

Dans votre Google Sheet, cliquer **ADAGP → Traiter les nouveaux fichiers**.

### 3. Valider chaque passage

Un panneau latéral s'ouvre pour chaque fichier :

```
┌─────────────────────────────────────┐
│  nom_du_fichier.jpg                 │
│  Fichier 1 sur 3 non traité(s)      │
│  [ Aperçu du fichier ]              │
├─────────────────────────────────────┤
│  Date du passage   [12/03/2026]     │
│  Type de média     [TV         ▼]   │
│  Nom du média      [France 5   ]    │
│  Titre de l'œuvre  [Mon œuvre  ▼]   │
│  Description       [Reportage…]     │
├─────────────────────────────────────┤
│  [⏭ Ignorer]    [💾 Valider]       │
└─────────────────────────────────────┘
```

- **💾 Valider** → enregistre la ligne dans `Déclarations` et passe au fichier suivant
- **⏭ Ignorer** → saute ce fichier pour cette session (il réapparaîtra au prochain lancement)

### 4. Consulter vos déclarations

L'onglet **Déclarations** contient toutes vos déclarations validées, prêtes à être
utilisées pour votre déclaration ADAGP officielle.

---

## Changer le modèle IA

Dans l'onglet **⚙️ Config**, modifier les cellules `AI_PROVIDER` et `AI_MODEL` :

| Pour utiliser | `AI_PROVIDER` | `AI_MODEL` | Clé API requise |
|---|---|---|---|
| Gemini Flash (gratuit, recommandé) | `gemini` | `gemini-2.0-flash` | Google AI Studio |
| Gemini 1.5 Pro | `gemini` | `gemini-1.5-pro` | Google AI Studio |
| GPT-4o mini | `openai` | `gpt-4o-mini` | OpenAI |
| GPT-4o | `openai` | `gpt-4o` | OpenAI |

Si vous changez de fournisseur, mettez à jour votre clé API via **ADAGP → Configurer la clé API**.

---

## Adapter le prompt d'extraction

L'IA utilise le texte de la cellule `PROMPT_EXTRACTION` dans l'onglet ⚙️ Config.
Vous pouvez le modifier directement si les résultats ne sont pas satisfaisants.

Le marqueur `[LISTE_OEUVRES]` dans le prompt est automatiquement remplacé par la liste
de vos œuvres de l'onglet 🎨 Œuvres.

---

## Dépannage

| Problème | Solution |
|---|---|
| Le menu ADAGP n'apparaît pas | Recharger la page (F5) — attendre 5–10 secondes |
| "DRIVE_FOLDER_ID non configuré" | Renseigner l'ID dans l'onglet ⚙️ Config |
| "Gemini API erreur 400" | Vérifier la clé API (ADAGP → Configurer la clé API) |
| "Gemini API erreur 429" | Quota dépassé — réessayer dans 1 minute |
| "Onglet 'Déclarations' introuvable" | Lancer ADAGP → Initialiser les onglets |
| L'aperçu du fichier ne s'affiche pas | Vérifier que le fichier est dans un Drive accessible par votre compte Google |
| L'IA laisse les champs vides | Remplir manuellement — ajuster le prompt dans ⚙️ Config si cela se répète |
| Le menu demande des autorisations | Accepter : l'outil a besoin d'accéder à Drive, Sheets et à l'API IA |

---

## Structure du Sheet

| Onglet | Rôle |
|---|---|
| `Déclarations` | Vos déclarations validées (une ligne par passage média) |
| `⚙️ Config` | Paramètres : dossier Drive, modèle IA, prompt d'extraction |
| `🎨 Œuvres` | Liste de vos œuvres (utilisée par l'IA pour identifier les titres) |

---

*Outil développé pour la gestion des droits ADAGP — [Association pour la Diffusion des Arts Graphiques et Plastiques](https://www.adagp.fr)*
