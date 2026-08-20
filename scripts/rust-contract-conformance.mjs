import assert from "node:assert/strict";
import { createHash, createPublicKey, verify } from "node:crypto";
import { readFileSync } from "node:fs";

import {
  createAuditEventV1,
  evaluateAuditEventV1Idempotency,
} from "../packages/audit/dist/index.js";
import {
  canonicalizePacketEnvelopeV1,
  hashPacketEnvelopeV1,
  parsePacketEnvelopeV1Json,
  validateContractVersion,
} from "../packages/packets/dist/index.js";
import {
  createApprovalRequestV1,
  decideApprovalRequestV1,
  decidePacketEnvelopePolicyV1,
  parseSignedApprovalEvidenceV1Json,
  verifyEd25519SignaturePrimitiveV1,
} from "../packages/policy/dist/index.js";

const versionFixtureUrl = new URL(
  "../fixtures/contracts/contract-version-v1_0.tsv",
  import.meta.url,
);
const versionFixtureLines = readFileSync(versionFixtureUrl, "utf8").split(/\r?\n/u);

let caseCount = 0;
for (const [lineIndex, line] of versionFixtureLines.entries()) {
  if (line.length === 0 || line.startsWith("#") || line.startsWith("case_id\t")) {
    continue;
  }

  const columns = line.split("\t");
  assert.equal(
    columns.length,
    5,
    `fixture line ${lineIndex + 1} must contain five tab-separated columns`,
  );

  const [caseId, encodedInput, expectedVersion, expectedStability, expectedError] =
    columns;
  const input = encodedInput === "<empty>" ? "" : encodedInput;
  const result = validateContractVersion(input);

  if (expectedError === "-") {
    assert.equal(result.ok, true, caseId);
    assert.equal(result.version, expectedVersion, caseId);
    assert.equal(result.stability, expectedStability, caseId);
    assert.deepEqual(result.side_effects, [], caseId);
  } else {
    assert.equal(result.ok, false, caseId);
    assert.equal(result.errors[0]?.code, expectedError, caseId);
    assert.deepEqual(result.side_effects, [], caseId);
  }

  caseCount += 1;
}

assert.equal(caseCount, 14, "all shared fixtures must run");

const packetFixtures = readJsonFixture("packet-envelope-v1_0.json");
for (const testCase of packetFixtures.validation_cases) {
  const input = packetValidationInput(
    packetFixtures.vectors[0].packet,
    testCase.mutation,
  );
  const result = parsePacketEnvelopeV1Json(input);
  const actual = result.ok ? "ok" : result.errors[0]?.code;
  assert.equal(actual, testCase.expected, testCase.case_id);
  assert.deepEqual(result.side_effects, [], testCase.case_id);
  caseCount += 1;
}
assert.equal(
  packetFixtures.validation_cases.length,
  20,
  "all shared packet parser fixtures must run",
);
const canonicalPacketResult = parsePacketEnvelopeV1Json(
  JSON.stringify(packetFixtures.vectors[0].packet),
);
assert.equal(canonicalPacketResult.ok, true, "stable packet must parse");
assert.equal(
  canonicalizePacketEnvelopeV1(canonicalPacketResult.packet),
  packetFixtures.vectors[0].canonical_json,
  "stable packet canonical JSON must match TypeScript",
);
caseCount += 1;
for (const testCase of packetFixtures.canonicalization_cases) {
  const result = parsePacketEnvelopeV1Json(
    JSON.stringify({
      ...packetFixtures.vectors[0].packet,
      constraints: testCase.constraints,
    }),
  );
  assert.equal(result.ok, true, testCase.case_id);
  assert.equal(
    canonicalizePacketEnvelopeV1(result.packet),
    testCase.expected_canonical_json,
    testCase.case_id,
  );
  assert.equal(
    await hashPacketEnvelopeV1(result.packet),
    testCase.expected_sha256,
    testCase.case_id,
  );
  caseCount += 1;
}
assert.equal(
  packetFixtures.canonicalization_cases.length,
  1,
  "all shared packet canonicalization fixtures must run",
);
const policyFixtures = readJsonFixture("policy-decision-v1_0.json");
for (const testCase of policyFixtures.evaluation_cases) {
  const packet = policyEvaluationPacket(
    packetFixtures.vectors[0].packet,
    testCase.mutation,
  );
  const result = await decidePacketEnvelopePolicyV1(packet, {
    evaluated_at: testCase.evaluated_at,
  });
  if ("expected_error" in testCase) {
    assert.equal(result.ok, false, testCase.case_id);
    assert.equal(result.errors[0]?.code, testCase.expected_error, testCase.case_id);
  } else {
    assert.equal(result.ok, true, testCase.case_id);
    assert.deepEqual(
      {
        decision: result.policy_decision.decision,
        requires_approval: result.policy_decision.requires_approval,
        reason_codes: result.policy_decision.reason_codes,
        capability_decisions: result.policy_decision.capability_decisions,
      },
      testCase.expected,
      testCase.case_id,
    );
  }
  assert.deepEqual(result.side_effects, [], testCase.case_id);
  caseCount += 1;
}
assert.equal(
  policyFixtures.evaluation_cases.length,
  13,
  "all shared policy evaluation fixtures must run",
);
const policyGolden = policyFixtures.vectors[0];
const policyGoldenResult = await decidePacketEnvelopePolicyV1(
  packetFixtures.vectors[0].packet,
  { evaluated_at: policyGolden.evaluated_at },
);
assert.equal(policyGoldenResult.ok, true, "policy golden vector must evaluate");
assert.equal(
  policyGoldenResult.policy_decision.decision_id,
  policyGolden.expected.decision_id,
  "policy golden decision identity must match",
);
assert.equal(
  policyGoldenResult.policy_decision.packet_ref.packet_hash,
  policyGolden.expected.packet_hash,
  "policy golden packet identity must match",
);
const approvalFixtures = readJsonFixture("approval-evidence-v1_0.json");
const auditFixtures = readJsonFixture("audit-event-v1_0.json");
const auditIdempotencyFixtures = readJsonFixture("audit-idempotency-v1_0.json");
const errorEnvelopeFixtures = readJsonFixture("error-envelope-v1_0.json");
const approvalVector = approvalFixtures.vectors[0];
const sourcePacket = packetFixtures.vectors.find(
  ({ case_id: caseId }) => caseId === approvalVector.packet_vector.case_id,
)?.packet;
assert.ok(sourcePacket, "approval packet fixture must resolve");

