// SPDX-License-Identifier: CC0-1.0
// Public-domain example code (CC0) - see LICENSE.

// BACnet B-SS (Smart Sensor) example - Node.js
// =============================================================================
// A complete, minimal BACnet/IP device implementing the B-SS device profile of
// ANSI/ASHRAE 135 Annex L: "a simple sensing device with very limited
// resources." Its only mandatory capability is DS-RP-B (ReadProperty), plus
// discovery (Who-Is/I-Am, Who-Has/I-Have). A B-SS does not require
// WriteProperty, COV, alarms/events, scheduling, or trending - so this
// example deliberately does NOT enable any of those. That is the whole point
// of a profile example: implement exactly what the profile asks for, nothing
// more.
//
// This is the Node.js edition of BACnetProfileExample-B-SS-CPP - same
// objects, same names, same section layout, same function names - so you can
// diff the two side by side. The systematic differences are the language's:
// out-parameters arrive as Buffers (value.writeFloatLE(...) instead of
// *value = ...), and the main loop is a timer instead of a while().
//
// The device exposes three READ-ONLY sensor objects plus the Network Port
// object every BACnet device must have - and nothing is writable. There are
// no Set* callbacks in this file: a B-SS is read-only end to end.
//
// Layout (same three numbered sections as the C++ edition):
//   1. Configuration - identity and the sensor objects
//   2. Get callbacks - the stack PULLS every property value it serves
//   3. main() - load, configure, announce, tick
// =============================================================================

import {
    LoadBACnetFunctions,
    CASBACnetStackAdapter_LastError,
    BACnetStack_AddDevice,
    BACnetStack_AddNetworkPortObject,
    BACnetStack_AddObject,
    BACnetStack_RegisterCallbackGetPropertyBool,
    BACnetStack_RegisterCallbackGetPropertyCharacterString,
    BACnetStack_RegisterCallbackGetPropertyEnumerated,
    BACnetStack_RegisterCallbackGetPropertyOctetString,
    BACnetStack_RegisterCallbackGetPropertyReal,
    BACnetStack_RegisterCallbackGetPropertyUnsignedInteger,
    BACnetStack_SetPropertyEnabled,
    BACnetStack_SetServiceEnabled,
    BACnetStack_Tick,
} from "@chipkin/cas-bacnet-stack";
import * as readline from "node:readline";
import {
    BACNET_IP_MODE_NORMAL,
    CHARACTER_STRING_ENCODING_UTF8,
    ENGINEERING_UNITS_DEGREES_CELSIUS,
    ERROR_CODE_INVALID_ARRAY_INDEX,
    NETWORK_NUMBER_QUALITY_UNKNOWN,
    NETWORK_PORT_NETWORK_TYPE_IPV4,
    NETWORK_PORT_PROTOCOL_LEVEL_BACNET_APPLICATION,
    NETWORK_PORT_REFERENCE_PORT_NONE,
    OBJECT_TYPE_ANALOG_INPUT,
    OBJECT_TYPE_BINARY_INPUT,
    OBJECT_TYPE_DEVICE,
    OBJECT_TYPE_MULTI_STATE_INPUT,
    OBJECT_TYPE_NETWORK_PORT,
    POLARITY_NORMAL,
    PROPERTY_IDENTIFIER_APDU_LENGTH,
    PROPERTY_IDENTIFIER_APPLICATION_SOFTWARE_VERSION,
    PROPERTY_IDENTIFIER_BACNET_IP_MODE,
    PROPERTY_IDENTIFIER_BACNET_IP_UDP_PORT,
    PROPERTY_IDENTIFIER_DESCRIPTION,
    PROPERTY_IDENTIFIER_FIRMWARE_REVISION,
    PROPERTY_IDENTIFIER_IP_ADDRESS,
    PROPERTY_IDENTIFIER_IP_DEFAULT_GATEWAY,
    PROPERTY_IDENTIFIER_IP_SUBNET_MASK,
    PROPERTY_IDENTIFIER_MODEL_NAME,
    PROPERTY_IDENTIFIER_NUMBER_OF_STATES,
    PROPERTY_IDENTIFIER_OBJECT_NAME,
    PROPERTY_IDENTIFIER_OUT_OF_SERVICE,
    PROPERTY_IDENTIFIER_POLARITY,
    PROPERTY_IDENTIFIER_PRESENT_VALUE,
    PROPERTY_IDENTIFIER_REFERENCE_PORT,
    PROPERTY_IDENTIFIER_STATE_TEXT,
    PROPERTY_IDENTIFIER_UNITS,
    PROPERTY_IDENTIFIER_VENDOR_IDENTIFIER,
    PROPERTY_IDENTIFIER_VENDOR_NAME,
    SERVICE_I_AM,
    SERVICE_I_HAVE,
    SERVICE_READ_PROPERTY,
    SERVICE_WHO_HAS,
    SERVICE_WHO_IS,
} from "./common/CASBACnetStackExampleConstants";
import {
    GetLocalIPv4,
    HandleHelpAndVersionArgs,
    ParseDeviceIdArg,
    ParsePortArg,
    PrintVersion,
    RegisterCommonCallbacks,
    SendIAm,
} from "./common/CASExampleHelper";
import { SimpleUDP } from "./common/SimpleUDP";

