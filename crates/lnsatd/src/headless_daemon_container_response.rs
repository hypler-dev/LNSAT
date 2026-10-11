use serde::de::{self, MapAccess, Visitor};
use serde::{Deserialize, Deserializer};
use std::fmt;
use zeroize::Zeroizing;

const MAX_BODY_BYTES: usize = 1_048_576;
const MAX_KEY_BYTES: usize = 256;
const MAX_VALUE_BYTES: usize = 4_096;
const MAX_CONTAINER_DEPTH: usize = 32;
const MAX_OBJECT_MEMBERS: usize = 64;
const MAX_TOTAL_OBJECT_MEMBERS: usize = 4_096;
const MAX_ARRAY_ELEMENTS: usize = 128;

#[derive(Debug, Eq, PartialEq)]
enum ContainerResponseDecodeError {
    InputTooLarge,
    JsonSyntax,
    JsonLimits,
    JsonShape,
    Recipe,
}

impl ContainerResponseDecodeError {
    const fn as_str(&self) -> &'static str {
        match self {
            Self::InputTooLarge => "headless_container_response.input_too_large",
            Self::JsonSyntax => "headless_container_response.json_syntax",
            Self::JsonLimits => "headless_container_response.json_limits",
            Self::JsonShape => "headless_container_response.json_shape",
            Self::Recipe => "headless_container_response.recipe",
        }
    }
}

struct UnverifiedCreatedContainer {
    id: Zeroizing<String>,
}

struct UnverifiedZeroExit;

fn decode_create_claim(
    input: &[u8],
) -> Result<UnverifiedCreatedContainer, ContainerResponseDecodeError> {
    preflight(input)?;
    let response: CreateResponse =
        serde_json::from_slice(input).map_err(|_| ContainerResponseDecodeError::JsonShape)?;
    validate_create_recipe(&response)?;
    Ok(UnverifiedCreatedContainer { id: response.id })
}

fn decode_wait_claim(input: &[u8]) -> Result<UnverifiedZeroExit, ContainerResponseDecodeError> {
    preflight(input)?;
    let response: WaitResponse =
        serde_json::from_slice(input).map_err(|_| ContainerResponseDecodeError::JsonShape)?;
    validate_wait_recipe(&response)?;
    Ok(UnverifiedZeroExit)
}

fn preflight(input: &[u8]) -> Result<(), ContainerResponseDecodeError> {
    if input.len() > MAX_BODY_BYTES {
        return Err(ContainerResponseDecodeError::InputTooLarge);
    }
    if std::str::from_utf8(input).is_err() {
        return Err(ContainerResponseDecodeError::JsonSyntax);
    }
    if ResponsePreflight::new(input)
        .scan_document()
        .map_err(ScanError::into_decode_error)?
    {
        return Err(ContainerResponseDecodeError::JsonShape);
    }
    Ok(())
}

struct CreateResponse {
    id: Zeroizing<String>,
    warnings: Vec<Zeroizing<String>>,
}

impl<'de> Deserialize<'de> for CreateResponse {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        struct CreateResponseVisitor;

        impl<'de> Visitor<'de> for CreateResponseVisitor {
            type Value = CreateResponse;

            fn expecting(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
                formatter.write_str("a Create response object")
            }

            fn visit_map<A>(self, mut map: A) -> Result<Self::Value, A::Error>
            where
                A: MapAccess<'de>,
            {
                let mut id = None;
                let mut warnings = None;
                while let Some(key) = map.next_key::<Zeroizing<String>>()? {
                    match key.as_str() {
                        "Id" => set_once(&mut id, map.next_value()?)?,
                        "Warnings" => set_once(&mut warnings, map.next_value()?)?,
                        _ => return Err(de::Error::custom("unknown Create response member")),
                    }
                }
                Ok(CreateResponse {
                    id: required(id)?,
                    warnings: required(warnings)?,
                })
            }
        }

        deserializer.deserialize_map(CreateResponseVisitor)
    }
}

