# tsover

A fork of TypeScript that adds only one functionality to the type checker... operator **over**loading.

## Setup in VSCode/Cursor

```jsonc
// .vscode/settings.json
{
  "typescript.tsdk": "node_modules/tsover/lib"
}
```

## Setup in Zed

### vtsls (default)
Configure vtsls settings in your Zed settings file:

```jsonc
// .zed/settings.json
{
  "lsp": {
    "vtsls": {
      "settings": {
        "typescript": {
          "tsdk": "node_modules/tsover/lib",
        },
      },
    },
  },
  // ...
}
```
