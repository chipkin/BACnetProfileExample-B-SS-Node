# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
