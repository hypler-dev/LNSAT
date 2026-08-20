# Open Source Governance Evidence

- Status: public-source companion record
- Canonical policy: [`GOVERNANCE.md`](../../GOVERNANCE.md)

## Purpose

This policy makes open-source and commercial maintenance boundaries explicit
while artifact publishing, package registries, hosted services, and production
operations remain closed.

## Public Files

Required root files:

- `SECURITY.md`;
- `CONTRIBUTING.md`;
- `CODE_OF_CONDUCT.md`;
- `GOVERNANCE.md`;
- `MAINTAINERS.md`;
- `SUPPORT.md`.

Required GitHub templates:

- `.github/PULL_REQUEST_TEMPLATE.md`;
- `.github/ISSUE_TEMPLATE/bug_report.md`;
- `.github/ISSUE_TEMPLATE/feature_request.md`;
- `.github/ISSUE_TEMPLATE/config.yml`, which links to private vulnerability
  reporting instead of creating a public security issue.

## Community Requirements

- DCO-first contribution posture until a CLA decision is made.
- Issue- or rationale-linked pull requests.
- Private vulnerability reporting guidance.
- Public issue templates that avoid secret/customer-data disclosure.
- Maintainer authority separated from live infrastructure authority.
- ADR/RFC process reserved for protocol, Gateway, module, release, and
  compatibility changes.

## Commercial Requirements

- Clear open-source versus commercial feature boundary.
- Versioned support windows.
- Security advisory path.
- Enterprise support tier definitions.
- Hosted-cloud trust-center obligations before any hosted-control-plane endpoint is
  opened and selected.

## Release Boundaries

Public repository operation does not open:

- release upload;
- package publish;
- hosted-cloud runtime;
- DNS/Cloudflare mutation;
- external service call;
- secret value;
- nonempty side effects.

Historical `lnsat.platform.open_source_governance_scaffold.v0_1` source remains
as a pre-release compatibility record. Root governance and GitHub settings own
current public operation; that historical contract grants no runtime or release
authority.
