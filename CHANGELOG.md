# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - unreleased

Profile-functional (series bar): a faithful port of
`BACnetProfileExample-B-SS-CPP` v1.3.0. The sensor performs the B-SS Profile
Function - ANSI/ASHRAE 135-2024 Annex L.4.5, "Ability to provide values for any
of its BACnet objects upon request" - with readings that change, and shows a
Failure Mode. The BACnet Surface is unchanged (DS-RP-B, DM-DDB-B, DM-DOB-B; the
same five objects).

### Added

- **Sensor Simulation** (`main.ts` section 2, `SensorSimulationTick()`,
  labelled Simulation in the README): once a second Analog Input 1 moves 0.5 C
  between 18.0 and 26.0, Binary Input 1 toggles every 3 s, Multi-State Input 1
  steps 1 -> 2 -> 3 -> 1 every 4 s. Before, all three were constants (Analog
  Input 1 changed only on an arrow key).
- **Analog Input 1 `Reliability`** (optional property, now enabled):
  `no-fault-detected`, or `open-loop` while the simulated sensor wire is
  broken; the stack derives the FAULT bit of `Status_Flags` from it (cl. 12.2.7,
  12.2.9). While broken the reading freezes. Test-only hook: the environment
  variable `CAS_EXAMPLE_TEST_SENSOR_FAULT_FILE` names a file, and the wire is
  broken while that file exists.
- **Wire Tests** (`tests/`, copied from the C++ reference) and the shared
  `wiretest/` 0.7.0 harness, vendored verbatim. The only addition is
  `tests/launch.py`: `--exe` takes a command line, default
  `node dist/main.js`. Windows, 3 runs in a row: 36/36 checks each (discovery
  11/11, sensing 11/11, failure modes 14/14), no `[RETRY]` lines.
  Mutation-checked: removing the Simulation tick, the wire break, the
  Reliability branch, or the multi-state step each fails a check.
- `.npmrc` `bacnet_testtool=0`: `npm install` builds the stack's production
  addon (customer interface only).
- `npm run build` (tsc to `dist/`); `npm start` runs `node dist/main.js`.

### Changed

- **Stack Pin** `6.x` @ `ec60c718` -> `6.x` @ `64b2cfac5` (CAS BACnet Stack
  6.0.23, Node package 6.1.2), consumed in place as an npm workspace.
  **Protocol_Revision 24 -> 30**; segmentation `segmented-both`
  (`Max_Segments_Accepted` 16, `APDU_Segment_Timeout` 5000 ms), from the stack.
- **Node.js 24.21+ (<25)**, the stack package's `engines` (was `>=18.20.8`);
  `tsx` is gone.
- `common/` 2.0.0 -> 3.0.0 (see `common/CHANGELOG.md`): the C++ `common/` 3.4.0
  conventions - RX/TX console lines, the broadcast rules of the send callback,
  primary-interface discovery, the three-line version banner, the interactive
  keys (also read from a piped stdin, which is how the Wire Tests stop the
  example), and CLI parsing that warns instead of exiting.
- The up/down keys nudge the simulated Analog Input 1 reading; the Simulation
  carries on from the new value.
- `.gitignore` covers every stack binary name (`*.node`, `*.dll`, `*.so`, ...);
  the release workflow publishes source only, never the addon.
- README: the scenario, the Simulation, Wire Tests, the version line, the
  binary-never-released rule; TUTORIAL: replacing the Simulation with hardware
  and reporting a sensor fault; PICS: Reliability row, segmentation,
  Protocol_Revision 30, Application_Software_Version 1.1.0. APP_VERSION
  1.0.2 -> 1.1.0.

## [1.0.2] - unreleased

### Changed

- **Device renamed from the series' colour placeholder "Rainbow" to "Chipkin
  Example B-SS"** so devices from different examples in the series are
  distinguishable from each other on the same BACnet network - every example
  previously announced the identical Object_Name "Rainbow", which made two
  examples on one subnet indistinguishable by name. Sub-object names are
  unchanged. `docs/colour-table.md` (series root) updated to match.
  APP_VERSION bumped 1.0.1 -> 1.0.2.

