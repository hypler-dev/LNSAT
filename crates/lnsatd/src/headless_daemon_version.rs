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
const MAX_ARRAY_ELEMENTS: usize = 8;

const FIXED_VERSION: &str = "29.8.2";
const FIXED_API_VERSION: &str = "1.56";
const FIXED_OS: &str = "linux";
const FIXED_CONTAINERS_VERSION: &str = "2.3.6";
const FIXED_RUNC_VERSION: &str = "1.5.2";
const FIXED_MODULE: &str = "github.com/moby/moby/v2";
const FIXED_EXPERIMENTAL: &str = "false";

#[derive(Debug, Eq, PartialEq)]
enum VersionDecodeError {
    InputTooLarge,
    JsonSyntax,
    JsonLimits,
    JsonShape,
    Recipe,
    Inconsistent,
}

impl VersionDecodeError {
    const fn code(&self) -> &'static str {
        match self {
            Self::InputTooLarge => "headless_version.input_too_large",
            Self::JsonSyntax => "headless_version.json_syntax",
            Self::JsonLimits => "headless_version.json_limits",
            Self::JsonShape => "headless_version.json_shape",
            Self::Recipe => "headless_version.recipe",
            Self::Inconsistent => "headless_version.inconsistent",
        }
    }
}

struct ComponentVersionClaim {
    version: Zeroizing<String>,
    git_commit: Zeroizing<String>,
}

struct UnverifiedVersion {
    platform_name: Zeroizing<String>,
    architecture: Zeroizing<String>,
    minimum_api_version: Zeroizing<String>,
    kernel_version: Zeroizing<String>,
    engine_git_commit: Zeroizing<String>,
    engine_go_version: Zeroizing<String>,
    engine_build_time: Zeroizing<String>,
    engine_module_version: Zeroizing<String>,
    containerd: ComponentVersionClaim,
    runc: ComponentVersionClaim,
    docker_init: ComponentVersionClaim,
}

fn decode_version_claim(input: &[u8]) -> Result<UnverifiedVersion, VersionDecodeError> {
    if input.len() > MAX_BODY_BYTES {
        return Err(VersionDecodeError::InputTooLarge);
    }
    if std::str::from_utf8(input).is_err() {
        return Err(VersionDecodeError::JsonSyntax);
    }

    JsonPreflight::new(input)
        .scan_document()
        .map_err(ScanError::into_decode_error)?;

    let response: VersionResponse =
        serde_json::from_slice(input).map_err(|_| VersionDecodeError::JsonShape)?;
    validate_recipe(&response)?;
    validate_consistency(&response)?;
    project(response)
}

struct VersionResponse {
    platform: Platform,
    version: Zeroizing<String>,
    api_version: Zeroizing<String>,
    minimum_api_version: Zeroizing<String>,
    os: Zeroizing<String>,
    architecture: Zeroizing<String>,
    components: Vec<Component>,
    git_commit: Zeroizing<String>,
    go_version: Zeroizing<String>,
    kernel_version: Zeroizing<String>,
    build_time: Zeroizing<String>,
}

struct Platform {
    name: Zeroizing<String>,
}

struct Component {
    name: Zeroizing<String>,
    version: Zeroizing<String>,
    details: Details,
}

