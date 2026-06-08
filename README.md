# Outil de déclaration ADAGP

Outil Google Apps Script pour déclarer les passages médias d'une adhérente ADAGP.
Il analyse les captures TV et les scans presse par IA (Gemini Flash gratuit ou OpenAI), vous laisse
vérifier les champs dans un panneau latéral, et enregistre les déclarations dans un Google Sheet,
avec les colonnes exactes des formulaires officiels ADAGP.

> **Pas besoin d'être à l'aise avec l'informatique.** L'installation se fait une seule fois, en
> suivant les étapes dans l'ordre. Vous ne pouvez rien casser : si une étape échoue, il suffit de la
> recommencer. Une fois en place, l'usage quotidien tient en deux clics.

---

## Prérequis

- Un compte Google (le même que pour vos mails ou Drive habituels).
- Une clé API **Gemini**, gratuite : https://aistudio.google.com/apikey
  *(ou une clé OpenAI si vous préférez ce modèle, mais Gemini suffit et ne coûte rien).*

Une « clé API » est simplement un mot de passe que l'outil utilise pour parler à l'IA. Vous la
copiez une fois, et vous n'y touchez plus.

---

## Installation (une seule fois, environ 10 minutes)

Faites les étapes dans l'ordre, de 1 à 8. Chaque étape est indépendante : vous pouvez vous arrêter et
reprendre plus tard sans rien perdre.

### Étape 1 : préparer le Google Sheet

1. Créer un nouveau Google Sheet vide.
2. Lui donner un nom, par exemple : `Déclarations ADAGP 2026`.

### Étape 2 : ouvrir l'éditeur Apps Script

1. Dans le Sheet, ouvrir le menu **Extensions**, puis cliquer **Apps Script**.
2. L'éditeur s'ouvre dans un nouvel onglet. C'est normal qu'il ait l'air technique : vous allez juste
   y coller du texte, sans rien comprendre au code.

> 📸 **Capture utile ici** : `docs/captures/01-menu-extensions.png`
> *Ce qu'on doit voir : le menu « Extensions » ouvert avec l'option « Apps Script » surlignée.*

### Étape 3 : copier le code depuis [`docs/SCRIPT.md`](docs/SCRIPT.md)

Le fichier [`docs/SCRIPT.md`](docs/SCRIPT.md) contient tout le code à recopier, fichier par fichier. Ouvrez-le à côté,
et pour chaque fichier décrit, suivez la méthode correspondante ci-dessous.

> 💡 Pour garder ce guide ouvert, faites **Ctrl+clic** (ou **Cmd+clic** sur Mac, ou un clic molette)
> sur le lien : `docs/SCRIPT.md` s'ouvrira dans un nouvel onglet.

