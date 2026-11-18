import { describe, expect, it } from 'vitest';
import { QUICK_COMMANDS, destructiveReason } from '../src/renderer/src/consoleCommands';

describe('destructiveReason', () => {
  it('asks before restarting the board', () => {
    for (const c of ['reboot', 'RebootDFU', 'rebootdfu', '  REBOOT  ', 'dfu', 'bootloader', 'reset']) expect(destructiveReason(c), c).toMatch(/restarts the saber/);
  });
  it('asks before deleting or overwriting files', () => {
    for (const c of ['del common/voicepack.ini', 'DEL tracks/a.wav', 'rm foo.wav', 'rmdir old', 'format', 'erase', 'mv a b', 'rename a b', 'cp a b']) expect(destructiveReason(c), c).toMatch(/SD card/);
  });
  it('lets plain reads and settings through', () => {
    for (const c of ['version', 'battery', 'get_volume', 'set_volume 1500', 'dir common', 'cat common/voicepack.ini', 'list_fonts', 'show_current_preset', 'mkdir foo', 'scanid', '']) expect(destructiveReason(c), c).toBeNull();
  });
  it('looks at every command in a chained line', () => {
    expect(destructiveReason('version; reboot')).toMatch(/restarts/);
    expect(destructiveReason('battery\ndel x')).toMatch(/SD card/);
    expect(destructiveReason('version; battery')).toBeNull();
  });
  it('is not fooled by leading punctuation', () => {
    expect(destructiveReason('>reboot')).toMatch(/restarts/);
  });
  it('errs toward asking when a first word only starts like a dangerous one', () => {
    expect(destructiveReason('delta_check')).not.toBeNull();
    expect(destructiveReason('resume')).toBeNull();
  });
});

describe('the quick buttons', () => {
  it('no longer include id, which ProffieOS 8 rejects', () => {
    expect(QUICK_COMMANDS).not.toContain('id');
    expect(QUICK_COMMANDS).toContain('scanid');
  });
  it('are all plainly safe', () => {
    for (const q of QUICK_COMMANDS) expect(destructiveReason(q), q).toBeNull();
  });
});
