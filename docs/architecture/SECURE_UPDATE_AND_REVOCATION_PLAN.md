# Secure Update And Revocation Plan

## Purpose

This document defines secure update and revocation requirements LNSAT needs
before `/download/latest`, version pointers, installer update checks, hosted
rollouts, or binary package channels become installable.

This packet plans update safety only. It does not write release manifests,
move stable/latest pointers, update `binary/latest`, sign artifacts, publish
revocation lists, activate emergency disablement, execute rollback, run
installers, build packages, upload releases, mutate GitHub, push Git,
call DNS/Cloudflare, call external services, or store secret values.

## Canonical Ownership

This proposal owns update channels, signed manifest and pointer rules,
revocation, emergency disablement, and offline mirror verification. It does not
select v1 artifacts or platforms.
[ADR-0002](ADR-0002_AUTHORITY_LAYER_AND_V1_DISTRIBUTION.md) defines the v1
release boundary, [Phase 14 distribution](DISTRIBUTION_AND_CLIENT_INSTALLERS.md)
defines required artifacts, and [the roadmap](../ROADMAP.md) controls sequence.

## Update Channels

Initial channel model:

- `source-plan`: source-only release plan and static refs;
- `candidate`: future signed candidate artifacts, never auto-installed;
- `stable`: future approved installable artifacts after promotion gates pass;
- `security`: future security-only update lane with support-window refs;
- `revoked`: blocked release state, not installable;
- `emergency-disabled`: channel disabled until operator review.

Every channel must point to a versioned manifest, stable pointer policy,
support window, changelog, rollback plan, revocation policy, and audit evidence
before any client uses it.

## Manifest And Pointer Rules

Required refs:

- update manifest schema;
- signed manifest policy;
- channel policy;
- version pointer policy;
- stable promotion gate;
- rollback plan;
- uninstall plan;
- revocation policy;
- revocation list;
- emergency disablement;
- download page pointer;
- support window;
- changelog;
- client update boundary;
- offline mirror policy;
- audit evidence.

`/download/latest`, `binary/latest`, and version-specific pointer files must
remain reviewable source refs until a later release packet opens write scope.
Promotion must be append-only, approval-gated, and reversible through a
documented rollback or revocation state.

## Client Update Boundary

Early LNSAT clients should be client-owned and operator-triggered:

- no forced background auto-update;
- no hidden package install;
- no broad root helper;
- no arbitrary shell update command;
- no remote code execution through update metadata;
- no update check that bypasses Gateway policy, approval, or audit evidence;
- no raw secret values in manifests, logs, prompts, fixtures, or docs.

Future update helpers may only consume signed manifests and named package
capabilities after their own packet opens implementation.

## Revocation And Emergency Disablement

Revocation states:

- `not_revoked`;
- `revocation_planned`;
- `revoked_do_not_install`;
- `emergency_disabled`;
- `superseded_by_security_update`.

Revocation evidence must include:

- affected version and artifact refs;
- reason category;
- severity;
- replacement version or mitigation;
- signature/certificate/key reference if relevant;
- rollback/uninstall refs;
- customer communication refs;
- audit evidence refs;
- approval refs.

Emergency disablement is a planned capability only. Activation requires a later
explicit incident or release packet.

## Offline And Air-Gapped Mirrors

Offline mirrors must preserve:

- versioned release manifest;
- checksum index;
- signature index;
- SBOM index;
- provenance index;
- revocation list snapshot;
- support window and changelog;
- rollback/uninstall docs;
- mirror audit evidence.

Offline mirrors must not become an untracked fork of release truth. They need
operator-owned import and verification steps before install scope opens.

## Public Surface Requirements

`lnsat.com/download` and `/security` should explain:

- latest pointers are gated;
- update metadata is planned source-only until release scope opens;
- clients are operator-triggered, not forced auto-update;
- revocation and emergency-disable states exist before stable binaries;
- rollback and uninstall refs are required;
- offline mirrors must carry the same trust evidence.

## Blocked Scope

This document does not open:

- update manifest write;
- stable pointer write;
- latest pointer write;
- `binary/latest` update;
- signing execution;
- revocation publication;
- emergency disablement activation;
- rollback execution;
- installer execution;
- package build;
- release upload;
- GitHub Release creation;
- GitHub API mutation;
- Git push;
- DNS/Cloudflare mutation;
- external service call;
- secret value;
- nonempty side effects.