// =============================================================================
// 1. Configuration
// =============================================================================
// >>> CHANGE ALL OF THIS BEFORE YOU SHIP <<<
// The device identity below belongs to this EXAMPLE, not to your product.
// Vendor ID 389 is Chipkin Automation Systems' - get your own vendor ID from
// ASHRAE (https://bacnet.org/assigned-vendor-ids/) and pick your own device
// instance (it must be unique on the whole BACnet internetwork).

const APP_NAME = "BACnet B-SS (Smart Sensor) Example - Node";
const APP_VERSION = "1.0.0";

// Every example in this series has its own default device instance (B-SS =
// 389001, see the series' device-instance table) so several examples can run
// on one subnet. Overridable at runtime with --deviceID, as BACnet requires.
let g_deviceInstance = 389001;
const VENDOR_IDENTIFIER = 389; // Chipkin Automation Systems - replace with the vendor ID ASHRAE assigns you.
// Object_Name must be UNIQUE across the whole BACnet internetwork - two
// devices with the same name is a spec violation, and it is the exact,
// silent failure mode this series warns about elsewhere in this file (see
// the "SILENT TRAP" comments below and TUTORIAL.md). Here it is a
// compile-time constant, which is fine for a single running copy of this
// example; a real product must make it per-unit configurable (serial
// number, DIP switches, a config file, or a --deviceName argument) so two
// units never boot with the same name.
const DEVICE_NAME = "Rainbow"; // replace with your product's per-unit device name.
const DEVICE_DESCRIPTION =
    "Chipkin CAS BACnet Stack example - B-SS (Smart Sensor) profile. " +
    "Demonstrates DS-RP-B: ReadProperty plus Who-Is/I-Am with read-only sensor objects."; // replace with your product's description.
const VENDOR_NAME = "Chipkin Automation Systems"; // replace with your company's name.
const MODEL_NAME = "CAS BACnet Stack Example - B-SS"; // replace with your product's model name.
// Firmware_Revision / Application_Software_Version - your real versions. Wire
// them to your build rather than hard-coding a number that will go stale.
const FIRMWARE_REVISION = "1.0.0";
const APPLICATION_SOFTWARE_VERSION = "1.0.0";

// Object instances - instances start at 1 in every example of this series.
const ANALOG_INPUT_INSTANCE = 1; //      "Bronze"     - room temperature, read-only
const BINARY_INPUT_INSTANCE = 1; //      "Emerald"    - a contact, read-only
const MULTI_STATE_INPUT_INSTANCE = 1; // "Hot Pink"   - a 3-state selector, read-only
const NETWORK_PORT_INSTANCE = 1; //      "Vermilion"  - the BACnet/IP port itself
const MAX_APDU_LENGTH = 1476; // BACnet/IP APDU length (1497-byte frame minus headers)

// Input values (series-standard starting values). The arrow keys nudge the
// Analog Input at runtime so you can watch the value change from a client.
let g_analogInput1Value = 21.5; // degrees Celsius
const g_binaryInput1Value = 0; // 0 = inactive
const g_multiStateInput1Value = 1; // state 1 ("On")
const MULTI_STATE_TEXT = ["On", "Off", "Auto"]; // State_Text, 1-based on the wire

