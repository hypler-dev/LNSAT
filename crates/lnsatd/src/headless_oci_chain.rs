use serde::de::{self, MapAccess, Visitor};
use serde::{Deserialize, Deserializer};
use sha2::{Digest, Sha256};
use std::fmt;
use zeroize::Zeroizing;

const MAX_BODY: usize = 1_048_576;
const MAX_TOTAL: usize = 3 * MAX_BODY;
const MAX_DEPTH: usize = 32;
const MAX_OBJECT: usize = 64;
const MAX_MEMBERS: usize = 4_096;
const MAX_ARRAY: usize = 128;
const MAX_ELEMENTS: usize = 1_024;
const MAX_KEY: usize = 256;
const MAX_TEXT: usize = 4_096;
type Text = Zeroizing<String>;

#[derive(Debug, Eq, PartialEq)]
enum OciChainError {
    InputBounds,
    JsonSyntax,
    JsonLimits,
    JsonShape,
    Claims,
    Links,
}
impl OciChainError {
    const fn code(&self) -> &'static str {
        match self {
            Self::InputBounds => "headless_oci_chain.input_bounds",
            Self::JsonSyntax => "headless_oci_chain.json_syntax",
            Self::JsonLimits => "headless_oci_chain.json_limits",
            Self::JsonShape => "headless_oci_chain.json_shape",
            Self::Claims => "headless_oci_chain.claims",
            Self::Links => "headless_oci_chain.links",
        }
    }
}

struct RawIdentity {
    size: u64,
    digest: Zeroizing<[u8; 32]>,
}
struct UnverifiedOciChain {
    config: OciConfig,
    manifest: OciManifest,
    index: Option<OciIndex>,
    config_identity: RawIdentity,
    manifest_identity: RawIdentity,
    index_identity: Option<RawIdentity>,
}
struct OciConfig {
    architecture: Text,
    config: ExecutionConfig,
    os: Text,
    rootfs: RootFs,
    variant: Option<Text>,
    created: Option<Text>,
    author: Option<Text>,
    history: Option<Vec<History>>,
}
struct RootFs {
    kind: Text,
    diff_ids: Vec<Text>,
}
struct History {
    created: Option<Text>,
    created_by: Option<Text>,
    author: Option<Text>,
    comment: Option<Text>,
    empty_layer: Option<bool>,
}
struct ExecutionConfig {
    user: Option<Text>,
    exposed_ports: Option<EmptyMap>,
    env: Option<Vec<Text>>,
    entrypoint: Option<Vec<Text>>,
    cmd: Option<Vec<Text>>,
    volumes: Option<EmptyMap>,
    working_dir: Option<Text>,
    labels: Option<Dictionary>,
    stop_signal: Option<Text>,
    args_escaped: Option<bool>,
    healthcheck: Option<Healthcheck>,
    on_build: Option<EmptyList>,
    shell: Option<EmptyList>,
}
struct Healthcheck {
    test: Vec<Text>,
}
struct Dictionary(Vec<(Text, Text)>);
struct EmptyMap;
struct EmptyList(Vec<Text>);
struct OciManifest {
    schema_version: u32,
    media_type: Text,
    config: Descriptor,
    layers: Vec<Descriptor>,
    annotations: Option<Dictionary>,
}
struct OciIndex {
    schema_version: u32,
    media_type: Text,
    manifests: Vec<IndexDescriptor>,
    annotations: Option<Dictionary>,
}
struct Descriptor {
    media_type: Text,
    digest: Text,
    size: u64,
}
struct IndexDescriptor {
    media_type: Text,
    digest: Text,
    size: u64,
    platform: Platform,
}
struct Platform {
    os: Text,
    architecture: Text,
    variant: Option<Text>,
}

