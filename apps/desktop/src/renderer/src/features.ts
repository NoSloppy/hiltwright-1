// Beta 1 feature switches: features that are in the code but not ready for testers are hidden here, in one place.
// Turning one on shows it again with nothing else to change. test/features.test.ts fails while either is on, so a
// switch flipped for local work is not committed by accident; flip that test with the switch when a feature ships.
//
// bladeId:         "Do you swap blades?" and Measure on Wiring. On in Beta 2, with `blade-id-verification`.
// xenopixelImport: the Xenopixel import on Fonts & SD. On once it is checked against real Xenopixel cards.

export const FEATURES = { bladeId: false, xenopixelImport: false } as const;