const packet = structuredClone(sourcePacket);
packet.permission_envelope.allow = [
  ...approvalVector.packet_vector.permission_allow_override,
];
const policyResult = await decidePacketEnvelopePolicyV1(packet, {
  evaluated_at: approvalVector.policy_evaluated_at,
});
assert.equal(policyResult.ok, true, "stable policy chain must validate");
const policyDecision = policyResult.policy_decision;
assert.equal(
  policyDecision.decision_id,
  approvalVector.expected.policy_decision_id,
  "stable policy identity must match its owning golden fixture",
);
assert.equal(
  policyDecision.packet_ref.packet_hash,
  approvalVector.expected.packet_hash,
  "stable packet identity must match its owning golden fixture",
);

const requestResult = await createApprovalRequestV1(policyDecision, {
  requested_at: approvalVector.requested_at,
});
assert.equal(requestResult.ok, true, "stable approval request must validate");
const approvalRequest = requestResult.approval_request;
assert.equal(
  approvalRequest.approval_request_id,
  approvalVector.expected.approval_request_id,
  "stable request identity must match its owning golden fixture",
);

const decisionResult = await decideApprovalRequestV1(approvalRequest, {
  approver_ref: approvalVector.approver_ref,
  approver_session_ref: approvalVector.approver_session_ref,
  decision: approvalVector.decision,
  reason_code: approvalVector.reason_code,
  decided_at: approvalVector.decided_at,
});
assert.equal(decisionResult.ok, true, "stable approval decision must validate");
const approvalDecision = decisionResult.approval_decision;
assert.equal(
  approvalDecision.approval_decision_id,
  approvalVector.expected.approval_decision_id,
  "stable approval decision identity must match its owning golden fixture",
);
caseCount += 1;

