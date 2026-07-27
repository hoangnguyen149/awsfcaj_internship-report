---
date: 2018-11-29T08:41:44+01:00
title: Tags
weight: 40
tags: ["documentation", "tutorial"]
---

<<<<<<< HEAD
_Learn theme_ support one default taxonomy of gohugo: the _tag_ feature.

## Configuration

Just add tags to any page:
=======
*Learn theme* support one default taxonomy of gohugo: the *tag* feature.

## Configuration 

Just add tags to any page: 
>>>>>>> 14f00160fe1a8798112c92f40478f57213880ddf

```markdown
---
date: 2018-11-29T08:41:44+01:00
title: Theme tutorial
weight: 15
<<<<<<< HEAD
tags: ["tutorial", "theme"]
=======
tags: ["tutorial", "theme"] 
>>>>>>> 14f00160fe1a8798112c92f40478f57213880ddf
---
```

## Behavior

<<<<<<< HEAD
The tags are displayed at the top of the page, in their insertion order.

Each tag is a link to a _Taxonomy_ page displaying all the articles with the given tag.

## List all the tags

In the `config.toml` file you can add a shortcut to display all the tags
=======

The tags are displayed at the top of the page, in their insertion order.

Each tag is a link to a *Taxonomy* page displaying all the articles with the given tag. 

## List all the tags

In the `config.toml`  file you can add a shortcut to display all the tags
>>>>>>> 14f00160fe1a8798112c92f40478f57213880ddf

```toml
[[menu.shortcuts]]
name = "<i class='fas fa-tags'></i> Tags"
url = "/tags"
weight = 30
<<<<<<< HEAD
```
=======
```
>>>>>>> 14f00160fe1a8798112c92f40478f57213880ddf