// Networking (served by the Network Port object; filled in main()).
let g_udpPort = 47808;
let g_ipAddress: number[] = [0, 0, 0, 0];
let g_ipSubnetMask: number[] = [0, 0, 0, 0];
const g_ipDefaultGateway: number[] = [0, 0, 0, 0]; // a real product reports its real gateway

// =============================================================================
// 2. Get callbacks
// =============================================================================
// The stack PULLS: when a client reads a property the stack serves internally
// (Object_List, Protocol_Services_Supported, ...) it answers alone; for the
// values only the application knows, it calls these callbacks, routed by
// DATATYPE - one callback per BACnet primitive type.
//
// THE errorCode OUT-PARAMETER. Every Get callback below ends with an
// errorCode: Buffer (stack issue #974). The stack PRESETS it to success (84)
// before the call, and reads it only if you return false. That gives a
// declining callback two distinct meanings:
//
//   1. return false and LEAVE errorCode ALONE -> "I have no opinion on this
//      property." The stack falls back to its own handling (see below).
//   2. return false and SET errorCode         -> "This read fails, with THIS
//      BACnet error." The client gets exactly that Error-PDU.
//
// Option 2 is new versus older stack pins; do not reach for it reflexively -
// option 1 is still the right answer most of the time, for the reason below.
//
// SILENT TRAP - a `false` return usually does NOT produce a BACnet error.
// The stack substitutes a default for everything it can invent: Object_Name
// becomes the literal "undefined", Units becomes no-units(95). It errors only
// for the values it refuses to invent: Present_Value, Number_Of_States,
// Relinquish_Default, Local_Date, Local_Time, and a Network Port's
// APDU_Length. So two half-added objects both report Object_Name "undefined" -
// duplicate names in one device, a spec violation - and every scan tool
// renders the device as healthy. Serve EVERY property of every object you add.
//
// AND THAT FALLBACK IS LOAD-BEARING, WHICH IS WHY WE DO NOT "FIX" IT HERE. It
// is tempting to end every callback with errorCode = unknown-property so
// nothing is ever silently invented. That breaks the device: the stack relies
// on the decline-and-fabricate path to answer required properties the
// application is not expected to serve - the Device's
// Max_APDU_Length_Accepted, APDU_Timeout and Number_Of_APDU_Retries among
// them. Set errorCode ONLY where THIS device knows the read is wrong - there
// is exactly one such case below (State_Text with an out-of-range array
// index); every catch-all `return false` deliberately leaves errorCode alone.

/** Write `text` into a CharacterString out-Buffer, clamped to the stack's
 *  maximum, and report the byte count + UTF-8 encoding. */
function ReturnCharacterString(
    text: string,
    value: Buffer,
    valueElementCount: Buffer,
    maxElementCount: number,
    encodingType: Buffer
): boolean {
    const bytes = Buffer.from(text, "utf8");
    const length = Math.min(bytes.length, maxElementCount); // silent truncation, like the C++ edition
    bytes.copy(value, 0, 0, length);
    valueElementCount.writeUInt32LE(length, 0);
    encodingType.writeUInt8(CHARACTER_STRING_ENCODING_UTF8, 0);
    return true;
}

// REAL (floating point) - the Analog Input's Present_Value.
function GetPropertyReal(
    _deviceInstance: number,
    objectType: number,
    objectInstance: number,
    propertyIdentifier: number,
    value: Buffer,
    _useArrayIndex: boolean,
    _propertyArrayIndex: number,
    _errorCode: Buffer
): boolean {
    // ON REAL HARDWARE: return the live sensor reading here. Read it from a
    // cached variable that your hardware updates (as g_analogInput1Value is),
    // NOT directly from a slow/blocking device (I2C, SPI, ADC conversion):
    // this callback runs on the BACnetStack_Tick() timer, so blocking it
    // delays all BACnet processing. Sample the sensor on a timer/another
    // thread and just hand back the latest value from here.
    if (
        objectType === OBJECT_TYPE_ANALOG_INPUT &&
        objectInstance === ANALOG_INPUT_INSTANCE &&
        propertyIdentifier === PROPERTY_IDENTIFIER_PRESENT_VALUE
    ) {
        value.writeFloatLE(g_analogInput1Value, 0);
        return true;
    }
    return false;
}

