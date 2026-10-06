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
enum ImageDecodeError {
    InputTooLarge,
    JsonSyntax,
    JsonLimits,
    JsonShape,
    Recipe,
}

impl ImageDecodeError {
    const fn code(&self) -> &'static str {
        match self {
            Self::InputTooLarge => "headless_image.input_too_large",
            Self::JsonSyntax => "headless_image.json_syntax",
            Self::JsonLimits => "headless_image.json_limits",
            Self::JsonShape => "headless_image.json_shape",
            Self::Recipe => "headless_image.recipe",
        }
    }
}

struct ImageStringPair {
    key: Zeroizing<String>,
    value: Zeroizing<String>,
}

struct ImageConfigClaim {
    user: Option<Zeroizing<String>>,
    env: Option<Vec<Zeroizing<String>>>,
    entrypoint: Option<Vec<Zeroizing<String>>>,
    cmd: Option<Vec<Zeroizing<String>>>,
    working_dir: Option<Zeroizing<String>>,
    labels: Option<Vec<ImageStringPair>>,
    stop_signal: Option<Zeroizing<String>>,
    healthcheck_present: bool,
}

struct ImageDescriptorClaim {
    media_type: Zeroizing<String>,
    digest: Zeroizing<String>,
    size: i64,
    annotations: Option<Vec<ImageStringPair>>,
    platform_present: bool,
}

struct UnverifiedImage {
    id: Zeroizing<String>,
    architecture: Zeroizing<String>,
    variant: Option<Zeroizing<String>>,
    config: ImageConfigClaim,
    layers: Vec<Zeroizing<String>>,
    size: i64,
    graph_driver: Option<Zeroizing<String>>,
    descriptor: Option<ImageDescriptorClaim>,
}

fn decode_image_claim(input: &[u8]) -> Result<UnverifiedImage, ImageDecodeError> {
    if input.len() > MAX_BODY_BYTES {
        return Err(ImageDecodeError::InputTooLarge);
    }
    if std::str::from_utf8(input).is_err() {
        return Err(ImageDecodeError::JsonSyntax);
    }
    let non_decimal_number = ImagePreflight::new(input)
        .scan_document()
        .map_err(ScanError::into_decode_error)?;
    if non_decimal_number {
        return Err(ImageDecodeError::JsonShape);
    }
    let response: ImageResponse =
        serde_json::from_slice(input).map_err(|_| ImageDecodeError::JsonShape)?;
    validate_recipe(&response)?;
    Ok(project(response))
}

struct ImageResponse {
    id: Zeroizing<String>,
    repo_tags: Vec<Zeroizing<String>>,
    repo_digests: Vec<Zeroizing<String>>,
    config: ImageConfig,
    architecture: Zeroizing<String>,
    os: Zeroizing<String>,
    size: ImageSize,
    root_fs: RootFs,
    metadata: Metadata,
    comment: Option<Zeroizing<String>>,
    created: Option<Zeroizing<String>>,
    author: Option<Zeroizing<String>>,
    variant: Option<Zeroizing<String>>,
    graph_driver: Option<GraphDriver>,
    descriptor: Option<Descriptor>,
}

