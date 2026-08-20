function compact(value) {
  return value.replace(/\s+/gu, " ").trim();
}

function splitSentences(value) {
  return compact(value).split(/(?<=[.!?;])\s+/u);
}

function splitClauses(value) {
  return splitSentences(value).flatMap((sentence) =>
    sentence
      .split(
        /\s*(?:,\s*(?:while|but|and)\s+|;\s*|\bwhile\b|\bbut\b|\band\b(?=\s+(?:phase\s+\d+|p7-[a-z]\d|(?:release\s+|final\s+)?publication|publishing|packag(?:e|es|ing)|binar(?:y|ies)|candidate\b|lnsat\b|current\b|production[- ]sign(?:ing|ed)?\b)))\s*/iu,
      )
      .map((clause) => clause.trim())
      .filter(Boolean),
  );
}

function hasLeadingNo(clause) {
  return /^(?:[-*]\s+)?no\b/iu.test(clause);
}

const buildSubject =
  /\b(?:phase\s+14|candidate(?:[ -](?:build|artifact))s?|candidate\s+artifacts?|packag(?:e|es|ing)|package\s+work|binar(?:y|ies)|artifact\s+builds?)\b/iu;
const publicationSubject = /\b(?:publication|publish(?:ed|ing)?)\b/iu;
const currentState =
  /\b(?:is|are)\s+(?:now\s+|currently\s+|already\s+)?(?:authorized|approved|allowed|permitted|open|executable|underway|active|in\s+progress)\b|\b(?:has|have)\s+(?:already\s+)?(?:begun|started|commenced)\b/iu;
const currentModalAction =
  /\b(?:may|might|can|could|should|must|shall|will)\s+(?:now|currently|immediately|today|already)\s+(?:begin|start|proceed|commence|be\s+built|be\s+produced|be\s+packaged|be\s+published|publish)\b|\b(?:may|might|can|could|should|must|shall|will)\s+(?:begin|start|proceed|commence|be\s+built|be\s+produced|be\s+packaged|be\s+published|publish)\s+(?:right\s+)?(?:now|currently|immediately|today|already)\b|^(?:now|currently|immediately|today|already)\b[^.!?;]{0,80}\b(?:may|might|can|could|should|must|shall|will)\s+(?:begin|start|proceed|commence|be\s+built|be\s+produced|be\s+packaged|be\s+published|publish)\b/iu;

function tableValue(value, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const regex = new RegExp(`^\\|\\s*${escaped}\\s*\\|\\s*([^|]+)\\|`, "imu");
  const row = value.match(regex);
  return row ? compact(row[1]).toLowerCase() : "";
}

function hasCurrentMaturityContradiction(value) {
  const lnsatClaim =
    /\blnsat(?:\s+`?0\.1\.0`?)?\s+(?:is|is now|has become)\s+(?:supported|published|released|shipped|available|production[- ]ready|generally\s+available|ga)\b/iu;
  const currentClaim =
    /\bcurrent\s+(?:maturity|product|release|runtime|software|status)\b[^.!?;]{0,40}\b(?:is|are|has become)\s+(?:now\s+)?(?:supported|published|released|shipped|available|production[- ]ready|generally\s+available|ga)\b/iu;
  const surfaceClaim =
    /\b(?:distribution|hosted runtime)\b\s+(?:is|is now|are|are now|has become)\s+available\b/iu;
  return splitClauses(value).some(
    (sentence) =>
      lnsatClaim.test(sentence) ||
      currentClaim.test(sentence) ||
      surfaceClaim.test(sentence),
  );
}

