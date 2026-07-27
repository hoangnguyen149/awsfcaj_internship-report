---
title: Attachments (Pièces jointes)
<<<<<<< HEAD
description: "The Attachments shortcode displays a list of files attached to a page."
---

Le shortcode _Attachments_ affiche une liste de pièces jointes d'une page.
=======
description : "The Attachments shortcode displays a list of files attached to a page."
---

Le shortcode *Attachments* affiche une liste de pièces jointes d'une page.
>>>>>>> 14f00160fe1a8798112c92f40478f57213880ddf

{{% attachments /%}}

## Utilisation

Le shortcode affiche la liste de fichiers trouvés dans un **dossier spécifique**
A l'heure actuelle, il supporte deux implémentations

1. Si votre page est un fichier Markdown, les pièces jointes doivent être placée dans un **dossier** nommé comme le nom de la page et suffixé par **.files**.

<<<<<<< HEAD
   > - content
   >   - \_index.md
   >   - page.files
   >     - attachment.pdf
   >   - page.md

2. Si votre page est un **dossier**, les pièces jointes doivent être placées dans un dossier fils **'files'**.

   > - content
   >   - \_index.md
   >   - page
   >     - index.md
   >     - files
   >       - attachment.pdf
=======
    > * content
    >   * _index.md
    >   * page.files
    >      * attachment.pdf
    >   * page.md

2. Si votre page est un **dossier**, les pièces jointes doivent être placées dans un dossier fils **'files'**.

    > * content
    >   * _index.md
    >   * page
    >      * index.md
    >      * files
    >          * attachment.pdf
>>>>>>> 14f00160fe1a8798112c92f40478f57213880ddf

Attention, si votre site est multi-langue, vous devrez avec autant de dossier qu'il y a de langues.

C'est tout !

### Paramètres

<<<<<<< HEAD
| Paramètre | Défaut           | Description                                                                                                                                                                                                            |
| :-------- | :--------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| title     | "Pièces jointes" | Titre de la liste                                                                                                                                                                                                      |
| style     | ""               | Choisir entre "orange", "grey", "blue" et "green" pour un style plus sympa                                                                                                                                             |
| pattern   | ".\*"            | Une expression régulière, utilisée pour filtrer les pièces jointes par leur nom de fichier. <br/><br/>Le paramètre **pattern** doit être une [expression régulière](https://en.wikipedia.org/wiki/Regular_expression). |

Par exemple:

- Pour trouver les fichiers avec le suffixe 'jpg', utilisez **.\*jpg** (pas \*.jpg).
- Pour trouver les fichiers avec les suffixe 'jpg' ou 'png', utilisez **.\*(jpg|png)**
=======
| Paramètre | Défaut | Description |
|:--|:--|:--|
| title | "Pièces jointes" | Titre de la liste  |
| style | "" | Choisir entre "orange", "grey", "blue" et "green" pour un style plus sympa |
| pattern | ".*" | Une expression régulière, utilisée pour filtrer les pièces jointes par leur nom de fichier. Le paramètre **pattern** doit être une [expression régulière](https://en.wikipedia.org/wiki/Regular_expression). |

Par exemple:

* Pour trouver les fichiers avec le suffixe '.jpg', utilisez `.*\.jpg$` (pas `*.jpg`).
* Pour trouver les fichiers avec les suffixe '.jpg' ou '.png', utilisez `.*\.(jpg|png)$`.
>>>>>>> 14f00160fe1a8798112c92f40478f57213880ddf

### Exemples

#### Lister les pièces jointes de type pdf ou mp4

<<<<<<< HEAD
    {{%/*attachments title="Fichiers associés" pattern=".*(pdf|mp4)"/*/%}}

s'affiche comme

{{%attachments title="Fichiers associés" pattern=".*(pdf|mp4)"/%}}
=======

    {{%/*attachments title="Fichiers associés" pattern=".*\.(pdf|mp4)$"/*/%}}

s'affiche comme

{{%attachments title="Fichiers associés" pattern=".*\.(pdf|mp4)$"/%}}
>>>>>>> 14f00160fe1a8798112c92f40478f57213880ddf

#### Modifier le style

    {{%/*attachments style="orange" /*/%}}

s'affiche comme

{{% attachments style="orange" /%}}

<<<<<<< HEAD
=======

>>>>>>> 14f00160fe1a8798112c92f40478f57213880ddf
    {{%/*attachments style="grey" /*/%}}

s'affiche comme

{{% attachments style="grey" /%}}

    {{%/*attachments style="blue" /*/%}}

s'affiche comme

{{% attachments style="blue" /%}}
<<<<<<< HEAD

=======
    
>>>>>>> 14f00160fe1a8798112c92f40478f57213880ddf
    {{%/*attachments style="green" /*/%}}

s'affiche comme

<<<<<<< HEAD
{{% attachments style="green" /%}}
=======
{{% attachments style="green" /%}}
>>>>>>> 14f00160fe1a8798112c92f40478f57213880ddf