for (const testCase of approvalFixtures.validation_cases) {
  const outcome = await approvalValidationOutcome(sourcePacket, testCase);
  assert.equal(outcome.code, testCase.expected, testCase.case_id);
  if (outcome.code === "ok") {
    assert.equal(
      outcome.decision.decision,
      testCase.expected_decision,
      testCase.case_id,
    );
    assert.equal(
      outcome.decision.reason_code,
      testCase.expected_reason,
      testCase.case_id,
    );
    assert.equal(
      outcome.decision.approval_gate_satisfied,
      testCase.expected_gate_satisfied,
      testCase.case_id,
    );
    assert.equal(outcome.decision.execution_authorized, false, testCase.case_id);
    assert.deepEqual(outcome.decision.side_effects, [], testCase.case_id);
  }
  caseCount += 1;
}
assert.equal(
  approvalFixtures.validation_cases.length,
  14,
  "all shared approval evidence fixtures must run",
);

const signedApprovalRecords = readJsonlFixture("signed-approval-evidence-v1_0.jsonl");
assert.equal(signedApprovalRecords.length, 26);
const signedApprovalFixtures = signedApprovalRecords.filter(
  ({ vector_kind: vectorKind }) => vectorKind !== "future_operational_negative",
);
assert.equal(
  signedApprovalFixtures[0]?.schema,
  "lnsat.signed_approval_evidence.conformance_vectors.v1_0",
);
assert.equal(signedApprovalFixtures.length, 20);
assert.equal(signedApprovalFixtures[0]?.provenance.private_material_included, false);
assert.equal(signedApprovalFixtures[0]?.provenance.runtime_signing_performed, false);
assert.equal(
  signedApprovalFixtures[0]?.provenance.production_signature_verification_performed,
  false,
);
for (const vector of signedApprovalFixtures) {
  const result = await parseSignedApprovalEvidenceV1Json(
    vector.raw_evidence_json,
    vector.verification_material,
  );
  const actual = result.ok ? "ok" : result.errors[0]?.code;
  assert.equal(actual, vector.expected_validation, vector.case_id);
  assert.equal(vector.expected_result.execution_authorized, false, vector.case_id);
  assert.equal(
    vector.expected_result.session_authority_state_changed,
    false,
    vector.case_id,
  );
  assert.equal(vector.expected_result.mutation_authority, false, vector.case_id);
  assert.deepEqual(vector.expected_result.side_effects, [], vector.case_id);
  if (result.ok) {
    assert.equal(
      result.canonical_payload_base64url,
      vector.expected_canonical_payload_base64url,
      vector.case_id,
    );
    assert.equal(
      result.preimage_base64url,
      vector.expected_preimage_base64url,
      vector.case_id,
    );
    assert.equal(result.payload_digest, vector.expected_payload_digest, vector.case_id);
    assert.equal(
      result.signed_approval_evidence_id,
      vector.expected_evidence_id,
      vector.case_id,
    );
  }
  caseCount += 1;
}

const ed25519VerificationFixtures = readJsonlFixture("ed25519-verification-v1_0.jsonl");
assert.equal(ed25519VerificationFixtures.length, 28);
assert.equal(
  ed25519VerificationFixtures.filter(
    ({ expected_result: expectedResult }) => expectedResult === "accepted",
  ).length,
  4,
);
assert.equal(
  ed25519VerificationFixtures.filter(
    ({ expected_result: expectedResult }) => expectedResult === "rejected",
  ).length,
  24,
);
for (const vector of ed25519VerificationFixtures) {
  assert.deepEqual(
    Object.keys(vector).sort(),
    [
      "case_id",
      "source",
      "source_revision",
      "public_key",
      "message",
      "signature",
      "expected_result",
      "rejection_class",
    ].sort(),
    vector.case_id,
  );
  const result = await verifyEd25519SignaturePrimitiveV1(vector, node22Ed25519Provider);
  assert.equal(result.accepted, vector.expected_result === "accepted", vector.case_id);
  assert.equal(result.rejection_class, vector.rejection_class, vector.case_id);
  caseCount += 1;
}