struct WaitResponse {
    status_code: i64,
    error: Option<WaitError>,
}

impl<'de> Deserialize<'de> for WaitResponse {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        struct WaitResponseVisitor;

        impl<'de> Visitor<'de> for WaitResponseVisitor {
            type Value = WaitResponse;

            fn expecting(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
                formatter.write_str("a Wait response object")
            }

            fn visit_map<A>(self, mut map: A) -> Result<Self::Value, A::Error>
            where
                A: MapAccess<'de>,
            {
                let mut status_code = None;
                let mut error = None;
                while let Some(key) = map.next_key::<Zeroizing<String>>()? {
                    match key.as_str() {
                        "StatusCode" => set_once(&mut status_code, map.next_value()?)?,
                        "Error" => set_once(&mut error, map.next_value()?)?,
                        _ => return Err(de::Error::custom("unknown Wait response member")),
                    }
                }
                Ok(WaitResponse {
                    status_code: required(status_code)?,
                    error,
                })
            }
        }

        deserializer.deserialize_map(WaitResponseVisitor)
    }
}

struct WaitError {
    message: Option<Zeroizing<String>>,
}

impl<'de> Deserialize<'de> for WaitError {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        struct WaitErrorVisitor;

        impl<'de> Visitor<'de> for WaitErrorVisitor {
            type Value = WaitError;

            fn expecting(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
                formatter.write_str("a Wait Error object")
            }

            fn visit_map<A>(self, mut map: A) -> Result<Self::Value, A::Error>
            where
                A: MapAccess<'de>,
            {
                let mut message = None;
                while let Some(key) = map.next_key::<Zeroizing<String>>()? {
                    match key.as_str() {
                        "Message" => set_once(&mut message, map.next_value()?)?,
                        _ => return Err(de::Error::custom("unknown Wait Error member")),
                    }
                }
                Ok(WaitError { message })
            }
        }

        deserializer.deserialize_map(WaitErrorVisitor)
    }
}

fn set_once<T, E>(slot: &mut Option<T>, value: T) -> Result<(), E>
where
    E: de::Error,
{
    if slot.replace(value).is_some() {
        return Err(E::custom("duplicate response member"));
    }
    Ok(())
}

fn required<T, E>(value: Option<T>) -> Result<T, E>
where
    E: de::Error,
{
    value.ok_or_else(|| E::custom("missing response member"))
}

fn validate_create_recipe(response: &CreateResponse) -> Result<(), ContainerResponseDecodeError> {
    if response.id.len() != 64
        || !response
            .id
            .as_bytes()
            .iter()
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(byte))
        || !response.warnings.is_empty()
    {
        return Err(ContainerResponseDecodeError::Recipe);
    }
    Ok(())
}

fn validate_wait_recipe(response: &WaitResponse) -> Result<(), ContainerResponseDecodeError> {
    let _discarded_message = response
        .error
        .as_ref()
        .and_then(|error| error.message.as_ref());
    if response.status_code != 0 || response.error.is_some() {
        return Err(ContainerResponseDecodeError::Recipe);
    }
    Ok(())
}

enum ScanError {
    Syntax,
    Limits,
}

impl ScanError {
    const fn into_decode_error(self) -> ContainerResponseDecodeError {
        match self {
            Self::Syntax => ContainerResponseDecodeError::JsonSyntax,
            Self::Limits => ContainerResponseDecodeError::JsonLimits,
        }
    }
}

struct ResponsePreflight<'a> {
    bytes: &'a [u8],
    position: usize,
    total_object_members: usize,
    non_decimal_number: bool,
}

impl<'a> ResponsePreflight<'a> {
    const fn new(bytes: &'a [u8]) -> Self {
        Self {
            bytes,
            position: 0,
            total_object_members: 0,
            non_decimal_number: false,
        }
    }

