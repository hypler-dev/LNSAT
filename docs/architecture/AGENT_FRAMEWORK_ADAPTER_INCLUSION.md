# Agent Framework Adapter Inclusion

## Purpose

This design records agent-framework adapter families LNSAT may support in its
connector ecosystem. Google ADK plus MCP is part of the intended LNSAT stack:
ADK can be the agent authoring/runtime framework, MCP can expose tools and
inspection adapters, and LNSAT Gateway remains the policy, approval, and audit
boundary between those agents and real systems.

This packet is source-only. It does not install `google-adk`, call Google APIs,
wire Vertex AI, deploy Agent Engine, create credentials, store secrets, or make
Google ADK a mandatory LNSAT core runtime dependency.

## Google ADK Position

Google ADK with MCP should be supported as:

- required stack capability target for ADK-built agents that use MCP tools;
- agent framework adapter family;
- MCP tool bridge target;
- connector/module manifest target;
- policy and approval evidence source;
- audit event source through LNSAT Gateway;
- compatibility/conformance row for agent framework adapters;
- future docs example for teams already building agents with Google/Gemini/
  Vertex AI tooling.

Google ADK should not be:

- LNSAT security boundary;
- mandatory runtime dependency for every LNSAT deployment;
- replacement for LNSAT Gateway;
- direct path to live infrastructure mutation;
- source of stored secrets in repo fixtures or docs;
- implicit `cloud.lnsat.com` hosted runtime.

## Adapter Requirements

Any future Google ADK plus MCP integration must provide:

- adapter manifest with package/version refs;
- MCP server/tool refs and tool-call authority mapping;
- ADK agent identity, version, model, and runtime refs;
- declared tools, actions, and external systems;
- credential references only, no secret values;
- policy class for each action;
- approval requirements for risky actions;
- audit event mapping;
- disablement and rollback behavior;
- conformance fixtures and deterministic tests;
- no-phone-home and telemetry disclosure;
- hosted/runtime boundary statement if deployed on Google Cloud.

## Universal and Model-Specific Configuration

Framework adapter consumes one resolved configuration chain:

- universal organization, workspace, role, rule, instruction, and skill
  objects;
- provider-family overlay;
- model-specific overlay;
- framework rendering adapter;
- task-scoped context;
- exact effective bundle digest and resolution trace.

Universal prohibitions, capability ceilings, approval duties, and evidence
requirements cannot be removed by Google ADK, another framework, provider, or
model overlay. Framework-specific files are rendered outputs tied to portable
source digests, not independent mutable policy.

Same contract applies to OpenAI, Anthropic, Google, local-model, CLI-agent, and
future framework adapters. Model or framework classifiers may recommend
delegation and escalation but cannot approve or authorize.

## Public Surface Requirements

- `/connectors` should name Google ADK plus MCP as a planned stack capability
  for teams building ADK agents that need governed MCP tools.
- Compatibility docs should list agent framework adapters separately from MCP
  adapters and connector SDKs, while also showing the intended ADK-agent to
  MCP-tool bridge.
- Hosted docs should keep Google Cloud/Vertex/Agent Engine paths future-only
  until an approved hosted packet opens runtime, auth, customer data, and
  secrets scope.
- Extension SDK should expose portable manifest, effective-profile digest,
  model/framework compatibility, receipt mapping, and conformance requirements
  without making one framework mandatory.

## Blocked Scope

This document does not open:

- Google ADK install;
- package install;
- Google API call;
- Vertex AI or Agent Engine deployment;
- Google Cloud project mutation;
- credential creation or storage;
- hosted runtime;
- customer data handling;
- live adapter invocation;
- MCP tool registration;
- Gateway route implementation;
- database write;
- Git push;
- deploy;
- DNS/Cloudflare mutation;
- secret value;
- external service call;
- nonempty side effects.
