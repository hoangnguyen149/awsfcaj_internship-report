---
title: Site param
<<<<<<< HEAD
description: "Get value of site params variables in your page."
---

`siteparam` shortcode is used to help you print values of site params.
=======
description : "Get value of site params variables in your page."
---

`siteparam` shortcode is used to help you print values of site params. 
>>>>>>> 14f00160fe1a8798112c92f40478f57213880ddf

For instance, in this current site, the `editURL` variable is used in `config.toml`

```toml
[params]
  editURL = "https://github.com/matcornic/hugo-theme-learn/edit/master/exampleSite/content/"
```

Use the `siteparam` shortcode to display its value.

```
`editURL` Value : {{%/* siteparam "editURL" */%}}
```

is displayed as

<<<<<<< HEAD
`editURL` Value : {{% siteparam "editURL" %}}
=======
`editURL` Value : {{% siteparam "editURL" %}}
>>>>>>> 14f00160fe1a8798112c92f40478f57213880ddf
