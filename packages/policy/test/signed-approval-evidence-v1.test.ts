import { createPublicKey, verify } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  deriveApprovalVerificationMaterialRefV1,
  parseSignedApprovalEvidenceV1Json,
  signedApprovalEvidenceV1Contract,
  signedApprovalVerificationErrorCodes,
  validateApprovalVerificationMaterialV1,
  verifyEd25519SignaturePrimitiveV1,
  type ApprovalVerificationMaterialV1,
  type Ed25519PublicVerificationInputV1,
  type SignedApprovalVerificationErrorCode,
  type SignedApprovalVerificationV1,
} from "../src/index.js";

const repoRoot = dirname(dirname(dirname(dirname(fileURLToPath(import.meta.url)))));

describe("@lnsat/policy signed approval evidence v1 foundation", () => {
  it("freezes parallel contract identities without opening signing or execution", () => {
    expect(signedApprovalEvidenceV1Contract).toEqual({
      contract_id: "lnsat.signed_approval_evidence.v1_0",
      contract_version: "lnsat.contracts.v1_0",
      schema_id: "lnsat.signed_approval_evidence.schema.v1_0",
      payload_profile: "lnsat.signed_approval_payload.v1_0",
      canonicalization_profile: "lnsat.canonical_json.v1_0",
      digest_profile: "lnsat.signed_approval_digest.sha256.v1_0",
      signature_profile: "lnsat.signed_approval_signature.ed25519.v1_0",
      verification_result_contract: "lnsat.signed_approval_verification.v1_0",
      verification_material_contract: "lnsat.approval_verification_material.v1_0",
      verification_material_schema: "lnsat.approval_verification_material.schema.v1_0",
      verification_result_schema: "lnsat.signed_approval_verification.schema.v1_0",
      domain_prefix: "LNSAT-SIGNED-APPROVAL-EVIDENCE-V1",
      runtime_signing: false,
      production_signature_verification: false,
      execution_authorized: false,
      side_effects: [],
    });
  });

  it("keeps all three new schemas closed and version-exact", async () => {
    const evidenceSchema = await readJson<Record<string, unknown>>(
      "packages/policy/schemas/signed-approval-evidence-v1.schema.json",
    );
    const materialSchema = await readJson<Record<string, unknown>>(
      "packages/policy/schemas/approval-verification-material-v1.schema.json",
    );
    const resultSchema = await readJson<Record<string, unknown>>(
      "packages/policy/schemas/signed-approval-verification-v1.schema.json",
    );
    expect(evidenceSchema).toMatchObject({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: "https://lnsat.local/schemas/signed-approval-evidence-v1.schema.json",
      additionalProperties: false,
    });
    expect(materialSchema).toMatchObject({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: "https://lnsat.local/schemas/approval-verification-material-v1.schema.json",
      additionalProperties: false,
    });
    expect(resultSchema).toMatchObject({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: "https://lnsat.local/schemas/signed-approval-verification-v1.schema.json",
      additionalProperties: false,
    });
  });

  it("keeps the frozen error taxonomy exact across source, schema, and vectors", async () => {
    const resultSchema = await readJson<{
      $defs: { error: { properties: { code: { enum: string[] } } } };
    }>("packages/policy/schemas/signed-approval-verification-v1.schema.json");
    const fixture = await readSignedApprovalFixture();
    expect(resultSchema.$defs.error.properties.code.enum).toEqual(
      signedApprovalVerificationErrorCodes,
    );
    expect(fixture.provenance.error_codes).toEqual(
      signedApprovalVerificationErrorCodes,
    );
    expect(new Set(signedApprovalVerificationErrorCodes).size).toBe(
      signedApprovalVerificationErrorCodes.length,
    );
  });

  it("matches every shared structural vector and exact derived byte contract", async () => {
    const fixture = await readSignedApprovalFixture();
    expect(fixture.schema).toBe(
      "lnsat.signed_approval_evidence.conformance_vectors.v1_0",
    );
    expect(fixture.vectors).toHaveLength(20);
    expect(fixture.provenance).toMatchObject({
      private_material_included: false,
      runtime_signing_performed: false,
      production_signature_verification_performed: false,
    });
    const jsonlVectors = fixture.jsonl_records;
    expect(jsonlVectors).toHaveLength(26);
    expect(jsonlVectors.slice(0, 20).map(({ case_id: id }) => id)).toEqual(
      fixture.vectors.map(({ case_id: id }) => id),
    );
    expect(
      jsonlVectors.slice(20).map(({ expected_result: expected }) => {
        const result = expected as SignedApprovalVerificationV1;
        return result.errors[0]?.code;
      }),
    ).toEqual(
      fixture.operational_threat_expectations.map(({ expected_error: error }) => error),
    );

    for (const vector of fixture.vectors) {
      const result = await parseSignedApprovalEvidenceV1Json(
        vector.raw_evidence_json,
        vector.verification_material,
      );
      const actual = result.ok ? "ok" : result.errors[0]?.code;
      expect(actual, vector.case_id).toBe(vector.expected_validation);
      expect(vector.expected_result.execution_authorized, vector.case_id).toBe(false);
      expect(
        vector.expected_result.session_authority_state_changed,
        vector.case_id,
      ).toBe(false);
      expect(vector.expected_result.mutation_authority, vector.case_id).toBe(false);
      expect(vector.expected_result.side_effects, vector.case_id).toEqual([]);

      if (result.ok) {
        expect(result.canonical_payload_base64url, vector.case_id).toBe(
          vector.expected_canonical_payload_base64url,
        );
        expect(result.preimage_base64url, vector.case_id).toBe(
          vector.expected_preimage_base64url,
        );
        expect(result.payload_digest, vector.case_id).toBe(
          vector.expected_payload_digest,
        );
        expect(result.signed_approval_evidence_id, vector.case_id).toBe(
          vector.expected_evidence_id,
        );
        expect(vector.expected_result).toMatchObject({
          ok: false,
          status: "rejected",
          cryptographic_signature_valid: false,
          chain_valid: true,
          current_status_valid: false,
          approval_gate_satisfied: true,
          server_signed: false,
          errors: [
            {
              code: "signed_approval.verification_unavailable",
            },
          ],
        });
      }
    }
  });

  it("binds immutable public material and rejects unavailable private semantics", async () => {
    const fixture = await readSignedApprovalFixture();
    const material = fixture.vectors[0]?.verification_material;
    if (material === undefined) throw new Error("material vector missing");
    const result = await validateApprovalVerificationMaterialV1(material);
    expect(result.ok).toBe(true);
    expect(await deriveApprovalVerificationMaterialRefV1(material)).toBe(
      material.verification_material_ref,
    );
    expect(material.public_key_spki_base64url).toHaveLength(59);
    expect(material).not.toHaveProperty("private_key");
    expect(material).not.toHaveProperty("seed");
    expect(material.side_effects).toEqual([]);
  });

  it("rejects hostile size and nesting before contract work", async () => {
    const oversized = JSON.stringify({ value: "x".repeat(1_048_577) });
    await expect(parseSignedApprovalEvidenceV1Json(oversized)).resolves.toMatchObject({
      ok: false,
      errors: [{ code: "signed_approval.input_too_large", path: "" }],
      side_effects: [],
    });

    let deep: unknown = null;
    for (let depth = 0; depth < 66; depth += 1) deep = [deep];
    await expect(
      parseSignedApprovalEvidenceV1Json(JSON.stringify(deep)),
    ).resolves.toMatchObject({
      ok: false,
      errors: [{ code: "signed_approval.input_too_deep", path: "" }],
      side_effects: [],
    });

    const hostileDepth = `${"[".repeat(20_000)}null${"]".repeat(20_000)}`;
    await expect(
      parseSignedApprovalEvidenceV1Json(hostileDepth),
    ).resolves.toMatchObject({
      ok: false,
      errors: [{ code: "signed_approval.input_too_deep", path: "" }],
      side_effects: [],
    });
  });

  it("freezes future operational failures without pretending they are implemented", async () => {
    const fixture = await readSignedApprovalFixture();
    expect(
      fixture.operational_threat_expectations.map(({ expected_error: error }) => error),
    ).toEqual([
      "signed_approval.nonce_replayed",
      "signed_approval.key_revoked",
      "signed_approval.requester_session_revoked",
      "signed_approval.approver_session_revoked",
      "signed_approval.policy_revoked",
      "signed_approval.approval_revoked",
    ]);
  });
});