impl<'de> Deserialize<'de> for VersionResponse {
    #[allow(
        clippy::too_many_lines,
        reason = "Closed map decoding keeps every accepted Version root member locally auditable"
    )]
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        struct VersionResponseVisitor;

        impl<'de> Visitor<'de> for VersionResponseVisitor {
            type Value = VersionResponse;

            fn expecting(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
                formatter.write_str("a Version response object")
            }

            fn visit_map<A>(self, mut map: A) -> Result<Self::Value, A::Error>
            where
                A: MapAccess<'de>,
            {
                let mut platform = None;
                let mut version = None;
                let mut api_version = None;
                let mut minimum_api_version = None;
                let mut os = None;
                let mut architecture = None;
                let mut components = None;
                let mut git_commit = None;
                let mut go_version = None;
                let mut kernel_version = None;
                let mut build_time = None;

                while let Some(key) = map.next_key::<Zeroizing<String>>()? {
                    match key.as_str() {
                        "Platform" => {
                            if platform.is_some() {
                                return Err(de::Error::duplicate_field("Platform"));
                            }
                            platform = Some(map.next_value()?);
                        }
                        "Version" => {
                            if version.is_some() {
                                return Err(de::Error::duplicate_field("Version"));
                            }
                            version = Some(map.next_value()?);
                        }
                        "ApiVersion" => {
                            if api_version.is_some() {
                                return Err(de::Error::duplicate_field("ApiVersion"));
                            }
                            api_version = Some(map.next_value()?);
                        }
                        "MinAPIVersion" => {
                            if minimum_api_version.is_some() {
                                return Err(de::Error::duplicate_field("MinAPIVersion"));
                            }
                            minimum_api_version = Some(map.next_value()?);
                        }
                        "Os" => {
                            if os.is_some() {
                                return Err(de::Error::duplicate_field("Os"));
                            }
                            os = Some(map.next_value()?);
                        }
                        "Arch" => {
                            if architecture.is_some() {
                                return Err(de::Error::duplicate_field("Arch"));
                            }
                            architecture = Some(map.next_value()?);
                        }
                        "Components" => {
                            if components.is_some() {
                                return Err(de::Error::duplicate_field("Components"));
                            }
                            components = Some(map.next_value()?);
                        }
                        "GitCommit" => {
                            if git_commit.is_some() {
                                return Err(de::Error::duplicate_field("GitCommit"));
                            }
                            git_commit = Some(map.next_value()?);
                        }
                        "GoVersion" => {
                            if go_version.is_some() {
                                return Err(de::Error::duplicate_field("GoVersion"));
                            }
                            go_version = Some(map.next_value()?);
                        }
                        "KernelVersion" => {
                            if kernel_version.is_some() {
                                return Err(de::Error::duplicate_field("KernelVersion"));
                            }
                            kernel_version = Some(map.next_value()?);
                        }
                        "BuildTime" => {
                            if build_time.is_some() {
                                return Err(de::Error::duplicate_field("BuildTime"));
                            }
                            build_time = Some(map.next_value()?);
                        }
                        _ => return Err(de::Error::custom("unknown Version response member")),
                    }
                }

                Ok(VersionResponse {
                    platform: platform.ok_or_else(|| de::Error::missing_field("Platform"))?,
                    version: version.ok_or_else(|| de::Error::missing_field("Version"))?,
                    api_version: api_version
                        .ok_or_else(|| de::Error::missing_field("ApiVersion"))?,
                    minimum_api_version: minimum_api_version
                        .ok_or_else(|| de::Error::missing_field("MinAPIVersion"))?,
                    os: os.ok_or_else(|| de::Error::missing_field("Os"))?,
                    architecture: architecture.ok_or_else(|| de::Error::missing_field("Arch"))?,
                    components: components.ok_or_else(|| de::Error::missing_field("Components"))?,
                    git_commit: git_commit.ok_or_else(|| de::Error::missing_field("GitCommit"))?,
                    go_version: go_version.ok_or_else(|| de::Error::missing_field("GoVersion"))?,
                    kernel_version: kernel_version
                        .ok_or_else(|| de::Error::missing_field("KernelVersion"))?,
                    build_time: build_time.ok_or_else(|| de::Error::missing_field("BuildTime"))?,
                })
            }
        }

        deserializer.deserialize_map(VersionResponseVisitor)
    }
}

impl<'de> Deserialize<'de> for Platform {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        struct PlatformVisitor;

        impl<'de> Visitor<'de> for PlatformVisitor {
            type Value = Platform;

            fn expecting(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
                formatter.write_str("a Platform object")
            }