function hasEarlyBuildClaim(value) {
  const beforePhase13 =
    /\b(?:before|ahead\s+of|prior\s+to)\s+(?:required\s+)?phase\s+13\b/iu;
  const phase14Precedes13 =
    /\bphase\s+14\b[^.!?;]{0,60}\b(?:may|might|can|could|should|must|shall|will|would|does)?\s*precede(?:s|d)?\s+phase\s+13\b/iu;
  const affirmativeAction =
    /\b(?:may|might|can|could|should|must|shall|will)\s+(?:begin|start|proceed|commence|precede|be\s+built|be\s+produced|be\s+packaged)\b|(?<!not\s)(?<!never\s)(?<!n't\s)\b(?:begins?|starts?|proceeds?|commences?|precedes?)\b|\b(?:is|are)\s+(?:allowed|permitted|authorized)\b/iu;
  return splitClauses(value).some(
    (clause) =>
      buildSubject.test(clause) &&
      ((beforePhase13.test(clause) && affirmativeAction.test(clause)) ||
        phase14Precedes13.test(clause)) &&
      !hasLeadingNo(clause),
  );
}

function hasCurrentBuildClaim(value) {
  return splitClauses(value).some(
    (clause) =>
      buildSubject.test(clause) &&
      (currentState.test(clause) || currentModalAction.test(clause)) &&
      !hasLeadingNo(clause),
  );
}

function hasEarlyPublicationClaim(value) {
  const beforePhase14 =
    /\b(?:before|ahead\s+of|prior\s+to)\s+(?:required\s+)?phase\s+14\b/iu;
  const affirmativeAction =
    /\b(?:may|might|can|could|should|must|shall|will)\s+(?:begin|start|proceed|publish|be\s+published)\b|(?<!not\s)(?<!never\s)(?<!n't\s)\b(?:begins?|starts?|proceeds?|publishes?)\b|\b(?:is|are)\s+(?:allowed|permitted|authorized)\b/iu;
  return splitClauses(value).some(
    (clause) =>
      publicationSubject.test(clause) &&
      beforePhase14.test(clause) &&
      affirmativeAction.test(clause) &&
      !hasLeadingNo(clause),
  );
}

function hasCurrentPublicationClaim(value) {
  return splitClauses(value).some(
    (clause) =>
      publicationSubject.test(clause) &&
      (currentState.test(clause) || currentModalAction.test(clause)) &&
      !hasLeadingNo(clause),
  );
}

function hasForbiddenPacketState(value) {
  const packetTerms = /\b(?:phase\s+12|p7-k1|p7-s1|p7-v1|p7-i1)\b/iu;
  const affirmativeState =
    /\b(?:(?:is|are|becomes?|became|remains?|must be|shall be|will be|may be)\s+(?:now\s+)?|now\s+)(?:required|mandatory|needed|necessary|an?\s+prerequisite|on\s+(?:the\s+)?critical\s+path|open|granted|enabled|unblocked|release-?blocking)\b|\b(?:now\s+)?blocks?\s+(?:initial\s+)?local\s+v1\b/iu;
  const selectedCondition =
    /\b(?:only\s+if|if|unless|when)\b(?:(?!\bnot\b)[^.!?;]){0,80}\bseparately\s+selected\b/iu;
  return splitClauses(value).some((sentence) => {
    return (
      packetTerms.test(sentence) &&
      affirmativeState.test(sentence) &&
      !selectedCondition.test(sentence)
    );
  });
}

function hasPhase10LifecycleOrderingViolation(value) {
  const phase10Regex = /\bphase\s+10\b/iu;
  const lifecycleRegex = /\b(?:lifecycle|proof)\b/iu;
  const targetRegex =
    /\b(?:selected[ -](?:targets?|profiles?)|canonical[ -](?:targets?|profiles?)|selected\s+canonical[ -]?targets?)\b/iu;
  const affirmativeOrdering =
    /(?<!not\s)(?<!never\s)(?<!n't\s)\b(?:owns?|ownership|requires?|mandates?|responsible\s+for)\b|\b(?:must|shall|will)\s+(?!not\b)/iu;

  return splitClauses(value).some((clause) => {
    return (
      phase10Regex.test(clause) &&
      lifecycleRegex.test(clause) &&
      targetRegex.test(clause) &&
      affirmativeOrdering.test(clause) &&
      !hasLeadingNo(clause)
    );
  });
}

function hasProductionSigningContradiction(value) {
  const signing = /\bproduction[- ]sign(?:ing|ed)?\b/iu;
  const beforeProof =
    /\b(?:before|ahead\s+of|prior\s+to)\s+(?:phase\s+14\s+)?proof\b|\b(?:before|ahead\s+of|prior\s+to)\s+phase\s+14\b/iu;
  const changedArtifact =
    /\b(?:rebuilt|changed|modified|different|differ(?:s|ed)?|new)\b[^.!?;]{0,80}\b(?:artifact|artifacts|bytes?|digests?)\b|\b(?:artifact|artifacts|bytes?|digests?)\b[^.!?;]{0,80}\b(?:rebuilt|changed|modified|different|differ(?:s|ed)?)\b/iu;
  const proof = /\b(?:phase\s+14|proven|proof)\b/iu;
  const affirmativeSigning =
    /\b(?:may|might|can|could|should|must|shall|will)\s+production[- ]sign\b|\b(?:may|might|can|could|should|must|shall|will)\s+be\s+production[- ]signed\b|\bproduction[- ]sign(?:ing|ed)?\s+(?:is|are)\s+(?:authorized|allowed|permitted|underway|active)\b|\bproduction[- ]signing\s+(?:may|might|can|could|should|must|shall|will)\s+(?:begin|start|proceed|cover|include|sign)\b/iu;
  const currentSigning =
    /\bproduction[- ]sign(?:ing|ed)?\b[^.!?;]{0,40}\b(?:is|are)\s+(?:now\s+|currently\s+|already\s+)?(?:authorized|allowed|permitted|underway|active|in\s+progress)\b|\b(?:may|might|can|could|should|must|shall|will)\s+(?:now\s+|currently\s+|already\s+)?(?:production[- ]sign|be\s+production[- ]signed)\s+(?:now|currently|immediately|today|already)\b|\bproduction[- ]signing\s+(?:may|might|can|could|should|must|shall|will)\s+(?:begin|start|proceed)\s+(?:now|currently|immediately|today|already)\b/iu;
  return splitClauses(value).some(
    (clause) =>
      signing.test(clause) &&
      (currentSigning.test(clause) ||
        (affirmativeSigning.test(clause) &&
          (beforeProof.test(clause) ||
            (changedArtifact.test(clause) && proof.test(clause))))) &&
      !hasLeadingNo(clause),
  );
}

function hasVisibilityMaturityCollapse(value) {
  const visibility =
    /\b(?:public\s+(?:repository|source)|making\s+(?:the\s+)?(?:repository|source)\s+public|(?:repository|source)\s+(?:visibility|becomes?\s+public)|visibility\s+(?:change|cutover))\b/iu;
  const collapse =
    /\b(?:means?|makes?|establishes?|constitutes?|proves?|creates?|becomes?|is(?:\s+equivalent\s+to)?)\b[^.!?;]{0,80}\b(?:supported\s+(?:release|product|runtime|package|artifact)|production[- ]ready|production\s+use|published\s+artifacts?|stable\s+compatibility|support\s+commitment)\b/iu;
  const negatedCollapse =
    /\b(?:(?:(?:do|does|will|would|can|could|may|might|must|shall|is|are)\s+not|(?:doesn|won|wouldn|can|couldn|mayn|mightn|mustn|shalln|isn|aren)['’]t|never)\s+(?:mean|make|establish|constitute|prove|create|become|be\s+equivalent\s+to)|(?:is|are)\s+not\s+(?:an?\s+)?(?:supported\s+(?:release|product|runtime|package|artifact)|production[- ]ready|production\s+use|published\s+artifacts?|stable\s+compatibility|support\s+commitment))\b/iu;
  return splitClauses(value).some(
    (clause) =>
      visibility.test(clause) && collapse.test(clause) && !negatedCollapse.test(clause),
  );
}

export function collectBuildSequenceErrors(readSource) {
  const semanticErrors = [];
  const status = readSource("docs/PROJECT_STATUS.md");
  const roadmap = readSource("docs/ROADMAP.md");
  const sequence = readSource("docs/PRODUCT_BUILD_SEQUENCE.md");
  const releasing = readSource("docs/RELEASING.md");
  const publicReadiness = readSource("docs/PUBLIC_READINESS.md");
  const claims = readSource("docs/CLAIMS_AND_MATURITY.md");
  const alignment = readSource("docs/reference/PRODUCT_DIRECTION_ALIGNMENT.md");
  const distributionValue = tableValue(status, "Distribution");
  const hostedRuntimeValue = tableValue(status, "Hosted runtime");
  const requiredPath =
    "Phase 8 -> Phase 9 -> Phase 10 -> Phase 11 -> Phase 13 -> Phase 14";
  const roadmapCompact = compact(roadmap);
  const sequenceCompact = compact(sequence);

  if (
    !status.includes("LNSAT `0.1.0` is pre-release, source-only software.") ||
    hasCurrentMaturityContradiction(status) ||
    distributionValue !== "not available" ||
    hostedRuntimeValue !== "not available" ||
    !/\|\s*Distribution\s*\|\s*Not available\s*\|/u.test(status) ||
    !/\|\s*Hosted runtime\s*\|\s*Not available\s*\|/u.test(status)
  ) {
    semanticErrors.push(
      "current maturity must remain source-only/unpublished with distribution and hosted runtime unavailable",
    );
  }

  if (
    !compact(publicReadiness).includes(
      "Public source may precede `v1.0.0`. It grants no package, binary, container, installer, hosted endpoint, production-use, compatibility, or support claim.",
    ) ||
    !compact(releasing).includes(
      "Public repository source and supported release artifacts are separate events.",
    ) ||
    !roadmapCompact.includes(
      "Repository source visibility is a separate pre-release decision governed by",
    ) ||
    !sequenceCompact.includes(
      "Public repository source is separate from release publication.",
    ) ||
    !compact(claims).includes(
      "Making source public does not publish `lnsatd`, `lnsatctl`, `lnsat`, an OCI image, package, installer, hosted endpoint, or production guarantee.",
    )
  ) {
    semanticErrors.push(
      "public repository source must remain separate from artifact release and support",
    );
  }

  if (
    !roadmapCompact.includes(`Required path is ${requiredPath}.`) ||
    !sequenceCompact.includes(`Current required sequence is **${requiredPath}**.`) ||
    !roadmapCompact.includes(
      "After required Phases 8, 9, 10, 11, and 13 pass, one explicit candidate-build",
    )
  ) {
    semanticErrors.push(
      "Phase 14 packaging must follow required Phases 8, 9, 10, 11, and 13",
    );
  }

  const phase14Index = roadmap.indexOf(
    "### 14. Canonical Artifacts, Thin Distribution, and Compatibility Evidence",
  );
  const publicationIndex = roadmap.indexOf("## Publication Gate");
  if (
    phase14Index < 0 ||
    publicationIndex <= phase14Index ||
    !roadmapCompact.includes("Release publication follows Phase 14.") ||
    !roadmapCompact.includes(
      "remain separately gated by explicit go/no-go authorization.",
    ) ||
    !compact(releasing).includes(
      "After Phase 14 passes, obtain separate final go/no-go authorization.",
    ) ||
    !compact(releasing).includes("Production-sign unchanged proven digests")
  ) {
    semanticErrors.push(
      "publication must follow Phase 14 under separate explicit authorization",
    );
  }

  const alignmentCompact = compact(alignment);
  if (
    !roadmapCompact.includes(
      "Optional signed-evidence packets `P7-K1/S1/V1/I1` stay blocked and ungranted.",
    ) ||
    !sequenceCompact.includes(
      "P7-K1, P7-S1, P7-V1, and P7-I1 remain optional, blocked, and nonblocking",
    ) ||
    !alignmentCompact.includes(
      "Phase 12 and `P7-K1/S1/V1/I1` remain optional, blocked, ungranted, and nonblocking unless separately selected.",
    )
  ) {
    semanticErrors.push(
      "optional signed packets must remain blocked/ungranted and nonblocking",
    );
  }
  if (
    !roadmapCompact.includes(
      "Phase 14 owns lifecycle proof on each later-selected canonical target.",
    )
  ) {
    semanticErrors.push(
      "phase 14 lifecycle-proof ownership marker must remain in roadmap",
    );
  }
  if (hasPhase10LifecycleOrderingViolation(roadmap)) {
    semanticErrors.push(
      "Phase 10 lifecycle proof claims must not precede Phase 14 target selection",
    );
  }

  const semanticPaths = [
    "README.md",
    "docs/PROJECT_STATUS.md",
    "docs/ROADMAP.md",
    "docs/PRODUCT_BUILD_SEQUENCE.md",
    "docs/RELEASING.md",
    "docs/PUBLIC_READINESS.md",
    "docs/CLAIMS_AND_MATURITY.md",
    "docs/reference/PRODUCT_DIRECTION_ALIGNMENT.md",
    "docs/architecture/DISTRIBUTION_AND_CLIENT_INSTALLERS.md",
  ];
  for (const path of semanticPaths) {
    const value = readSource(path);
    if (hasEarlyBuildClaim(value)) {
      semanticErrors.push(`candidate/package/binary build contradiction in ${path}`);
    }
    if (hasCurrentBuildClaim(value)) {
      semanticErrors.push(
        `current candidate/package/binary authorization contradiction in ${path}`,
      );
    }
    if (hasEarlyPublicationClaim(value)) {
      semanticErrors.push(`publication contradiction in ${path}`);
    }
    if (hasCurrentPublicationClaim(value)) {
      semanticErrors.push(`current publication authorization contradiction in ${path}`);
    }
    if (hasProductionSigningContradiction(value)) {
      semanticErrors.push(`production-signing proof contradiction in ${path}`);
    }
    if (hasVisibilityMaturityCollapse(value)) {
      semanticErrors.push(
        `repository visibility/source maturity contradiction in ${path}`,
      );
    }
  }
  if (
    hasForbiddenPacketState(roadmap) ||
    hasForbiddenPacketState(sequence) ||
    hasForbiddenPacketState(alignment)
  ) {
    semanticErrors.push(
      "optional signed packets must remain blocked, ungranted, and nonblocking",
    );
  }

  return semanticErrors;
}