impl<'de> Deserialize<'de> for ImageResponse {
    #[allow(
        clippy::too_many_lines,
        reason = "closed Image response map is locally auditable"
    )]
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        struct RootVisitor;
        impl<'de> Visitor<'de> for RootVisitor {
            type Value = ImageResponse;
            fn expecting(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
                f.write_str("an Image response object")
            }
            fn visit_map<A>(self, mut map: A) -> Result<Self::Value, A::Error>
            where
                A: MapAccess<'de>,
            {
                let mut id = None;
                let mut repo_tags = None;
                let mut repo_digests = None;
                let mut config = None;
                let mut architecture = None;
                let mut os = None;
                let mut size = None;
                let mut root_fs = None;
                let mut metadata = None;
                let mut comment = None;
                let mut created = None;
                let mut author = None;
                let mut variant = None;
                let mut graph_driver = None;
                let mut descriptor = None;
                while let Some(key) = map.next_key::<Zeroizing<String>>()? {
                    match key.as_str() {
                        "Id" => set_once(&mut id, map.next_value()?, "Id")?,
                        "RepoTags" => set_once(&mut repo_tags, map.next_value()?, "RepoTags")?,
                        "RepoDigests" => {
                            set_once(&mut repo_digests, map.next_value()?, "RepoDigests")?;
                        }
                        "Config" => set_once(&mut config, map.next_value()?, "Config")?,
                        "Architecture" => {
                            set_once(&mut architecture, map.next_value()?, "Architecture")?;
                        }
                        "Os" => set_once(&mut os, map.next_value()?, "Os")?,
                        "Size" => set_once(&mut size, map.next_value()?, "Size")?,
                        "RootFS" => set_once(&mut root_fs, map.next_value()?, "RootFS")?,
                        "Metadata" => set_once(&mut metadata, map.next_value()?, "Metadata")?,
                        "Comment" => set_once(&mut comment, map.next_value()?, "Comment")?,
                        "Created" => set_once(&mut created, map.next_value()?, "Created")?,
                        "Author" => set_once(&mut author, map.next_value()?, "Author")?,
                        "Variant" => set_once(&mut variant, map.next_value()?, "Variant")?,
                        "GraphDriver" => {
                            set_once(&mut graph_driver, map.next_value()?, "GraphDriver")?;
                        }
                        "Descriptor" => set_once(&mut descriptor, map.next_value()?, "Descriptor")?,
                        _ => return Err(de::Error::custom("unknown Image response member")),
                    }
                }
                Ok(ImageResponse {
                    id: required(id, "Id")?,
                    repo_tags: required(repo_tags, "RepoTags")?,
                    repo_digests: required(repo_digests, "RepoDigests")?,
                    config: required(config, "Config")?,
                    architecture: required(architecture, "Architecture")?,
                    os: required(os, "Os")?,
                    size: required(size, "Size")?,
                    root_fs: required(root_fs, "RootFS")?,
                    metadata: required(metadata, "Metadata")?,
                    comment: flatten_optional(comment),
                    created: flatten_optional(created),
                    author: flatten_optional(author),
                    variant: flatten_optional(variant),
                    graph_driver: flatten_optional(graph_driver),
                    descriptor: flatten_optional(descriptor),
                })
            }
        }
        deserializer.deserialize_map(RootVisitor)
    }
}

fn set_once<T, E: de::Error>(slot: &mut Option<T>, value: T, field: &'static str) -> Result<(), E> {
    if slot.replace(value).is_some() {
        Err(de::Error::duplicate_field(field))
    } else {
        Ok(())
    }
}
fn required<T, E: de::Error>(value: Option<T>, field: &'static str) -> Result<T, E> {
    value.ok_or_else(|| de::Error::missing_field(field))
}
fn flatten_optional<T>(value: Option<T>) -> Option<T> {
    value
}

struct ImageConfig {
    user: Option<Zeroizing<String>>,
    env: Option<Vec<Zeroizing<String>>>,
    entrypoint: Option<Vec<Zeroizing<String>>>,
    cmd: Option<Vec<Zeroizing<String>>>,
    working_dir: Option<Zeroizing<String>>,
    labels: Option<Pairs>,
    stop_signal: Option<Zeroizing<String>>,
    healthcheck: Option<Healthcheck>,
}

