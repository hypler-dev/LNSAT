# Substrates and Nodes

A substrate is a system on which controlled work could occur. A node advertises
bounded capabilities for a substrate. Neither grants authority to an agent.

## Principle

Agents describe intent and required capabilities. LNSAT resolves eligible
substrates only after validation, policy, approval, and audit gates. Adapter
contracts keep substrate-specific mechanics outside packet and policy logic.

## Substrate Families

- source: repositories, worktrees, patches, and review systems;
- compute: containers, virtual machines, hosts, and accelerators;
- data: databases, object stores, queues, and indexes;
- model: local and remote inference providers;
- edge: mobile or embedded devices with bounded advertised capabilities;
- service: owned APIs, deployment providers, and enterprise applications;
- document: specifications, decisions, evidence, and generated reports.

These are taxonomy contracts. Listing a family does not mean a runtime adapter
or integration is active.

## Capability Advertisement

A node record may describe identity, environment, capability names, limits,
health evidence, and freshness. It must not embed secret values. Advertised
capability is input to selection; it is not proof of authorization.

Stale, missing, or contradictory evidence removes a node from eligibility.
Health signals never bypass policy or approval.

## Adapter Contract

An adapter manifest binds:

- adapter and contract version;
- substrate type and supported capabilities;
- required resource and secret references;
- risk and approval requirements;
- timeout, budget, cancellation, and rollback behavior;
- audit inputs and outputs.

An invocation additionally needs a matching authorization bundle. Result
evidence must distinguish success, failure, cancellation, and indeterminate
state without exposing credentials.

## Current Status

`packages/packets` contains inventory, intent, capability, manifest, preflight,
authorization, result, and readiness contracts. Inspection surfaces expose this
evidence. Repository source does not provide unrestricted runtime dispatch,
generic remote shell access, or production node control.

## Safety Requirements

- deny unknown capability and substrate combinations;
- use references for credentials and sensitive resources;
- constrain time, cost, scope, and output;
- require explicit mutation and rollback semantics;
- audit selection, authorization, invocation, and result independently;
- never treat adapter availability as permission.