const auditVector = auditFixtures.vectors.find(
  ({ case_id: caseId }) => caseId === "approval_decision_recorded",
);
assert.ok(auditVector, "approval decision audit fixture must exist");
const auditResult = await createAuditEventV1(
  {
    event_type: auditVector.event_type,
    packet,
    policy_decision: policyDecision,
    approval_request: approvalRequest,
    approval_decision: approvalDecision,
  },
  { observed_at: auditVector.observed_at },
);
assert.equal(auditResult.ok, true, "stable audit event must validate");
const auditEvent = auditResult.audit_event;
assert.equal(
  auditEvent.event_id,
  auditVector.expected_event_id,
  "stable audit identity must match its owning golden fixture",
);
for (const testCase of auditFixtures.validation_cases) {
  const input = auditValidationInput(
    testCase.event_type,
    { packet, policyDecision, approvalRequest, approvalDecision },
    testCase.mutation,
  );
  const result = await createAuditEventV1(input, {
    observed_at: testCase.observed_at,
  });
  const actual = result.ok ? "ok" : result.errors[0]?.code;
  assert.equal(actual, testCase.expected, testCase.case_id);
  assert.deepEqual(result.side_effects, [], testCase.case_id);
  if (result.ok) {
    assert.equal(result.audit_event.execution_authorized, false, testCase.case_id);
    assert.equal(result.audit_event.persistence_requested, false, testCase.case_id);
  }
  caseCount += 1;
}
assert.equal(
  auditFixtures.validation_cases.length,
  9,
  "all shared audit validation fixtures must run",
);

for (const testCase of auditIdempotencyFixtures.cases) {
  const input = auditIdempotencyInput(auditIdempotencyFixtures, testCase.mutation);
  const before = structuredClone(input);
  const result = evaluateAuditEventV1Idempotency(input);
  const actual = result.ok ? result.outcome : result.errors[0]?.code;
  assert.equal(actual, testCase.expected, testCase.case_id);
  assert.deepEqual(input, before, testCase.case_id);
  assert.equal(result.write_performed, false, testCase.case_id);
  assert.deepEqual(result.side_effects, [], testCase.case_id);
  caseCount += 1;
}
assert.equal(
  auditIdempotencyFixtures.cases.length,
  7,
  "all shared audit idempotency fixtures must run",
);

const errorEnvelopeResults = new Map([
  ["contract_version_unsupported", validateContractVersion("lnsat.contracts.v1_1")],
  [
    "packet_contract_unsupported",
    parsePacketEnvelopeV1Json(
      JSON.stringify({
        ...packetFixtures.vectors[0].packet,
        contract_version: "lnsat.contracts.v1_1",
      }),
    ),
  ],
  [
    "policy_time_malformed",
    await decidePacketEnvelopePolicyV1(packetFixtures.vectors[0].packet, {
      evaluated_at: "not-a-time",
    }),
  ],
  [
    "approval_request_not_required",
    await createApprovalRequestV1(policyGoldenResult.policy_decision, {
      requested_at: "2026-07-22T20:01:00Z",
    }),
  ],
  [
    "approval_decision_input_malformed",
    await decideApprovalRequestV1(approvalRequest, {
      approver_ref: "identity:agent:not-human",
      approver_session_ref: "session:local:review",
      decision: "approved",
      reason_code: "approval.operator_approved",
      decided_at: "2026-07-22T20:02:00Z",
    }),
  ],
  [
    "audit_input_malformed",
    await createAuditEventV1(
      { event_type: "unknown", secret: "withheld" },
      { observed_at: "2026-07-22T20:02:10Z" },
    ),
  ],
]);
for (const testCase of errorEnvelopeFixtures.vectors) {
  const result = errorEnvelopeResults.get(testCase.case_id);
  assert.ok(result, `${testCase.case_id}: result must exist`);
  assert.equal(result.ok, false, testCase.case_id);
  assert.deepEqual(
    Object.keys(result).sort(),
    ["ok", testCase.family_result_field, "errors", "side_effects"].sort(),
    testCase.case_id,
  );
  assert.equal(result[testCase.family_result_field], null, testCase.case_id);
  assert.equal(result.errors.length, 1, testCase.case_id);
  assert.equal(result.errors[0]?.code, testCase.expected.code, testCase.case_id);
  assert.equal(result.errors[0]?.path, testCase.expected.path, testCase.case_id);
  assert.equal(
    result.errors[0]?.severity,
    testCase.expected.severity,
    testCase.case_id,
  );
  assert.ok(result.errors[0]?.message.length > 0, testCase.case_id);
  assert.deepEqual(result.side_effects, [], testCase.case_id);
  assert.equal(JSON.stringify(result).includes("withheld"), false, testCase.case_id);
  caseCount += 1;
}
assert.equal(
  errorEnvelopeFixtures.vectors.length,
  6,
  "all shared error-envelope fixtures must run",
);

