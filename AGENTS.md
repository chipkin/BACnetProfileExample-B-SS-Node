# AGENTS.md

Guidance for AI coding agents working in this repository. See
<https://agents.md/> for the format. Human contributors should read
[README.md](README.md) first, then [TUTORIAL.md](TUTORIAL.md).

## What this project is

A **tutorial** Node.js/TypeScript example that implements the BACnet
**B-SS** (Smart Sensor) profile using the CAS BACnet Stack's npm package: a
complete minimal, **read-only** BACnet/IP device (DS-RP-B, DM-DDB-B,
DM-DOB-B) whose readings follow a sensor **Simulation** and which reports a
broken sensor as a fault. Part of the BACnet profile example series - it is a
faithful translation of BACnetProfileExample-B-SS-CPP (v1.3.0,
branch `profile-functional`): same objects, names, Simulation, test-only hooks,
section layout and `BACnetStack_*` function names, and the same Wire Tests
pass against both. The top priority
is that the code reads like a tutorial a customer can learn from and
copy-paste. Favour clarity over cleverness.

## Layout

This repository is self-contained:

- `main.ts` - the whole application, four numbered sections like the C++
  `main.cpp` (§1 configuration, §2 the sensor Simulation, §3 get callbacks,
  §4 main). A B-SS registers no `Set*` callback and no
  `DeviceCommunicationControl` handler.
- `tests/` - the Wire Tests, copied from B-SS-CPP; `tests/launch.py` is the
  only addition (`--exe` takes a command line, default `node dist/main.js`).
- `wiretest/` - the series' shared Python Wiretest Harness, vendored
  **verbatim** (0.7.0). Never edit it here; report a needed change instead.
- `common/` - the shared Node.js helper (SimpleUDP, CASExampleHelper,
  constants), vendored in. Never edit here alone: a change must be swept to
  every sibling Node example and `COMMON_VERSION` bumped with a
  `common/CHANGELOG.md` entry.
- `README.md` - what this example is. Keep it short and about THIS example
  only.
- `TUTORIAL.md` - how to extend and review the example. Long-form material
  that would bloat the README belongs here.
- `docs/PICS.md` - the Protocol Implementation Conformance Statement. Its
  objects-and-properties section is GENERATED from `docs/objects.json`; do
  not hand-edit between the `OBJECTS-PROPERTIES` markers.
- `docs/objects.json` - the input to that generator. Update it in the same
  change as any `main.ts` change that adds an object or a `Get*` branch.
- `submodules/cas-bacnet-stack` - the **CAS BACnet Stack** as a git submodule
  (private; pinned to `6.x` @ `69b6249f`, stack 6.0.23), consumed via **npm
  workspaces**. Per the series ADR 0001, the pin moves to the latest `6.x`
  whenever this example is updated. After cloning, run
  `git submodule update --init --recursive`.

The `PROFILE-TABLE` block in README.md is also generated, from the
example-series repository's `docs/profile-table.md`. Edit it there, not here.

## Build

This is a **Node.js example, not a CMake project** - do not apply the C++
sibling examples' CMake/SOURCE-mode build instructions here. The real build is
one command, identical on every platform:

```bash
git submodule update --init --recursive   # once, if not cloned with --recursive
npm install                               # compiles the CAS BACnet Stack addon
                                          # (node-gyp, ~3 min) and builds the
                                          # package's dist/ via its prepare script
npm run build                             # tsc: main.ts + common/ -> dist/
```

Node **24.21+ (<25)** with its own npm 11 - the stack's package `engines`.
`.npmrc` sets `bacnet_testtool=0`: the addon is the stack's **production**
build (customer interface only). Never remove it, and never call a test-tool
export. npm warns `Unknown project config "bacnet_testtool"` on every run; that
is expected. Windows needs Visual Studio (2022 or 2026) with "Desktop
development with C++" plus Python and a short project path; Linux/macOS need a
C++17 toolchain. The addon is built from the pinned submodule, never pulled
from a registry. Do not reintroduce a CMake invocation, a
prebuilt-library step, or a series-root build script into the documented
build: a customer downloads this repository on its own and must be able to
build it with the command above.

