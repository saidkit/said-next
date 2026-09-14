# Surface-contract element grammar - `web` surface

**Surface:** `web` - Next.js SSR screens (App Router). This is the element **grammar** the `uxtoc`
skill consumes to walk a web feature/screen spec into a design outline, and the `completeness` check
consumes to derive DESIGNED. The engine skill carries no surface vocabulary: it LOADs this section
WHOLE (selected by the consuming lane's `SAID.surface:`), echoes the SC-HEADER `token,count`, and
reasons only over what it loaded. A different surface (cli, api, native) declares its own section; the
engine is medium-agnostic and owns only the projection RULE (`element-projection.md`).

Schema: the `SC-HEADER` fields are **comma-separated** `key=value`, and the multi-value keys in
`## Machine-readable` are **`;`-separated** (never dot-separated). `count=` must equal the number of
`containers=`.

Proof-of-load: a consumer echoes `UXG-WEB-1 count=3` before emitting or projecting. `count` is the
number of `containers` in the SC-HEADER (obtainable only by reading). No token or count echoed ->
HALT. Parse the SC-HEADER **key-anchored** (find `containers=` by name and split its value on `;`),
never by splitting the header on a field separator.

<!-- SC-HEADER: feature-ux-grammar,surface=web,unit=Screen,unit-home=inline,containers=Columns;Sections;Row actions,token=UXG-WEB-1,count=3 -->

## Unit + walk order

The unit is a **Screen**. `uxtoc` emits one `## Screen <ID> - <title>` header per screen; the
projection reads `<ID>` as the unit key. Walk and capture only what the spec states (never invent;
omit a silent attribute entirely), in this order:

1. **Identity** - the screen `<ID>` is its **canonical name** (the stable id the header carries).
   The route path is an **attribute** of the screen, never the unit key - so a moved route never
   changes the unit id.
2. **Columns** - the fields a list/table screen renders per row.
3. **Sections** - the page regions a screen composes (header band, form, detail panel).
4. **Row actions** - the per-row operations the screen offers.

## Containers (attribute schema, emit order)

Every element is a **keyed line** `- <key>:` directly under its container header; its attributes are
keyed or valued lines nested beneath it. Keyed form is mandatory - a bare prose bullet is not an
element.

- **Columns** - one element per rendered column; `<key>` = the column's field name.
  - attributes: `title` (the header label), `type`, `render` (how the cell renders), `required`.
- **Sections** - one element per page region; `<key>` = the section name.
  - attributes: `title`, `label`.
- **Row actions** - one element per per-row action; `<key>` = the action name.
  - attributes: `label`, `type`, `hidden` (true|false).

**Qualify a duplicate key.** Keys are unique per screen across containers: where a key would repeat
(a `status` column and a `status` section), qualify one (`status-col`) so the projection keeps the two
distinct and a screen never silently collapses two elements into one.

## Trust tiers (declaration-bound)

The completeness capture's guarantee is a property of the container, declared here (not decided at
capture time):

`oracle-containers:` (below) declares the containers intended to be verified author-independently by a
web capture probe (a DOM/route walk the front lane supplies under its own cycle).

- **web oracle tier (intended)** - a container in `oracle-containers` is verified author-independently
  when the capture manifest declares a per-unit `cmd:` (a front-supplied read-only DOM/route probe):
  the engine runs that probe as given (the front owns its read-only-ness - there is no universal
  `--help` short-circuit for web) and checks each designed element against the built keys it lists.
- **declared-evidence (the honest default here)** - absent a probe, a web container falls to the
  capture manifest (`## <unit-key>` / `built: <key>`); the verdict reports it as manifest AND WARNs
  which oracle-intended containers fell to declared-evidence, so a reader knows those elements are
  author-trusted (manifest), not author-independently verified. This is a legitimate honest fallback,
  not a FAIL - a web adopter runs the gate green today; the WARN owns the coverage ceiling until a
  front supplies a probe.

## Machine-readable
attributes: title;type;label;render;hidden;required;route
not-elements: Sorts;Empty state
oracle-containers: Columns;Sections;Row actions

## Unit-spec stencil

A web screen lives inline in its feature spec as a `### Screen <ID>` sub-section
(`unit-home=inline`). uxtoc mirrors it into a `## Screen <ID>` outline section:

    ### Screen <ID> - <one-line title>
    - route: `<the route path>`
    - Columns:
      - <field-name>:
        - title: <header label>
        - type: <type>
        - render: <how the cell renders>
    - Sections:
      - <section-name>:
        - title: <region title>
    - Row actions:
      - <action-name>:
        - label: <button label>
        - type: <action type>

A container with nothing to state is written `<container>: none - <reason>` (the explicit-empty
idiom, an operator-owned outline convention); a screen yielding zero designed elements is a hollow FAIL.

## Determinism
The projection over this grammar is purely structural over the closed container + attribute sets - no
selection, ranking, or inference; byte-stable across re-runs of the same outline.
