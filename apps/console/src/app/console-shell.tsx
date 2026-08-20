import * as React from "react";
import {
  consoleFixtureContracts,
  consoleOperationReadback,
  consoleSections,
  consoleSyntheticOperationProjection,
  type ConsoleSection,
} from "../lib/console-model.js";
import { OperationReadbackClient } from "./operation-readback-client.js";

export function ConsoleShell({
  section,
}: {
  section?: ConsoleSection;
}): React.ReactElement {
  return (
    <div className="console-shell">
      <aside>
        <a className="brand" href="/">
          <span>L</span>
          LNSAT
        </a>
        <nav aria-label="Console navigation">
          <a href="/">Dashboard</a>
          {consoleSections.map((item) => (
            <a
              aria-current={section?.slug === item.slug ? "page" : undefined}
              href={`/${item.slug}`}
              key={item.slug}
            >
              {item.title}
            </a>
          ))}
        </nav>
        <p className="boundary">
          Read-only evidence console. Live operation load requires active local session.
        </p>
      </aside>
      <main>{section ? <SectionView section={section} /> : <Dashboard />}</main>
    </div>
  );
}

function Dashboard(): React.ReactElement {
  return (
    <>
      <Header
        eyebrow="Control Center"
        title="Govern agent actions before execution."
        summary="Inspect intent, policy, approvals, and evidence through source contracts. Most panels use synthetic fixtures; operations can explicitly load read-only same-origin Gateway evidence. No console route mutates or dispatches."
      />
      <section className="metrics" aria-label="Contract fixture posture">
        <Metric label="Packet" value={consoleFixtureContracts.packet_type} />
        <Metric label="Policy" value={consoleFixtureContracts.policy_decision} />
        <Metric label="Audit" value={consoleFixtureContracts.audit_event_type} />
        <Metric label="Side effects" value="0" />
      </section>
      <section className="cards" aria-label="Console sections">
        {consoleSections.map((item) => (
          <a href={`/${item.slug}`} key={item.slug}>
            <span>{item.status}</span>
            <h2>{item.title}</h2>
            <p>{item.summary}</p>
          </a>
        ))}
      </section>
    </>
  );
}

function SectionView({ section }: { section: ConsoleSection }): React.ReactElement {
  return (
    <>
      <Header
        eyebrow="Product fixture"
        title={section.title}
        summary={section.summary}
      />
      <section className="panel">
        <div className="panel-head">
          <h2>Current signals</h2>
          <span>{section.status}</span>
        </div>
        <ul>
          {section.signals.map((signal) => (
            <li key={signal}>{signal}</li>
          ))}
        </ul>
      </section>
      {section.slug === "operations" ? (
        <>
          <OperationReadbackClient />
          <FixtureOperationReadback />
        </>
      ) : null}
      <section className="boundary-panel">
        <h2>Boundary</h2>
        <p>
          Mutation controls: {section.mutation_controls.length}. Side effects:{" "}
          {section.side_effects.length}. Live dispatch, networking, database writes,
          provider calls, and secret access remain unavailable.
        </p>
      </section>
    </>
  );
}

function FixtureOperationReadback(): React.ReactElement {
  return (
    <section className="panel" aria-label="Synthetic operation reconciliation fixtures">
      <div className="panel-head">
        <h2>Synthetic reconciliation fixtures</h2>
        <span>
          {consoleSyntheticOperationProjection.source_kind} ·{" "}
          {consoleOperationReadback.source}
        </span>
      </div>
      <ul>
        {consoleOperationReadback.operations.map((operation) => (
          <li key={operation.operation_id}>
            <strong>{operation.presentation_state}</strong>{" "}
            <span>{operation.operation_id}</span>{" "}
            <button disabled={!operation.retry.button_enabled} type="button">
              Retry disabled: {operation.retry.disabled_reason}
            </button>
          </li>
        ))}
      </ul>
      <p>
        Timeout and cancellation remain ambiguous. Non-execution requires verified
        Gateway receipt. Frontend cannot authorize or dispatch.
      </p>
    </section>
  );
}

function Header({
  eyebrow,
  title,
  summary,
}: {
  eyebrow: string;
  title: string;
  summary: string;
}): React.ReactElement {
  return (
    <header className="page-header">
      <p>{eyebrow}</p>
      <h1>{title}</h1>
      <span>{summary}</span>
    </header>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}): React.ReactElement {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
