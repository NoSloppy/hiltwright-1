// "From <saber>" in the demo room (SR12): what one blade of one of the saber's presets puts on the room's blade.
// Pure, so it can be tested under node. The style is the one the preset runs (still waiting in the plan, else the one
// installed); its colours come from the same rule the Styles page uses to find a slot's settings (`slotArgs`).

import { argInfo, colorWordToHex, lookAtSlot, parseBuiltin, type FirmwareManifest, type LookDef, type PresetRecord, type SaberConfigModel } from '@hiltwright/core';
import { slotArgs } from './styleToSaber';

export interface BladeLoad {
  /** The room's style to switch to, or null to leave the blade as it is. */
  lookId: string | null;
  /** The preset's own colours for that style, as hex by argument number: only the ones the style reads. */
  colours: Record<number, string>;
  /** Said plainly when the preset's style cannot be shown, with what is shown instead. */
  note: string | null;
}

export interface BladeLoadInput {
  model: SaberConfigModel | null | undefined;
  firmware: FirmwareManifest | null | undefined;
  /** The presets as the saber reports them (or as last read): the ones the picker lists. */
  saberPresets: PresetRecord[];
  /** 0-based, in `saberPresets`. */
  preset: number;
  /** 1-based. */
  blade: number;
  /** The styles the room can show. */
  shown: LookDef[];
  /** The name of the style on this blade now, which stays when the preset's cannot be shown. */
  current: string;
}

/** The plan's choices, unless the plan holds a staged list: its positions are not the saber's, which the picker lists. */
const plan = (model: SaberConfigModel | null | undefined): SaberConfigModel | null => (model && !model.presetsFrom ? model : null);

/** The style a preset's blade runs: the one chosen in the plan and not yet installed, else the one the firmware has there. */
export function presetLookId(input: Pick<BladeLoadInput, 'model' | 'firmware' | 'saberPresets' | 'preset' | 'blade'>): { id: string; name: string } | null {
  const { firmware, saberPresets, preset, blade } = input;
  const model = plan(input.model);
  const queued = model?.presets[preset]?.looks?.[blade - 1];
  if (queued) return { id: queued, name: model?.looks?.find((l) => l.id === queued)?.name ?? firmware?.looks.find((l) => l.id === queued)?.name ?? queued };
  if (!firmware) return null;
  const style = saberPresets[preset]?.styles[blade - 1];
  const b = style ? parseBuiltin(style) : null;
  const had = lookAtSlot(firmware, b ? b.preset : preset, b ? b.blade : blade);
  return had ? { id: had.id, name: had.name } : null;
}

export function presetBladeLoad(input: BladeLoadInput): BladeLoad {
  const { saberPresets, preset, blade, shown, current } = input;
  const name = (saberPresets[preset]?.name ?? `Preset ${preset + 1}`).replace(/\s*\n\s*/g, ' ');
  const keep = (note: string): BladeLoad => ({ lookId: null, colours: {}, note });
  const found = presetLookId(input);
  if (!found) return keep(`Hiltwright cannot tell which style ${name} runs on blade ${blade}, so the blade still shows ${current}.`);
  const look = shown.find((l) => l.id === found.id);
  if (!look) return keep(`${name} runs ${found.name} on blade ${blade}, which the demo room cannot show yet, so the blade still shows ${current}.`);
  // The same rule as the Styles page: colours still waiting in the plan, else those on the saber's preset.
  const words = slotArgs(plan(input.model) ?? ({ presets: [] } as unknown as SaberConfigModel), saberPresets, preset, blade);
  const colours: Record<number, string> = {};
  for (const n of look.args) {
    if (argInfo(n).kind !== 'color') continue;
    const hex = words.has(n) ? colorWordToHex(words.get(n)!) : null;
    if (hex) colours[n] = hex;
  }
  return { lookId: look.id, colours, note: null };
}