impl<'de> Deserialize<'de> for ImageConfig {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        struct ConfigVisitor;
        impl<'de> Visitor<'de> for ConfigVisitor {
            type Value = ImageConfig;
            fn expecting(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
                f.write_str("an Image Config object")
            }
            fn visit_map<A>(self, mut map: A) -> Result<Self::Value, A::Error>
            where
                A: MapAccess<'de>,
            {
                let mut user = None;
                let mut env = None;
                let mut entrypoint = None;
                let mut cmd = None;
                let mut working_dir = None;
                let mut labels = None;
                let mut stop_signal = None;
                let mut healthcheck = None;
                while let Some(key) = map.next_key::<Zeroizing<String>>()? {
                    match key.as_str() {
                        "User" => set_once(&mut user, map.next_value()?, "User")?,
                        "Env" => set_once(&mut env, map.next_value()?, "Env")?,
                        "Entrypoint" => set_once(&mut entrypoint, map.next_value()?, "Entrypoint")?,
                        "Cmd" => set_once(&mut cmd, map.next_value()?, "Cmd")?,
                        "WorkingDir" => {
                            set_once(&mut working_dir, map.next_value()?, "WorkingDir")?;
                        }
                        "Labels" => set_once(&mut labels, map.next_value()?, "Labels")?,
                        "StopSignal" => {
                            set_once(&mut stop_signal, map.next_value()?, "StopSignal")?;
                        }
                        "Healthcheck" => {
                            set_once(&mut healthcheck, map.next_value()?, "Healthcheck")?;
                        }
                        _ => return Err(de::Error::custom("unknown Config member")),
                    }
                }
                Ok(ImageConfig {
                    user,
                    env,
                    entrypoint,
                    cmd,
                    working_dir,
                    labels,
                    stop_signal,
                    healthcheck,
                })
            }
        }
        deserializer.deserialize_map(ConfigVisitor)
    }
}

struct RootFs {
    kind: Zeroizing<String>,
    layers: Vec<Zeroizing<String>>,
}
impl<'de> Deserialize<'de> for RootFs {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        struct RootFsVisitor;
        impl<'de> Visitor<'de> for RootFsVisitor {
            type Value = RootFs;
            fn expecting(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
                f.write_str("a RootFS object")
            }
            fn visit_map<A>(self, mut map: A) -> Result<Self::Value, A::Error>
            where
                A: MapAccess<'de>,
            {
                let mut kind = None;
                let mut layers = None;
                while let Some(key) = map.next_key::<Zeroizing<String>>()? {
                    match key.as_str() {
                        "Type" => set_once(&mut kind, map.next_value()?, "Type")?,
                        "Layers" => set_once(&mut layers, map.next_value()?, "Layers")?,
                        _ => return Err(de::Error::custom("unknown RootFS member")),
                    }
                }
                Ok(RootFs {
                    kind: required(kind, "Type")?,
                    layers: required(layers, "Layers")?,
                })
            }
        }
        deserializer.deserialize_map(RootFsVisitor)
    }
}

struct Metadata {
    last_tag_time: Zeroizing<String>,
}
impl<'de> Deserialize<'de> for Metadata {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        struct MetadataVisitor;
        impl<'de> Visitor<'de> for MetadataVisitor {
            type Value = Metadata;
            fn expecting(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
                f.write_str("a Metadata object")
            }
            fn visit_map<A>(self, mut map: A) -> Result<Self::Value, A::Error>
            where
                A: MapAccess<'de>,
            {
                let mut last_tag_time = None;
                while let Some(key) = map.next_key::<Zeroizing<String>>()? {
                    if key.as_str() != "LastTagTime" {
                        return Err(de::Error::custom("unknown Metadata member"));
                    }
                    set_once(&mut last_tag_time, map.next_value()?, "LastTagTime")?;
                }
                Ok(Metadata {
                    last_tag_time: required(last_tag_time, "LastTagTime")?,
                })
            }
        }
        deserializer.deserialize_map(MetadataVisitor)
    }
}

struct GraphDriver {
    name: Zeroizing<String>,
    data: Option<Pairs>,
}
impl<'de> Deserialize<'de> for GraphDriver {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        struct GraphDriverVisitor;
        impl<'de> Visitor<'de> for GraphDriverVisitor {
            type Value = GraphDriver;
            fn expecting(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
                f.write_str("a GraphDriver object")
            }
            fn visit_map<A>(self, mut map: A) -> Result<Self::Value, A::Error>
            where
                A: MapAccess<'de>,
            {
                let mut name = None;
                let mut data = None;
                while let Some(key) = map.next_key::<Zeroizing<String>>()? {
                    match key.as_str() {
                        "Name" => set_once(&mut name, map.next_value()?, "Name")?,
                        "Data" => set_once(&mut data, map.next_value::<Option<Pairs>>()?, "Data")?,
                        _ => return Err(de::Error::custom("unknown GraphDriver member")),
                    }
                }
                Ok(GraphDriver {
                    name: required(name, "Name")?,
                    data: required(data, "Data")?,
                })
            }
        }
        deserializer.deserialize_map(GraphDriverVisitor)
    }
}

