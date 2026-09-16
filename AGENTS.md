# AGENTS.md

Guidance for AI coding agents working in this repository. See
<https://agents.md/> for the format. Human contributors should read
[README.md](README.md) first, then [TUTORIAL.md](TUTORIAL.md).

## What this project is

A **tutorial** Node.js/TypeScript example that implements the BACnet
**B-SS** (Smart Sensor) profile using the CAS BACnet Stack's npm package: a
complete minimal, **read-only** BACnet/IP device (DS-RP-B, DM-DDB-B,
DM-DOB-B). Part of the BACnet profile example series - the C++ sibling is
BACnetProfileExample-B-SS-CPP, and the two are kept diffable: same objects,
names, section layout, and `BACnetStack_*` function names. The top priority
is that the code reads like a tutorial a customer can learn from and
copy-paste. Favour clarity over cleverness.

## Layout

This repository is self-contained:

- `main.ts` - the whole application, three numbered sections (§1
  configuration, §2 get callbacks, §3 main). There is no §2b/§2c - a B-SS
  registers no `Set*` callback and no `DeviceCommunicationControl` handler.
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
  (private; tracks `6.x`), consumed via **npm workspaces**. Do not bump the
  pin in one example alone. After cloning, run
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
                                           # (node-gyp, 10-20 min first time) and
                                           # builds the package's dist/ via its
                                           # prepare script
```

Windows needs Visual Studio 2022 Build Tools ("Desktop development with C++")
plus Python (the standard node-gyp prerequisites) and a short project path;
Linux/macOS need a C++17 toolchain. Do not reintroduce a CMake invocation, a
prebuilt-library step, or a series-root build script into the documented
build: a customer downloads this repository on its own and must be able to
build it with the command above.

## Run

```bash
npm start [-- --port 47821 --deviceID N]   # run
npm run typecheck                          # tsc --noEmit
```

Interactive keys while running: `h` help, `q` quit, up/down nudge Analog
Input 1.

## Conventions

- Device is named "Rainbow"; objects use the series' colour names; vendor id
  389.
- Implement **only** the services and objects the B-SS profile requires -
  but expose **every required property** of each object.
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

There are no unit tests; verification is behavioural:

1. `npm run typecheck`.
2. Smoke: `npm start -- --port 47821` stays up past the ready banner (every
   failed setup call exits 1, so "still running" proves registration).
3. Read back what you changed with a BACnet client (Who-Is, ReadProperty of
   every required property; confirm a WriteProperty is rejected).
4. If you changed the objects or their properties, regenerate
   `docs/PICS.md` (`python tools/gen-objects-properties.py
   BACnetProfileExample-B-SS-Node` from the series root) and confirm no row
   comes out flagged with ⚠.

## Releasing

Bump `APP_VERSION` in `main.ts` and add an entry to
[CHANGELOG.md](CHANGELOG.md), then tag `vX.Y.Z`. The GitHub Actions workflow
builds, typechecks, smoke-tests, and publishes a source release (there is no
prebuilt binary - every install compiles the stack addon locally).

## License

See [LICENSE](LICENSE). The CAS BACnet Stack is a separate, commercially
licensed product and is not covered by it.