## Run

```bash
npm start [-- --port 47821 --deviceID N --deviceName "<name>"]   # run (node dist/main.js)
npm run typecheck                          # tsc --noEmit
```

Interactive keys while running: `h` help, `q` quit, up/down nudge the
simulated Analog Input 1 reading. With stdin a pipe, writing `q` quits.

## Conventions

- Device is named "Chipkin Example B-SS"; objects use the series' colour names; vendor id
  389.
- Implement **only** the services and objects the B-SS profile requires -
  but expose **every required property** of each object.
- The sensor readings come from the **Simulation** in `main.ts` section 2
  (`SensorSimulationTick()`); it is outside the BACnet Surface and labelled so
  in the README. Its broken-wire hook is test-only
  (`CAS_EXAMPLE_TEST_SENSOR_FAULT_FILE`, an environment variable) - never a
  command-line option or a menu key.
- **Behaviour follows B-SS-CPP.** A change to the device's behaviour starts in
  the C++ reference; this port follows it so the shared Wire Tests keep passing
  against both.
- **This device is read-only.** There is no `RegisterCallbackSetProperty*`
  call and no `SERVICE_WRITE_PROPERTY` anywhere in `main.ts`; do not add
  Set-side plumbing here - that belongs in a different profile example
  (B-SA/B-ASC).
- The application calls `LoadBACnetFunctions()` once, first, and checks it.
- Every `BACnetStack_*` setup call's return value is checked; failures print
  which call failed and exit non-zero.
- The stack PULLS: callbacks serve values; out-params are `Buffer`s
  (`value.writeFloatLE(v, 0)`; CharacterString writes byte count + UTF-8 tag).
  Every `GetProperty*` callback ends with a trailing `errorCode: Buffer`
  out-param (stack issue #974) - leave it alone on a catch-all `return false`;
  set it only where this device knows the read is wrong (see the
  `State_Text` branch in `GetPropertyCharacterString`).
- The 6-byte IPv4 connection string (4 octets + BIG-endian port) is packed in
  `common/CASExampleHelper.ts` only - never re-derive it.
- Links are identified by **Network Port object instance**, not by a
  transport-type enumeration: `RegisterCommonCallbacks()` and `SendIAm()` both
  take a `networkPortInstance` parameter, and the transport callbacks are
  `BACnetStack_RegisterCallbackReceiveMessageForPort()` /
  `BACnetStack_RegisterCallbackSendMessageForPort()`.
- Present tense only: no comment or doc references a previous version of this
  example or of the stack.
- **Never edit `common/` in this repo alone** - it is a vendored copy shared
  by every Node example in the series, with its own version
  (`COMMON_VERSION`) and changelog (`common/CHANGELOG.md`).

## How to verify a change

The Wire Tests in `tests/` automate this (README "Wire Tests"): discovery, the
readings following the Simulation, and the Failure Modes -
`npm run build && python tests/run_wire_tests.py --port <free port>`. Run them
after any change; they end with `ALL WIRE TESTS PASSED`. A new check must fail
with its feature removed (tests/README.md has the mutation table). Beyond them:

1. `npm run typecheck`.
2. Read back what you changed with a BACnet client (Who-Is, ReadProperty of
   every required property; confirm a WriteProperty is rejected).
3. If you changed the objects or their properties, regenerate
   `docs/PICS.md` (`python tools/gen-objects-properties.py
   BACnetProfileExample-B-SS-Node` from the series root; it writes `main.cpp`
   in the objects-table intro - change that word back to `main.ts`) and
   confirm no row comes out flagged with ⚠.

## Releasing

Bump `APP_VERSION` in `main.ts` and add an entry to
[CHANGELOG.md](CHANGELOG.md), then tag `vX.Y.Z`. The GitHub Actions workflow
builds, typechecks, smoke-tests, and publishes a source release (there is no
prebuilt binary - every install compiles the stack addon locally).

## License

See [LICENSE](LICENSE). The CAS BACnet Stack is a separate, commercially
licensed product and is not covered by it.
