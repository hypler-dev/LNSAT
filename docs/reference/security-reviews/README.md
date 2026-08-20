# Security Review Evidence

Files in this directory preserve completed private-history review records as
archival provenance. Their recorded Git revisions remain in the private
engineering archive and are intentionally absent from fresh public history.
They are not locally replayable attestations in the public repository.

Public snapshot validators still require current `lnsat.security_review.v1`
records to have exact closed shape. They require every path enumerated by the
[snapshot marker](../public-source-snapshot.json), including the older
post-merge input, to remain byte-identical to public root across every
descendant commit and working tree. Change-then-restore, side-branch rewrite,
deletion, shallow history, multiple roots, custom evidence-path overrides, and
tags fail closed.

Snapshot mode does not independently verify private commit existence,
ancestry, attestation topology, exact diffs, reviewed tree IDs, protected file
blobs, completion commits, or reviewer identity. Validator output lists these
skipped checks. Mode is allowed only while root package version is pre-`1.0.0`,
package publication stays disabled, no Git tags exist, and release, artifact,
and deployment authority remain false.

This exception supports source visibility, not a supported release. Before any
supported artifact or `v1.0.0`, maintainers must retire snapshot mode and
establish publicly replayable review/provenance evidence for exact release
source.
