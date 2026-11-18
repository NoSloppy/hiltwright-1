// Which files of a sound font folder go into a font pack. Kept free of runtime imports so the packer script, which
// Node runs directly, can use it.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { PackItem } from './hwpack';

/** Sound names the demo room can play. Anything else in a font is data the saber reads, not the demo. */
export const PLAYABLE = /^(hum|humm|out|poweron|in|poweroff|clsh|clash|blst|blaster|stab|force|font|boot|lock|lockup|bgnlock|endlock|drag|bgndrag|enddrag|lb|bgnlb|endlb|swingl|swingh|lswing|hswing|swng|swing)$/i;

export interface FontPackItem { name: string; kind: PackItem['kind']; data: Buffer }

/**
 * The items of a font folder. Without `whole`, only the sounds the demo room plays (a pack that may not be copied
 * needs no more). With it, every file in every subfolder, so a copy to a card is the original folder: the sounds,
 * config.ini, smoothsw.ini, and the licence and readme files that CC BY-SA says must travel with it. Playable sounds
 * keep kind 'wav' so demo playback is the same either way; everything else is kind 'file'. Names use `/`.
 */
export function collectFontItems(dir: string, whole: boolean): FontPackItem[] {
  const items: FontPackItem[] = [];
  const walk = (rel: string) => {
    for (const f of readdirSync(join(dir, rel)).sort()) {
      const r = rel ? `${rel}/${f}` : f;
      const st = statSync(join(dir, r));
      if (st.isDirectory()) {
        if (whole || (!rel && PLAYABLE.test(f))) walk(r);
      } else if (st.isFile()) {
        const isWav = /\.wav$/i.test(f);
        const playable = isWav && (rel ? !rel.includes('/') && PLAYABLE.test(rel) : PLAYABLE.test(f.replace(/\d*\.wav$/i, '')));
        if (playable) items.push({ name: r, kind: 'wav', data: readFileSync(join(dir, r)) });
        else if (whole) items.push({ name: r, kind: 'file', data: readFileSync(join(dir, r)) });
      }
    }
  };
  walk('');
  return items;
}
