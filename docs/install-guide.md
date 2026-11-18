# Hiltwright 0.2.0-beta.1: install guide (draft)

Hiltwright Beta 1 is not signed. Windows will warn you. This guide takes you from the download to your first firmware install.

## Before you start

You need:

- Windows 10 or 11, 64-bit. Windows in S mode is not supported. S mode can only run Microsoft Store apps. Microsoft says you can leave S mode for free, but you cannot go back.
- A Proffieboard V2.2 or V3.
- A USB data cable. Some cables only charge.
- About 2.5 GB of free disk space. The first-run setup downloads about 360 MB and uses about 1.9 GB.
- The installer is about 205 MB.

## 1 Download

1. Open https://github.com/safwyls/hiltwright/releases/tag/v0.2.0-beta.1
2. Download `Hiltwright-0.2.0-beta.1-setup.exe`.

## 2 Windows warnings when you run the installer

The installer installs for your account only. It does not ask for administrator approval.

**Browser.** Edge and Chrome flag the download and ask whether to keep the file. Choose to keep it. The exact words differ between browsers and versions; look for **Keep**, sometimes under a **…** or arrow menu beside the download.

**Unblock.** Windows marks downloaded files. To clear the mark:

1. Right-click the installer and choose **Properties**.
2. On the **General** tab, tick **Unblock**.
3. Choose **OK**.

If you do not see **Unblock**, the file is not marked. Go on.

**SmartScreen.** Double-click the installer. You may see "Windows protected your PC".

1. Choose **More info**.
2. Choose **Run anyway**.

TODO(owner): confirm these names on a clean Windows 10 and Windows 11 PC.

If there is no **Run anyway** button, read the next section.

## 3 Smart App Control

Smart App Control is on some new Windows 11 PCs. It blocks unsigned apps. It gives no **Run anyway** choice. Microsoft says there is no way to allow one app.

To check:

1. Open **Windows Security**.
2. Choose **App & browser control**.
3. Choose **Smart App Control settings**.
4. It says **On**, **Evaluation** or **Off**.

**On** blocks unsigned apps. **Evaluation** may turn itself off, or may switch to **On**. **Off** does nothing.

On the developer's PC, with Smart App Control turned back on, the installer ran and was not blocked. That is one PC, so yours may differ.

If Smart App Control does block Hiltwright, do not turn it off just for this. Tell us what it said and at which step (section 7): the installer, the one-time setup download, or the first build.

TODO(owner): whether Smart App Control said On or Evaluation during that test, and whether the setup download and a build were also run with it on

## 4 First run: the one-time setup download

1. Open Hiltwright.
2. Go to the **Build** page and find **Compiler**. It says "one-time download".
3. Choose **Download and install**.
4. Wait. Setup downloads about 360 MB. It checks each file before it uses it.
5. When it says ProffieOS is ready, setup is done.

Setup gets arduino-cli and the ProffieOS source from GitHub. It gets the Proffieboard board support, with the compiler and dfu-util, from the ProffieOS author's package index.

Setup installs to `C:\ProgramData\Hiltwright`. If that folder is not available, it uses a short folder in your own profile. Only administrators and your account can change the folder.

If setup says there is not enough space, free some space and choose **Try again**.

On a fast connection, setup takes about a minute.

## 5 The one Windows approval to expect

Your first install needs a one-time bootloader driver. Windows asks for administrator approval once.

1. Plug in your saber with the USB data cable.
2. Put the board in bootloader mode if Hiltwright asks. Hold BOOT, tap RESET, then release BOOT.
3. During the install, the **Build** page stops at "Windows needs a driver". Choose **Install the driver**.
4. Hiltwright downloads a 3 MB installer from the ProffieOS author, checks it, and starts it.
5. Choose **Yes** when Windows asks for approval.
6. Leave the saber plugged in. The install carries on by itself.

If you choose **No**, the driver is not installed and you cannot flash.

## 6 If antivirus flags something

Unsigned files are sometimes flagged by mistake. If Defender or another antivirus blocks or removes a file:

1. Do not turn your antivirus off.
2. Note the file name and the warning.
3. Tell us (section 7).
4. You can submit the file to Microsoft at https://www.microsoft.com/wdsi/filesubmission. Say it is a false positive.

TODO(owner): whether the installer or the downloaded tools have been checked with Defender

## 7 Where to report a problem

1. In Hiltwright, press **Save diagnostics**. It saves a file on your PC. It does not send anything.
2. Open https://github.com/safwyls/hiltwright/issues
3. Describe what happened and which step you were on.
4. Attach the diagnostics file.

Source for this build: https://github.com/safwyls/hiltwright/tree/v0.2.0-beta.1