const stableEvidenceCases = [
  {
    caseId: "packet_envelope_hash",
    preimage: canonicalizePacketEnvelopeV1(packet),
    expected: approvalVector.expected.packet_hash,
  },
  {
    caseId: "policy_decision_id",
    preimage: `${policyDecision.schema_id}\n${policyDecision.packet_ref.packet_hash}\n${policyDecision.evaluated_at}`,
    expected: approvalVector.expected.policy_decision_id,
  },
  {
    caseId: "approval_request_id",
    preimage: canonicalizeJson(withoutKey(approvalRequest, "approval_request_id")),
    expected: approvalVector.expected.approval_request_id,
  },
  {
    caseId: "approval_decision_id",
    preimage: [
      approvalDecision.schema_id,
      approvalDecision.approval_request_ref.approval_request_id,
      approvalDecision.decision,
      approvalDecision.decided_at,
      approvalDecision.approver_ref,
      approvalDecision.approver_session_ref,
      approvalDecision.reason_code,
    ].join("\n"),
    expected: approvalVector.expected.approval_decision_id,
  },
  {
    caseId: "audit_event_id",
    preimage: canonicalizeJson(withoutKey(auditEvent, "event_id")),
    expected: auditVector.expected_event_id,
  },
];

const stableEvidenceFixtureUrl = new URL(
  "../fixtures/contracts/stable-evidence-digests-v1_0.tsv",
  import.meta.url,
);
const stableEvidenceFixtureLines = readFileSync(stableEvidenceFixtureUrl, "utf8").split(
  /\r?\n/u,
);
let stableEvidenceCaseCount = 0;
for (const [lineIndex, line] of stableEvidenceFixtureLines.entries()) {
  if (line.length === 0 || line.startsWith("#") || line.startsWith("case_id\t")) {
    continue;
  }
  const columns = line.split("\t");
  assert.equal(
    columns.length,
    3,
    `stable evidence fixture line ${lineIndex + 1} must contain three tab-separated columns`,
  );
  const [caseId, encodedPreimage, expectedOutput] = columns;
  const expectedCase = stableEvidenceCases[stableEvidenceCaseCount];
  assert.equal(
    caseId,
    expectedCase?.caseId,
    `${caseId} ordering must stay authoritative`,
  );
  const preimage = encodedPreimage.replaceAll("<LF>", "\n");
  assert.equal(
    preimage,
    expectedCase.preimage,
    `${caseId} preimage must match TypeScript`,
  );
  assert.equal(
    expectedOutput,
    expectedCase.expected,
    `${caseId} output must match its owning golden fixture`,
  );
  assert.equal(
    `${outputPrefix(expectedOutput)}${createHash("sha256").update(preimage).digest("hex")}`,
    expectedOutput,
    `${caseId} digest must match TypeScript`,
  );
  stableEvidenceCaseCount += 1;
}

assert.equal(stableEvidenceCaseCount, 5, "all stable evidence fixtures must run");
caseCount += stableEvidenceCaseCount;
console.log(`TypeScript contract conformance: ${caseCount}/${caseCount}`);

function readJsonFixture(name) {
  return JSON.parse(
    readFileSync(new URL(`../fixtures/contracts/${name}`, import.meta.url), "utf8"),
  );
}

function readJsonlFixture(name) {
  return readFileSync(new URL(`../fixtures/contracts/${name}`, import.meta.url), "utf8")
    .trim()
    .split(/\r?\n/u)
    .map((line) => JSON.parse(line));
}

function node22Ed25519Provider(input) {
  const publicKey = createPublicKey({
    key: input.public_key_spki_der,
    format: "der",
    type: "spki",
  });
  return verify(null, input.message, publicKey, input.signature);
}

function auditValidationInput(eventType, chain, mutation) {
  const source = {
    event_type: eventType,
    packet: structuredClone(chain.packet),
    policy_decision: structuredClone(chain.policyDecision),
  };
  if (eventType !== "policy.decision_recorded") {
    source.approval_request = structuredClone(chain.approvalRequest);
  }
  if (eventType === "approval.decision_recorded") {
    source.approval_decision = structuredClone(chain.approvalDecision);
  }
  switch (mutation) {
    case "none":
      break;
    case "tamper_packet":
      source.packet.risk_level = 4;
      break;
    case "tamper_policy":
      source.policy_decision.risk_level = 4;
      break;
    case "tamper_request":
      source.approval_request.project_ref = "project:other";
      break;
    case "tamper_decision":
      source.approval_decision.approval_decision_id = `apd_${"0".repeat(64)}`;
      break;
    default:
      throw new Error(`unknown audit mutation: ${mutation}`);
  }
  return source;
}