## [1.0.1] - unreleased

### Fixed

- **`Application_Software_Version` (12) and `Firmware_Revision` (44) were
  both hardcoded to the same stale `"1.0.0"` constants**, with
  `Firmware_Revision` never actually meant to be this example's own version
  at all - it names the underlying platform, not the app. Fixed:
  `Application_Software_Version` now reads `APP_VERSION` directly (one
  source of truth, can't drift from `--version`'s own banner again).
  `Firmware_Revision` is now built at runtime from the CAS BACnet Stack's
  own `BACnetStack_GetAPIMajorVersion()`/`GetAPIMinorVersion()`/
  `GetAPIPatchVersion()`/`GetAPIBuildVersion()` (the same 4 calls
  `common/CASExampleHelper.ts`'s `PrintVersion()` already uses for the
  startup banner), computed once right after `LoadBACnetFunctions()`
  succeeds rather than per-property-read. Same underlying issue as
  [BACnetProfileExample-B-SCHUB-CPP's 1.1.13 fix](https://github.com/chipkin/BACnetProfileExample-B-SCHUB-CPP/blob/main/CHANGELOG.md).
  Verified with a real ReadProperty (`bacpypes3`) against the running device,
  pre-bump build (`APP_VERSION` was still `1.0.0` at test time; this fix
  bumps to 1.0.1): `application-software-version = '1.0.0'`,
  `firmware-revision = '6.0.21.0'` - both now match the actual running build
  instead of a hardcoded string.

## [1.0.0] - unreleased

### Added

- The first **B-SS (Smart Sensor)** Node.js implementation in this example
  series, ported from
  [BACnetProfileExample-B-SS-CPP](https://github.com/chipkin/BACnetProfileExample-B-SS-CPP)
  v1.2.0: same device model, same object/property split between "app" and
  "stack", same section layout, so the two examples diff 1:1 modulo the
  language's out-parameter and event-loop idioms.
- The complete B-SS example application (`main.ts`): device 389001
  ("Rainbow"), the series' three read-only input objects (Analog Input
  "Bronze", Binary Input "Emerald", Multi-State Input "Hot Pink") plus the
  required Network Port ("Vermilion"), DS-RP-B (ReadProperty), DM-DDB-B /
  DM-DOB-B (Who-Is/I-Am, Who-Has/I-Have), unsolicited I-Am on start-up,
  series-standard CLI (`--help`/`--version`/`--deviceID`/`--port`) and
  interactive keys (`h`/`q`/arrows). There are no `Set*` callbacks and
  `SERVICE_WRITE_PROPERTY` is never enabled - this device is read-only end to
  end, matching the B-SS profile boundary.
- Vendored Node `common/` v2.0.0: `SimpleUDP.ts`, `CASExampleHelper.ts`
  (transport callbacks + the 6-byte IPv4 connection string, I-Am, local-IP
  discovery, CLI helpers), `CASBACnetStackExampleConstants.ts`. Starts at
  2.0.0, not 1.0.0, because it targets the `submodules/cas-bacnet-stack`
  `6.x` branch's current Node adapter API rather than an older pin - see
  `common/CHANGELOG.md` for the full list of what that means (trailing
  `errorCode` on every `GetProperty*` callback, the folded
  `AddNetworkPortObject()`, and the `*ForPort` transport callbacks keyed by
  Network Port instance rather than transport type).
- npm workspace consumption of the CAS BACnet Stack submodule: plain
  `npm install` compiles the addon and builds the package.
- Repository scaffold: CAS BACnet Stack submodule (`submodules/cas-bacnet-stack`,
  tracking `6.x`), CC0-1.0 licence, README, TUTORIAL, `docs/PICS.md` +
  `docs/objects.json`, AGENTS.md, changelog.

Verified on the wire: Who-Is → I-Am; every required property of every object
reads back; `State_Text[1..3]` reads `On`/`Off`/`Auto` and `State_Text[4]`
errors `invalid-array-index`; WriteProperty is rejected on every object (no
`Set*` callback registered).