describe("@lnsat/policy Phase 7c Ed25519 verification primitive", () => {
  it("matches all selected public-only cases under Node 22 pure Ed25519", async () => {
    const vectors = await readEd25519Vectors();
    expect(vectors).toHaveLength(28);
    expect(
      vectors.filter(({ expected_result: result }) => result === "accepted"),
    ).toHaveLength(4);
    expect(
      vectors.filter(({ expected_result: result }) => result === "rejected"),
    ).toHaveLength(24);

    for (const vector of vectors) {
      const result = await verifyEd25519SignaturePrimitiveV1(vector, node22Provider);
      expect(result.accepted, vector.case_id).toBe(
        vector.expected_result === "accepted",
      );
      expect(result.rejection_class, vector.case_id).toBe(vector.rejection_class);
    }
  });

  it("rejects structural failures before calling cryptographic provider", async () => {
    const vectors = await readEd25519Vectors();
    const structuralIds = [
      "spki-present-parameters",
      "padded-base64url",
      "noncanonical-base64url",
    ];
    let providerCalls = 0;
    const provider = (): boolean => {
      providerCalls += 1;
      return true;
    };

    for (const caseId of structuralIds) {
      const vector = vectors.find(({ case_id: id }) => id === caseId);
      if (vector === undefined) throw new Error("structural vector missing");
      const result = await verifyEd25519SignaturePrimitiveV1(vector, provider);
      expect(result.accepted, caseId).toBe(false);
      expect(result.rejection_class, caseId).toBe(vector.rejection_class);
    }
    const positive = vectors[0];
    if (positive === undefined) throw new Error("positive vector missing");
    await expect(
      verifyEd25519SignaturePrimitiveV1({ ...positive, message: "=" }, provider),
    ).resolves.toEqual({
      accepted: false,
      rejection_class: "message_encoding",
    });
    await expect(
      verifyEd25519SignaturePrimitiveV1(
        { ...positive, public_key: "A".repeat(1_000_000) },
        provider,
      ),
    ).resolves.toEqual({
      accepted: false,
      rejection_class: "public_key_encoding",
    });
    await expect(
      verifyEd25519SignaturePrimitiveV1(
        { ...positive, message: "A".repeat(1_398_103) },
        provider,
      ),
    ).resolves.toEqual({
      accepted: false,
      rejection_class: "message_encoding",
    });
    await expect(
      verifyEd25519SignaturePrimitiveV1(
        { ...positive, signature: "A".repeat(1_000_000) },
        provider,
      ),
    ).resolves.toEqual({
      accepted: false,
      rejection_class: "signature_encoding",
    });
    expect(providerCalls).toBe(0);
  });

  it("collapses provider exceptions to closed non-diagnostic rejection", async () => {
    const vector = (await readEd25519Vectors())[0];
    if (vector === undefined) throw new Error("positive vector missing");
    const result = await verifyEd25519SignaturePrimitiveV1(vector, () => {
      throw new Error("hostile-value-that-must-not-escape");
    });
    expect(result).toEqual({
      accepted: false,
      rejection_class: "cryptographic_reject",
    });
    expect(JSON.stringify(result)).not.toContain("hostile-value");

    let providerCalls = 0;
    const hostileInput = new Proxy(vector, {
      get() {
        throw new Error("hostile-input-that-must-not-escape");
      },
    });
    const hostileResult = await verifyEd25519SignaturePrimitiveV1(hostileInput, () => {
      providerCalls += 1;
      return true;
    });
    expect(hostileResult).toEqual({
      accepted: false,
      rejection_class: "cryptographic_reject",
    });
    expect(providerCalls).toBe(0);
    expect(JSON.stringify(hostileResult)).not.toContain("hostile-input");
  });
});

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(join(repoRoot, path), "utf8")) as T;
}

