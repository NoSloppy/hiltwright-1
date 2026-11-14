// The Diagnostics console: its quick buttons, and which typed commands are asked about before they are sent.

/** The quick buttons. Every one only reads. `id` is not here: ProffieOS 8 does not have it. */
export const QUICK_COMMANDS = ['version', 'battery', 'get_volume', 'get_preset', 'show_current_preset', 'list_fonts', 'list_tracks', 'scanid'] as const;

// First words that restart the board or take it out of normal running.
const REBOOTS = /^(reboot\w*|reset|restart|dfu|bootloader|enter_?dfu|poweroff|shutdown)$/i;
// First words that remove, overwrite or reformat files on the card.
const FILE_LOSS = /^(del\w*|rm\w*|erase\w*|remove|format\w*|wipe\w*|mv|move|rename|ren|cp|copy|write\w*|truncate|unlink|rd)$/i;

/**
 * Why a typed console command should be confirmed before it is sent, in plain words, or null when it is plainly safe.
 * It errs toward asking: a command is only let through when its first word is not one that restarts the board or
 * changes files, for every command in a line (commands can be chained with ";"). Leading punctuation is ignored.
 */
export function destructiveReason(command: string): string | null {
  for (const part of command.split(/[;\r\n]+/)) {
    const first = part.trim().replace(/^[^A-Za-z0-9_]+/, '').split(/\s+/)[0] ?? '';
    if (!first) continue;
    if (REBOOTS.test(first)) return `"${first}" restarts the saber. The connection will drop, and any change that was not saved is lost.`;
    if (FILE_LOSS.test(first)) return `"${first}" can delete or overwrite files on the saber's SD card, and there is no undo.`;
  }
  return null;
}
