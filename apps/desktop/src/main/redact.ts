// Keeps personal details out of the log and the diagnostics file: the owner's user folder, Windows user name and
// computer name become fixed placeholders. The rest of a path is kept so the location still reads.

import { homedir, hostname, userInfo } from 'node:os';

export interface Personal {
  home: string;
  user: string;
  host: string;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function makeRedactor(p: Personal): (text: string) => string {
  const rules: [RegExp, string][] = [];
  // The home folder first, in either slash direction, so C:\Users\Sam\x and C:/Users/Sam/x both keep their shape.
  const home = p.home.replace(/[\\/]+$/, '');
  if (home.length > 3) {
    const parts = home.split(/[\\/]+/).map(escape);
    rules.push([new RegExp(parts.join('[\\\\/]+') + '(?![A-Za-z0-9])', 'gi'), '%USERPROFILE%']);
  }
  // Names only as whole words, so a short name does not eat the middle of another word.
  const word = (s: string, to: string) => {
    if (s.trim().length < 2) return;
    rules.push([new RegExp(`(?<![A-Za-z0-9])${escape(s)}(?![A-Za-z0-9])`, 'gi'), to]);
  };
  word(p.user, '<user>');
  word(p.host, '<computer>');
  return (text) => rules.reduce((t, [re, to]) => t.replace(re, to), text);
}

function personal(): Personal {
  let user = '';
  try { user = userInfo().username; } catch { /* no user record */ }
  return { home: homedir(), user, host: hostname() };
}

let shared: ((text: string) => string) | null = null;

/** The redactor for this computer. */
export function redact(text: string): string {
  shared ??= makeRedactor(personal());
  return shared(text);
}