function auditIdempotencyInput(fixture, mutation) {
  const candidate = structuredClone(fixture.candidate);
  switch (mutation) {
    case "none":
      return { prior_state: [], candidate };
    case "unrelated_prior":
      return {
        prior_state: [structuredClone(fixture.unrelated_prior)],
        candidate,
      };
    case "exact_replay":
      return { prior_state: [structuredClone(candidate)], candidate };
    case "collision":
      return {
        prior_state: [
          {
            ...structuredClone(candidate),
            event_id: `aud_${"c".repeat(64)}`,
          },
        ],
        candidate,
      };
    case "duplicate_prior":
      return {
        prior_state: [
          structuredClone(fixture.unrelated_prior),
          structuredClone(fixture.unrelated_prior),
        ],
        candidate,
      };
    case "invalid_prior":
      return {
        prior_state: [
          {
            ...structuredClone(fixture.unrelated_prior),
            event_id: "aud_invalid",
          },
        ],
        candidate,
      };
    case "invalid_candidate":
      return {
        prior_state: [],
        candidate: { ...candidate, idempotency_key: "audit:invalid" },
      };
    default:
      throw new Error(`unknown audit idempotency mutation: ${mutation}`);
  }
}

function packetValidationInput(base, mutation) {
  if (mutation === "malformed_json") return '{"contract_version":';
  if (mutation === "root_array") return "[]";
  if (mutation === "set_risk_integral_decimal") {
    return JSON.stringify(base).replace('"risk_level":3', '"risk_level":3.0');
  }
  if (mutation === "set_constraint_negative_zero") {
    return JSON.stringify(base).replace(
      '"constraints":{',
      '"constraints":{"negative_zero":-0,',
    );
  }

  const packet = structuredClone(base);
  switch (mutation) {
    case "none":
      break;
    case "add_unknown_root_field":
      packet.unexpected = true;
      break;
    case "remove_schema_id":
      delete packet.schema_id;
      break;
    case "set_contract_v1_1":
      packet.contract_version = "lnsat.contracts.v1_1";
      break;
    case "set_contract_number":
      packet.contract_version = 1;
      break;
    case "set_schema_v0_1":
      packet.schema_id = "lnsat.packet_envelope.schema.v0_1";
      break;
    case "set_risk_string":
      packet.risk_level = "3";
      break;
    case "set_permission_allow_string":
      packet.permission_envelope.allow = "tests.run.sandbox";
      break;
    case "set_permission_leading_digit":
      packet.permission_envelope.allow = ["1tests.run"];
      break;
    case "set_permission_allow_unsorted":
      packet.permission_envelope.allow = ["tests.write", "tests.read"];
      break;
    case "set_permission_block_duplicate":
      packet.permission_envelope.block = ["network.open", "network.open"];
      break;
    case "set_permission_allow_block_conflict":
      packet.permission_envelope.allow = ["network.open"];
      break;
    case "set_created_at_invalid_calendar":
      packet.created_at = "2026-02-31T00:00:00Z";
      break;
    case "set_expires_equal_created":
      packet.expires_at = packet.created_at;
      break;
    case "set_constraint_fractional_number":
      packet.constraints.fractional = 1.5;
      break;
    case "set_constraint_unsafe_integer":
      packet.constraints.unsafe = 9_007_199_254_740_992;
      break;
    default:
      throw new Error(`unknown packet validation mutation: ${mutation}`);
  }
  return JSON.stringify(packet);
}

function policyEvaluationPacket(base, mutation) {
  const packet = structuredClone(base);
  switch (mutation) {
    case "none":
      break;
    case "set_unsupported_profile":
      packet.policy_profile_ref = "policy:unknown";
      break;
    case "set_forbidden_capability":
      packet.permission_envelope.allow = ["root"];
      break;
    case "set_unknown_capability":
      packet.permission_envelope.allow = ["teleport.execute"];
      break;
    case "clear_capabilities":
      packet.permission_envelope.allow = [];
      break;
    case "set_requires_approval":
      packet.requires_approval = true;
      break;
    case "set_risk_threshold":
      packet.risk_level = 5;
      break;
    case "set_approval_capability":
      packet.permission_envelope.allow = ["deploy.request"];
      break;
    case "set_denial_and_approval":
      packet.permission_envelope.allow = ["root"];
      packet.requires_approval = true;
      packet.risk_level = 6;
      break;
    case "set_invalid_created_at":
      packet.created_at = "2026-02-31T00:00:00Z";
      break;
    default:
      throw new Error(`unknown policy evaluation mutation: ${mutation}`);
  }
  return packet;
}

