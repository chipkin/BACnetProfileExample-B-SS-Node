# Changelog - `common/` (Node.js edition)

All notable changes to the vendored Node.js `common/` helpers. The format is
based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [2.0.0] - 2026-09-16

### Added

- `SimpleUDP.ts` - application-owned UDP socket with an inbound datagram queue
  (the stack pulls; it never owns the socket).
- `CASExampleHelper.ts` - `RegisterCommonCallbacks()` (receive/send/system-time
  callbacks; the 6-byte IPv4 connection string - 4 octets + big-endian port -
  packed/unpacked here once), `SendIAm()` targeting the local subnet broadcast,
  `GetLocalIPv4()`, and CLI helpers (`--help`/`--version`/`--deviceID`/`--port`).
- `CASBACnetStackExampleConstants.ts` - the BACnet enumeration values this
  example uses, constant names matching the C++ edition 1:1.

### Changed - the adapter/callback API this example was built against

This is the **first** Node.js `common/` for the B-SS profile, and it starts
at `2.0.0` (not `1.0.0`) deliberately: it targets the `submodules/cas-bacnet-stack`
`6.x` branch's *current* Node adapter API, not the older
`6.x-TestTool` pin the B-ASC-Node example's `common/` v1.0.0 was built
against. Three interface differences reach every callback/call site below,
matching the version jump `BACnetProfileExample-B-SS-CPP`'s own `common/`
made for the same reason (see its `CHANGELOG.md`, `[1.2.0]`):

- **Every `RegisterCallbackGetProperty*` callback gained a trailing
  `errorCode: Buffer` out-parameter** (stack issue #974). The stack presets it
  to `success` and reads it only on a `false` return, so a declining callback
  can name the BACnet error the client receives instead of falling back to the
  stack's silent defaults. `main.ts` uses it in exactly one place -
  `State_Text` with an out-of-range array index now answers
  `Error(property, invalid-array-index)` instead of an empty string - and
  deliberately leaves it alone on every catch-all `return false`.
- **`BACnetStack_AddNetworkPortObjectWithNetworkNumber()` is gone**, folded
  into `BACnetStack_AddNetworkPortObject()`, which now always takes the
  network number and its quality. Same arguments, one function.
- **Links are identified by Network Port object instance, not network type**
  (stack issues #822/#556): the transport callbacks are now
  `BACnetStack_RegisterCallbackReceiveMessageForPort()` /
  `BACnetStack_RegisterCallbackSendMessageForPort()`, and `BACnetStack_SendIAm()`'s
  fourth argument is a `networkPortInstance`, not a `networkType` enumeration.
  `RegisterCommonCallbacks()` and `SendIAm()` both now take a
  `networkPortInstance` parameter naming the Network Port object the caller's
  socket belongs to.

There is no B-SS Node `common/` at `1.x` to diff against - this file exists so
future examples pinned to this same stack branch (or a later one) can tell at
a glance which adapter shape a given `common/` version expects.
