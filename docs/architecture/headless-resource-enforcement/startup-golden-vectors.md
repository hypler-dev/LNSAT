# HCFG-6 Startup Golden Vectors

Status: source-only synthetic vectors for the proposed schema-3 startup wire
contract. These vectors do not prove the native observer, Docker behavior,
authority, full source freeze, or runtime readiness. Values are deliberately
synthetic and must never be used as pins, credentials, installation identity,
or authorization evidence.

## Reproduction rule

Use Node.js standard library only. For every value below, recursively sort
object keys by their ASCII byte order, preserve array order, and encode compact
UTF-8 JSON with `JSON.stringify`. A digest is:

```text
sha256(domain UTF-8 bytes + one LF + compact canonical JSON bytes)
```

Digest input has no trailing LF. A wire frame is the recursively sorted,
compact canonical object followed by exactly one LF. The reported frame byte
count includes that LF. The following implementation is sufficient to
reproduce the encoding and hash operation:

```js
import { createHash } from "node:crypto";
const sort = (v) =>
  Array.isArray(v)
    ? v.map(sort)
    : v && typeof v === "object"
      ? Object.fromEntries(
          Object.entries(v)
            .sort(([a], [b]) => Buffer.compare(Buffer.from(a), Buffer.from(b)))
            .map(([k, x]) => [k, sort(x)]),
        )
      : v;
const json = (v) => JSON.stringify(sort(v));
const sha = (domain, v) =>
  "sha256:" +
  createHash("sha256")
    .update(domain + "\n" + json(v))
    .digest("hex");
const frameBytes = (v) => Buffer.byteLength(json(v), "utf8") + 1;
```

The fixture uses `sha256:` plus repeated hexadecimal characters as synthetic
digests. The profile fixture contains every schema-3 field and the native
fixture contains every exact native field defined by the wire specification.
Each vector is an independent encoding fixture, not a valid startup/release
sequence. Assertions, native facts, profile/candidate digests and request
bindings are deliberately unauthenticated. The native example also fails
actual recipe/budget checks (synthetic AppArmor label, incomplete mounts/devices,
no loopback, and CPU quota above its one-millicore fixture ceiling). A source
decoder may use its bytes for canonicalization tests; a live observer or
release guard must reject it. No positive-observation claim follows.
The UUID values use lowercase UUIDv4 syntax; `channel_id`, `challenge`, and
the synthetic container ID use exactly 64 lowercase hexadecimal characters.

## Schema-3 profile inputs

The canonical profile object is the following object. The `image_index_digest`
value is the only difference between the two vectors: `null` represents no
selected index; the second vector uses the explicit synthetic selected index.

```json
{
  "contract_id": "lnsat.runtime_profile.docker_local.v2",
  "contract_version": "lnsat.contracts.v1_0",
  "schema_version": 3,
  "profile_id": "runtime-profile:docker-local:git-reference",
  "profile_family": "docker_local",
  "adapter": { "ref": "adapter:docker-local:git-commit", "version": "v2" },
  "audience": "audience:gateway:local",
  "adapter_executable_digest": "sha256:1111111111111111111111111111111111111111111111111111111111111111",
  "image_digest": "sha256:2222222222222222222222222222222222222222222222222222222222222222",
  "entrypoint": "/usr/local/bin/adapter",
  "filesystem": {
    "root_filesystem_read_only": true,
    "workdir": "/work",
    "target_mount_path": "/work",
    "target_mount_mode": "read_write",
    "additional_mounts": false
  },
  "isolation": {
    "network": "none",
    "run_as_uid": 1000,
    "run_as_gid": 1000,
    "privilege": {
      "privileged": false,
      "no_new_privileges": true,
      "capabilities_drop_all": true
    },
    "host_namespaces": { "pid": false, "ipc": false, "network": false },
    "host_access": { "docker_socket_mount": false, "devices": false },
    "ambient": { "environment": false, "credentials": false, "shell": false },
    "seccomp_profile": "runtime_default"
  },
  "limits": {
    "memory_bytes": 16777216,
    "pids": 1,
    "cpu_millis": 1,
    "wall_clock_seconds": 1,
    "stdout_bytes": 1,
    "stderr_bytes": 0
  },
  "engine": {
    "endpoint_path": "/run/lnsat/docker.sock",
    "implementation_manifest_path": "/etc/lnsat/manifest.json",
    "implementation_manifest_digest": "sha256:3333333333333333333333333333333333333333333333333333333333333333",
    "verifier_git_executable_path": "/usr/bin/git",
    "verifier_git_executable_digest": "sha256:4444444444444444444444444444444444444444444444444444444444444444"
  },
  "headless": {
    "installation_ref": "installation:synthetic",
    "binding_digest": "sha256:5555555555555555555555555555555555555555555555555555555555555555",
    "recipe_digest": "sha256:6666666666666666666666666666666666666666666666666666666666666666",
    "probe_entrypoint": "/usr/local/bin/probe",
    "probe_executable_digest": "sha256:7777777777777777777777777777777777777777777777777777777777777777",
    "image_manifest_digest": "sha256:8888888888888888888888888888888888888888888888888888888888888888",
    "image_index_digest": null
  }
}
```

