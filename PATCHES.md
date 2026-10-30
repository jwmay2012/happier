# Native Codex compatibility and source relay build

Base: upstream0.2.17, `a2c45c86804b24e60ac0b76146a3ef36dfcaa15b`.
The public-reasoning projection is a narrow backport from upstream
`a23725528108c941778398ce0a5f3a0d1190f4a5`; unrelated development changes are excluded.
Branch: `release/0.2.17-compat`. Changes are kept separate from upstream to support
rebasing and individual review.

The application changes address independently reproduced compatibility defects:

- Direct-session takeover status resolves independently of history loading,
  with coalesced polling and stale-owner protection.
- Codex native history preserves mixed media references and informational
  activity records, including future unprojectable kinds. Malformed records
  still fail. Opaque reasoning and hook prompts retain their existing treatment.
- Live/native user and assistant identities reconcile without text deduplication.
  Tool boundaries retain cumulative assistant/reasoning text. Late user echoes
  advance sequence/delivery state without duplicating rows or stealing pending
  custody from the server.

Validation included focused CLI and takeover-hook tests, UI-store arrival/batch
cases, streaming across tool boundaries, refresh, and full history import. The
release-based source relay image builds, including the server typecheck and Expo
web export, and passes two-account isolation and mobile-width signup. Full UI
typecheck passes with the complete source checkout and build dependencies.
The full CLI typecheck and source CLI build also pass with the complete dependency
installation. The complete upstream test suite and a Kaniko execution have not
been validated.

Packaging is a separate logical change: `Dockerfile.relay` retains only upstream's
source relay/UI stages, with the SQLite relay plus web export as its final target.
The original Dockerfile stays unchanged. Optional BuildKit cache mounts are
omitted and unused release-download/docs stages excluded for the Kaniko path.
The web dependency stage includes only the UI and its shared workspace packages;
CLI, website and documentation workspaces are not installed into that build stage.
Pass `BUILDPLATFORM=linux/amd64` and `HAPPIER_BUILD_DB_PROVIDERS=all`: TypeScript
checks statically imported clients for all providers even though runtime is SQLite.
This image does not execute Codex agents or ship a running laptop daemon.

The source relay image disables web analytics and crash reporting through the
existing build feature policy (`app.analytics,app.crashReports`). Expo build
telemetry and central server Sentry reporting are disabled as well. Deployments
should leave both `SENTRY_DSN` and `HAPPIER_SENTRY_DSN` empty. This does not disable
local operational logs or encrypted synchronization with the selected relay.

For the CLI, `HAPPIER_EXTERNAL_NETWORK_ACCESS=0` suppresses provider/helper latest
version lookups, passive hosted-Git authentication checks, outbound notifications,
capability installation and automatic prerequisite/runtime downloads. Existing
local runtimes remain usable. The restriction and supported reporting/feature
settings propagate to daemon-spawned terminal runners, including tmux. Combine
this with `HAPPIER_CLI_UPDATE_CHECK=0`, denied bug-report/voice/connected-service/
bridge features, disabled memory indexing and empty remote-debug logging settings.
It is an application policy for these paths, not an OS firewall for child agents;
provider processes and intentional agent tools retain their own network access.

These changes do not introduce a custom Codex transport. Use the normal Happier
shared-control startup and native terminal attachment workflow. Transport
configuration and deployment-specific hostnames, accounts, secrets, and rollout
instructions are deliberately outside this repository.

The web new-session modal delegates keyboard avoidance to Expo Router's drawer.
Its simple and wizard composers suppress their second keyboard lift; native
layouts keep the existing behavior. A production-browser viewport test reproduced
the prompt moving above the screen before the change and remaining visible after
it, including keyboard dismissal. UI typecheck and13 related tests pass.

The web session composer also subtracts navigation space already reserved below
its keyboard scaffold, matching the native calculation. Keyboard visibility and
available editor height retain the absolute keyboard measurement. The shared
helper keeps its native worklet annotation;50 web/native geometry tests and the
UI typecheck pass.

Table cells containing inline links or formatting now use the existing enriched
Markdown renderer; unchanged plain cells retain their lightweight text path.
Original cell Markdown reaches the rich parser unchanged, preserving globs,
literal code and complete URL destinations. Real-renderer regression coverage
includes nested bold links, parenthesized URLs, safe link activation and unsafe
target rejection. Existing table scrolling, alignment and copying tests pass.
