# BACnet B-SS (Smart Sensor) - Node.js example

A minimal, copy-paste-friendly example showing how to implement the BACnet
**B-SS (BACnet Smart Sensor)** device profile in TypeScript on Node.js, using the
[CAS BACnet Stack](https://store.chipkin.com/services/stacks/bacnet-stack). It
listens on **BACnet/IP (UDP 47808)**, answers **ReadProperty** requests, and is
discoverable via **Who-Is / I-Am**. Its three sensor readings change over time
the way real ones do, and a broken sensor shows up as a **fault** a client can
read. The sensors themselves are a [Simulation](#the-sensor-simulation);
everything BACnet does with their readings is real.

It is the Node.js edition of
[BACnetProfileExample-B-SS-CPP](https://github.com/chipkin/BACnetProfileExample-B-SS-CPP):
the same device, the same objects and properties, the same Simulation and the
same Wire Tests - a client cannot tell the two apart on the wire.

**[Tagged source releases](https://github.com/chipkin/BACnetProfileExample-B-SS-Node/releases)**
- there is no prebuilt binary to download; `npm install` compiles the CAS BACnet
Stack addon locally (see [Build](#build) below).

- **[TUTORIAL.md](TUTORIAL.md)** - how to extend this example and how to review
  it for conformance. Read it when you start turning this into your own device.
- **[docs/PICS.md](docs/PICS.md)** - the Protocol Implementation Conformance
  Statement: every object, every property, and who answers it.

> **Versions:** this document describes **example v1.2.0**, built and verified
> against **CAS BACnet Stack 6.0.23** (`6.x` @ `69b6249f`; its Node package
> `@chipkin/cas-bacnet-stack` 6.1.2, built as the production addon), at
> **Protocol_Revision 30**, with the vendored Node `common/` helper at
> **v3.1.0**, on **Node.js 24.21**. Running the example prints the example,
> stack and `common/` versions - if what it prints disagrees with this line,
> trust the program and check `CHANGELOG.md`.

## What is the B-SS (Smart Sensor) profile?

**B-SS (BACnet Smart Sensor)**, defined in Annex L of ANSI/ASHRAE 135, is the
simplest BACnet device profile - the standard describes it as *"a simple
sensing device with very limited resources."* It is meant for inexpensive,
fixed-function sensors (temperature, humidity, occupancy, a contact, ...) that
mostly just need to **report what they measure** when asked.

A B-SS device answers **ReadProperty** and is discoverable. It does not have
to support **WriteProperty** (a smart sensor is read-only), **alarming /
event reporting**, **scheduling**, or **trending**, and this example
implements none of them on purpose.

**But it is still a full BACnet device.** Even the simplest profile must
present the standard object model - a **Device** object, a **Network Port**
object (every device needs one), and its sensor objects - and each object
must expose all of its **required properties**. The CAS BACnet Stack
generates most of those automatically (Object_Identifier, Object_Type,
Status_Flags, Object_List, Protocol_*, ...); this example supplies the
handful that are application-specific. The result is conformant for
**Protocol_Revision 30**. [docs/PICS.md](docs/PICS.md) lists every property
and who answers it.

## The device this example creates

```
Device 389001  "Chipkin Example B-SS"   (Vendor 389 - Chipkin Automation Systems)
    │
    ├── Analog Input 1       "Bronze"      Present_Value  21.5 -> ramps 18.0 .. 26.0  (REAL, degrees Celsius)
    ├── Binary Input 1       "Emerald"     Present_Value  toggles every 3 s     (0 = inactive / 1 = active)
    ├── Multi-State Input 1  "Hot Pink"    Present_Value  1 -> 2 -> 3 every 4 s (state, 1..3)
    └── Network Port 1       "Vermilion"   the BACnet/IP port     (required on every device)
```

## The scenario: a sensor a controller reads

What a B-SS is for, in one sentence, from Annex L.4.5 of ANSI/ASHRAE 135-2024:
*"Ability to provide values for any of its BACnet objects upon request."* A
controller or workstation (the **Peer** - any BACnet client, or the Python
client in [`tests/`](tests/README.md)) reads the sensor and gets what it is
measuring **now**:

1. The Peer finds the sensor with **Who-Is** and reads its `Object_List`.
2. It reads Analog Input 1 `Present_Value` - say `22.0` - and again a few
   seconds later - `23.5`. The reading follows the (simulated) room temperature,
   0.5 C a second. Binary Input 1 and Multi-State Input 1 change too.
3. **Failure Mode - a broken sensor.** When the sensor wire breaks, the device
   does not keep handing out a number as if nothing happened: Analog Input 1
   `Reliability` reads `open-loop` (4) and the **FAULT** bit of `Status_Flags`
   is TRUE - clause 12.2.7: FAULT is *"Logical TRUE (1) if the Reliability
   property is present and does not have a value of NO_FAULT_DETECTED"*. The
   reading stops changing. Repair the wire and `Reliability` returns to
   `no-fault-detected`, FAULT clears, and the reading moves again.
4. **Failure Mode - a request it cannot serve.** Reading an object or property
   the sensor does not have, or an array element past the end, gets the error
   clause 15.5.1.3.1 names (`unknown-object`, `unknown-property`,
   `invalid-array-index`); a WriteProperty gets a **Reject**
   `unrecognized-service`, because a B-SS is read-only.

### The sensor Simulation

A real smart sensor samples a thermistor, a contact and a selector switch. This
example has none of them, so it **simulates** them - non-BACnet scaffolding,
outside the BACnet Surface, in section 2 of [`main.ts`](main.ts)
(`SensorSimulationTick()`, run beside `BACnetStack_Tick()`). Once a second:

- the **temperature** (Analog Input 1) moves 0.5 C, ramping up to 26.0 and back
  down to 18.0;
- the **contact** (Binary Input 1) toggles every 3 s;
- the **selector** (Multi-State Input 1) steps 1 -> 2 -> 3 -> 1 every 4 s.

The **broken wire** is a test-only hook, not a feature: if the environment
variable `CAS_EXAMPLE_TEST_SENSOR_FAULT_FILE` names a file, the wire counts as
broken for as long as that file exists. The Wire Tests create and delete it.
Nothing on the network can break the sensor.

To port the example to hardware, replace `SensorSimulationTick()` with your own
sampling (on a timer - never block the BACnet callbacks on slow I/O), and set
`Reliability` from your hardware's own diagnostics.

## What this example supports

The example implements exactly the capabilities below - and nothing more, which
is the point of a profile example.

### BIBBs (BACnet Interoperability Building Blocks)

These three are what the B-SS profile requires, and they are what this example
implements. DS-RP-B is the profile's defining BIBB; the two DM BIBBs make the
device discoverable.

| BIBB | Description | Supported |
|------|-------------|:---------:|
| DS-RP-B | Data Sharing - ReadProperty - B | ✅ |
| DM-DDB-B | Device Management - Dynamic Device Binding - B | ✅ |
| DM-DOB-B | Device Management - Dynamic Object Binding - B | ✅ |

### Services (executed / B-side)

| Service | Notes |
|---------|-------|
| ReadProperty | Responds to property reads (DS-RP-B). |
| Who-Is / I-Am | Answers Who-Is with I-Am, and broadcasts an I-Am on start-up (DM-DDB-B). |
| Who-Has / I-Have | Answers Who-Has with I-Have (DM-DOB-B). |

### Object types

| Object type | Instance | Name |
|-------------|:--------:|------|
| Device | 389001 | Chipkin Example B-SS |
| Analog Input | 1 | Bronze |
| Binary Input | 1 | Emerald |
| Multi-State Input | 1 | Hot Pink |
| Network Port | 1 | Vermilion |

Every required property of every object, and who answers it, is in
[docs/PICS.md](docs/PICS.md).

## Requires the CAS BACnet Stack (licensed product)

This example **builds against the CAS BACnet Stack, which is a commercial
Chipkin product** - it is not free or open source, and there is no
public/trial build. The stack is referenced here as the **private** git
submodule `submodules/cas-bacnet-stack` (pinned to `6.x` @ `69b6249f`) and
consumed as an **npm workspace**: `npm install` compiles it from source into a
native Node addon and builds the package's TypeScript layer. You can only fetch
and build it once you have a CAS BACnet Stack license and access to that
repository.

**To get the CAS BACnet Stack (and access to build this example), contact
Chipkin:** <https://store.chipkin.com/services/stacks/bacnet-stack> or
sales@chipkin.com.

## What's in this repository

This is a **self-contained** project. It ships:

- `main.ts` - the example device.
- `common/` - the shared Node.js helper (UDP, callbacks, CLI, keyboard)
  vendored in.
- `package.json` / `tsconfig.json` / `.npmrc` - the build, the same on Windows,
  Linux and macOS. `.npmrc` sets `bacnet_testtool=0`, so `npm install` builds the
  stack's **production** addon: the customer interface only, no test-tool
  exports.
- `tests/` - the Wire Tests, and `wiretest/` - the series' shared Python
  Wiretest Harness they are written against (vendored).
- `docs/PICS.md` - the conformance statement.
- `TODO.md` - known gaps and what is not implemented on purpose.
- `docs/objects.json` - the input to the objects-and-properties generator.
- `submodules/cas-bacnet-stack/` - the **CAS BACnet Stack as a git submodule**
  (private; requires a license - see above), consumed as an npm workspace. Its
  sources compile into a native Node addon, so there is no separate library to
  build, ship, or install. The Node adapter is used in place from the submodule
  (`submodules/cas-bacnet-stack/adapters/node/`); nothing of it is copied here.

The stack binary - the addon `cas-bacnet-stack.node`, written to
`submodules/cas-bacnet-stack/projects/npm/build/Release/` (the stack keeps its
`binding.gyp` in `projects/npm/`) - is **never committed and never
released**: `.gitignore` covers it, and a tagged release carries source only.
Build it yourself from the submodule with `npm install`.

## Prerequisites

- **Node.js 24.21 or a later 24.x**, with its npm (11.x). The stack's Node
  package requires `>=24.21.0 <25`.
- A C++17 toolchain (node-gyp needs it to compile the stack addon).
- Git (to fetch the stack submodule), and Python 3 for the Wire Tests.

### Windows

- **Build tools** - Visual Studio 2022 or 2026 (or their Build Tools) with the
  **"Desktop development with C++"** workload, plus Python (the standard
  node-gyp prerequisites). Node 24.21's own npm (11.19, node-gyp 12) finds
  Visual Studio 2026 by itself; no `msvs_version` setting is needed.
- Use a short project path - the stack's MSVC intermediate paths mirror its
  source tree, and long paths can fail to compile.

### Linux / macOS

- Debian/Ubuntu: `sudo apt install build-essential python3 git`
- macOS: `xcode-select --install`

## Build

npm only, and the same commands on every platform:

```bash
git clone --recursive https://github.com/chipkin/BACnetProfileExample-B-SS-Node.git
cd BACnetProfileExample-B-SS-Node

npm install        # compiles the CAS BACnet Stack addon (production build)
npm run build      # compiles main.ts and common/ to dist/
```

Already cloned without `--recursive`? Run `git submodule update --init --recursive`
first - the install needs the stack submodule.

> **The first `npm install` takes a few minutes** (about 3 on a 12-core Windows
> machine): it compiles the entire CAS BACnet Stack into a native Node addon via
> node-gyp. npm prints `Unknown project config "bacnet_testtool"` on every run -
> that is npm noticing the `.npmrc` setting it hands on to the stack's build, not
> an error. To confirm which addon you built:
> `node -e "const s=require('@chipkin/cas-bacnet-stack');s.LoadBACnetFunctions();console.log(s.IsTestToolBuild())"`
> prints `false` for the production build.

## Run

```bash
npm start                      # defaults: device 389001, UDP 47808
npm start -- --port 47823      # non-default port (recommended while testing)
npm start -- --deviceID 12345  # your own device instance
npm start -- --deviceID 12345 --deviceName "Chipkin Example B-SS Unit 2"  # and its own name
npm start -- --help
```

`npm start` runs `node dist/main.js`; run `npm run build` again after editing
`main.ts`. Expected output:

```
BACnet B-SS (Smart Sensor) Example - Node v1.2.0
CAS BACnet Stack version: 6.0.23.0
Common helper (common/) version: 3.1.0
FYI: Listening for BACnet/IP on UDP port 47808 (Network Port 1).
TX 21 bytes to <your-subnet-broadcast>:47808 (broadcast) (Network Port 1) - Unconfirmed: I-Am
FYI: Device 389001 ("Chipkin Example B-SS") ready. Vendor ID 389. Press 'h' for help.
```

Every BACnet frame the device receives or sends prints one `RX ...` / `TX ...`
line. The device listens on UDP **47808** (BACnet/IP) by default. Allow that
port through your firewall. To use a different port, pass `--port`.

### Command-line options

| Option | Default | Meaning |
|--------|---------|---------|
| `--port <n>` | `47808` | UDP port to listen on (BACnet/IP). |
| `--deviceID <n>` | `389001` | The device's BACnet instance number (BACnet requires this to be configurable). |
| `--deviceName <text>` | `Chipkin Example B-SS` | The Device object's `Object_Name`, 1..255 bytes, no control characters. It must be unique across the BACnet internetwork, so give every unit its own (BACnet requires it to be configurable, like the instance). An invalid value prints a warning and keeps the default. |
| `--help`, `-h` | - | Show usage and exit. |
| `--version` | - | Print the example, stack, and `common/` helper versions, then exit. |

### Interactive commands

While the example runs, these keys are available:

| Key | Action |
|-----|--------|
| `h` | Show the version information and this command list. |
| `q` | Quit. |
| up arrow | Nudge the simulated Analog Input 1 (`Bronze`) reading up by 1.1. |
| down arrow | Nudge the simulated Analog Input 1 (`Bronze`) reading down by 1.1. |

The up/down keys move the simulated temperature; the Simulation carries on
ramping from the new value, and a client re-reading it sees the change. When
stdin is a pipe rather than a terminal the same characters work (`q` quits) -
that is how the Wire Tests stop the example.

## Verify

Use a BACnet client such as the
[**CAS BACnet Explorer**](https://store.chipkin.com/products/tools/cas-bacnet-explorer):

1. **Discover** - send a **Who-Is**. The device replies with **I-Am** from
   instance **389001** (vendor **389**). It also broadcasts an I-Am at start-up.
2. **Browse the object model** - the device shows five objects: the Device
   (`Chipkin Example B-SS`), the three sensors, and the Network Port (`Vermilion`). Reading
   the Device's `Object_List` returns all five. The Network Port reports real
   BACnet/IP addressing - `IP_Address`, `IP_Subnet_Mask`, `BACnet_IP_UDP_Port`,
   and a `MAC_Address` the stack builds from them.
3. **Read the Device** - ReadProperty `389001` -> `Object_Name` returns
   `"Chipkin Example B-SS"`; `Protocol_Revision` returns `30`; `Description` returns the
   profile description string.
4. **Read a sensor** - ReadProperty Analog Input `1` -> `Present_Value` returns
   the current simulated temperature (`21.5` at start-up, then 0.5 higher each
   second); read it again and it has moved. `Units` returns `degrees-Celsius`;
   `Reliability` returns `no-fault-detected`; `Status_Flags` returns all FALSE;
   `Out_Of_Service` returns `false`; `Object_Name` returns `"Bronze"`. Repeat for Binary Input `1` (`"Emerald"`,
   has `Polarity`) and Multi-State Input `1` (`"Hot Pink"`, has `Number_Of_States`
   = 3). Every required property of every object is readable.
5. **Confirm the profile boundary** - a **WriteProperty** to any object is
   rejected. That is correct: a B-SS Smart Sensor is read-only.

For a property-by-property review against the conformance statement, see
[TUTORIAL.md](TUTORIAL.md).

## Wire Tests

The checks above, automated: a Python BACnet client (the Peer) drives the running
example over BACnet/IP from outside it. Python 3 standard library only. They are
the C++ edition's Wire Tests, unchanged except that `--exe` takes a command line
(`tests/launch.py`), so they prove the two editions behave the same.
`configuration_test.py`'s `--help` check names the options this port reads (it
has no `--xml`).

| Script | What it proves |
|---|---|
| `discovery_test.py` | Who-Is, the Device's `Object_List`, then for every object its `Property_List` and a ReadProperty of every property it lists - every read comes back as a value. |
| `configuration_test.py` | The Device's identity is configurable at start-up: with `--deviceID 389901 --deviceName "Chipkin Example B-SS Unit 2"`, Who-Is, ReadProperty `Object_Name` and Who-Has by name all see the configured instance and name (and 389001 is gone); without them, the defaults; an empty or 256-byte name keeps the default with a warning, a 255-byte one is kept whole. `--help` lists exactly the options the example reads. |
| `sensing_test.py` | **The Profile Function.** Reads the three sensors again and again for 12 s; the readings follow the Simulation (0.5 C steps, a toggle every 3 s, states in order). Fails against a sensor that serves constants. |
| `failure_modes_test.py` | **The Failure Modes.** Breaks the simulated sensor wire: `Reliability` `open-loop`, `Status_Flags` FAULT, a frozen reading; repairs it: all clear, the reading moves. Then the errors for an unknown object / property / array index, and the Reject for a WriteProperty. |

Build (`npm install && npm run build`), then run them all:

```bash
python3 tests/run_wire_tests.py                 # Linux/macOS: starts "node dist/main.js"
python tests\run_wire_tests.py --port 47823     # Windows
```

It ends with `ALL WIRE TESTS PASSED` (exit 0). `--exe "<command>"` starts the
example some other way (e.g. `--exe "npx tsx main.ts"`).
[tests/README.md](tests/README.md) says what each check proves.

## The BACnet profile example series

<!-- PROFILE-TABLE:BEGIN (generated from cas-bacnet-stack-examples/docs/profile-table.md - do not edit here) -->
The CAS BACnet Stack supports every standardized device profile in ASHRAE 135-2024 Annex L, and there is one example repository per profile. Pick the profile your device claims, then the language you build in. "Ask" means the example hasn't been built yet for that language - [contact Chipkin](https://store.chipkin.com/contact-us) if you need one.

### Controllers (Annex L.4)

| Profile | C++ | Node.js | C# | Rust | Python | Go |
|---|---|---|---|---|---|---|
| **B-SS** Smart Sensor | [B-SS-CPP](https://github.com/chipkin/BACnetProfileExample-B-SS-CPP) | [B-SS-Node](https://github.com/chipkin/BACnetProfileExample-B-SS-Node) | [B-SS-CS](https://github.com/chipkin/BACnetProfileExample-B-SS-CS) | [B-SS-Rust](https://github.com/chipkin/BACnetProfileExample-B-SS-Rust) | [B-SS-Python](https://github.com/chipkin/BACnetProfileExample-B-SS-Python) | [B-SS-Go](https://github.com/chipkin/BACnetProfileExample-B-SS-Go) |
| **B-SA** Smart Actuator | [B-SA-CPP](https://github.com/chipkin/BACnetProfileExample-B-SA-CPP) | Ask | Ask | Ask | Ask | Ask |
| **B-ASC** Application Specific Controller | [B-ASC-CPP](https://github.com/chipkin/BACnetProfileExample-B-ASC-CPP) | [B-ASC-Node](https://github.com/chipkin/BACnetProfileExample-B-ASC-Node) | Ask | Ask | Ask | Ask |
| **B-AAC** Advanced Application Controller | [B-AAC-CPP](https://github.com/chipkin/BACnetProfileExample-B-AAC-CPP) | Ask | Ask | Ask | Ask | Ask |
| **B-BC** Building Controller | [B-BC-CPP](https://github.com/chipkin/BACnetProfileExample-B-BC-CPP) | Ask | Ask | Ask | Ask | Ask |

### Life safety controllers (Annex L.5)

| Profile | C++ | Node.js | C# | Rust | Python | Go |
|---|---|---|---|---|---|---|
| **B-LSC** Life Safety Controller | [B-LSC-CPP](https://github.com/chipkin/BACnetProfileExample-B-LSC-CPP) 🚧 | Ask | Ask | Ask | Ask | Ask |
| **B-ALSC** Advanced Life Safety Controller | [B-ALSC-CPP](https://github.com/chipkin/BACnetProfileExample-B-ALSC-CPP) | Ask | Ask | Ask | Ask | Ask |

### Access control controllers (Annex L.6)

| Profile | C++ | Node.js | C# | Rust | Python | Go |
|---|---|---|---|---|---|---|
| **B-ACC** Access Control Controller | [B-ACC-CPP](https://github.com/chipkin/BACnetProfileExample-B-ACC-CPP) | Ask | Ask | Ask | Ask | Ask |
| **B-AACC** Advanced Access Control Controller | [B-AACC-CPP](https://github.com/chipkin/BACnetProfileExample-B-AACC-CPP) | Ask | Ask | Ask | Ask | Ask |

### Lighting controllers (Annex L.11)

| Profile | C++ | Node.js | C# | Rust | Python | Go |
|---|---|---|---|---|---|---|
| **B-LD** Lighting Device | [B-LD-CPP](https://github.com/chipkin/BACnetProfileExample-B-LD-CPP) | Ask | Ask | Ask | Ask | Ask |
| **B-LS** Lighting Supervisor | [B-LS-CPP](https://github.com/chipkin/BACnetProfileExample-B-LS-CPP) | Ask | Ask | Ask | Ask | Ask |

### Elevator controllers (Annex L.13)

| Profile | C++ | Node.js | C# | Rust | Python | Go |
|---|---|---|---|---|---|---|
| **B-EM** Elevator Monitor | [B-EM-CPP](https://github.com/chipkin/BACnetProfileExample-B-EM-CPP) | Ask | Ask | Ask | Ask | Ask |
| **B-EC** Elevator Controller | [B-EC-CPP](https://github.com/chipkin/BACnetProfileExample-B-EC-CPP) | Ask | Ask | Ask | Ask | Ask |
| **B-AEC** Advanced Elevator Controller | [B-AEC-CPP](https://github.com/chipkin/BACnetProfileExample-B-AEC-CPP) | Ask | Ask | Ask | Ask | Ask |

### Authentication and authorization (Annex L.14)

| Profile | C++ | Node.js | C# | Rust | Python | Go |
|---|---|---|---|---|---|---|
| **B-AS** Authorization Server | [B-AS-CPP](https://github.com/chipkin/BACnetProfileExample-B-AS-CPP) | Ask | Ask | Ask | Ask | Ask |

### Miscellaneous (Annex L.7, combinable with any one family)

| Profile | C++ | Node.js | C# | Rust | Python | Go |
|---|---|---|---|---|---|---|
| **B-BBMD** Broadcast Management Device | [B-BBMD-CPP](https://github.com/chipkin/BACnetProfileExample-B-BBMD-CPP) | Ask | Ask | Ask | Ask | Ask |
| **B-ACDC** Access Control Door Controller | [B-ACDC-CPP](https://github.com/chipkin/BACnetProfileExample-B-ACDC-CPP) | Ask | Ask | Ask | Ask | Ask |
| **B-ACCR** Access Control Credential Reader | [B-ACCR-CPP](https://github.com/chipkin/BACnetProfileExample-B-ACCR-CPP) | Ask | Ask | Ask | Ask | Ask |
| **B-RTR** Router | [B-RTR-CPP](https://github.com/chipkin/BACnetProfileExample-B-RTR-CPP) | Ask | Ask | Ask | Ask | Ask |
| **B-GW** Gateway | [B-GW-CPP](https://github.com/chipkin/BACnetProfileExample-B-GW-CPP) | Ask | Ask | Ask | Ask | Ask |
| **B-DAP** Device Address Proxy | [B-DAP-CPP](https://github.com/chipkin/BACnetProfileExample-B-DAP-CPP) | Ask | Ask | Ask | Ask | Ask |
| **B-SCHUB** BACnet/SC Hub | [B-SCHUB-CPP](https://github.com/chipkin/BACnetProfileExample-B-SCHUB-CPP) | Ask | Ask | Ask | Ask | Ask |
| **B-GENERAL** General device (Annex L.8) | *(satisfied by every example above)* | — | — | — | — | — |

### Operator interfaces and workstations (Annex L.1–L.3, L.9–L.10, L.12)

Client-side profiles.

| Profile | C++ | Node.js | C# | Rust | Python | Go |
|---|---|---|---|---|---|---|
| **B-OD** Operator Display | [B-OD-CPP](https://github.com/chipkin/BACnetProfileExample-B-OD-CPP) | Ask | Ask | Ask | Ask | Ask |
| **B-OWS** Operator Workstation | planned | — | — | — | — | — |
| **B-AWS** Advanced Operator Workstation | planned | — | — | — | — | — |
| **B-XAWS** Extended Advanced Operator Workstation | planned | — | — | — | — | — |
| **B-LSAP** Life Safety Annunciator Panel | planned | — | — | — | — | — |
| **B-LSWS** Life Safety Workstation | planned | — | — | — | — | — |
| **B-ALSWS** Advanced Life Safety Workstation | planned | — | — | — | — | — |
| **B-ACSD** Access Control Security Display | planned | — | — | — | — | — |
| **B-ACWS** Access Control Workstation | planned | — | — | — | — | — |
| **B-AACWS** Advanced Access Control Workstation | planned | — | — | — | — | — |
| **B-LOD** Lighting Operator Display | planned | — | — | — | — | — |
| **B-ALWS** Advanced Lighting Workstation | planned | — | — | — | — | — |
| **B-LCS** Lighting Control Station | planned | — | — | — | — | — |
| **B-ALCS** Advanced Lighting Control Station | planned | — | — | — | — | — |
| **B-ED** Elevator Display | planned | — | — | — | — | — |
| **B-EWS** Elevator Workstation | planned | — | — | — | — | — |
| **B-AEWS** Advanced Elevator Workstation | planned | — | — | — | — | — |

🚧 = in progress. "Ask" = not yet built for that language; contact Chipkin if you need it. Profile definitions: ANSI/ASHRAE 135-2024 Annex L. BIBB definitions: Annex K. Get the stack: <https://store.chipkin.com/services/stacks/bacnet-stack>.
<!-- PROFILE-TABLE:END -->

## References

- **ANSI/ASHRAE Standard 135** (BACnet) - the protocol standard. Object model
  (Clause 12), services (Clause 15), BACnet/IP (Annex J), device profiles
  (Annex L). Purchase / preview via the [ASHRAE store](https://www.ashrae.org/technical-resources/standards-and-guidelines).
- **What is BACnet?** - Chipkin's introduction:
  <https://docs.chipkin.com/protocols/bacnet/>.
- **CAS BACnet Stack** - product page and documentation:
  <https://store.chipkin.com/services/stacks/bacnet-stack>.
- **CAS BACnet Explorer** - client for testing this device:
  <https://store.chipkin.com/products/tools/cas-bacnet-explorer>.
- **Shared helper used by this example** - [`common/README.md`](common/README.md).

See also [TUTORIAL.md](TUTORIAL.md), [docs/PICS.md](docs/PICS.md),
[CHANGELOG.md](CHANGELOG.md), [TODO.md](TODO.md) (known gaps), and [AGENTS.md](AGENTS.md).
