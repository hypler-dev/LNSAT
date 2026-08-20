# LNSAT Documentation

- Status: current documentation entry point

Documentation covers current source, contributor workflows, experimental
implementation notes, and future architecture proposals.

Read [claims and maturity vocabulary](CLAIMS_AND_MATURITY.md) before treating
`implemented`, `experimental`, `planned`, `public source`, or `supported` as
equivalent states. They are deliberately distinct.

Start with [documentation index](DOCS_INDEX.md). New contributors should read:

1. [Project status](PROJECT_STATUS.md)
2. [Claims and maturity vocabulary](CLAIMS_AND_MATURITY.md)
3. [Product build sequence](PRODUCT_BUILD_SEQUENCE.md)
4. [Architecture and developer guide](architecture/ARCHITECTURE_AND_DEVELOPER_GUIDE.md)
5. [Local development](LOCAL_DEVELOPMENT.md)
6. [Contributing](../CONTRIBUTING.md)

Use [architecture catalog](architecture/README.md) to distinguish current source
from proposals. Use [SDK overview](sdk/README.md) for repository-local contract
documentation.

## Product Direction

Read:

1. [Product build sequence](PRODUCT_BUILD_SEQUENCE.md) for preserved v1 goal,
   current phase truth, and exact product/build/release order;
2. [ADR-0002](architecture/ADR-0002_AUTHORITY_LAYER_AND_V1_DISTRIBUTION.md)
   for authority lifecycle, fourteen-phase v1, and mandatory distribution;
3. [ADR-0003](architecture/ADR-0003_OPEN_CORE_EXTENSIONS_AND_MANAGEMENT_PLANE.md)
   for open-core, downstream repository, managed-agent-content, model, module,
   UI, and OS CLI boundaries;
4. [ADR-0007](architecture/ADR-0007_DOCKER_FIRST_RUNTIME_NEUTRAL_ENFORCEMENT.md)
   for Docker-first integration, runtime-neutral authority, monotonic
   configuration, and emergency-stop boundaries;
5. [Product direction alignment](reference/PRODUCT_DIRECTION_ALIGNMENT.md) for
   canonical decisions and documentation coverage;
6. [Project status](PROJECT_STATUS.md) before treating any planned behavior as
   implemented.
