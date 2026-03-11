This project heavily relies on embedding raw Markdown text inside HTML `<template>` tags (e.g. `<template data-target="...">`). 

Because Markdown syntax is highly space and indentation-sensitive, you MUST NOT automatically format or change the indentation of HTML files containing these `<template>` tags. 

Do not run automatic formatters on HTML or Markdown files in this repository without explicit permission, and when modifying HTML files, preserve the exact whitespace and indentation existing within `<template>` blocks.