struct Descriptor {
    media_type: Zeroizing<String>,
    digest: Zeroizing<String>,
    size: ImageSize,
    annotations: Option<Pairs>,
    platform: Option<Platform>,
}
impl<'de> Deserialize<'de> for Descriptor {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        struct DescriptorVisitor;
        impl<'de> Visitor<'de> for DescriptorVisitor {
            type Value = Descriptor;
            fn expecting(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
                f.write_str("an OCI Descriptor object")
            }
            fn visit_map<A>(self, mut map: A) -> Result<Self::Value, A::Error>
            where
                A: MapAccess<'de>,
            {
                let mut media_type = None;
                let mut digest = None;
                let mut size = None;
                let mut annotations = None;
                let mut platform = None;
                while let Some(key) = map.next_key::<Zeroizing<String>>()? {
                    match key.as_str() {
                        "mediaType" => set_once(&mut media_type, map.next_value()?, "mediaType")?,
                        "digest" => set_once(&mut digest, map.next_value()?, "digest")?,
                        "size" => set_once(&mut size, map.next_value()?, "size")?,
                        "annotations" => {
                            set_once(&mut annotations, map.next_value()?, "annotations")?;
                        }
                        "platform" => set_once(&mut platform, map.next_value()?, "platform")?,
                        _ => return Err(de::Error::custom("unknown Descriptor member")),
                    }
                }
                Ok(Descriptor {
                    media_type: required(media_type, "mediaType")?,
                    digest: required(digest, "digest")?,
                    size: required(size, "size")?,
                    annotations,
                    platform,
                })
            }
        }
        deserializer.deserialize_map(DescriptorVisitor)
    }
}

struct Platform {
    architecture: Zeroizing<String>,
    os: Zeroizing<String>,
    variant: Option<Zeroizing<String>>,
}
impl<'de> Deserialize<'de> for Platform {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        struct PlatformVisitor;
        impl<'de> Visitor<'de> for PlatformVisitor {
            type Value = Platform;
            fn expecting(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
                f.write_str("an OCI platform object")
            }
            fn visit_map<A>(self, mut map: A) -> Result<Self::Value, A::Error>
            where
                A: MapAccess<'de>,
            {
                let mut architecture = None;
                let mut os = None;
                let mut variant = None;
                while let Some(key) = map.next_key::<Zeroizing<String>>()? {
                    match key.as_str() {
                        "architecture" => {
                            set_once(&mut architecture, map.next_value()?, "architecture")?;
                        }
                        "os" => set_once(&mut os, map.next_value()?, "os")?,
                        "variant" => set_once(&mut variant, map.next_value()?, "variant")?,
                        _ => return Err(de::Error::custom("unknown platform member")),
                    }
                }
                Ok(Platform {
                    architecture: required(architecture, "architecture")?,
                    os: required(os, "os")?,
                    variant,
                })
            }
        }
        deserializer.deserialize_map(PlatformVisitor)
    }
}

struct Healthcheck {
    test: Vec<Zeroizing<String>>,
}
impl<'de> Deserialize<'de> for Healthcheck {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        struct HealthcheckVisitor;
        impl<'de> Visitor<'de> for HealthcheckVisitor {
            type Value = Healthcheck;
            fn expecting(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
                f.write_str("a Healthcheck object")
            }
            fn visit_map<A>(self, mut map: A) -> Result<Self::Value, A::Error>
            where
                A: MapAccess<'de>,
            {
                let mut test = None;
                while let Some(key) = map.next_key::<Zeroizing<String>>()? {
                    if key.as_str() != "Test" {
                        return Err(de::Error::custom("unknown Healthcheck member"));
                    }
                    set_once(&mut test, map.next_value()?, "Test")?;
                }
                Ok(Healthcheck {
                    test: required(test, "Test")?,
                })
            }
        }
        deserializer.deserialize_map(HealthcheckVisitor)
    }
}