            fn visit_map<A>(self, mut map: A) -> Result<Self::Value, A::Error>
            where
                A: MapAccess<'de>,
            {
                let mut name = None;
                while let Some(key) = map.next_key::<Zeroizing<String>>()? {
                    if key.as_str() != "Name" {
                        return Err(de::Error::custom("unknown Platform member"));
                    }
                    if name.is_some() {
                        return Err(de::Error::duplicate_field("Name"));
                    }
                    name = Some(map.next_value()?);
                }
                Ok(Platform {
                    name: name.ok_or_else(|| de::Error::missing_field("Name"))?,
                })
            }
        }

        deserializer.deserialize_map(PlatformVisitor)
    }
}

impl<'de> Deserialize<'de> for Component {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        struct ComponentVisitor;

        impl<'de> Visitor<'de> for ComponentVisitor {
            type Value = Component;

            fn expecting(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
                formatter.write_str("a Component object")
            }

            fn visit_map<A>(self, mut map: A) -> Result<Self::Value, A::Error>
            where
                A: MapAccess<'de>,
            {
                let mut name = None;
                let mut version = None;
                let mut details = None;
                while let Some(key) = map.next_key::<Zeroizing<String>>()? {
                    match key.as_str() {
                        "Name" => {
                            if name.is_some() {
                                return Err(de::Error::duplicate_field("Name"));
                            }
                            name = Some(map.next_value()?);
                        }
                        "Version" => {
                            if version.is_some() {
                                return Err(de::Error::duplicate_field("Version"));
                            }
                            version = Some(map.next_value()?);
                        }
                        "Details" => {
                            if details.is_some() {
                                return Err(de::Error::duplicate_field("Details"));
                            }
                            details = Some(map.next_value()?);
                        }
                        _ => return Err(de::Error::custom("unknown Component member")),
                    }
                }
                Ok(Component {
                    name: name.ok_or_else(|| de::Error::missing_field("Name"))?,
                    version: version.ok_or_else(|| de::Error::missing_field("Version"))?,
                    details: details.ok_or_else(|| de::Error::missing_field("Details"))?,
                })
            }
        }

        deserializer.deserialize_map(ComponentVisitor)
    }
}

struct Details {
    entries: Vec<DetailEntry>,
}

struct DetailEntry {
    key: Zeroizing<String>,
    value: Zeroizing<String>,
}

impl Details {
    fn required(&self, key: &str) -> Result<&Zeroizing<String>, VersionDecodeError> {
        self.entries
            .iter()
            .find(|entry| entry.key.as_str() == key)
            .map(|entry| &entry.value)
            .ok_or(VersionDecodeError::Recipe)
    }

    fn take_required(&mut self, key: &str) -> Result<Zeroizing<String>, VersionDecodeError> {
        let index = self
            .entries
            .iter()
            .position(|entry| entry.key.as_str() == key)
            .ok_or(VersionDecodeError::Recipe)?;
        let DetailEntry { value, .. } = self.entries.swap_remove(index);
        Ok(value)
    }
}

impl<'de> Deserialize<'de> for Details {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        struct DetailsVisitor;

        impl<'de> Visitor<'de> for DetailsVisitor {
            type Value = Details;

            fn expecting(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
                formatter.write_str("a JSON object of string detail pairs")
            }

            fn visit_map<A>(self, mut map: A) -> Result<Self::Value, A::Error>
            where
                A: MapAccess<'de>,
            {
                let mut entries = Vec::new();
                while let Some((key, value)) =
                    map.next_entry::<Zeroizing<String>, Zeroizing<String>>()?
                {
                    if entries
                        .iter()
                        .any(|entry: &DetailEntry| entry.key.as_str() == key.as_str())
                    {
                        return Err(de::Error::custom("duplicate detail key"));
                    }
                    entries.push(DetailEntry { key, value });
                }
                Ok(Details { entries })
            }
        }

        deserializer.deserialize_map(DetailsVisitor)
    }
}