fn decode_oci_chain(
    config: &[u8],
    manifest: &[u8],
    index: Option<&[u8]>,
) -> Result<UnverifiedOciChain, OciChainError> {
    let bodies = [Some(config), Some(manifest), index];
    let total = bodies.into_iter().flatten().try_fold(0usize, |n, body| {
        if body.is_empty() || body.len() > MAX_BODY {
            return Err(OciChainError::InputBounds);
        }
        n.checked_add(body.len())
            .filter(|n| *n <= MAX_TOTAL)
            .ok_or(OciChainError::InputBounds)
    })?;
    let _ = total;
    let cf = preflight(config)?;
    let mf = preflight(manifest)?;
    let inf = index.map(preflight).transpose()?;
    if cf.nondecimal || mf.nondecimal || inf.as_ref().is_some_and(|f| f.nondecimal) {
        return Err(OciChainError::JsonShape);
    }
    let config_identity = raw_identity(config);
    let manifest_identity = raw_identity(manifest);
    let index_identity = index.map(raw_identity);
    let config: OciConfig = serde_json::from_slice(config).map_err(|_| OciChainError::JsonShape)?;
    let manifest: OciManifest =
        serde_json::from_slice(manifest).map_err(|_| OciChainError::JsonShape)?;
    let index: Option<OciIndex> = index
        .map(|b| serde_json::from_slice(b).map_err(|_| OciChainError::JsonShape))
        .transpose()?;
    if cf.controls || mf.controls || inf.as_ref().is_some_and(|f| f.controls) {
        return Err(OciChainError::Claims);
    }
    claims_config(&config)?;
    claims_manifest(&manifest)?;
    if let Some(i) = &index {
        claims_index(i)?;
    }
    links(
        &config,
        &config_identity,
        &manifest_identity,
        index_identity.as_ref(),
        &manifest,
        index.as_ref(),
    )?;
    Ok(UnverifiedOciChain {
        config,
        manifest,
        index,
        config_identity,
        manifest_identity,
        index_identity,
    })
}
fn raw_identity(bytes: &[u8]) -> RawIdentity {
    let mut hash = Sha256::new();
    hash.update(bytes);
    let mut digest = Zeroizing::new([0_u8; 32]);
    hash.finalize_into((&mut *digest).into());
    RawIdentity {
        size: u64::try_from(bytes.len()).expect("bounded input"),
        digest,
    }
}

macro_rules! closed {
    (
        $name:ident { $($field:ident : $ty:ty, $key:literal),* $(,)? }
        optional { $($opt:ident : $oty:ty, $okey:literal),* $(,)? }
    ) => {
        impl<'de> Deserialize<'de> for $name {
            fn deserialize<D: Deserializer<'de>>(d: D) -> Result<Self, D::Error> {
                struct V;

                impl<'de> Visitor<'de> for V {
                    type Value = $name;

                    fn expecting(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
                        f.write_str("a closed OCI object")
                    }

                    fn visit_map<A: MapAccess<'de>>(self, mut m: A) -> Result<$name, A::Error> {
                        $(let mut $field = None;)*
                        $(let mut $opt = None;)*
                        while let Some(k) = m.next_key::<Text>()? {
                            match k.as_str() {
                                $($key => once(&mut $field, m.next_value::<$ty>()?)?,)*
                                $($okey => once(&mut $opt, m.next_value::<$oty>()?)?,)*
                                _ => return Err(de::Error::custom("unknown OCI member")),
                            }
                        }
                        Ok($name {
                            $($field: need($field)?,)*
                            $($opt,)*
                        })
                    }
                }

                d.deserialize_map(V)
            }
        }
    };
}
fn once<T, E: de::Error>(slot: &mut Option<T>, value: T) -> Result<(), E> {
    if slot.replace(value).is_some() {
        Err(E::custom("duplicate OCI member"))
    } else {
        Ok(())
    }
}
fn need<T, E: de::Error>(v: Option<T>) -> Result<T, E> {
    v.ok_or_else(|| de::Error::custom("missing OCI member"))
}
closed!(OciConfig { architecture:Text,"architecture",config:ExecutionConfig,"config",os:Text,"os",rootfs:RootFs,"rootfs" } optional { variant:Text,"variant",created:Text,"created",author:Text,"author",history:Vec<History>,"history" });
closed!(RootFs { diff_ids:Vec<Text>,"diff_ids",kind:Text,"type" } optional {});
closed!(History {} optional { created:Text,"created",created_by:Text,"created_by",author:Text,"author",comment:Text,"comment",empty_layer:bool,"empty_layer" });
closed!(ExecutionConfig {} optional { user:Text,"User",exposed_ports:EmptyMap,"ExposedPorts",env:Vec<Text>,"Env",entrypoint:Vec<Text>,"Entrypoint",cmd:Vec<Text>,"Cmd",volumes:EmptyMap,"Volumes",working_dir:Text,"WorkingDir",labels:Dictionary,"Labels",stop_signal:Text,"StopSignal",args_escaped:bool,"ArgsEscaped",healthcheck:Healthcheck,"Healthcheck",on_build:EmptyList,"OnBuild",shell:EmptyList,"Shell" });
closed!(Healthcheck { test:Vec<Text>,"Test" } optional {});
closed!(OciManifest { config:Descriptor,"config",layers:Vec<Descriptor>,"layers",media_type:Text,"mediaType",schema_version:u32,"schemaVersion" } optional { annotations:Dictionary,"annotations" });
closed!(OciIndex { manifests:Vec<IndexDescriptor>,"manifests",media_type:Text,"mediaType",schema_version:u32,"schemaVersion" } optional { annotations:Dictionary,"annotations" });
closed!(Descriptor { digest:Text,"digest",media_type:Text,"mediaType",size:u64,"size" } optional {});
closed!(IndexDescriptor { digest:Text,"digest",media_type:Text,"mediaType",platform:Platform,"platform",size:u64,"size" } optional {});
closed!(Platform { architecture:Text,"architecture",os:Text,"os" } optional { variant:Text,"variant" });