// ENUMERATED - the Binary Input's Present_Value (0 = inactive, 1 = active),
// the Analog Input's Units (degrees Celsius), and the Network Port's
// BACnet_IP_Mode.
function GetPropertyEnumerated(
    _deviceInstance: number,
    objectType: number,
    objectInstance: number,
    propertyIdentifier: number,
    value: Buffer,
    _useArrayIndex: boolean,
    _propertyArrayIndex: number,
    _errorCode: Buffer
): boolean {
    if (objectType === OBJECT_TYPE_BINARY_INPUT && objectInstance === BINARY_INPUT_INSTANCE) {
        if (propertyIdentifier === PROPERTY_IDENTIFIER_PRESENT_VALUE) {
            // ON REAL HARDWARE: return your cached input state here - the same
            // rule as GetPropertyReal above applies (never block this callback
            // on slow I/O; sample on a timer/another thread and hand back the
            // latest).
            value.writeUInt32LE(g_binaryInput1Value, 0); // inactive - the series-wide starting value
            return true;
        }
        if (propertyIdentifier === PROPERTY_IDENTIFIER_POLARITY) {
            value.writeUInt32LE(POLARITY_NORMAL, 0); // required property of a Binary Input
            return true;
        }
    }
    if (
        objectType === OBJECT_TYPE_ANALOG_INPUT &&
        objectInstance === ANALOG_INPUT_INSTANCE &&
        propertyIdentifier === PROPERTY_IDENTIFIER_UNITS
    ) {
        value.writeUInt32LE(ENGINEERING_UNITS_DEGREES_CELSIUS, 0);
        return true;
    }
    if (
        objectType === OBJECT_TYPE_NETWORK_PORT &&
        objectInstance === NETWORK_PORT_INSTANCE &&
        propertyIdentifier === PROPERTY_IDENTIFIER_BACNET_IP_MODE
    ) {
        value.writeUInt32LE(BACNET_IP_MODE_NORMAL, 0); // not foreign-device, not BBMD
        return true;
    }
    return false;
}

// UNSIGNED INTEGER - the Multi-State Input's Present_Value/Number_Of_States,
// the Device's Vendor_Identifier (the stack also uses Vendor_Identifier to
// build I-Am), and the Network Port's APDU_Length/Reference_Port/UDP port.
function GetPropertyUnsignedInteger(
    _deviceInstance: number,
    objectType: number,
    objectInstance: number,
    propertyIdentifier: number,
    value: Buffer,
    useArrayIndex: boolean,
    propertyArrayIndex: number,
    _errorCode: Buffer
): boolean {
    if (objectType === OBJECT_TYPE_MULTI_STATE_INPUT && objectInstance === MULTI_STATE_INPUT_INSTANCE) {
        if (propertyIdentifier === PROPERTY_IDENTIFIER_PRESENT_VALUE) {
            value.writeUInt32LE(g_multiStateInput1Value, 0); // state 1 (valid range is 1..Number_Of_States)
            return true;
        }
        if (propertyIdentifier === PROPERTY_IDENTIFIER_NUMBER_OF_STATES) {
            value.writeUInt32LE(MULTI_STATE_TEXT.length, 0); // required property
            return true;
        }
        // State_Text is an array. The stack asks for its LENGTH here (array
        // index 0) before reading each element via GetPropertyCharacterString.
        if (
            propertyIdentifier === PROPERTY_IDENTIFIER_STATE_TEXT &&
            useArrayIndex &&
            propertyArrayIndex === 0
        ) {
            value.writeUInt32LE(MULTI_STATE_TEXT.length, 0);
            return true;
        }
    }
    if (
        objectType === OBJECT_TYPE_DEVICE &&
        objectInstance === g_deviceInstance &&
        propertyIdentifier === PROPERTY_IDENTIFIER_VENDOR_IDENTIFIER
    ) {
        value.writeUInt32LE(VENDOR_IDENTIFIER, 0);
        return true;
    }
    if (objectType === OBJECT_TYPE_NETWORK_PORT && objectInstance === NETWORK_PORT_INSTANCE) {
        if (propertyIdentifier === PROPERTY_IDENTIFIER_APDU_LENGTH) {
            value.writeUInt32LE(MAX_APDU_LENGTH, 0);
            return true;
        }
        if (propertyIdentifier === PROPERTY_IDENTIFIER_REFERENCE_PORT) {
            value.writeUInt32LE(NETWORK_PORT_REFERENCE_PORT_NONE, 0);
            return true;
        }
        if (propertyIdentifier === PROPERTY_IDENTIFIER_BACNET_IP_UDP_PORT) {
            value.writeUInt32LE(g_udpPort, 0);
            return true;
        }
    }
    return false;
}