async function readEd25519Vectors(): Promise<Ed25519Vector[]> {
  return (
    await readFile(
      join(repoRoot, "fixtures/contracts/ed25519-verification-v1_0.jsonl"),
      "utf8",
    )
  )
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as Ed25519Vector);
}

function node22Provider(input: Ed25519PublicVerificationInputV1): boolean {
  const publicKey = createPublicKey({
    key: input.public_key_spki_der,
    format: "der",
    type: "spki",
  });
  return verify(null, input.message, publicKey, input.signature);
}

async function readSignedApprovalFixture(): Promise<SignedApprovalFixture> {
  const records = (
    await readFile(
      join(repoRoot, "fixtures/contracts/signed-approval-evidence-v1_0.jsonl"),
      "utf8",
    )
  )
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as SignedApprovalJsonlRecord);
  const first = records[0];
  if (first === undefined) throw new Error("signed approval vectors missing");
  return {
    schema: first.schema,
    provenance: first.provenance,
    vectors: records.filter(
      (record) => record.vector_kind !== "future_operational_negative",
    ),
    operational_threat_expectations: records
      .filter((record) => record.vector_kind === "future_operational_negative")
      .map((record) => ({
        expected_error:
          record.expected_result.errors[0]?.code ??
          "signed_approval.verification_unavailable",
      })),
    jsonl_records: records,
  };
}

type SignedApprovalFixture = {
  schema: string;
  provenance: SignedApprovalProvenance;
  vectors: SignedApprovalVector[];
  operational_threat_expectations: Array<{
    expected_error: SignedApprovalVerificationErrorCode;
  }>;
  jsonl_records: SignedApprovalJsonlRecord[];
};

type SignedApprovalProvenance = {
  private_material_included: boolean;
  runtime_signing_performed: boolean;
  production_signature_verification_performed: boolean;
  error_codes: SignedApprovalVerificationErrorCode[];
};

type SignedApprovalVector = {
  case_id: string;
  raw_evidence_json: string;
  verification_material: ApprovalVerificationMaterialV1;
  expected_validation: "ok" | SignedApprovalVerificationErrorCode;
  expected_result: SignedApprovalVerificationV1;
  expected_canonical_payload_base64url: string;
  expected_preimage_base64url: string;
  expected_payload_digest: string;
  expected_evidence_id: string;
};

type SignedApprovalJsonlRecord = SignedApprovalVector & {
  schema: string;
  vector_kind: string;
  provenance: SignedApprovalProvenance;
};

type Ed25519Vector = {
  case_id: string;
  source: string;
  source_revision: string;
  public_key: string;
  message: string;
  signature: string;
  expected_result: "accepted" | "rejected";
  rejection_class:
    | "none"
    | "public_key_encoding"
    | "message_encoding"
    | "signature_encoding"
    | "cryptographic_reject";
};
