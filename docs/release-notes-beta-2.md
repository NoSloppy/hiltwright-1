# Hiltwright 0.2.0-beta.2

## New in this beta

- **Updates from inside the app.** Hiltwright now looks for a newer version a little after it starts and every few hours, by asking GitHub for its list of releases. A chip under the version in the sidebar says when one is out. Nothing is downloaded until you press Download on the About page, and nothing is installed until you press Restart to update. A switch on About turns the check off. The check sends nothing about your sabers or you.
- **Remove a saber from the Armory.** Every saber that is not plugged in has a Remove button. It asks first, and says what is removed and what is kept. Firmware backups and preset history stay as files.
- **A website.** hiltwright.com has a walkthrough of every page and the user docs.

Not yet proven: the update itself. This is the first beta with the updater, so the first real update will be from this beta to the next one. If it does not work, install the next beta by hand and tell us.

## What Hiltwright is

Hiltwright is a desktop app that gives lightsaber owners coming from Crystal Focus X, Xenopixel and LGT boards everything ProffieOS can do. You do not need Arduino, C++, drivers or the style language.

## Who this beta is for

This is a closed beta for experts: installers and style builders who own a Proffieboard V2.2 or V3. It runs on Windows only.

## What the beta promises

> "Plan your saber, choose styles and fonts, build custom styles, demo any premade or created style and font in the demo room, then build and install it, with live preset editing, all without touching Arduino or any code."

## What is hidden in this beta

Blade ID and the Xenopixel import are hidden behind one switch. The code stays in the app.

## What is not in this beta yet

- Card formatting. A card formatter is not in this beta.
- Code signing.
- macOS and Linux.
- Building fonts from sounds.

## Free sound fonts

The six free ProffieOS fonts are included and can be copied to a card from Fonts & SD.

## Install

Coming from 0.2.0-beta.1? Download this installer and run it. It installs over the old one and keeps your sabers, styles, fonts and backups. This is the last beta you install by hand.

The installer is unsigned, so Windows will warn you before it runs. If Smart App Control is on, Windows blocks both the installer and the app, and it has to stay off while you use this beta: check that first (install guide, section 3). The install guide covers each Windows barrier to unsigned software.

Install guide: https://github.com/safwyls/hiltwright/blob/v0.2.0-beta.2/docs/install-guide.md

## Licence and source

Hiltwright is licensed under GPL-3.0-or-later. The source for this build is at https://github.com/safwyls/hiltwright/tree/v0.2.0-beta.2

## Report a problem

Open an issue at https://github.com/safwyls/hiltwright/issues. Each report is answered: it is fixed, planned for a later release, or closed with a reason.

When you report a problem, press "Save diagnostics" in the app and attach the file it saves.
