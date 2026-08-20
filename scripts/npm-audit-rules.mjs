const HONO_NODE_ADVISORY = "https://github.com/advisories/GHSA-frvp-7c67-39w9";

const ALLOWED_PACKAGES = new Set(["@hono/node-server", "@modelcontextprotocol/node"]);

export function evaluateNpmAudit(report, lock) {
  const errors = [];
  const vulnerabilities = report?.vulnerabilities;

  if (report?.auditReportVersion !== 2 || !isRecord(vulnerabilities)) {
    return {
      ok: false,
      errors: ["Unsupported npm audit JSON schema."],
      allowedAdvisories: [],
    };
  }

  for (const name of Object.keys(vulnerabilities)) {
    if (!ALLOWED_PACKAGES.has(name)) {
      errors.push(`Unexpected vulnerable package: ${name}.`);
    }
  }

  const honoNode = vulnerabilities["@hono/node-server"];
  const mcpNode = vulnerabilities["@modelcontextprotocol/node"];

  if ((honoNode === undefined) !== (mcpNode === undefined)) {
    errors.push(
      "MCP Node and its Hono Node advisory must appear together or not at all.",
    );
  }

  if (honoNode !== undefined) {
    const advisory = Array.isArray(honoNode.via) ? honoNode.via[0] : undefined;
    exact(errors, honoNode.name, "@hono/node-server", "Hono Node name");
    exact(errors, honoNode.severity, "moderate", "Hono Node severity");
    exact(errors, honoNode.isDirect, false, "Hono Node directness");
    exact(errors, honoNode.range, "<2.0.5", "Hono Node range");
    exact(errors, honoNode.fixAvailable, false, "Hono Node fix availability");
    exactArray(
      errors,
      honoNode.nodes,
      ["node_modules/@modelcontextprotocol/node/node_modules/@hono/node-server"],
      "Hono Node install path",
    );
    exactArray(
      errors,
      honoNode.effects,
      ["@modelcontextprotocol/node"],
      "Hono Node effects",
    );
    exact(errors, honoNode.via?.length, 1, "Hono Node advisory count");
    exact(errors, advisory?.source, 1124006, "Hono Node advisory source");
    exact(errors, advisory?.name, "@hono/node-server", "Hono Node advisory name");
    exact(errors, advisory?.severity, "moderate", "Hono Node advisory severity");
    exact(errors, advisory?.range, "<2.0.5", "Hono Node advisory range");
    exact(errors, advisory?.url, HONO_NODE_ADVISORY, "Hono Node advisory URL");

    exact(errors, mcpNode?.name, "@modelcontextprotocol/node", "MCP Node name");
    exact(errors, mcpNode?.severity, "moderate", "MCP Node severity");
    exact(errors, mcpNode?.isDirect, true, "MCP Node directness");
    exact(errors, mcpNode?.range, "*", "MCP Node range");
    exact(errors, mcpNode?.fixAvailable, false, "MCP Node fix availability");
    exactArray(errors, mcpNode?.via, ["@hono/node-server"], "MCP Node advisory path");
    exactArray(
      errors,
      mcpNode?.nodes,
      ["node_modules/@modelcontextprotocol/node"],
      "MCP Node install path",
    );
    exactArray(errors, mcpNode?.effects, [], "MCP Node effects");

    exact(
      errors,
      lock?.packages?.["node_modules/@modelcontextprotocol/node"]?.version,
      "2.0.0",
      "MCP Node locked version",
    );
    exact(
      errors,
      lock?.packages?.[
        "node_modules/@modelcontextprotocol/node/node_modules/@hono/node-server"
      ]?.version,
      "1.19.17",
      "Hono Node locked version",
    );
  }

  return {
    ok: errors.length === 0,
    errors,
    allowedAdvisories:
      honoNode === undefined
        ? []
        : [
            {
              package: "@hono/node-server",
              advisory: HONO_NODE_ADVISORY,
              reason:
                "Upstream MCP Node 2.0.0 pins Hono Node 1.x; LNSAT uses toNodeHandler and never imports serveStatic.",
            },
          ],
  };
}

function exact(errors, actual, expected, label) {
  if (actual !== expected) {
    errors.push(`${label} changed: expected ${json(expected)}, got ${json(actual)}.`);
  }
}

function exactArray(errors, actual, expected, label) {
  if (!Array.isArray(actual) || json(actual) !== json(expected)) {
    errors.push(`${label} changed: expected ${json(expected)}, got ${json(actual)}.`);
  }
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function json(value) {
  return JSON.stringify(value);
}