fn validate_recipe(response: &VersionResponse) -> Result<(), VersionDecodeError> {
    require_claim(&response.platform.name)?;
    require_claim(&response.version)?;
    require_claim(&response.api_version)?;
    require_claim(&response.minimum_api_version)?;
    require_claim(&response.os)?;
    require_claim(&response.architecture)?;
    require_claim(&response.git_commit)?;
    require_claim(&response.go_version)?;
    require_claim(&response.kernel_version)?;
    require_claim(&response.build_time)?;

    require_exact(&response.version, FIXED_VERSION)?;
    require_exact(&response.api_version, FIXED_API_VERSION)?;
    require_exact(&response.os, FIXED_OS)?;

    if response.components.len() != 4 {
        return Err(VersionDecodeError::Recipe);
    }
    for component in &response.components {
        require_claim(&component.version)?;
        match component.name.as_str() {
            "Engine" | "containerd" | "runc" | "docker-init" => {}
            _ => return Err(VersionDecodeError::Recipe),
        }
        if response
            .components
            .iter()
            .filter(|candidate| candidate.name.as_str() == component.name.as_str())
            .count()
            != 1
        {
            return Err(VersionDecodeError::Recipe);
        }
    }

    let engine = component(response, "Engine")?;
    let containerd = component(response, "containerd")?;
    let runc = component(response, "runc")?;
    let docker_init = component(response, "docker-init")?;

    require_exact(&engine.version, FIXED_VERSION)?;
    require_exact(&containerd.version, FIXED_CONTAINERS_VERSION)?;
    require_exact(&runc.version, FIXED_RUNC_VERSION)?;

    for key in [
        "GitCommit",
        "ApiVersion",
        "MinAPIVersion",
        "GoVersion",
        "Os",
        "Arch",
        "BuildTime",
        "KernelVersion",
        "Module",
        "ModuleVersion",
        "Experimental",
    ] {
        require_claim(engine.details.required(key)?)?;
    }
    require_exact(engine.details.required("Module")?, FIXED_MODULE)?;
    require_exact(engine.details.required("Experimental")?, FIXED_EXPERIMENTAL)?;

    for component in [containerd, runc, docker_init] {
        require_claim(component.details.required("GitCommit")?)?;
    }

    Ok(())
}

fn validate_consistency(response: &VersionResponse) -> Result<(), VersionDecodeError> {
    let engine = component(response, "Engine")?;
    for (root, detail) in [
        (&response.git_commit, engine.details.required("GitCommit")?),
        (
            &response.api_version,
            engine.details.required("ApiVersion")?,
        ),
        (
            &response.minimum_api_version,
            engine.details.required("MinAPIVersion")?,
        ),
        (&response.go_version, engine.details.required("GoVersion")?),
        (&response.os, engine.details.required("Os")?),
        (&response.architecture, engine.details.required("Arch")?),
        (&response.build_time, engine.details.required("BuildTime")?),
        (
            &response.kernel_version,
            engine.details.required("KernelVersion")?,
        ),
    ] {
        if root.as_str() != detail.as_str() {
            return Err(VersionDecodeError::Inconsistent);
        }
    }
    Ok(())
}

fn require_claim(value: &Zeroizing<String>) -> Result<(), VersionDecodeError> {
    if value.is_empty() || value.as_str() == "N/A" {
        return Err(VersionDecodeError::Recipe);
    }
    Ok(())
}

fn require_exact(value: &Zeroizing<String>, expected: &str) -> Result<(), VersionDecodeError> {
    if value.as_str() != expected {
        return Err(VersionDecodeError::Recipe);
    }
    Ok(())
}

fn component<'a>(
    response: &'a VersionResponse,
    name: &str,
) -> Result<&'a Component, VersionDecodeError> {
    response
        .components
        .iter()
        .find(|component| component.name.as_str() == name)
        .ok_or(VersionDecodeError::Recipe)
}