struct Pairs {
    entries: Vec<ImageStringPair>,
}
impl<'de> Deserialize<'de> for Pairs {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        struct PairsVisitor;
        impl<'de> Visitor<'de> for PairsVisitor {
            type Value = Pairs;
            fn expecting(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
                f.write_str("a JSON object of string pairs")
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
                        .any(|entry: &ImageStringPair| entry.key.as_str() == key.as_str())
                    {
                        return Err(de::Error::custom("duplicate dictionary key"));
                    }
                    entries.push(ImageStringPair { key, value });
                }
                Ok(Pairs { entries })
            }
        }
        deserializer.deserialize_map(PairsVisitor)
    }
}

struct ImageSize(i64);
impl<'de> Deserialize<'de> for ImageSize {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        struct SizeVisitor;
        impl Visitor<'_> for SizeVisitor {
            type Value = ImageSize;
            fn expecting(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
                f.write_str("a nonnegative signed 64-bit JSON integer")
            }
            fn visit_i64<E>(self, value: i64) -> Result<Self::Value, E>
            where
                E: de::Error,
            {
                if value < 0 {
                    Err(de::Error::custom("negative size"))
                } else {
                    Ok(ImageSize(value))
                }
            }
            fn visit_u64<E>(self, value: u64) -> Result<Self::Value, E>
            where
                E: de::Error,
            {
                i64::try_from(value)
                    .map(ImageSize)
                    .map_err(|_| de::Error::custom("size overflow"))
            }
        }
        deserializer.deserialize_i64(SizeVisitor)
    }
}

fn validate_recipe(response: &ImageResponse) -> Result<(), ImageDecodeError> {
    require_digest(&response.id)?;
    require_claim(&response.architecture)?;
    require_exact(&response.os, "linux")?;
    if let Some(variant) = &response.variant {
        require_claim(variant)?;
    }
    for list in [&response.repo_tags, &response.repo_digests] {
        if list.len() > MAX_ARRAY_ELEMENTS {
            return Err(ImageDecodeError::Recipe);
        }
    }
    for value in [response.comment.as_ref(), response.author.as_ref()]
        .into_iter()
        .flatten()
    {
        require_nonempty(value)?;
    }
    if let Some(created) = &response.created {
        validate_timestamp(created)?;
    }
    validate_timestamp(&response.metadata.last_tag_time)?;
    validate_config(&response.config)?;
    require_exact(&response.root_fs.kind, "layers")?;
    if !(1..=16).contains(&response.root_fs.layers.len()) {
        return Err(ImageDecodeError::Recipe);
    }
    for (index, layer) in response.root_fs.layers.iter().enumerate() {
        require_digest(layer)?;
        if response.root_fs.layers[..index]
            .iter()
            .any(|other| other.as_str() == layer.as_str())
        {
            return Err(ImageDecodeError::Recipe);
        }
    }
    match (&response.graph_driver, &response.descriptor) {
        (Some(driver), None) => {
            require_claim(&driver.name)?;
            let _ = &driver.data;
        }
        (None, Some(descriptor)) => validate_descriptor(descriptor, response)?,
        _ => return Err(ImageDecodeError::Recipe),
    }
    Ok(())
}

fn validate_config(config: &ImageConfig) -> Result<(), ImageDecodeError> {
    for value in [
        config.user.as_ref(),
        config.working_dir.as_ref(),
        config.stop_signal.as_ref(),
    ]
    .into_iter()
    .flatten()
    {
        require_nonempty(value)?;
    }
    for list in [&config.env, &config.entrypoint, &config.cmd]
        .into_iter()
        .flatten()
    {
        if !(1..=64).contains(&list.len()) {
            return Err(ImageDecodeError::Recipe);
        }
    }
    if let Some(labels) = &config.labels
        && !(1..=64).contains(&labels.entries.len())
    {
        return Err(ImageDecodeError::Recipe);
    }
    if let Some(healthcheck) = &config.healthcheck
        && (healthcheck.test.len() != 1 || healthcheck.test[0].as_str() != "NONE")
    {
        return Err(ImageDecodeError::Recipe);
    }
    Ok(())
}

