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
The full CLI typecheck is not established in the UI-only dependency environment;
CLI-specific dependencies are missing. The complete upstream test suite and a
Kaniko execution have not been validated.

Packaging is a separate logical change: `Dockerfile.relay` retains only upstream's
source relay/UI stages, with the SQLite relay plus web export as its final target.
The original Dockerfile stays unchanged. Optional BuildKit cache mounts are
omitted and unused release-download/docs stages excluded for the Kaniko path.
The web dependency stage includes only the UI and its shared workspace packages;
CLI, website and documentation workspaces are not installed into that build stage.
Pass `BUILDPLATFORM=linux/amd64` and `HAPPIER_BUILD_DB_PROVIDERS=all`: TypeScript
checks statically imported clients for all providers even though runtime is SQLite.
This image does not execute Codex agents or ship a running laptop daemon.

These changes do not introduce a custom Codex transport. Use the normal Happier
shared-control startup and native terminal attachment workflow. Transport
configuration and deployment-specific hostnames, accounts, secrets, and rollout
instructions are deliberately outside this repository.
