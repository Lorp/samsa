## Samsa help system

These files are contextual help documents, that are loaded dynamically by the Samsa-GUI app.

The help files are currently loaded by clicking the ‘i’ icon at the top right of each panel. The filenames of the help files correspond to the DOM `id` of the panel, thus to connect a help file to the “Delta sets” panel, we look at its `id`, which is `panel-tvts`, and therefore load `panel-tvts.md`.

Help files are formatted in a subset of Markdown. Samsa is able to parse this without requiring a real Markdown parser.

### Supported syntax

- \# : \<_h1_\>
- \#\# : \<_h2_\>
- \#\#\# : \<_h3_\>
- \#\#\#\# : \<_h4_\>
- \#\#\#\#\# : \<_h5_\>
- \#\#\#\#\#\# : \<_h6_\>
- \[link text\]\(url\) : _link_
- \*xxx\* and \_xxx\_ : *italic*
- \*\*xxx\*\* and \_\_xxx\_\_ : *bold*
- \`xxx\` : *terminal font*
- \[space\]\[space\]\[linebreak\] : \<br\>
- \[consecutive linebreaks\] : *new paragraph*
- \* : *unnumbered list item*
- [number] : *ordered list item*