fn validate_descriptor(
    descriptor: &Descriptor,
    response: &ImageResponse,
) -> Result<(), ImageDecodeError> {
    if descriptor.media_type.as_str() != "application/vnd.oci.image.manifest.v1+json"
        && descriptor.media_type.as_str() != "application/vnd.oci.image.index.v1+json"
    {
        return Err(ImageDecodeError::Recipe);
    }
    require_digest(&descriptor.digest)?;
    if descriptor.size.0 <= 0 || response.id.as_str() != descriptor.digest.as_str() {
        return Err(ImageDecodeError::Recipe);
    }
    if let Some(annotations) = &descriptor.annotations
        && (!(1..=64).contains(&annotations.entries.len())
            || annotations
                .entries
                .iter()
                .any(|pair| !is_ascii_nonempty(pair.key.as_str())))
    {
        return Err(ImageDecodeError::Recipe);
    }
    if let Some(platform) = &descriptor.platform {
        require_claim(&platform.architecture)?;
        require_exact(&platform.os, "linux")?;
        if let Some(variant) = &platform.variant {
            require_claim(variant)?;
        }
        if platform.architecture.as_str() != response.architecture.as_str()
            || option_text(platform.variant.as_ref()) != option_text(response.variant.as_ref())
        {
            return Err(ImageDecodeError::Recipe);
        }
    }
    Ok(())
}
fn option_text(value: Option<&Zeroizing<String>>) -> Option<&str> {
    value.map(|value| value.as_str())
}
fn require_claim(value: &Zeroizing<String>) -> Result<(), ImageDecodeError> {
    if value.is_empty() || value.as_str() == "N/A" {
        Err(ImageDecodeError::Recipe)
    } else {
        Ok(())
    }
}
fn require_nonempty(value: &Zeroizing<String>) -> Result<(), ImageDecodeError> {
    if value.is_empty() {
        Err(ImageDecodeError::Recipe)
    } else {
        Ok(())
    }
}
fn require_exact(value: &Zeroizing<String>, expected: &str) -> Result<(), ImageDecodeError> {
    if value.as_str() == expected {
        Ok(())
    } else {
        Err(ImageDecodeError::Recipe)
    }
}
fn require_digest(value: &Zeroizing<String>) -> Result<(), ImageDecodeError> {
    let bytes = value.as_bytes();
    if bytes.len() == 71
        && bytes.starts_with(b"sha256:")
        && bytes[7..]
            .iter()
            .all(|byte| matches!(byte, b'0'..=b'9' | b'a'..=b'f'))
    {
        Ok(())
    } else {
        Err(ImageDecodeError::Recipe)
    }
}
fn is_ascii_nonempty(value: &str) -> bool {
    !value.is_empty() && value.len() <= MAX_KEY_BYTES && value.is_ascii()
}
fn validate_timestamp(value: &Zeroizing<String>) -> Result<(), ImageDecodeError> {
    let text = value.as_bytes();
    if text.len() < 20
        || text[4] != b'-'
        || text[7] != b'-'
        || text[10] != b'T'
        || text[13] != b':'
        || text[16] != b':'
        || !text[..4]
            .iter()
            .chain(text[5..7].iter())
            .chain(text[8..10].iter())
            .chain(text[11..13].iter())
            .chain(text[14..16].iter())
            .chain(text[17..19].iter())
            .all(u8::is_ascii_digit)
    {
        return Err(ImageDecodeError::Recipe);
    }
    let number = |start, end| {
        std::str::from_utf8(&text[start..end])
            .ok()?
            .parse::<u32>()
            .ok()
    };
    let (year, month, day, hour, minute, second) = (
        number(0, 4).ok_or(ImageDecodeError::Recipe)?,
        number(5, 7).ok_or(ImageDecodeError::Recipe)?,
        number(8, 10).ok_or(ImageDecodeError::Recipe)?,
        number(11, 13).ok_or(ImageDecodeError::Recipe)?,
        number(14, 16).ok_or(ImageDecodeError::Recipe)?,
        number(17, 19).ok_or(ImageDecodeError::Recipe)?,
    );
    if year == 0 || !(1..=12).contains(&month) || hour > 23 || minute > 59 || second > 59 {
        return Err(ImageDecodeError::Recipe);
    }
    let leap = year % 4 == 0 && (year % 100 != 0 || year % 400 == 0);
    let max_day = match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 if leap => 29,
        2 => 28,
        _ => return Err(ImageDecodeError::Recipe),
    };
    if day == 0 || day > max_day {
        return Err(ImageDecodeError::Recipe);
    }
    let mut position = 19;
    if text.get(position) == Some(&b'.') {
        position += 1;
        let start = position;
        while matches!(text.get(position), Some(b'0'..=b'9')) {
            position += 1;
        }
        if position == start || position - start > 9 {
            return Err(ImageDecodeError::Recipe);
        }
    }
    match text.get(position..) {
        Some(b"Z") => Ok(()),
        Some(offset)
            if offset.len() == 6
                && matches!(offset[0], b'+' | b'-')
                && offset[3] == b':'
                && offset[1..3]
                    .iter()
                    .chain(offset[4..6].iter())
                    .all(u8::is_ascii_digit)
                && (offset[1] - b'0') * 10 + offset[2] - b'0' <= 23
                && (offset[4] - b'0') * 10 + offset[5] - b'0' <= 59 =>
        {
            Ok(())
        }
        _ => Err(ImageDecodeError::Recipe),
    }
}

