# Captures d'écran à ajouter

Ce dossier accueille les captures d'écran référencées dans le `README.md` principal.
Tant qu'une image n'est pas déposée ici, le README affiche un petit encadré « 📸 Capture utile ici »
à la place : rien n'est cassé, c'est juste un repère.

## Comment ajouter une capture

1. Faire la capture d'écran demandée (voir la liste ci-dessous).
2. L'enregistrer dans ce dossier `docs/captures/` avec **exactement** le nom de fichier indiqué.
3. Dans `README.md`, remplacer l'encadré de repère par la ligne d'image. Par exemple, remplacer :

   ```
   > 📸 **Capture utile ici** : `docs/captures/01-menu-extensions.png`
   > *Ce qu'on doit voir : le menu « Extensions » ouvert avec l'option « Apps Script » surlignée.*
   ```

   par :

   ```
   ![Menu Extensions vers Apps Script](docs/captures/01-menu-extensions.png)
   ```

Astuce : un cadre rouge ou une flèche sur la zone importante aide beaucoup une personne qui découvre.

## Liste des captures attendues

| Fichier | Étape | Ce qu'on doit voir |
|---|---|---|
| `01-menu-extensions.png` | Étape 2 | Le menu « Extensions » du Sheet ouvert, option « Apps Script » surlignée |
| `02-editeur-fichiers.png` | Étape 3 | L'éditeur Apps Script : le bouton `+` et la liste des fichiers à gauche |
| `03-menu-adagp.png` | Étape 5 | Le menu « ADAGP » déroulé avec ses options |
| `04-drive-folder-id.png` | Étape 7 | La barre d'adresse du dossier Drive, partie ID entourée |
| `05-panneau-lateral.png` | Usage quotidien | Le panneau latéral ouvert sur un fichier, avec aperçu et champs |

Format conseillé : PNG, largeur 800 à 1200 px. Pensez à masquer toute information personnelle
(adresse mail, contenu sensible) avant de committer une capture.