| Vector                   | Canonical profile bytes | Profile digest                                                            | Authority digest                                                          |
| ------------------------ | ----------------------: | ------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `profile-index-null`     |                    2057 | `sha256:975d60c7350dc0c8cd838a88318a9564864eff7b552695066325d5a18871a352` | `sha256:8ceeebf376a09ffc117946f2a671f598eef3d54f86dcb10bd40baa97db391051` |
| `profile-index-selected` |                    2126 | `sha256:9cb96a347431a23b3d9c1fa082770091b93bcc9ca92bec302728251cb92b9f3b` | `sha256:7d489ebf8fdae82e730f273cf1515c01266e45b1a91c1ca9dcdc01dafcc1cd3c` |

For `profile-index-selected`, replace the profile's `image_index_digest`
`null` with
`sha256:9999999999999999999999999999999999999999999999999999999999999999`.
The profile digest uses domain `lnsat.hcfg_profile.v3`. The authority input is
the positional array
`[compiled_git_configuration_digest, profile_digest, binding_digest,
recipe_digest]`, using synthetic compiled digest `sha256:` followed by 64
`a` characters, and domains `lnsat.hcfg_profile_authority.v3`.

## Context and challenge inputs

Action context commitment input (the fourth element is the ordered value array,
not the frame's named context object):

```json
[
  "lnsat.adapter_process.docker_local.v2",
  "lnsat.contracts.v1_0",
  2,
  [
    "550e8400-e29b-41d4-a716-446655440000",
    1,
    1,
    "opn_1111111111111111111111111111111111111111111111111111111111111111",
    "xau_2222222222222222222222222222222222222222222222222222222222222222",
    1,
    "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd"
  ]
]
```

Preparation context commitment input:

```json
[
  "lnsat.preparation_probe.docker_local.v1",
  "lnsat.contracts.v1_0",
  1,
  [
    "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    "9999999999999999999999999999999999999999999999999999999999999999"
  ]
]
```

| Context     | Domain                          | Digest                                                                    |
| ----------- | ------------------------------- | ------------------------------------------------------------------------- |
| action      | `lnsat.hcfg_startup_context.v2` | `sha256:fc4ed54e6f5120fc10ba25faf79965c03e3299f60d75e643972d33440c3c8829` |
| preparation | `lnsat.hcfg_probe_context.v1`   | `sha256:d950eb49e6133371368e74c202d380570442a095849410edb3c58f2b8f11eb1e` |

The synthetic limits object used by challenge frames is:

```json
{
  "memory_bytes": 16777216,
  "pids": 1,
  "cpu_millis": 1,
  "wall_clock_millis": 1000,
  "stdout_bytes": 1,
  "stderr_bytes": 0
}
```

The one-byte `stdout_bytes` value is a decoder-only denial-case fixture; it is
not a valid preparation or runtime positive budget. Each challenge payload is
exactly `{limits, startup_digest}`. The action frame
uses `message_type=startup_challenge`, action schema 2, the full closed action
context object, and 1189 bytes including LF. The preparation frame uses
`message_type=probe_challenge`, preparation schema 1, the full closed
preparation context object, and 984 bytes including LF. Their canonical envelope fields are the
six exact top-level fields from the wire specification:
`contract_id`, `contract_version`, `schema_version`, `message_type`,
`context`, `payload`. The preparation challenge is syntax-only; it has no
`negative_checks` field. The deferred preparation-observation payload's
`negative_checks` field now has the exact five-record ordered grammar: each
record contains only `id` and positive `errno`, with IDs and errno values fixed
by the realized recipe. This synthetic document does not claim any actual
syscall result or positive probe evidence.

The exact compact canonical challenge objects (before their one LF frame byte)
are:

```text
{"context":{"attempt_sequence":1,"authority_epoch":1,"authorization_id":"xau_2222222222222222222222222222222222222222222222222222222222222222","candidate_digest":"sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","challenge":"dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd","channel_id":"cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc","container_id":"ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff","generation":1,"installation_id":"550e8400-e29b-41d4-a716-446655440000","operation_id":"opn_1111111111111111111111111111111111111111111111111111111111111111","profile_digest":"sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","recipe_digest":"sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"},"contract_id":"lnsat.adapter_process.docker_local.v2","contract_version":"lnsat.contracts.v1_0","message_type":"startup_challenge","payload":{"limits":{"cpu_millis":1,"memory_bytes":16777216,"pids":1,"stderr_bytes":0,"stdout_bytes":1,"wall_clock_millis":1000},"startup_digest":"sha256:fc4ed54e6f5120fc10ba25faf79965c03e3299f60d75e643972d33440c3c8829"},"schema_version":2}
{"context":{"candidate_digest":"sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","challenge":"9999999999999999999999999999999999999999999999999999999999999999","channel_id":"cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc","container_id":"ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff","preparation_id":"eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee","profile_digest":"sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","recipe_digest":"sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"},"contract_id":"lnsat.preparation_probe.docker_local.v1","contract_version":"lnsat.contracts.v1_0","message_type":"probe_challenge","payload":{"limits":{"cpu_millis":1,"memory_bytes":16777216,"pids":1,"stderr_bytes":0,"stdout_bytes":1,"wall_clock_millis":1000},"startup_digest":"sha256:d950eb49e6133371368e74c202d380570442a095849410edb3c58f2b8f11eb1e"},"schema_version":1}
```

## Native observation input

The native input object is the exact schema-defined object below. It is shown
in readable JSON for review; recursive ASCII sorting and compact encoding are
applied by the reproduction rule. This synthetic fixture uses the proposed
primary group `[1000]`; it does not claim live observation or positive runtime
proof.

```json
{
  "process": {
    "pid": 1,
    "start_ticks": 2,
    "thread_count": 1,
    "uids": [1000, 1000, 1000, 1000],
    "gids": [1000, 1000, 1000, 1000],
    "groups": [1000],
    "cap_inheritable": "0000000000000000",
    "cap_permitted": "0000000000000000",
    "cap_effective": "0000000000000000",
    "cap_bounding": "0000000000000000",
    "cap_ambient": "0000000000000000",
    "no_new_privileges": 1,
    "seccomp_mode": 2,
    "scheduler_policy": 0,
    "executable_digest": "sha256:1111111111111111111111111111111111111111111111111111111111111111",
    "inherited_fds": [0, 1, 2],
    "environment": [
      "PATH=/usr/bin",
      "HOSTNAME=lnsat",
      "LANG=C",
      "LC_ALL=C",
      "HOME=/nonexistent",
      "GIT_CONFIG_NOSYSTEM=1",
      "GIT_CONFIG_GLOBAL=/dev/null",
      "GIT_TERMINAL_PROMPT=0",
      "GIT_NO_REPLACE_OBJECTS=1",
      "GIT_ATTR_NOSYSTEM=1"
    ]
  },
  "namespaces": {
    "user": { "device": 10, "inode": 20 },
    "mount": { "device": 11, "inode": 21 },
    "pid": { "device": 12, "inode": 22 },
    "ipc": { "device": 13, "inode": 23 },
    "network": { "device": 14, "inode": 24 },
    "uts": { "device": 15, "inode": 25 },
    "cgroup": { "device": 16, "inode": 26 },
    "time": { "device": 17, "inode": 27 }
  },
  "mapping": { "uid_map": [[0, 0, 4294967295]], "gid_map": [[0, 0, 4294967295]] },
  "target": {
    "mount_path": "/work",
    "device": 30,
    "inode": 31,
    "owner_uid": 1000,
    "owner_gid": 1000,
    "mount_id": 32,
    "descriptor_cloexec": true,
    "descriptor_access": "read_only_metadata"
  },
  "mounts": [
    {
      "mount_id": 32,
      "parent_id": 1,
      "device_major": 8,
      "device_minor": 1,
      "root": "/",
      "mount_point": "/work",
      "mount_options": ["rw"],
      "optional_fields": [],
      "filesystem_type": "ext4",
      "mount_source": "/dev/sda1",
      "super_options": ["rw"]
    }
  ],
  "devices": [],
  "cgroup": {
    "membership_path": "/sys/fs/cgroup",
    "mount_id": 40,
    "directory_device": 41,
    "directory_inode": 42,
    "controllers": ["cpu", "memory", "pids"],
    "cpu_quota": 1000,
    "cpu_period": 100000,
    "cpu_burst": 0,
    "memory_max": 16777216,
    "memory_swap_max": 0,
    "memory_oom_group": 0,
    "pids_max": 1
  },
  "security": {
    "apparmor_label": "synthetic",
    "network_interfaces": [],
    "security_recipe_digest": "sha256:2222222222222222222222222222222222222222222222222222222222222222"
  },
  "kernel": {
    "boot_id": "00000000-0000-4000-8000-000000000000",
    "kernel_recipe_digest": "sha256:3333333333333333333333333333333333333333333333333333333333333333",
    "procfs_device": 50,
    "cgroupfs_device": 51
  }
}
```

Observation input is `[action_startup_digest, native]` under domain
`lnsat.hcfg_startup_observation.v2`. Its canonical input byte count is 2156
and digest is
`sha256:03747186479a16e66c32ade220d0f258838f2a319e43fe9a1fd249237605e57b`.
The complete action observation frame is 3258 bytes including LF. The frame
uses the full closed action context object and the specification's
`startup_digest`, `observation_digest`, and `native` fields.

The preparation observation is intentionally deferred. The frozen
`negative_checks` grammar requires exactly these five ordered records, each
with only `id` and positive `errno`: `mount_tmpfs_root`/`1`,
`unshare_mount_namespace`/`1`, `setuid_root`/`1`,
`create_root_sentinel`/`13` or `30`, and `connect_test_net`/`101`. No vector
here claims those syscall results or labels any synthetic array as a valid
probe result. The native object remains a decoder fixture; its `[1000]` groups
array is not claimed as live runtime proof.

## Release and result inputs

Release input under `lnsat.hcfg_action_release.v2` is:

```json
[
  "sha256:fc4ed54e6f5120fc10ba25faf79965c03e3299f60d75e643972d33440c3c8829",
  "sha256:03747186479a16e66c32ade220d0f258838f2a319e43fe9a1fd249237605e57b",
  "550e8400-e29b-41d4-a716-446655440001",
  "sha256:4444444444444444444444444444444444444444444444444444444444444444",
  {
    "action": {
      "arguments": { "message": "bounded fixture commit", "path": "fixture.txt" },
      "kind": "git.commit"
    },
    "adapter": { "ref": "adapter:local:git-commit", "version": "v1" },
    "approval_decision_ref": {
      "approval_decision_id": "apd_3333333333333333333333333333333333333333333333333333333333333333",
      "schema_id": "lnsat.approval_decision.schema.v1_0"
    },
    "approval_request_ref": {
      "approval_request_id": "apr_2222222222222222222222222222222222222222222222222222222222222222",
      "schema_id": "lnsat.approval_request.schema.v1_0"
    },
    "approver_ref": "identity:human:owner",
    "approver_session_ref": "session:local:owner-0001",
    "audience": "audience:gateway:local",
    "configuration_digest": "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    "contract_version": "lnsat.contracts.v1_0",
    "derivation_profile": "lnsat.execution_request.packet_embedded.v1",
    "executable_digest": "sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    "expires_at": "2026-07-22T20:05:00Z",
    "packet_ref": {
      "packet_id": "pkt_execute_v1_0001",
      "packet_sha256": "sha256:f68072fd6ca6e67aa65580a4dc55540bef33d48ddc06ab29aa69f985d41f4822",
      "schema_id": "lnsat.packet_envelope.schema.v1_0"
    },
    "policy_decision_ref": {
      "decision_id": "pol_1111111111111111111111111111111111111111111111111111111111111111",
      "schema_id": "lnsat.policy_decision.schema.v1_0"
    },
    "prepared_at": "2026-07-22T20:03:00.000Z",
    "project_ref": "project:lnsat",
    "requester_ref": "identity:agent:codex",
    "requester_session_ref": "session:local:0001",
    "resource_ref": "repo:lnsat",
    "schema_id": "lnsat.execution_request.schema.v1_0",
    "target": {
      "identity": { "base": "fixture-base", "repository": "fixture" },
      "resource_ref": "repo:lnsat"
    }
  },
  "sha256:5555555555555555555555555555555555555555555555555555555555555555",
  "sha256:6666666666666666666666666666666666666666666666666666666666666666",
  "/work"
]
```

Its digest is
`sha256:0bbe946c6d81b5aeb1eb0e68eec205ec1230b9d5850fdda167a3a870ed5cbb9b`.
The canonical action-release frame is 3185 bytes including LF.

Result inputs under `lnsat.hcfg_action_result.v2` are:

```json
[
  "sha256:fc4ed54e6f5120fc10ba25faf79965c03e3299f60d75e643972d33440c3c8829",
  "550e8400-e29b-41d4-a716-446655440001",
  "sha256:4444444444444444444444444444444444444444444444444444444444444444",
  "completed",
  "sha256:7777777777777777777777777777777777777777777777777777777777777777"
]
```

Completed result digest:
`sha256:5669ff5a5dbfb59c5c7226de6ff408bda3cc2fb3a7c0e313102ab3dd2f72f068`.
The completed result frame is 1237 bytes including LF.

Unknown result input retains explicit null:

```json
[
  "sha256:fc4ed54e6f5120fc10ba25faf79965c03e3299f60d75e643972d33440c3c8829",
  "550e8400-e29b-41d4-a716-446655440001",
  "sha256:4444444444444444444444444444444444444444444444444444444444444444",
  "outcome_unknown",
  null
]
```

Unknown result digest:
`sha256:254039b132d8c557f557396ad0143a099f303b0d0da4305b5fded5e4e074f19f`.
The unknown result frame is 1174 bytes including LF. `outcome_unknown` supplies
no success and never permits a replacement attempt or resend.

## Independent frame reconstruction

The named context object is reconstructed by pairing the wire specification's
field names with each commitment array's values. It is never replaced by the
startup digest. The following exact LF-inclusive counts use the complete
envelope and payload, including the full approved-request object:

| Frame                   | Bytes including LF |
| ----------------------- | -----------------: |
| `action_challenge`      |               1189 |
| `preparation_challenge` |                984 |
| `action_observation`    |               3258 |
| `action_release`        |               3185 |
| `result_completed`      |               1237 |
| `result_unknown`        |               1174 |

The completed result's digest string is replaced by explicit null for unknown,
while its outcome text grows by six bytes. The unknown frame is therefore
63 bytes smaller, not the same size.

## Scope boundary

These values are independent source fixtures. They do not authorize a frame,
prove a digest pin, establish a live observation, or close the HCFG-6 source
freeze. Full native implementation, independent review, selected-target proof,
Docker proof, release, and production gates remain open.