async function approvalValidationOutcome(base, testCase) {
  if (testCase.stage === "request") {
    let policy = await approvalPolicyForCase(
      base,
      "identity:agent:codex",
      testCase.mutation === "use_allow_policy" ? "tests.run.sandbox" : "deploy.request",
    );
    let requestedAt = "2026-07-22T20:01:00Z";
    if (testCase.mutation === "tamper_policy_id") {
      policy = { ...policy, decision_id: `pol_${"0".repeat(64)}` };
    } else if (testCase.mutation === "tamper_policy_risk") {
      policy = { ...policy, risk_level: 6 };
    } else if (testCase.mutation === "malformed_request_time") {
      requestedAt = "2026-02-31T00:00:00Z";
    } else if (testCase.mutation === "early_request_time") {
      requestedAt = "2026-07-22T19:59:59Z";
    } else if (testCase.mutation === "expired_request_time") {
      requestedAt = policy.expires_at;
    }
    const result = await createApprovalRequestV1(policy, {
      requested_at: requestedAt,
    });
    return {
      code: result.ok ? "ok" : result.errors[0]?.code,
      decision: null,
    };
  }

  const actorRef =
    testCase.mutation === "self_approval"
      ? "identity:human:owner"
      : "identity:agent:codex";
  const policy = await approvalPolicyForCase(base, actorRef, "deploy.request");
  const requestResult = await createApprovalRequestV1(policy, {
    requested_at: "2026-07-22T20:01:00Z",
  });
  assert.equal(requestResult.ok, true, `${testCase.case_id} request`);
  let request = requestResult.approval_request;
  const options = {
    approver_ref: "identity:human:owner",
    approver_session_ref: "session:local:owner-0001",
    decision: "approved",
    reason_code: "approval.operator_approved",
    decided_at: "2026-07-22T20:02:00Z",
  };
  if (testCase.mutation === "deny_scope") {
    options.decision = "denied";
    options.reason_code = "approval.scope_rejected";
  } else if (testCase.mutation === "nonhuman_approver") {
    options.approver_ref = "identity:agent:reviewer";
  } else if (testCase.mutation === "mismatched_reason") {
    options.reason_code = "approval.scope_rejected";
  } else if (testCase.mutation === "early_decision_time") {
    options.decided_at = "2026-07-22T20:00:59Z";
  } else if (testCase.mutation === "expired_decision_time") {
    options.decided_at = request.expires_at;
  } else if (testCase.mutation === "tamper_request_id") {
    request = { ...request, approval_request_id: `apr_${"0".repeat(64)}` };
  } else if (testCase.mutation === "tamper_request_project") {
    request = { ...request, project_ref: "project:other" };
  }
  const result = await decideApprovalRequestV1(request, options);
  return {
    code: result.ok ? "ok" : result.errors[0]?.code,
    decision: result.ok ? result.approval_decision : null,
  };
}

async function approvalPolicyForCase(base, actorRef, capability) {
  const packet = structuredClone(base);
  packet.actor_ref = actorRef;
  packet.permission_envelope.allow = [capability];
  const result = await decidePacketEnvelopePolicyV1(packet, {
    evaluated_at: packet.created_at,
  });
  assert.equal(result.ok, true, "approval case policy must evaluate");
  return result.policy_decision;
}

function withoutKey(value, keyToRemove) {
  return Object.fromEntries(
    Object.entries(value).filter(([key]) => key !== keyToRemove),
  );
}

function canonicalizeJson(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    assert.equal(Number.isFinite(value), true, "canonical JSON numbers must be finite");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalizeJson(item)).join(",")}]`;
  }
  assert.equal(isPlainObject(value), true, "value must be canonical JSON");
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalizeJson(value[key])}`)
    .join(",")}}`;
}

function isPlainObject(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function outputPrefix(expected) {
  if (expected.startsWith("sha256:")) return "sha256:";
  const separatorIndex = expected.indexOf("_");
  assert.notEqual(
    separatorIndex,
    -1,
    "stable evidence output must have a known prefix",
  );
  return expected.slice(0, separatorIndex + 1);
}