**Pour les fichiers `.gs` (type « Script ») :**
1. Dans l'éditeur, cliquer le `+` à côté de « Fichiers », puis choisir **Script**.
2. Nommer le fichier exactement comme indiqué (sans écrire l'extension `.gs`).
3. Effacer le contenu par défaut et coller à la place le code correspondant.

**Pour `Sidebar.html` :**
1. Cliquer le `+`, puis choisir **HTML** (et non « Script »).
2. Nommer le fichier `Sidebar`.
3. Remplacer tout le contenu par le code HTML correspondant.

**Pour `appsscript.json` :**
1. Dans l'éditeur, cliquer l'icône ⚙️ **Paramètres du projet**.
2. Cocher la case **« Afficher le fichier manifeste appsscript.json »**.
3. Revenir à la liste des fichiers : un fichier `appsscript.json` y est apparu. Cliquer dessus.
4. Remplacer tout son contenu par le JSON fourni.

Créez les fichiers dans cet ordre (cela évite les messages d'erreur en cours de route) :
1. `Config` (Script)
2. `SheetService` (Script)
3. `DriveService` (Script)
4. `AIService` (Script)
5. `Menu` (Script)
6. `Sidebar` (HTML)

Après chaque collage, cliquer l'icône **💾 Enregistrer** (ou faire `Ctrl+S` / `⌘S`).

> 📸 **Capture utile ici** : `docs/captures/02-editeur-fichiers.png`
> *Ce qu'on doit voir : le bouton `+` pour ajouter un fichier et la liste des fichiers à gauche.*

### Étape 4 : enregistrer la clé API

La clé API ne se colle **jamais** dans le Sheet : elle se range de façon sécurisée dans les
paramètres du script.

> 💡 Le plus simple est de le faire via le menu ADAGP, à l'étape 6. Vous pouvez donc sauter cette
> étape pour l'instant.
>
> Si vous préférez quand même le faire maintenant :
> 1. Dans l'éditeur Apps Script, cliquer l'icône ⚙️, puis **Propriétés du script**.
> 2. Cliquer **« Ajouter une propriété »**.
> 3. Nom : `AI_API_KEY`. Valeur : votre clé Gemini (ou OpenAI).
> 4. Cliquer **Enregistrer**.

### Étape 5 : initialiser le Sheet

1. Retourner dans le Google Sheet et **recharger la page** (touche `F5`, ou `⌘R` sur Mac).
2. Un nouveau menu **ADAGP** apparaît dans la barre de menus, en haut.
   *(S'il n'apparaît pas, patientez quelques secondes et rechargez encore une fois.)*
3. Cliquer **ADAGP**, puis **Initialiser les onglets**.
4. Une fenêtre d'autorisation peut s'ouvrir : c'est Google qui vérifie que vous êtes d'accord.
   Accepter les accès demandés (Drive, Sheets, et appels vers l'IA). C'est sans risque.
5. Quatre onglets sont créés : `📺 Déclarations TV`, `📰 Déclarations Presse`, `⚙️ Config`, `🎨 Œuvres`.

> 📸 **Capture utile ici** : `docs/captures/03-menu-adagp.png`
> *Ce qu'on doit voir : le menu « ADAGP » déroulé avec ses options.*

### Étape 6 : configurer la clé API via le menu

1. Cliquer **ADAGP**, puis **Configurer la clé API**.
2. Coller votre clé Gemini (ou OpenAI) dans la fenêtre.
3. Cliquer **OK**. Un message confirme que c'est enregistré.

### Étape 7 : indiquer le dossier Drive source

C'est le dossier où vous déposerez vos captures et scans.

1. Aller dans l'onglet **⚙️ Config**.
2. Trouver la ligne `DRIVE_FOLDER_ID`.
3. Coller l'identifiant de votre dossier Google Drive dans la colonne **Valeur**.
   - Cet identifiant se trouve dans l'adresse (URL) du dossier, après `folders/` :
     `https://drive.google.com/drive/folders/`**`VOTRE_ID_ICI`**

> 📸 **Capture utile ici** : `docs/captures/04-drive-folder-id.png`
> *Ce qu'on doit voir : la barre d'adresse du navigateur avec la partie ID du dossier entourée.*

### Étape 8 : ajouter vos œuvres

1. Aller dans l'onglet **🎨 Œuvres**.
2. Inscrire la liste de vos créations, une par ligne, dans la colonne « Titre ».
3. L'IA s'appuiera sur cette liste pour reconnaître l'œuvre visible sur chaque capture.
4. Dans l'onglet **⚙️ Config**, mettre votre nom (ou celui de l'adhérente) dans la cellule
   `ARTISTE`. L'IA s'en sert pour mieux repérer vos œuvres dans les images.

**C'est terminé.** Vous n'aurez plus jamais à refaire ces 8 étapes.

---

## Utilisation au quotidien

Trois actions, toujours les mêmes.

### 1. Déposer vos fichiers

Glissez vos captures TV (JPG, PNG) ou vos scans presse (PDF, JPG) dans le dossier Google Drive que
vous avez indiqué à l'étape 7.

Formats acceptés : **JPG, PNG, PDF, GIF, WEBP**.

> L'outil devine tout seul le type de chaque fichier (TV ou Presse) d'après son nom : les PDF et les
> noms contenant un mot de presse (cosmo, figaro, monde, etc.) sont traités comme de la presse ; tout
> le reste comme de la TV.

### 2. Lancer le traitement

Dans votre Google Sheet, cliquer **ADAGP**, puis **Traiter les nouveaux fichiers**.

### 3. Vérifier chaque passage

Un panneau s'ouvre sur le côté droit pour chaque fichier, avec le badge **📺 TV** ou **📰 Presse**.
L'IA a déjà pré-rempli les champs : vous n'avez qu'à relire et corriger si besoin.

**Ce que vous voyez pour une capture TV :**
```
+-------------------------------------+
|  France 4 les maternelles.png   📺  |
|  Fichier 1 sur 5 non traité(s)      |
|  [ Aperçu du fichier ]              |
+-------------------------------------+
|  Chaîne TV    [france4  ]  Type ém. [Magazine v]
|  Date         [27/10/2025] Heure    [19:30   ]
|  Titre émission [Les Maternelles    ]
|  Épisode        [                  ]
|  Titre de l'œuvre  [La Meuf en paillettes v]
|  Nb d'œuvres  [1]  Type util.  [Banc-titre v]
|  Commentaire    [Reportage...        ]
+-------------------------------------+
|  [Ignorer]              [Valider]   |
+-------------------------------------+
```

**Ce que vous voyez pour un scan presse :**
```
+-------------------------------------+
|  COSMO 2.jpg                    📰  |
|  Fichier 2 sur 5 non traité(s)      |
|  [ Aperçu du fichier ]              |
+-------------------------------------+
|  Titre de presse  [Cosmopolitan    ]
|  Pays  [France]   Année  [2026     ]
|  Titre de l'œuvre [La Meuf...  v   ]
|  Nb d'images reproduites  [1       ]
|  Commentaires / Observations  [...  ]
+-------------------------------------+
|  [Ignorer]              [Valider]   |
+-------------------------------------+
```

- Bouton **Valider** : enregistre la ligne dans le bon onglet et passe au fichier suivant.
- Bouton **Ignorer** : saute ce fichier pour cette fois (il reviendra au prochain traitement).

> 📸 **Capture utile ici** : `docs/captures/05-panneau-lateral.png`
> *Ce qu'on doit voir : le vrai panneau latéral ouvert sur un fichier, avec l'aperçu et les champs.*

### 4. Consulter vos déclarations

Les onglets **📺 Déclarations TV** et **📰 Déclarations Presse** rassemblent toutes vos déclarations
validées, avec les colonnes exactes du formulaire officiel ADAGP. Vous pouvez les recopier dans le
portail ADAGP, ou les garder comme archive.

---

## Changer le modèle IA

Dans l'onglet **⚙️ Config**, modifier les cellules `AI_PROVIDER` et `AI_MODEL` :

| Pour utiliser | `AI_PROVIDER` | `AI_MODEL` | Clé API requise |
|---|---|---|---|
| Gemini Flash (gratuit, recommandé) | `gemini` | `gemini-2.0-flash` | Google AI Studio |
| Gemini 1.5 Pro | `gemini` | `gemini-1.5-pro` | Google AI Studio |
| GPT-4o mini | `openai` | `gpt-4o-mini` | OpenAI |
| GPT-4o | `openai` | `gpt-4o` | OpenAI |

Si vous changez de fournisseur, pensez à mettre à jour votre clé API via **ADAGP**, puis
**Configurer la clé API**.

---

## Adapter les instructions données à l'IA

Les cellules `PROMPT_TV` et `PROMPT_PRESSE`, dans l'onglet ⚙️ Config, contiennent les consignes
envoyées à l'IA pour chaque type de fichier. Si les résultats ne vous conviennent pas, vous pouvez
les modifier directement.

Deux repères sont remplacés automatiquement dans ces consignes (laissez-les tels quels) :

- `[ARTISTE]` : remplacé par le nom inscrit dans la cellule `ARTISTE` de l'onglet ⚙️ Config.
- `[LISTE_OEUVRES]` : remplacé par la liste de vos œuvres de l'onglet 🎨 Œuvres.

---

## Dépannage

| Problème | Solution |
|---|---|
| Le menu ADAGP n'apparaît pas | Recharger la page (`F5`), puis patienter 5 à 10 secondes |
| « DRIVE_FOLDER_ID non configuré » | Indiquer l'ID du dossier dans l'onglet ⚙️ Config (étape 7) |
| « Gemini API erreur 400 » | Vérifier la clé API (ADAGP, puis Configurer la clé API) |
| « Gemini API erreur 429 » | Quota momentané dépassé : réessayer dans une minute |
| « Onglet introuvable » | Relancer ADAGP, puis Initialiser les onglets |
| L'aperçu du fichier ne s'affiche pas | Vérifier que le fichier est dans un Drive accessible avec votre compte Google |
| L'IA laisse des champs vides | Les remplir à la main ; au besoin, ajuster `PROMPT_TV` ou `PROMPT_PRESSE` dans ⚙️ Config |
| Le menu demande des autorisations | Accepter : l'outil a besoin d'accéder à Drive, Sheets et à l'API IA |
| Un fichier TV est traité comme Presse | Renommer le fichier pour retirer le mot-clé presse |

En cas de doute, rien n'est définitif : vous pouvez toujours relancer **ADAGP**, puis
**Initialiser les onglets**, ou recommencer une étape de l'installation.

---

## Structure du Sheet

| Onglet | Rôle |
|---|---|
| `📺 Déclarations TV` | Passages TV validés (colonnes du formulaire ADAGP Télévision) |
| `📰 Déclarations Presse` | Articles presse validés (colonnes du formulaire ADAGP Presse) |
| `⚙️ Config` | Paramètres : dossier Drive, modèle IA, nom de l'artiste, consignes d'extraction |
| `🎨 Œuvres` | Liste de vos œuvres (utilisée par l'IA pour reconnaître les titres) |

### Colonnes `📺 Déclarations TV`

| Chaîne TV | Date | Heure | Type d'émission | Titre de l'émission | Épisode | Titre de l'œuvre | Nb d'œuvres | Type d'utilisation | Commentaire | Lien Drive | Statut | Date de saisie |
|---|---|---|---|---|---|---|---|---|---|---|---|---|

### Colonnes `📰 Déclarations Presse`

| Titre de presse | Pays | Année de parution | Titre de l'œuvre | Nb d'images reproduites | Commentaires / Observations | Lien Drive | Statut | Date de saisie |
|---|---|---|---|---|---|---|---|---|

> Chaque onglet contient aussi une dernière colonne technique **`ID Drive`**, masquée
> automatiquement. Elle sert à l'outil pour ne pas retraiter deux fois le même fichier :
> laissez-la telle quelle, inutile d'y toucher.

---

*Outil développé par [Studio Dragamig](https://studiodragamig.fr) pour la gestion des droits ADAGP.
ADAGP : [Association pour la Diffusion des Arts Graphiques et Plastiques](https://www.adagp.fr).*
