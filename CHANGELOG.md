# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