// BOOLEAN - Out_Of_Service is a required property of every input object and
// of the Network Port. This is a read-only sensor, so nothing is ever out of
// service: always false.
function GetPropertyBool(
    _deviceInstance: number,
    objectType: number,
    _objectInstance: number,
    propertyIdentifier: number,
    value: Buffer,
    _useArrayIndex: boolean,
    _propertyArrayIndex: number,
    _errorCode: Buffer
): boolean {
    if (
        propertyIdentifier === PROPERTY_IDENTIFIER_OUT_OF_SERVICE &&
        (objectType === OBJECT_TYPE_ANALOG_INPUT ||
            objectType === OBJECT_TYPE_BINARY_INPUT ||
            objectType === OBJECT_TYPE_MULTI_STATE_INPUT ||
            objectType === OBJECT_TYPE_NETWORK_PORT)
    ) {
        value.writeUInt8(0, 0);
        return true;
    }
    return false;
}

// OCTET STRING - the Network Port's BACnet/IP addressing. The stack cannot
// know the host's IP, so the application must supply IP_Address and
// IP_Subnet_Mask (and IP_Default_Gateway). Each is four octets. The stack
// also reads IP_Address (with BACnet_IP_UDP_Port) to build the port's
// six-octet MAC_Address.
function GetPropertyOctetString(
    _deviceInstance: number,
    objectType: number,
    objectInstance: number,
    propertyIdentifier: number,
    value: Buffer,
    valueElementCount: Buffer,
    maxElementCount: number,
    _useArrayIndex: boolean,
    _propertyArrayIndex: number,
    _errorCode: Buffer
): boolean {
    if (objectType === OBJECT_TYPE_NETWORK_PORT && objectInstance === NETWORK_PORT_INSTANCE && maxElementCount >= 4) {
        let octets: number[] | null = null;
        if (propertyIdentifier === PROPERTY_IDENTIFIER_IP_ADDRESS) {
            octets = g_ipAddress;
        } else if (propertyIdentifier === PROPERTY_IDENTIFIER_IP_SUBNET_MASK) {
            octets = g_ipSubnetMask;
        } else if (propertyIdentifier === PROPERTY_IDENTIFIER_IP_DEFAULT_GATEWAY) {
            octets = g_ipDefaultGateway;
        }
        if (octets !== null) {
            value[0] = octets[0];
            value[1] = octets[1];
            value[2] = octets[2];
            value[3] = octets[3];
            valueElementCount.writeUInt32LE(4, 0);
            return true;
        }
    }
    return false;
}