impl<'de> Deserialize<'de> for EmptyMap {
    fn deserialize<D: Deserializer<'de>>(d: D) -> Result<Self, D::Error> {
        struct V;
        impl<'de> Visitor<'de> for V {
            type Value = EmptyMap;
            fn expecting(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
                f.write_str("empty object")
            }
            fn visit_map<A: MapAccess<'de>>(self, mut m: A) -> Result<EmptyMap, A::Error> {
                if m.next_key::<Text>()?.is_some() {
                    Err(de::Error::custom("nonempty OCI object"))
                } else {
                    Ok(EmptyMap)
                }
            }
        }
        d.deserialize_map(V)
    }
}
impl<'de> Deserialize<'de> for EmptyList {
    fn deserialize<D: Deserializer<'de>>(d: D) -> Result<Self, D::Error> {
        struct V;
        impl<'de> Visitor<'de> for V {
            type Value = EmptyList;
            fn expecting(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
                f.write_str("a string array")
            }
            fn visit_seq<A: serde::de::SeqAccess<'de>>(
                self,
                mut s: A,
            ) -> Result<EmptyList, A::Error> {
                let mut values = Vec::new();
                while let Some(value) = s.next_element::<Text>()? {
                    values.push(value);
                }
                Ok(EmptyList(values))
            }
        }
        d.deserialize_seq(V)
    }
}
impl<'de> Deserialize<'de> for Dictionary {
    fn deserialize<D: Deserializer<'de>>(d: D) -> Result<Self, D::Error> {
        struct V;
        impl<'de> Visitor<'de> for V {
            type Value = Dictionary;
            fn expecting(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
                f.write_str("OCI string dictionary")
            }
            fn visit_map<A: MapAccess<'de>>(self, mut m: A) -> Result<Dictionary, A::Error> {
                let mut v = Vec::new();
                while let Some(k) = m.next_key::<Text>()? {
                    if v.len() == 64 {
                        return Err(de::Error::custom("dictionary limit"));
                    }
                    if v.iter().any(|(old, _)| old == &k) {
                        return Err(de::Error::custom("duplicate OCI dictionary key"));
                    }
                    let value = m.next_value::<Text>()?;
                    v.push((k, value));
                }
                v.sort_by(|a, b| a.0.as_bytes().cmp(b.0.as_bytes()));
                Ok(Dictionary(v))
            }
        }
        d.deserialize_map(V)
    }
}