fn project(response: VersionResponse) -> Result<UnverifiedVersion, VersionDecodeError> {
    let VersionResponse {
        platform,
        version: _,
        api_version: _,
        minimum_api_version,
        os: _,
        architecture,
        components,
        git_commit,
        go_version,
        kernel_version,
        build_time,
    } = response;

    let mut engine = None;
    let mut containerd = None;
    let mut runc = None;
    let mut docker_init = None;
    for component in components {
        match component.name.as_str() {
            "Engine" => engine = Some(component),
            "containerd" => containerd = Some(component),
            "runc" => runc = Some(component),
            "docker-init" => docker_init = Some(component),
            _ => return Err(VersionDecodeError::Recipe),
        }
    }

    let mut engine = engine.ok_or(VersionDecodeError::Recipe)?;
    let engine_module_version = engine.details.take_required("ModuleVersion")?;
    let containerd = project_component(containerd.ok_or(VersionDecodeError::Recipe)?)?;
    let runc = project_component(runc.ok_or(VersionDecodeError::Recipe)?)?;
    let docker_init = project_component(docker_init.ok_or(VersionDecodeError::Recipe)?)?;

    Ok(UnverifiedVersion {
        platform_name: platform.name,
        architecture,
        minimum_api_version,
        kernel_version,
        engine_git_commit: git_commit,
        engine_go_version: go_version,
        engine_build_time: build_time,
        engine_module_version,
        containerd,
        runc,
        docker_init,
    })
}

fn project_component(
    mut component: Component,
) -> Result<ComponentVersionClaim, VersionDecodeError> {
    let git_commit = component.details.take_required("GitCommit")?;
    Ok(ComponentVersionClaim {
        version: component.version,
        git_commit,
    })
}

enum ScanError {
    Syntax,
    Limits,
}

impl ScanError {
    const fn into_decode_error(self) -> VersionDecodeError {
        match self {
            Self::Syntax => VersionDecodeError::JsonSyntax,
            Self::Limits => VersionDecodeError::JsonLimits,
        }
    }
}

struct JsonPreflight<'a> {
    bytes: &'a [u8],
    position: usize,
    total_object_members: usize,
}

impl<'a> JsonPreflight<'a> {
    const fn new(bytes: &'a [u8]) -> Self {
        Self {
            bytes,
            position: 0,
            total_object_members: 0,
        }
    }

    fn scan_document(&mut self) -> Result<(), ScanError> {
        self.skip_whitespace();
        self.scan_value(1)?;
        self.skip_whitespace();
        if self.position != self.bytes.len() {
            return Err(ScanError::Syntax);
        }
        Ok(())
    }