// CHARACTER STRING - Object_Name for each object, State_Text, and the
// Device's identity strings.
function GetPropertyCharacterString(
    _deviceInstance: number,
    objectType: number,
    objectInstance: number,
    propertyIdentifier: number,
    value: Buffer,
    valueElementCount: Buffer,
    maxElementCount: number,
    encodingType: Buffer,
    useArrayIndex: boolean,
    propertyArrayIndex: number,
    errorCode: Buffer
): boolean {
    const text = (t: string) => ReturnCharacterString(t, value, valueElementCount, maxElementCount, encodingType);

    // State_Text (optional) - one label per state of the Multi-State Input.
    // It is a BACnet array, so the stack asks for one element at a time by
    // index (1..Number_Of_States). Present_Value 1 -> "On", 2 -> "Off",
    // 3 -> "Auto".
    if (
        objectType === OBJECT_TYPE_MULTI_STATE_INPUT &&
        objectInstance === MULTI_STATE_INPUT_INSTANCE &&
        propertyIdentifier === PROPERTY_IDENTIFIER_STATE_TEXT &&
        useArrayIndex
    ) {
        if (propertyArrayIndex >= 1 && propertyArrayIndex <= MULTI_STATE_TEXT.length) {
            return text(MULTI_STATE_TEXT[propertyArrayIndex - 1]);
        }
        // The one place in this file where naming an error is clearly right:
        // the client asked for State_Text[n] and this object has no element
        // n. That is not "no opinion" - it is a wrong read, and the spec has
        // a code for it. Without this the client would silently receive an
        // empty string.
        errorCode.writeUInt32LE(ERROR_CODE_INVALID_ARRAY_INDEX, 0);
        return false;
    }

    // Object_Name - the colour name for each object.
    if (propertyIdentifier === PROPERTY_IDENTIFIER_OBJECT_NAME) {
        if (objectType === OBJECT_TYPE_DEVICE && objectInstance === g_deviceInstance) {
            return text(DEVICE_NAME);
        }
        if (objectType === OBJECT_TYPE_ANALOG_INPUT && objectInstance === ANALOG_INPUT_INSTANCE) {
            return text("Bronze");
        }
        if (objectType === OBJECT_TYPE_BINARY_INPUT && objectInstance === BINARY_INPUT_INSTANCE) {
            return text("Emerald");
        }
        if (objectType === OBJECT_TYPE_MULTI_STATE_INPUT && objectInstance === MULTI_STATE_INPUT_INSTANCE) {
            return text("Hot Pink");
        }
        if (objectType === OBJECT_TYPE_NETWORK_PORT && objectInstance === NETWORK_PORT_INSTANCE) {
            return text("Vermilion");
        }
    }

    // The remaining strings are all on the Device object - its identity, read
    // by clients and used to populate the device's I-Am / object list.
    if (objectType === OBJECT_TYPE_DEVICE && objectInstance === g_deviceInstance) {
        if (propertyIdentifier === PROPERTY_IDENTIFIER_DESCRIPTION) {
            return text(DEVICE_DESCRIPTION);
        }
        if (propertyIdentifier === PROPERTY_IDENTIFIER_VENDOR_NAME) {
            return text(VENDOR_NAME);
        }
        if (propertyIdentifier === PROPERTY_IDENTIFIER_MODEL_NAME) {
            return text(MODEL_NAME);
        }
        if (propertyIdentifier === PROPERTY_IDENTIFIER_FIRMWARE_REVISION) {
            return text(FIRMWARE_REVISION);
        }
        if (propertyIdentifier === PROPERTY_IDENTIFIER_APPLICATION_SOFTWARE_VERSION) {
            return text(APPLICATION_SOFTWARE_VERSION);
        }
    }
    return false;
}

// =============================================================================
// 3. main()
// =============================================================================

