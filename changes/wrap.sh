#!/bin/sh
# dist/Changes.html = standalone artifact wrapped in a document skeleton
{ printf '%s\n' '<!doctype html>' '<html lang="en">' '<head>' '<meta charset="utf-8">' '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">' '<style>html{color-scheme:dark}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>' '</head>' '<body>'; cat dist/artifact.html; printf '%s\n' '</body>' '</html>'; } > dist/Changes.html
