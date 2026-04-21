`src/components/shared` is the project-wide home for reusable UI primitives.

Use this folder only for:
- visual building blocks reused across multiple features
- layout, table, modal, and display shells with no feature-specific language

Keep components feature-local when they:
- encode domain behavior for a single feature
- depend on feature-specific hooks, payloads, or validation rules
- wrap a page or workflow that is not reusable across features

Folder convention:
- `layout/` for shared wrappers and shells
- `table/` for reusable table framing
- `modal/` for reusable modal framing
- `display/` for small shared presentational pieces

`src/shared` remains utility-only and should not become a UI component folder.