fn project(response: ImageResponse) -> UnverifiedImage {
    let ImageResponse {
        id,
        repo_tags: _,
        repo_digests: _,
        config,
        architecture,
        os: _,
        size,
        root_fs,
        metadata: _,
        comment: _,
        created: _,
        author: _,
        variant,
        graph_driver,
        descriptor,
    } = response;
    let ImageConfig {
        user,
        env,
        entrypoint,
        cmd,
        working_dir,
        labels,
        stop_signal,
        healthcheck,
    } = config;
    let labels = labels.map(|mut pairs| {
        sort_pairs(&mut pairs.entries);
        pairs.entries
    });
    let graph_driver = graph_driver.map(|driver| driver.name);
    let descriptor = descriptor.map(|descriptor| {
        let Descriptor {
            media_type,
            digest,
            size,
            annotations,
            platform,
        } = descriptor;
        let annotations = annotations.map(|mut pairs| {
            sort_pairs(&mut pairs.entries);
            pairs.entries
        });
        ImageDescriptorClaim {
            media_type,
            digest,
            size: size.0,
            annotations,
            platform_present: platform.is_some(),
        }
    });
    UnverifiedImage {
        id,
        architecture,
        variant,
        config: ImageConfigClaim {
            user,
            env,
            entrypoint,
            cmd,
            working_dir,
            labels,
            stop_signal,
            healthcheck_present: healthcheck.is_some(),
        },
        layers: root_fs.layers,
        size: size.0,
        graph_driver,
        descriptor,
    }
}
fn sort_pairs(entries: &mut [ImageStringPair]) {
    entries.sort_by(|left, right| left.key.as_bytes().cmp(right.key.as_bytes()));
}

