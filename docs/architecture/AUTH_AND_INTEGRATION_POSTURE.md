# Authentication and Integration Posture

LNSAT is owner-controlled and provider-neutral. Authentication establishes
identity; Gateway policy establishes authority. Integrations remain explicit,
scoped, and user-owned.

## Authentication Modes

Deployments may eventually support local accounts, external identity providers,
or hybrid identity. Provider choice cannot bypass project isolation, policy,
approval, or audit requirements. Repository source does not configure a live
provider or create production users.

## Authorization Levels

Interfaces may present read-only, approval-required, and bounded operator
levels. Exact capabilities are policy records, not role-name assumptions.
Unknown roles, stale sessions, and missing project membership fail closed.

The source-local control plane has one closed role-to-permission map:

| Role       | Local control permissions                                             |
| ---------- | --------------------------------------------------------------------- |
| `owner`    | identity management, action request, approval decision, evidence read |
| `operator` | action request, approval decision, evidence read                      |
| `auditor`  | evidence read only                                                    |

These local permissions gate control-plane operations only. They never grant a
packet capability, satisfy action policy, or authorize execution. Operator and
auditor identities are immutable and may be created only by an active owner
session with independent anti-CSRF proof.

## Delegated Agent Roles

Agent roles require explicit identity and policy ceilings:

- request classes the agent may propose;
- maximum capability and risk;
- projects, environments, resources, and audiences;
- roles it may recommend or delegate;
- actions it must escalate to human or stronger control plane;
- model/runtime and effective profile identity;
- delegation depth, validity, session, expiry, and revocation.

Gatekeeper/delegator models may classify, recommend, summarize, and route. They
cannot approve, grant roles, widen ceilings, sign evidence, issue execution
authorization, or access ambient credentials. Model output remains untrusted
policy input; low confidence or unavailability denies or escalates
consequential work.

Enterprise identity may later map OIDC/SAML/SCIM groups and attributes into
LNSAT subject/project membership. Mapping is not authority by itself. Gateway
still evaluates RBAC/ABAC capability, resource, risk, separation-of-duties,
approval class, time, environment, and delegation evidence.

## Integration Descriptor

An integration definition should declare:

- provider and contract version;
- owned project and resource scope;
- capability names and risk;
- secret references and required scopes;
- approval and audit obligations;
- health, expiry, revocation, and rollback behavior.

Descriptors contain references, never credential values. Installation or a
successful connection test does not authorize capability use.

## Current Product Boundary

Console settings show synthetic, read-only posture evidence. Rust/SQLite source
now persists local credentials and role-bound sessions and requires an active
owner/operator session plus anti-CSRF proof for approval-decision persistence.
Loopback HTTP session issue/read/rotation/sign-out, identity-password
rotation, owner-only identity creation, and owner-only identity disablement are
stable source contracts. Authenticated pending approval-request creation is
also stable, as is authenticated distinct-human approval-decision recording.
Packet and Gateway contracts model broader auth and integration state. OAuth
security source validates protected-resource admission inputs and negative
cases without starting a listener or contacting a provider. No live OAuth flow,
external provider registration, marketplace install, token exchange, execution
authorization, or external API mutation is enabled.

MCP HTTP OAuth authenticates protected-resource access only. Checked-in source
enforces exact issuer and resource/audience binding, bounded token metadata,
revocation posture, and redaction while listener support stays closed. OAuth
scopes set admission ceilings; they never satisfy LNSAT policy, human approval,
or action authorization. OIDC human identity and SPIFFE workload identity
remain distinct and jointly policy-bound where required. No IdP, authorization
server, SPIRE deployment, trust domain, credential, or certificate is created.

## Deployment Ownership

Operators own provider selection, redirect URLs, keys, domain settings,
retention, and user lifecycle. Any live implementation requires a threat model,
data-flow review, policy tests, audit events, revocation tests, and explicit
environment authorization.

Commercial entitlement and support status remain separate from permission.
They may expose a feature but cannot create identity, membership, capability,
approval, or execution authority.
