# Proposal

**Milestone:** M2 (Beta 1 blocker). Triaged on 2026-09-24 from the findings of `baseline-showroom` (archived as `openspec/changes/archive/2026-09-24-baseline-showroom/`, design.md Findings table).

## Why

Packs carry creators' work. The free ProffieOS font packs are CC BY-SA, yet their credit is never shown. Pack contents can be pulled out through the page's own interface, credits are unsigned, and the protection level has never been told to creators. All of this needs settling before third-party packs ship and before the Shadowfoil conversation.

## What Changes

- **SR24:** Pack fonts show their creator and licence wherever they are offered, and appear on the Contributors page.
- **SR17:** Say plainly to creators, in the packing tool's output and in a short doc, what the format does and does not protect against. Decide the key question (roadmap open question) here.
- **SR18:** The page's interface no longer hands out a pack's full contents. Sounds are played and meshes drawn without exposing the raw data to anyone who opens the developer tools, as far as practical. Developer tools are disabled in packaged builds.
- **SR19:** Credits and permissions are protected against editing: signed, or bound into the encryption.
- **SR21:** Pack headers are validated, and unpacking is bounded, so a bad or crafted pack cannot exhaust memory or break a page.
- **SR26:** The font packer includes pre-on, post-off, fast-on and power-off sounds.
- **SR32:** Record in the docs which hilts Shadowfoil Props has agreed to (or not), credit them consistently, and bring GLB packing over from its branch, or record why not.

## Non-goals

- Shipping third-party packs in Beta 1.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `hwpack`: requirements for credited fonts, stated protection, protected credits, validated packs, and complete font packs.
- `contributors`: pack fonts are counted.

## Impact

`apps/desktop/src/main/{hwpack,packs,ipc,index}.ts`, `apps/desktop/scripts/hwpack.ts`, `apps/desktop/src/renderer/src/{Demo,Contributors}.tsx`, docs. Feeds `license-and-notices` and `style-attribution`.
