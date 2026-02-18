# 0.0.3
- Not exporting the helper functions, limiting the public API surface.

# 0.0.2
- Populating the global scope with helper functions, so that code transformers (like `tsover/plugin`, `unplugin-typegpu`) have access to them without requiring a direct runtime dependency (a transitive dependency is fine).

# 0.0.1

- Initial release of the `tsover-runtime` package.
- `Operator` object with reexported symbols.
- `add`, `sub`, `mul`, `div` functions.
- `TsoverEnabled` type, to apply conditional logic at the type level.