enum ScanError {
    Syntax,
    Limits,
}
impl ScanError {
    const fn into_decode_error(self) -> ImageDecodeError {
        match self {
            Self::Syntax => ImageDecodeError::JsonSyntax,
            Self::Limits => ImageDecodeError::JsonLimits,
        }
    }
}
struct KeyBuffer {
    bytes: Zeroizing<[u8; MAX_KEY_BYTES]>,
    length: usize,
}
impl KeyBuffer {
    fn new() -> Self {
        Self {
            bytes: Zeroizing::new([0; MAX_KEY_BYTES]),
            length: 0,
        }
    }
    fn append(&mut self, input: &[u8]) -> Result<(), ScanError> {
        let end = self
            .length
            .checked_add(input.len())
            .ok_or(ScanError::Limits)?;
        if end > MAX_KEY_BYTES {
            return Err(ScanError::Limits);
        }
        self.bytes[self.length..end].copy_from_slice(input);
        self.length = end;
        Ok(())
    }
}
struct ImagePreflight<'a> {
    bytes: &'a [u8],
    position: usize,
    total_object_members: usize,
    non_decimal_number: bool,
}
impl<'a> ImagePreflight<'a> {
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
            Some(b'"') => self.scan_string(MAX_VALUE_BYTES, false, None),
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
            members += 1;
            self.total_object_members += 1;
            let mut key = KeyBuffer::new();
            self.scan_string(MAX_KEY_BYTES, true, Some(&mut key))?;
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
    fn scan_string(
        &mut self,
        maximum: usize,
        require_nonempty: bool,
        mut key: Option<&mut KeyBuffer>,
    ) -> Result<(), ScanError> {
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
                            let value = match escape {
                                b'"' => b"\"".as_slice(),
                                b'\\' => b"\\".as_slice(),
                                b'/' => b"/".as_slice(),
                                b'b' => b"\x08".as_slice(),
                                b'f' => b"\x0c".as_slice(),
                                b'n' => b"\n".as_slice(),
                                b'r' => b"\r".as_slice(),
                                _ => b"\t".as_slice(),
                            };
                            Self::add_bytes(&mut decoded, value.len(), maximum)?;
                            if let Some(buffer) = key.as_deref_mut() {
                                buffer.append(value)?;
                            }
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
                            let mut output = Zeroizing::new([0_u8; 4]);
                            let encoded = char::from_u32(scalar)
                                .ok_or(ScanError::Syntax)?
                                .encode_utf8(&mut *output)
                                .as_bytes();
                            Self::add_bytes(&mut decoded, encoded.len(), maximum)?;
                            if let Some(buffer) = key.as_deref_mut() {
                                buffer.append(encoded)?;
                            }
                        }
                        _ => return Err(ScanError::Syntax),
                    }
                }
                _ => {
                    self.position += 1;
                    Self::add_bytes(&mut decoded, 1, maximum)?;
                    if let Some(buffer) = key.as_deref_mut() {
                        buffer.append(&[byte])?;
                    }
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
    fn scan_keyword(&mut self, word: &[u8]) -> Result<(), ScanError> {
        if self.bytes.get(self.position..self.position + word.len()) == Some(word) {
            self.position += word.len();
            Ok(())
        } else {
            Err(ScanError::Syntax)
        }
    }
    fn scan_number(&mut self) -> Result<(), ScanError> {
        let negative = self.consume(b'-');
        let zero = if self.current() == Some(b'0') {
            self.position += 1;
            true
        } else if matches!(self.current(), Some(b'1'..=b'9')) {
            self.position += 1;
            self.consume_digits();
            false
        } else {
            return Err(ScanError::Syntax);
        };
        if negative && zero {
            self.non_decimal_number = true;
        }
        if self.consume(b'.') {
            self.non_decimal_number = true;
            if !self.consume_digit() {
                return Err(ScanError::Syntax);
            }
            self.consume_digits();
        }
        if matches!(self.current(), Some(b'e' | b'E')) {
            self.non_decimal_number = true;
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
    fn add_bytes(count: &mut usize, add: usize, maximum: usize) -> Result<(), ScanError> {
        *count = count.checked_add(add).ok_or(ScanError::Limits)?;
        if *count > maximum {
            Err(ScanError::Limits)
        } else {
            Ok(())
        }
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
    fn expect(&mut self, byte: u8) -> Result<(), ScanError> {
        if self.consume(byte) {
            Ok(())
        } else {
            Err(ScanError::Syntax)
        }
    }
    fn consume(&mut self, byte: u8) -> bool {
        if self.current() == Some(byte) {
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

#[cfg(test)]
#[path = "headless_daemon_image_tests.rs"]
mod tests;