    fn scan_value(&mut self, depth: usize) -> Result<(), ScanError> {
        let Some(byte) = self.current() else {
            return Err(ScanError::Syntax);
        };
        match byte {
            b'{' => self.scan_object(depth),
            b'[' => self.scan_array(depth),
            b'"' => self.scan_string(MAX_VALUE_BYTES, false),
            b't' => self.scan_keyword(b"true"),
            b'f' => self.scan_keyword(b"false"),
            b'n' => self.scan_keyword(b"null"),
            b'-' | b'0'..=b'9' => self.scan_number(),
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
            members += 1;
            self.total_object_members += 1;
            self.scan_string(MAX_KEY_BYTES, true)?;
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
        let mut decoded_bytes = 0;
        loop {
            let Some(byte) = self.current() else {
                return Err(ScanError::Syntax);
            };
            match byte {
                b'"' => {
                    self.position += 1;
                    if require_nonempty && decoded_bytes == 0 {
                        return Err(ScanError::Limits);
                    }
                    return Ok(());
                }
                0x00..=0x1f => return Err(ScanError::Syntax),
                b'\\' => {
                    self.position += 1;
                    let Some(escape) = self.current() else {
                        return Err(ScanError::Syntax);
                    };
                    match escape {
                        b'"' | b'\\' | b'/' | b'b' | b'f' | b'n' | b'r' | b't' => {
                            self.position += 1;
                            Self::add_decoded_bytes(&mut decoded_bytes, 1, maximum)?;
                        }
                        b'u' => {
                            self.position += 1;
                            let code_unit = self.scan_hex_code_unit()?;
                            let scalar = if (0xd800..=0xdbff).contains(&code_unit) {
                                self.expect(b'\\')?;
                                self.expect(b'u')?;
                                let low = self.scan_hex_code_unit()?;
                                if !(0xdc00..=0xdfff).contains(&low) {
                                    return Err(ScanError::Syntax);
                                }
                                0x1_0000
                                    + (((u32::from(code_unit) - 0xd800) << 10)
                                        | (u32::from(low) - 0xdc00))
                            } else if (0xdc00..=0xdfff).contains(&code_unit) {
                                return Err(ScanError::Syntax);
                            } else {
                                u32::from(code_unit)
                            };
                            Self::add_decoded_bytes(
                                &mut decoded_bytes,
                                utf8_encoded_len(scalar),
                                maximum,
                            )?;
                        }
                        _ => return Err(ScanError::Syntax),
                    }
                }
                _ => {
                    self.position += 1;
                    Self::add_decoded_bytes(&mut decoded_bytes, 1, maximum)?;
                }
            }
        }
    }

    fn scan_hex_code_unit(&mut self) -> Result<u16, ScanError> {
        let mut value = 0_u16;
        for _ in 0..4 {
            let Some(byte) = self.current() else {
                return Err(ScanError::Syntax);
            };
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

    fn scan_keyword(&mut self, keyword: &[u8]) -> Result<(), ScanError> {
        if self.bytes.get(self.position..self.position + keyword.len()) != Some(keyword) {
            return Err(ScanError::Syntax);
        }
        self.position += keyword.len();
        Ok(())
    }

    fn scan_number(&mut self) -> Result<(), ScanError> {
        self.consume(b'-');
        match self.current() {
            Some(b'0') => self.position += 1,
            Some(b'1'..=b'9') => {
                self.position += 1;
                self.consume_digits();
            }
            _ => return Err(ScanError::Syntax),
        }
        if self.consume(b'.') {
            if !self.consume_digit() {
                return Err(ScanError::Syntax);
            }
            self.consume_digits();
        }
        if matches!(self.current(), Some(b'e' | b'E')) {
            self.position += 1;
            if matches!(self.current(), Some(b'+' | b'-')) {
                self.position += 1;
            }
            if !self.consume_digit() {
                return Err(ScanError::Syntax);
            }
            self.consume_digits();
        }
        Ok(())
    }

    fn add_decoded_bytes(
        decoded_bytes: &mut usize,
        addition: usize,
        maximum: usize,
    ) -> Result<(), ScanError> {
        *decoded_bytes = decoded_bytes
            .checked_add(addition)
            .ok_or(ScanError::Limits)?;
        if *decoded_bytes > maximum {
            return Err(ScanError::Limits);
        }
        Ok(())
    }

    fn consume_digits(&mut self) {
        while self.consume_digit() {}
    }

    fn consume_digit(&mut self) -> bool {
        if matches!(self.current(), Some(b'0'..=b'9')) {
            self.position += 1;
            true
        } else {
            false
        }
    }

    fn expect(&mut self, expected: u8) -> Result<(), ScanError> {
        if self.consume(expected) {
            Ok(())
        } else {
            Err(ScanError::Syntax)
        }
    }

    fn consume(&mut self, expected: u8) -> bool {
        if self.current() == Some(expected) {
            self.position += 1;
            true
        } else {
            false
        }
    }

    fn current(&self) -> Option<u8> {
        self.bytes.get(self.position).copied()
    }

    fn skip_whitespace(&mut self) {
        while matches!(self.current(), Some(b' ' | b'\n' | b'\r' | b'\t')) {
            self.position += 1;
        }
    }
}

const fn utf8_encoded_len(scalar: u32) -> usize {
    if scalar <= 0x7f {
        1
    } else if scalar <= 0x7ff {
        2
    } else if scalar <= 0xffff {
        3
    } else {
        4
    }
}

#[cfg(test)]
#[path = "headless_daemon_version_tests.rs"]
mod tests;
