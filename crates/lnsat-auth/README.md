# `lnsat-auth`

Source-only local authentication primitives for LNSAT.

Current behavior:

- accepts 15–128 Unicode-scalar passwords, bounded to 512 UTF-8 bytes, without
  trimming or normalization;
- creates random-salt Argon2id v19 PHC verifiers under versioned
  `lnsat.argon2id.v1`;
- fixes v1 work factors at 19 MiB memory, two passes, one lane, and 32-byte
  output;
- validates exact algorithm, version, work factors, salt, and output length
  before credential verification;
- creates independent 128-bit session IDs, 256-bit bearer secrets, and 256-bit
  anti-CSRF secrets from the operating-system random source;
- exposes only domain-separated SHA-256 digests for persistence and uses
  constant-time digest comparison;
- composes bounded host-only strict same-site cookie field values whose
  secret-bearing buffers are zeroized when dropped;
- evaluates exact numeric-loopback Host, same-origin Fetch Metadata, Origin,
  JSON mutation method, and independent anti-CSRF facts without opening an HTTP
  route;
- returns only public-safe error classes.

This crate creates one-time session secret material but does not create
identities, persist credentials/sessions, parse HTTP headers, write HTTP
responses, configure CORS, sign approvals, log secrets, deploy, or authorize
runtime actions.
