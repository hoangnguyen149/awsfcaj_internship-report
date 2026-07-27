---
title: Site param
<<<<<<< HEAD
description: "Afficher la valeur d'un paramètre global du site dans votre page"
---

Les shortcode `siteparam` est utilisé pour vous aider à afficher des valeurs provenant des paramètres globaux du site.

Par exemple, dans ce site, le paramètre `editURL` est utilisé dans le fichier `config.toml`
=======
description : "Afficher la valeur d'un paramètre global du site dans votre page"
---

Les shortcode `siteparam` est utilisé pour vous aider à afficher des valeurs provenant des paramètres globaux du site. 

Par exemple, dans ce site, le paramètre `editURL`  est utilisé dans le fichier `config.toml`
>>>>>>> 14f00160fe1a8798112c92f40478f57213880ddf

```toml
[params]
  editURL = "https://github.com/matcornic/hugo-theme-learn/edit/master/exampleSite/content/"
```

Utilisez le shortcode `siteparam` pour affichier sa valeur.

```
Valeur de `editURL` : {{%/* siteparam "editURL" */%}}
```

s'affiche comme

<<<<<<< HEAD
Valeur de `editURL` : {{% siteparam "editURL" %}}
=======
Valeur de `editURL` : {{% siteparam "editURL" %}}
>>>>>>> 14f00160fe1a8798112c92f40478f57213880ddf