async function main(): Promise<void> {
    const argv = process.argv.slice(2);

    // Load the CAS BACnet Stack FIRST - deliberately before even --version,
    // because PrintVersion() calls BACnetStack_GetAPIMajorVersion(). Same
    // contract as every edition of this example: LoadBACnetFunctions() once,
    // before any stack call, and check the result.
    if (!LoadBACnetFunctions()) {
        console.error(`Error: failed to load the CAS BACnet Stack: ${CASBACnetStackAdapter_LastError()}`);
        process.exit(1);
    }

    if (HandleHelpAndVersionArgs(argv, APP_NAME, APP_VERSION)) {
        return;
    }
    g_udpPort = ParsePortArg(argv, 47808);
    g_deviceInstance = ParseDeviceIdArg(argv, g_deviceInstance);
    PrintVersion(APP_NAME, APP_VERSION);

    // The application owns the socket; the stack only sees the callbacks.
    const udp = new SimpleUDP();
    try {
        await udp.Setup(g_udpPort);
    } catch (err) {
        console.error(`Error: could not bind UDP port ${g_udpPort}: ${err instanceof Error ? err.message : err}`);
        console.error("Is another BACnet device already running on this machine? Try --port.");
        process.exit(1);
    }
    const local = GetLocalIPv4();
    g_ipAddress = local.address.split(".").map(Number);
    g_ipSubnetMask = local.netmask.split(".").map(Number);
    console.log(`FYI: listening on ${local.address}:${g_udpPort} (broadcast ${local.broadcast})`);

    // Callbacks BEFORE the device exists: transport/time first (keyed to the
    // Network Port instance this socket will become), then one registration
    // per datatype this example serves. There are no Set* registrations: a
    // B-SS is read-only, so no WriteProperty callback is ever consulted.
    RegisterCommonCallbacks(udp, NETWORK_PORT_INSTANCE);
    BACnetStack_RegisterCallbackGetPropertyReal(GetPropertyReal);
    BACnetStack_RegisterCallbackGetPropertyEnumerated(GetPropertyEnumerated);
    BACnetStack_RegisterCallbackGetPropertyUnsignedInteger(GetPropertyUnsignedInteger);
    BACnetStack_RegisterCallbackGetPropertyBool(GetPropertyBool);
    BACnetStack_RegisterCallbackGetPropertyOctetString(GetPropertyOctetString);
    BACnetStack_RegisterCallbackGetPropertyCharacterString(GetPropertyCharacterString);

    // The device. AddDevice creates the Device object itself - do not AddObject it.
    if (!BACnetStack_AddDevice(g_deviceInstance)) {
        console.error("Error: BACnetStack_AddDevice failed.");
        process.exit(1);
    }

    // Exactly the services the B-SS profile requires - nothing more. The
    // stack emits Protocol_Services_Supported verbatim from these flags, and
    // its defaults leave even I-Am/I-Have false: enable everything you claim.
    // We deliberately do NOT enable WriteProperty, ReadPropertyMultiple,
    // SubscribeCOV, or any alarm/event service: a Smart Sensor does not
    // require them, so a faithful B-SS example leaves them off.
    const services: Array<[number, string]> = [
        [SERVICE_READ_PROPERTY, "ReadProperty (DS-RP-B)"],
        [SERVICE_WHO_IS, "Who-Is (DM-DDB-B)"],
        [SERVICE_I_AM, "I-Am (DM-DDB-B)"],
        [SERVICE_WHO_HAS, "Who-Has (DM-DOB-B)"],
        [SERVICE_I_HAVE, "I-Have (DM-DOB-B)"],
    ];
    for (const [service, label] of services) {
        if (!BACnetStack_SetServiceEnabled(g_deviceInstance, service, true)) {
            console.error(`Error: SetServiceEnabled failed for ${label}.`);
            process.exit(1);
        }
    }

    // The read-only sensor objects. Every stack setup call returns a bool; a
    // real device should always check it, so this example does too.
    const objects: Array<[number, number, string]> = [
        [OBJECT_TYPE_ANALOG_INPUT, ANALOG_INPUT_INSTANCE, 'Analog Input 1 ("Bronze")'],
        [OBJECT_TYPE_BINARY_INPUT, BINARY_INPUT_INSTANCE, 'Binary Input 1 ("Emerald")'],
        [OBJECT_TYPE_MULTI_STATE_INPUT, MULTI_STATE_INPUT_INSTANCE, 'Multi-State Input 1 ("Hot Pink")'],
    ];
    for (const [objectType, objectInstance, label] of objects) {
        if (!BACnetStack_AddObject(g_deviceInstance, objectType, objectInstance)) {
            console.error(`Error: AddObject failed for ${label}.`);
            process.exit(1);
        }
    }

    // Every BACnet device (Protocol_Revision 17+) must have at least one
    // Network Port object describing the port it talks on. This one is the
    // BACnet/IP application port; it is the lowest layer, so its reference
    // port is "none". networkNumber 0 with quality "unknown" describes a
    // local port that has not learned its network number - the right answer
    // for a device that is not a router and has not been told one.
    //
    // NOTE - stack API: on this example's pin (branch `6.x`) there is a
    // single AddNetworkPortObject() that always takes the network number and
    // its quality; an older AddNetworkPortObjectWithNetworkNumber() variant
    // no longer exists.
    if (
        !BACnetStack_AddNetworkPortObject(
            g_deviceInstance,
            NETWORK_PORT_INSTANCE,
            NETWORK_PORT_NETWORK_TYPE_IPV4, // GOTCHA: this enum (ipv4 = 5) is NOT the
            NETWORK_PORT_PROTOCOL_LEVEL_BACNET_APPLICATION, // message-callback's networkPortInstance
            0, // networkNumber: not configured
            NETWORK_NUMBER_QUALITY_UNKNOWN,
            NETWORK_PORT_REFERENCE_PORT_NONE
        )
    ) {
        console.error('Error: Failed to add Network Port 1 (Vermilion).');
        process.exit(1);
    }

    // Enable the OPTIONAL properties this example serves. The stack
    // automatically enables an object's REQUIRED properties when the object
    // is added (AddObject / AddNetworkPortObject) - so Units, Polarity,
    // Number_Of_States, Out_Of_Service, and the Network Port's BACnet/IP
    // addressing are already enabled; the Get* callbacks above just supply
    // their values. SILENT TRAP: an OPTIONAL property that is served without
    // being ENABLED answers unknown-property before your callback is ever
    // called - the callback is dead code that looks alive. Description and
    // State_Text are optional.
    if (!BACnetStack_SetPropertyEnabled(g_deviceInstance, OBJECT_TYPE_DEVICE, g_deviceInstance, PROPERTY_IDENTIFIER_DESCRIPTION, true)) {
        console.error("Error: SetPropertyEnabled failed for Device Description.");
        process.exit(1);
    }
    if (!BACnetStack_SetPropertyEnabled(g_deviceInstance, OBJECT_TYPE_MULTI_STATE_INPUT, MULTI_STATE_INPUT_INSTANCE, PROPERTY_IDENTIFIER_STATE_TEXT, true)) {
        console.error("Error: SetPropertyEnabled failed for Multi-State Input State_Text.");
        process.exit(1);
    }

    // Who-Is is answered automatically. The spec also requires a device to
    // announce itself on start-up, so broadcast an unsolicited I-Am now (to
    // the local subnet broadcast - the Network Port's own network).
    if (!SendIAm(g_deviceInstance, g_udpPort, NETWORK_PORT_INSTANCE)) {
        console.error("Error: SendIAm failed.");
        process.exit(1);
    }

    console.log(`FYI: Device ${g_deviceInstance} ("${DEVICE_NAME}") ready. Vendor ID ${VENDOR_IDENTIFIER}. Press 'h' for help.`);

    // --- The main loop -------------------------------------------------------
    // BACnetStack_Tick() does everything: reads queued datagrams (through the
    // receive callback), processes requests, transmits responses. It returns
    // true while it did work, so drain it, then let the event loop breathe.
    // 10 ms is far inside BACnet timing. (The C++ edition polls Tick() every
    // millisecond in a while-loop; a timer is the Node-idiomatic equivalent -
    // a deliberate, documented divergence.)
    const tick = setInterval(() => {
        while (BACnetStack_Tick()) {
            // drain
        }
    }, 10);

    const shutdown = () => {
        clearInterval(tick);
        if (process.stdin.isTTY) {
            process.stdin.setRawMode(false);
        }
        process.stdin.pause();
        udp.Shutdown();
        console.log("FYI: stopped.");
    };

    // Interactive keys (series-standard): h = help, q = quit, up/down = nudge
    // Analog Input 1 so a client can watch the value change.
    if (process.stdin.isTTY) {
        readline.emitKeypressEvents(process.stdin);
        process.stdin.setRawMode(true);
        process.stdin.on("keypress", (_chunk, key) => {
            if (key === undefined) {
                return;
            }
            if (key.name === "q" || (key.ctrl === true && key.name === "c")) {
                shutdown();
            } else if (key.name === "h") {
                PrintVersion(APP_NAME, APP_VERSION);
                console.log("Keys: h = this help, q = quit, up/down = Analog Input 1 +/- 1.1");
            } else if (key.name === "up") {
                g_analogInput1Value += 1.1;
                console.log(`FYI: Analog Input 1 ("Bronze") is now ${g_analogInput1Value.toFixed(1)}`);
            } else if (key.name === "down") {
                g_analogInput1Value -= 1.1;
                console.log(`FYI: Analog Input 1 ("Bronze") is now ${g_analogInput1Value.toFixed(1)}`);
            }
        });
    } else {
        // Not a terminal (CI smoke test): run until killed.
        process.on("SIGINT", shutdown);
        process.on("SIGTERM", shutdown);
    }
}

main().catch((err) => {
    console.error(`Error: ${err instanceof Error ? err.stack : err}`);
    process.exit(1);
});
