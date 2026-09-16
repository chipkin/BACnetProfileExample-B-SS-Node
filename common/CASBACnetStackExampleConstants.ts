// SPDX-License-Identifier: CC0-1.0
// Public-domain example code (CC0) - see ../LICENSE.

// CASBACnetStackExampleConstants.ts
// =============================================================================
// A small, self-contained set of the BACnet enumeration values that this
// example project needs. The CAS BACnet Stack defines the FULL enumerations
// internally, in the stack header noted above each section below. We mirror
// only the handful of values used here so the example is easy to read and
// copy into a customer project - open the referenced stack header to see
// every available value.
//
// Every value matches the BACnet standard (ANSI/ASHRAE 135) and the CAS
// BACnet Stack enumerations, and every constant name matches the C++ edition
// of this file (common/CASBACnetStackExampleConstants.h in
// BACnetProfileExample-B-SS-CPP) so the two languages diff 1:1. Add more as
// your own project needs them.
// =============================================================================

// -- BACnet object types (Object_Type enumeration) -------------------------
//    Full list: submodules/cas-bacnet-stack/source/BACnetObjectType.h
export const OBJECT_TYPE_ANALOG_INPUT = 0;
export const OBJECT_TYPE_BINARY_INPUT = 3;
export const OBJECT_TYPE_DEVICE = 8;
export const OBJECT_TYPE_MULTI_STATE_INPUT = 13;
export const OBJECT_TYPE_NETWORK_PORT = 56;

// -- BACnet property identifiers (Property_Identifier enumeration) ----------
//    Full list: submodules/cas-bacnet-stack/source/BACnetPropertyIdentifier.h
export const PROPERTY_IDENTIFIER_APPLICATION_SOFTWARE_VERSION = 12;
export const PROPERTY_IDENTIFIER_APDU_LENGTH = 399;
export const PROPERTY_IDENTIFIER_DESCRIPTION = 28;
export const PROPERTY_IDENTIFIER_FIRMWARE_REVISION = 44;
export const PROPERTY_IDENTIFIER_MODEL_NAME = 70;
export const PROPERTY_IDENTIFIER_IP_ADDRESS = 400;
export const PROPERTY_IDENTIFIER_IP_DEFAULT_GATEWAY = 401;
export const PROPERTY_IDENTIFIER_BACNET_IP_MODE = 408;
export const PROPERTY_IDENTIFIER_IP_SUBNET_MASK = 411;
export const PROPERTY_IDENTIFIER_BACNET_IP_UDP_PORT = 412;
export const PROPERTY_IDENTIFIER_NUMBER_OF_STATES = 74;
export const PROPERTY_IDENTIFIER_OBJECT_NAME = 77;
export const PROPERTY_IDENTIFIER_OUT_OF_SERVICE = 81;
export const PROPERTY_IDENTIFIER_POLARITY = 84;
export const PROPERTY_IDENTIFIER_PRESENT_VALUE = 85;
export const PROPERTY_IDENTIFIER_REFERENCE_PORT = 483;
export const PROPERTY_IDENTIFIER_STATE_TEXT = 110;
export const PROPERTY_IDENTIFIER_UNITS = 117;
export const PROPERTY_IDENTIFIER_VENDOR_IDENTIFIER = 120;
export const PROPERTY_IDENTIFIER_VENDOR_NAME = 121;

// -- BACnet engineering units (Engineering_Units enumeration) ---------------
//    Full list: submodules/cas-bacnet-stack/source/BACnetEngineeringUnits.h
export const ENGINEERING_UNITS_DEGREES_CELSIUS = 62;

// -- BACnet polarity (Polarity enumeration, for Binary objects) -------------
//    Full list: submodules/cas-bacnet-stack/source/BACnetPolarity.h
export const POLARITY_NORMAL = 0;

// -- BACnet/IP mode (BACnetIPMode enumeration, for the Network Port) ---------
//    Full list: submodules/cas-bacnet-stack/source/BACnetIPMode.h
export const BACNET_IP_MODE_NORMAL = 0;

// -- BACnet services (Services_Supported enumeration) -----------------------
//    Full list: submodules/cas-bacnet-stack/source/BACnetServicesSupported.h
//    Used with BACnetStack_SetServiceEnabled() to turn individual services on/off.
//    Enable ONLY the services your profile requires - omitting the rest is the
//    whole point of a profile example.
export const SERVICE_READ_PROPERTY = 12;
export const SERVICE_I_AM = 26;
export const SERVICE_I_HAVE = 27;
export const SERVICE_WHO_HAS = 33;
export const SERVICE_WHO_IS = 34;

// -- Network Port object network type (BACnetNetworkType enumeration, used by
//    BACnetStack_AddNetworkPortObject).
//    Full list: submodules/cas-bacnet-stack/source/BACnetNetworkType.h
export const NETWORK_PORT_NETWORK_TYPE_IPV4 = 5;

// -- Network Port object protocol level (BACnetProtocolLevel enumeration, used
//    by BACnetStack_AddNetworkPortObject).
//    Full list: submodules/cas-bacnet-stack/source/BACnetProtocolLevel.h
export const NETWORK_PORT_PROTOCOL_LEVEL_BACNET_APPLICATION = 2;
// The lowest protocol layer references this sentinel instead of another port.
export const NETWORK_PORT_REFERENCE_PORT_NONE = 4194303;

// -- Network_Number_Quality (BACnetNetworkNumberQuality, cl. 12.56.11). Says how
//    the port learned its Network_Number. A port that has not been told and has
//    not learned one reports "unknown" with Network_Number = 0.
export const NETWORK_NUMBER_QUALITY_UNKNOWN = 0;

// -- Character string encoding (the encoding byte written by the character-
//    string Get callback). 0 = UTF-8. The BACnet character-set values are
//    defined by ANSI/ASHRAE 135 Clause 20.2.9; see the stack's handling in
//    submodules/cas-bacnet-stack/source/BACnetPrimitiveCharSTRING.h
export const CHARACTER_STRING_ENCODING_UTF8 = 0;

// -- BACnet error codes (Error_Code enumeration) ----------------------------
//    Full list: submodules/cas-bacnet-stack/source/BACnetErrorCode.h
//    A GetProperty* callback (stack issue #974) may write one of these to its
//    trailing errorCode: Buffer out-param (errorCode.writeUInt32LE(code, 0))
//    and return false to name the BACnet error a client receives, instead of
//    letting the stack silently substitute a default. This example uses it in
//    exactly one place: an out-of-range State_Text array index.
export const ERROR_CODE_INVALID_ARRAY_INDEX = 42;

// -- BACnet/IP default port ---------------------------------------------------
export const BACNET_NETWORK_PORT_DEFAULT = 4194303;