fn claims_config(c: &OciConfig) -> Result<(), OciChainError> {
    if c.os.as_str() != "linux"
        || !architecture(&c.architecture)
        || c.variant.as_ref().is_some_and(|v| !ascii(v, 0, 32))
        || c.created.as_ref().is_some_and(|v| !timestamp(v))
        || c.author.as_ref().is_some_and(|v| v.len() > 256)
    {
        return Err(OciChainError::Claims);
    }
    if c.rootfs.kind.as_str() != "layers"
        || !(1..=16).contains(&c.rootfs.diff_ids.len())
        || !distinct_digests(&c.rootfs.diff_ids)
    {
        return Err(OciChainError::Claims);
    }
    if c.history.as_ref().is_some_and(|history| {
        history.is_empty()
            || history.len() > 64
            || history
                .iter()
                .filter(|x| !x.empty_layer.unwrap_or(false))
                .count()
                != c.rootfs.diff_ids.len()
            || history.iter().any(|x| {
                x.created.as_ref().is_some_and(|v| !timestamp(v))
                    || [x.created_by.as_ref(), x.author.as_ref(), x.comment.as_ref()]
                        .into_iter()
                        .flatten()
                        .any(|v| v.len() > MAX_TEXT)
            })
    }) {
        return Err(OciChainError::Claims);
    }
    execution(&c.config)
}
fn execution(c: &ExecutionConfig) -> Result<(), OciChainError> {
    for x in [&c.user, &c.working_dir, &c.stop_signal]
        .into_iter()
        .flatten()
    {
        if x.len() > MAX_TEXT {
            return Err(OciChainError::Claims);
        }
    }
    for xs in [&c.env, &c.entrypoint, &c.cmd].into_iter().flatten() {
        if xs.len() > 64 || xs.iter().any(|x| x.len() > MAX_TEXT) {
            return Err(OciChainError::Claims);
        }
    }
    if c.args_escaped.is_some_and(|v| v)
        || c.on_build.as_ref().is_some_and(|v| !v.0.is_empty())
        || c.shell.as_ref().is_some_and(|v| !v.0.is_empty())
        || c.healthcheck
            .as_ref()
            .is_some_and(|h| h.test.len() != 1 || h.test[0].as_str() != "NONE")
    {
        return Err(OciChainError::Claims);
    }
    if c.labels.as_ref().is_some_and(|labels| {
        labels.0.len() > 64
            || labels
                .0
                .iter()
                .any(|(k, v)| k.is_empty() || k.len() > MAX_KEY || v.len() > MAX_TEXT)
    }) {
        return Err(OciChainError::Claims);
    }
    Ok(())
}
fn claims_manifest(m: &OciManifest) -> Result<(), OciChainError> {
    if m.schema_version != 2
        || m.media_type.as_str() != "application/vnd.oci.image.manifest.v1+json"
        || !(1..=16).contains(&m.layers.len())
        || !descriptor(
            &m.config,
            "application/vnd.oci.image.config.v1+json",
            MAX_BODY as u64,
        )
        || m.layers.iter().any(|d| {
            !descriptor(
                d,
                "application/vnd.oci.image.layer.v1.tar+gzip",
                i64::MAX as u64,
            )
        })
        || m.annotations.as_ref().is_some_and(|d| !annotations(d))
    {
        Err(OciChainError::Claims)
    } else {
        Ok(())
    }
}
fn claims_index(i: &OciIndex) -> Result<(), OciChainError> {
    if i.schema_version != 2
        || i.media_type.as_str() != "application/vnd.oci.image.index.v1+json"
        || i.manifests.len() != 1
        || !index_descriptor(&i.manifests[0])
        || i.annotations.as_ref().is_some_and(|d| !annotations(d))
    {
        Err(OciChainError::Claims)
    } else {
        Ok(())
    }
}
fn descriptor(d: &Descriptor, media: &str, max: u64) -> bool {
    d.media_type.as_str() == media
        && digest(&d.digest)
        && d.size > 0
        && i64::try_from(d.size).is_ok()
        && d.size <= max
}
fn index_descriptor(d: &IndexDescriptor) -> bool {
    d.media_type.as_str() == "application/vnd.oci.image.manifest.v1+json"
        && digest(&d.digest)
        && d.size > 0
        && d.size <= MAX_BODY as u64
        && d.platform.os.as_str() == "linux"
        && architecture(&d.platform.architecture)
        && d.platform.variant.as_ref().is_none_or(|v| ascii(v, 0, 32))
}
fn annotations(d: &Dictionary) -> bool {
    d.0.iter().all(|(k, v)| {
        !k.is_empty()
            && k.len() <= MAX_KEY
            && k.is_ascii()
            && ascii(k, 1, MAX_KEY)
            && v.len() <= MAX_TEXT
    })
}
fn links(
    c: &OciConfig,
    ci: &RawIdentity,
    mi: &RawIdentity,
    ii: Option<&RawIdentity>,
    m: &OciManifest,
    i: Option<&OciIndex>,
) -> Result<(), OciChainError> {
    if m.config.size != ci.size || m.config.digest.as_bytes() != hex_digest(&ci.digest).as_bytes() {
        return Err(OciChainError::Links);
    }
    if m.layers.len() != c.rootfs.diff_ids.len() {
        return Err(OciChainError::Links);
    }
    if let (Some(index), Some(_identity)) = (i, ii) {
        let d = &index.manifests[0];
        if d.size != mi.size
            || d.digest.as_bytes() != hex_digest(&mi.digest).as_bytes()
            || d.platform.os.as_str() != c.os.as_str()
            || d.platform.architecture.as_str() != c.architecture.as_str()
            || d.platform.variant.as_ref().map_or("", |v| v.as_str())
                != c.variant.as_ref().map_or("", |v| v.as_str())
        {
            return Err(OciChainError::Links);
        }
    }
    Ok(())
}
fn hex_digest(d: &[u8; 32]) -> Text {
    const HEX: &[u8; 16] = b"0123456789abcdef";
    let mut value = Zeroizing::new(String::with_capacity(71));
    value.push_str("sha256:");
    for byte in d {
        value.push(char::from(HEX[usize::from(byte >> 4)]));
        value.push(char::from(HEX[usize::from(byte & 0x0f)]));
    }
    value
}
fn digest(v: &str) -> bool {
    v.strip_prefix("sha256:").is_some_and(|x| {
        x.len() == 64
            && x.bytes()
                .all(|b| b.is_ascii_digit() || matches!(b, b'a'..=b'f'))
    })
}
fn distinct_digests(v: &[Text]) -> bool {
    v.iter().all(|x| digest(x)) && v.iter().enumerate().all(|(i, x)| !v[..i].contains(x))
}
fn architecture(v: &str) -> bool {
    !v.is_empty()
        && v.len() <= 32
        && v.bytes()
            .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'_')
}
fn ascii(v: &str, min: usize, max: usize) -> bool {
    (min..=max).contains(&v.len()) && v.bytes().all(|b| (0x20..=0x7e).contains(&b))
}
fn timestamp(value: &str) -> bool {
    let bytes = value.as_bytes();
    if bytes.len() < 20 || bytes.len() > 35 {
        return false;
    }
    let digits = |slice: &[u8]| slice.iter().all(u8::is_ascii_digit);
    if !digits(&bytes[0..4])
        || bytes.get(4) != Some(&b'-')
        || !digits(&bytes[5..7])
        || bytes.get(7) != Some(&b'-')
        || !digits(&bytes[8..10])
        || bytes.get(10) != Some(&b'T')
        || !digits(&bytes[11..13])
        || bytes.get(13) != Some(&b':')
        || !digits(&bytes[14..16])
        || bytes.get(16) != Some(&b':')
        || !digits(&bytes[17..19])
    {
        return false;
    }
    let decimal = |slice: &[u8]| {
        slice
            .iter()
            .fold(0_u32, |number, digit| number * 10 + u32::from(digit - b'0'))
    };
    let year = decimal(&bytes[0..4]);
    let month = decimal(&bytes[5..7]);
    let day = decimal(&bytes[8..10]);
    let hour = decimal(&bytes[11..13]);
    let minute = decimal(&bytes[14..16]);
    let second = decimal(&bytes[17..19]);
    if year == 0
        || month == 0
        || month > 12
        || day == 0
        || day > days_in_month(year, month)
        || hour > 23
        || minute > 59
        || second > 59
    {
        return false;
    }
    let mut position = 19;
    if bytes.get(position) == Some(&b'.') {
        position += 1;
        let start = position;
        while matches!(bytes.get(position), Some(b'0'..=b'9')) {
            position += 1;
        }
        if !(1..=9).contains(&(position - start)) {
            return false;
        }
    }
    match bytes.get(position..) {
        Some(b"Z") => true,
        Some(
            [
                b'+' | b'-',
                hour_tens,
                hour_ones,
                b':',
                minute_tens,
                minute_ones,
            ],
        ) => {
            hour_tens.is_ascii_digit()
                && hour_ones.is_ascii_digit()
                && minute_tens.is_ascii_digit()
                && minute_ones.is_ascii_digit()
                && (hour_tens - b'0') * 10 + hour_ones - b'0' <= 23
                && (minute_tens - b'0') * 10 + minute_ones - b'0' <= 59
        }
        _ => false,
    }
}
fn days_in_month(year: u32, month: u32) -> u32 {
    let mut count = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
        [usize::try_from(month - 1).expect("validated month")];
    if month == 2
        && (year.is_multiple_of(4) && !year.is_multiple_of(100) || year.is_multiple_of(400))
    {
        count = 29;
    }
    count
}

