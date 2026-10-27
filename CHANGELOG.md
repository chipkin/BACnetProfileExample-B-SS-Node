# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

_No changes yet._

## [1.2.0] - 2026-10-27

Built on CAS BACnet Stack 6.x (`69b6249f`, npm package 6.1.2).

### Added

- **`--deviceName <text>`** sets the Device's Object_Name at start-up, like
  `--deviceID` sets its instance (ASHRAE 135-2024 cl. 12.1.1.3, 12.1.1.4).
  Object_Name must be unique on the internetwork, so two units could not share
  the compile-time name. The default is unchanged (`Chipkin Example B-SS`). A name
  must be 1..255 bytes with no control characters, otherwise the example warns and
  keeps the default. The name is not writable over the network. Documented in the
  README, PICS and TUTORIAL.
- **Wire Test** `tests/configuration_test.py` checks `--deviceID` and `--deviceName`
  over Who-Is, ReadProperty and Who-Has, and that `--help` lists exactly the
  options the example reads.

### Changed

- **Updated to CAS BACnet Stack 6.x `69b6249f`.** No change to `main.ts`.
- **Wire Tests default to this example's own port, 47823.** Runs that pass `--port`
  are unchanged.
- **PICS** now cites the CAS BACnet Stack's property profiles for the
  objects-and-properties tables.

### Fixed

- **PICS: Database_Revision is 5**, not 0. The stack adds one per object created at
  start-up (cl. 12.11): the Device and its four objects.

### Compatibility

- **The addon is built to `submodules/cas-bacnet-stack/projects/npm/build/Release/`**
  (the stack moved its `binding.gyp`). The build commands are unchanged.
- Requires Node.js 24.21 or a later 24.x, and a C++17 toolchain for node-gyp
  (Visual Studio 2022 or 2026 Build Tools on Windows).

## [1.1.0] - 2026-10-16

Built on CAS BACnet Stack 6.x (`64b2cfac`, 6.0.23, npm package 6.1.2). This is the
first tagged release; it includes everything from the earlier 1.0.x development
builds.

The sensor performs the B-SS Profile Function (ANSI/ASHRAE 135-2024 Annex L.4.5,
"Ability to provide values for any of its BACnet objects upon request") with live
readings and a failure mode. The BACnet surface is DS-RP-B, DM-DDB-B and DM-DOB-B
over five objects, matching the C++ example 1.3.0.

### Added

- **First Node.js B-SS (Smart Sensor) example** for the CAS BACnet Stack, ported
  from the C++ example. It has a Device (instance 389001), Analog Input 1, Binary
  Input 1, Multi-State Input 1 and Network Port 1; ReadProperty, Who-Is / I-Am and
  Who-Has / I-Have; an unsolicited I-Am at start-up; options `--help`, `--version`,
  `--deviceID` and `--port`; and interactive keys. The device is read-only:
  WriteProperty is rejected.
- **Sensor simulation.** Once a second Analog Input 1 moves 0.5 C between 18.0 and
  26.0, Binary Input 1 toggles every 3 s and Multi-State Input 1 steps 1, 2, 3
  every 4 s. The up/down keys nudge Analog Input 1.
- **Analog Input 1 `Reliability`** reads `no-fault-detected`, or `open-loop` while
  a simulated sensor wire is broken, and the FAULT bit of `Status_Flags` follows
  (cl. 12.2.7, 12.2.9). The TUTORIAL explains how to report a sensor fault from
  real hardware.
- **Wire Tests** under `tests/` (discovery, sensing, failure modes), run against
  `node dist/main.js`.
- **npm workspace build.** `npm install` compiles the stack's production addon from
  the submodule and `npm run build` compiles the TypeScript to `dist/`;
  `npm start` runs it.
- README, TUTORIAL and PICS (`docs/PICS.md`).

### Changed

- **Protocol_Revision 30** and **segmentation supported** (`segmented-both`,
  `Max_Segments_Accepted` 16, `APDU_Segment_Timeout` 5000 ms), from the stack.
- **The Device is named "Chipkin Example B-SS"** (was "Rainbow") so examples on
  the same network can be told apart.
- **Releases are source only.** The stack addon (`*.node`) is never published.
- `common/` 3.0.0 (see `common/CHANGELOG.md`): console RX/TX lines, broadcast
  handling, the version banner, and CLI parsing that warns instead of exiting.

### Fixed

- **`Application_Software_Version` and `Firmware_Revision` were stale.** The first
  now follows the example's version, the second is built from the running stack's
  version.

### Compatibility

- **Node.js 24.21 or later 24.x is required** (was 18.20.8 or later), following the
  stack package. `tsx` is no longer used; run the compiled output.