    fn scan_document(&mut self) -> Result<bool, ScanError> {
        self.skip_whitespace();
        self.scan_value(1)?;
        self.skip_whitespace();
        if self.position == self.bytes.len() {
            Ok(self.non_decimal_number)
        } else {
            Err(ScanError::Syntax)
        }
    }

    fn scan_value(&mut self, depth: usize) -> Result<(), ScanError> {
        match self.current() {
            Some(b'{') => self.scan_object(depth),
            Some(b'[') => self.scan_array(depth),
            Some(b'"') => self.scan_string(MAX_VALUE_BYTES, false),
            Some(b't') => self.scan_keyword(b"true"),
            Some(b'f') => self.scan_keyword(b"false"),
            Some(b'n') => self.scan_keyword(b"null"),
            Some(b'-' | b'0'..=b'9') => self.scan_number(),
            _ => Err(ScanError::Syntax),
        }
    }

    fn scan_object(&mut self, depth: usize) -> Result<(), ScanError> {
        if depth > MAX_CONTAINER_DEPTH {
            return Err(ScanError::Limits);
        }
        self.position += 1;
        self.skip_whitespace();
        if self.consume(b'}') {
            return Ok(());
        }
        let mut members = 0;
        loop {
            if members == MAX_OBJECT_MEMBERS
                || self.total_object_members == MAX_TOTAL_OBJECT_MEMBERS
            {
                return Err(ScanError::Limits);
            }
            self.scan_string(MAX_KEY_BYTES, true)?;
            members += 1;
            self.total_object_members += 1;
            self.skip_whitespace();
            self.expect(b':')?;
            self.skip_whitespace();
            self.scan_value(depth + 1)?;
            self.skip_whitespace();
            if self.consume(b'}') {
                return Ok(());
            }
            self.expect(b',')?;
            self.skip_whitespace();
            if self.current() == Some(b'}') {
                return Err(ScanError::Syntax);
            }
        }
    }

    fn scan_array(&mut self, depth: usize) -> Result<(), ScanError> {
        if depth > MAX_CONTAINER_DEPTH {
            return Err(ScanError::Limits);
        }
        self.position += 1;
        self.skip_whitespace();
        if self.consume(b']') {
            return Ok(());
        }
        let mut elements = 0;
        loop {
            if elements == MAX_ARRAY_ELEMENTS {
                return Err(ScanError::Limits);
            }
            self.scan_value(depth + 1)?;
            elements += 1;
            self.skip_whitespace();
            if self.consume(b']') {
                return Ok(());
            }
            self.expect(b',')?;
            self.skip_whitespace();
            if self.current() == Some(b']') {
                return Err(ScanError::Syntax);
            }
        }
    }

    fn scan_string(&mut self, maximum: usize, require_nonempty: bool) -> Result<(), ScanError> {
        self.expect(b'"')?;
        let mut decoded = 0;
        loop {
            let byte = self.current().ok_or(ScanError::Syntax)?;
            match byte {
                b'"' => {
                    self.position += 1;
                    if require_nonempty && decoded == 0 {
                        return Err(ScanError::Limits);
                    }
                    return Ok(());
                }
                0x00..=0x1f => return Err(ScanError::Syntax),
                b'\\' => {
                    self.position += 1;
                    let escape = self.current().ok_or(ScanError::Syntax)?;
                    match escape {
                        b'"' | b'\\' | b'/' | b'b' | b'f' | b'n' | b'r' | b't' => {
                            self.position += 1;
                            Self::add_bytes(&mut decoded, 1, maximum)?;
                        }
                        b'u' => {
                            self.position += 1;
                            let high = self.scan_hex_code_unit()?;
                            let scalar = if (0xd800..=0xdbff).contains(&high) {
                                self.expect(b'\\')?;
                                self.expect(b'u')?;
                                let low = self.scan_hex_code_unit()?;
                                if !(0xdc00..=0xdfff).contains(&low) {
                                    return Err(ScanError::Syntax);
                                }
                                0x1_0000
                                    + (((u32::from(high) - 0xd800) << 10)
                                        | (u32::from(low) - 0xdc00))
                            } else if (0xdc00..=0xdfff).contains(&high) {
                                return Err(ScanError::Syntax);
                            } else {
                                u32::from(high)
                            };
                            let mut encoded = Zeroizing::new([0_u8; 4]);
                            let width = char::from_u32(scalar)
                                .ok_or(ScanError::Syntax)?
                                .encode_utf8(&mut *encoded)
                                .len();
                            Self::add_bytes(&mut decoded, width, maximum)?;
                        }
                        _ => return Err(ScanError::Syntax),
                    }
                }
                _ => {
                    self.position += 1;
                    Self::add_bytes(&mut decoded, 1, maximum)?;
                }
            }
        }
    }