struct Facts {
    controls: bool,
    nondecimal: bool,
}
fn preflight(b: &[u8]) -> Result<Facts, OciChainError> {
    if b.is_empty() || b.len() > MAX_BODY {
        return Err(OciChainError::InputBounds);
    }
    if std::str::from_utf8(b).is_err() {
        return Err(OciChainError::JsonSyntax);
    }
    let mut s = Scanner::new(b);
    s.document().map_err(|e| match e {
        ScanError::Syntax => OciChainError::JsonSyntax,
        ScanError::Limits => OciChainError::JsonLimits,
    })
}
enum ScanError {
    Syntax,
    Limits,
}
struct Scanner<'a> {
    b: &'a [u8],
    p: usize,
    members: usize,
    elements: usize,
    text: usize,
    controls: bool,
    nondecimal: bool,
}
impl<'a> Scanner<'a> {
    const fn new(b: &'a [u8]) -> Self {
        Self {
            b,
            p: 0,
            members: 0,
            elements: 0,
            text: 0,
            controls: false,
            nondecimal: false,
        }
    }
    fn document(&mut self) -> Result<Facts, ScanError> {
        self.ws();
        self.value(1)?;
        self.ws();
        if self.p == self.b.len() {
            Ok(Facts {
                controls: self.controls,
                nondecimal: self.nondecimal,
            })
        } else {
            Err(ScanError::Syntax)
        }
    }
    fn value(&mut self, d: usize) -> Result<(), ScanError> {
        if d > MAX_DEPTH {
            return Err(ScanError::Limits);
        }
        match self.cur() {
            Some(b'{') => self.object(d),
            Some(b'[') => self.array(d),
            Some(b'"') => self.string(MAX_TEXT, false),
            Some(b't') => self.keyword(b"true"),
            Some(b'f') => self.keyword(b"false"),
            Some(b'n') => self.keyword(b"null"),
            Some(b'-' | b'0'..=b'9') => self.number(),
            _ => Err(ScanError::Syntax),
        }
    }
    fn object(&mut self, d: usize) -> Result<(), ScanError> {
        if d > MAX_DEPTH {
            return Err(ScanError::Limits);
        }
        self.p += 1;
        self.ws();
        if self.take(b'}') {
            return Ok(());
        }
        let mut n = 0;
        loop {
            if n == MAX_OBJECT || self.members == MAX_MEMBERS {
                return Err(ScanError::Limits);
            }
            self.string(MAX_KEY, true)?;
            n += 1;
            self.members += 1;
            self.ws();
            self.need(b':')?;
            self.ws();
            self.value(d + 1)?;
            self.ws();
            if self.take(b'}') {
                return Ok(());
            }
            self.need(b',')?;
            self.ws();
            if self.cur() == Some(b'}') {
                return Err(ScanError::Syntax);
            }
        }
    }
    fn array(&mut self, d: usize) -> Result<(), ScanError> {
        if d > MAX_DEPTH {
            return Err(ScanError::Limits);
        }
        self.p += 1;
        self.ws();
        if self.take(b']') {
            return Ok(());
        }
        let mut n = 0;
        loop {
            if n == MAX_ARRAY || self.elements == MAX_ELEMENTS {
                return Err(ScanError::Limits);
            }
            n += 1;
            self.elements += 1;
            self.value(d + 1)?;
            self.ws();
            if self.take(b']') {
                return Ok(());
            }
            self.need(b',')?;
            self.ws();
            if self.cur() == Some(b']') {
                return Err(ScanError::Syntax);
            }
        }
    }
    fn string(&mut self, max: usize, nonempty: bool) -> Result<(), ScanError> {
        self.need(b'"')?;
        let mut n = 0;
        loop {
            match self.cur().ok_or(ScanError::Syntax)? {
                b'"' => {
                    self.p += 1;
                    if nonempty && n == 0 {
                        return Err(ScanError::Limits);
                    }
                    return Ok(());
                }
                0..=0x1f => return Err(ScanError::Syntax),
                0x7f => {
                    self.controls = true;
                    self.p += 1;
                    self.add(&mut n, 1, max)?;
                }
                b'\\' => {
                    self.p += 1;
                    match self.cur().ok_or(ScanError::Syntax)? {
                        b'"' | b'\\' | b'/' => {
                            self.p += 1;
                            self.add(&mut n, 1, max)?;
                        }
                        b'b' | b'f' | b'n' | b'r' | b't' => {
                            self.controls = true;
                            self.p += 1;
                            self.add(&mut n, 1, max)?;
                        }
                        b'u' => {
                            self.p += 1;
                            let h = self.hex()?;
                            let scalar = if (0xd800..=0xdbff).contains(&h) {
                                self.need(b'\\')?;
                                self.need(b'u')?;
                                let l = self.hex()?;
                                if !(0xdc00..=0xdfff).contains(&l) {
                                    return Err(ScanError::Syntax);
                                }
                                0x10000
                                    + (((u32::from(h) - 0xd800) << 10) | (u32::from(l) - 0xdc00))
                            } else if (0xdc00..=0xdfff).contains(&h) {
                                return Err(ScanError::Syntax);
                            } else {
                                u32::from(h)
                            };
                            if scalar <= 0x1f || scalar == 0x7f {
                                self.controls = true;
                            }
                            self.add(
                                &mut n,
                                char::from_u32(scalar).ok_or(ScanError::Syntax)?.len_utf8(),
                                max,
                            )?;
                        }
                        _ => return Err(ScanError::Syntax),
                    }
                }
                _ => {
                    self.p += 1;
                    self.add(&mut n, 1, max)?;
                }
            }
        }
    }
    fn hex(&mut self) -> Result<u16, ScanError> {
        let mut v = 0;
        for _ in 0..4 {
            let x = match self.cur().ok_or(ScanError::Syntax)? {
                b'0'..=b'9' => self.cur().unwrap() - b'0',
                b'a'..=b'f' => self.cur().unwrap() - b'a' + 10,
                b'A'..=b'F' => self.cur().unwrap() - b'A' + 10,
                _ => return Err(ScanError::Syntax),
            };
            v = (v << 4) | u16::from(x);
            self.p += 1;
        }
        Ok(v)
    }
    fn number(&mut self) -> Result<(), ScanError> {
        let neg = self.take(b'-');
        match self.cur() {
            Some(b'0') => {
                self.p += 1;
                if neg {
                    self.nondecimal = true;
                }
                if matches!(self.cur(), Some(b'0'..=b'9')) {
                    return Err(ScanError::Syntax);
                }
            }
            Some(b'1'..=b'9') => {
                self.p += 1;
                while matches!(self.cur(), Some(b'0'..=b'9')) {
                    self.p += 1;
                }
            }
            _ => return Err(ScanError::Syntax),
        }
        if self.take(b'.') {
            self.nondecimal = true;
            self.digits()?;
        }
        if matches!(self.cur(), Some(b'e' | b'E')) {
            self.nondecimal = true;
            self.p += 1;
            if matches!(self.cur(), Some(b'+' | b'-')) {
                self.p += 1;
            }
            self.digits()?;
        }
        Ok(())
    }
    fn digits(&mut self) -> Result<(), ScanError> {
        if !matches!(self.cur(), Some(b'0'..=b'9')) {
            return Err(ScanError::Syntax);
        }
        while matches!(self.cur(), Some(b'0'..=b'9')) {
            self.p += 1;
        }
        Ok(())
    }
    fn keyword(&mut self, k: &[u8]) -> Result<(), ScanError> {
        let e = self.p.checked_add(k.len()).ok_or(ScanError::Syntax)?;
        if self.b.get(self.p..e) == Some(k) {
            self.p = e;
            Ok(())
        } else {
            Err(ScanError::Syntax)
        }
    }
    fn ws(&mut self) {
        while matches!(self.cur(), Some(b' ' | b'\n' | b'\r' | b'\t')) {
            self.p += 1;
        }
    }
    fn cur(&self) -> Option<u8> {
        self.b.get(self.p).copied()
    }
    fn take(&mut self, x: u8) -> bool {
        if self.cur() == Some(x) {
            self.p += 1;
            true
        } else {
            false
        }
    }
    fn need(&mut self, x: u8) -> Result<(), ScanError> {
        if self.take(x) {
            Ok(())
        } else {
            Err(ScanError::Syntax)
        }
    }
    fn add(&mut self, n: &mut usize, a: usize, max: usize) -> Result<(), ScanError> {
        *n = n.checked_add(a).ok_or(ScanError::Limits)?;
        self.text = self.text.checked_add(a).ok_or(ScanError::Limits)?;
        if *n > max || self.text > MAX_BODY {
            Err(ScanError::Limits)
        } else {
            Ok(())
        }
    }
}

#[cfg(test)]
#[path = "headless_oci_chain_tests.rs"]
mod tests;
