// What the About screen says that does not depend on the machine: where the source of a build lives, and the
// statement about how Hiltwright's own styles were made. No Electron here, so main, the page and tests share it.

export const SOURCE_REPO = 'https://github.com/safwyls/hiltwright';

export const LICENCE_NAME = 'GPL-3.0-or-later';

export const STYLE_STATEMENT = "Hiltwright's own styles were composed from ProffieOS building blocks, taking ideas only from public style descriptions.";

/** A release version as npm writes it: 0.1.0, or with a prerelease such as 0.2.0-beta.1. Build metadata is not used for tags. */
const VERSION = /^\d+\.\d+\.\d+(-[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?$/;

/** The tagged source of a build: the release tag is the version with a "v" in front. Null if the version is not a plain release version. */
export function sourceUrl(version: string): string | null {
  const v = version.trim().replace(/^v/, '');
  return VERSION.test(v) ? `${SOURCE_REPO}/tree/v${v}` : null;
}

/** The licence and notices files that ship with the app, as text. Missing ones are null. */
export interface LegalTexts { licence: string | null; notices: string | null }