    fn scan_hex_code_unit(&mut self) -> Result<u16, ScanError> {
        let mut value = 0_u16;
        for _ in 0..4 {
            let byte = self.current().ok_or(ScanError::Syntax)?;
            let digit = match byte {
                b'0'..=b'9' => u16::from(byte - b'0'),
                b'a'..=b'f' => u16::from(byte - b'a' + 10),
                b'A'..=b'F' => u16::from(byte - b'A' + 10),
                _ => return Err(ScanError::Syntax),
            };
            value = (value << 4) | digit;
            self.position += 1;
        }
        Ok(value)
    }

    fn scan_number(&mut self) -> Result<(), ScanError> {
        let negative = self.consume(b'-');
        match self.current() {
            Some(b'0') => {
                self.position += 1;
                if negative {
                    self.non_decimal_number = true;
                }
                if matches!(self.current(), Some(b'0'..=b'9')) {
                    return Err(ScanError::Syntax);
                }
            }
            Some(b'1'..=b'9') => {
                self.position += 1;
                while matches!(self.current(), Some(b'0'..=b'9')) {
                    self.position += 1;
                }
            }
            _ => return Err(ScanError::Syntax),
        }
        if self.consume(b'.') {
            self.non_decimal_number = true;
            self.scan_digits()?;
        }
        if matches!(self.current(), Some(b'e' | b'E')) {
            self.non_decimal_number = true;
            self.position += 1;
            let _ = self.consume(b'+') || self.consume(b'-');
            self.scan_digits()?;
        }
        Ok(())
    }

    fn scan_digits(&mut self) -> Result<(), ScanError> {
        if !matches!(self.current(), Some(b'0'..=b'9')) {
            return Err(ScanError::Syntax);
        }
        while matches!(self.current(), Some(b'0'..=b'9')) {
            self.position += 1;
        }
        Ok(())
    }

    fn skip_whitespace(&mut self) {
        while matches!(self.current(), Some(b' ' | b'\n' | b'\r' | b'\t')) {
            self.position += 1;
        }
    }

    fn current(&self) -> Option<u8> {
        self.bytes.get(self.position).copied()
    }

    fn consume(&mut self, byte: u8) -> bool {
        if self.current() == Some(byte) {
            self.position += 1;
            true
        } else {
            false
        }
    }

    fn expect(&mut self, byte: u8) -> Result<(), ScanError> {
        if self.consume(byte) {
            Ok(())
        } else {
            Err(ScanError::Syntax)
        }
    }

    fn scan_keyword(&mut self, keyword: &[u8]) -> Result<(), ScanError> {
        let end = self
            .position
            .checked_add(keyword.len())
            .ok_or(ScanError::Syntax)?;
        if self.bytes.get(self.position..end) == Some(keyword) {
            self.position = end;
            Ok(())
        } else {
            Err(ScanError::Syntax)
        }
    }

    fn add_bytes(total: &mut usize, addition: usize, maximum: usize) -> Result<(), ScanError> {
        let next = total.checked_add(addition).ok_or(ScanError::Limits)?;
        if next > maximum {
            return Err(ScanError::Limits);
        }
        *total = next;
        Ok(())
    }
}

#[cfg(test)]
#[path = "headless_daemon_container_response_tests.rs"]
mod tests;
