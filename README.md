# @plasius/hexagons

[![npm version](https://img.shields.io/npm/v/@plasius/hexagons.svg)](https://www.npmjs.com/package/@plasius/hexagons)
[![Build Status](https://img.shields.io/github/actions/workflow/status/Plasius-LTD/hexagons/ci.yml?branch=main&label=build&style=flat)](https://github.com/Plasius-LTD/hexagons/actions/workflows/ci.yml)
[![coverage](https://img.shields.io/codecov/c/github/Plasius-LTD/hexagons)](https://codecov.io/gh/Plasius-LTD/hexagons)
[![License](https://img.shields.io/github/license/Plasius-LTD/hexagons)](./LICENSE)
[![Code of Conduct](https://img.shields.io/badge/code%20of%20conduct-yes-blue.svg)](./CODE_OF_CONDUCT.md)
[![Security Policy](https://img.shields.io/badge/security%20policy-yes-orange.svg)](./SECURITY.md)
[![Changelog](https://img.shields.io/badge/changelog-md-blue.svg)](./CHANGELOG.md)

Public package containing hexagonal architecture utilities and game/domain helpers for Plasius applications.

Primary demo surface name: **Generator**.


## Install

```bash
npm install @plasius/hexagons
```

## Module formats

This package publishes dual ESM and CJS artifacts.
When CJS output is emitted under `dist-cjs/*.js` with `type: module`, `dist-cjs/package.json` is generated with `{ "type": "commonjs" }` to ensure Node `require(...)` compatibility.


## Usage

```ts
import { worldMap } from "@plasius/hexagons";
```

The supported public API is the root module export from `src/index.ts`. Internal
`src/state/*` files are implementation details unless they are explicitly
re-exported.

## Development

```bash
npm install
npm run build
npm test
```

## Governance

- Security policy: [SECURITY.md](./SECURITY.md)
- Code of conduct: [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)
- ADRs: [docs/adrs](./docs/adrs)
- Legal docs: [legal](./legal)

## License

MIT

<!-- BEGIN PLASIUS RELEASE INTEGRITY -->
## Release integrity

CI keeps the administrative contributor registry outside Git and npm package
artifacts using exact, case-normalised path checks. CI runs on approved
GitHub-hosted runners for same-repository pull requests and `main`, with
package-manager cache finalization disabled; fork PR code is denied.
Publication uses the GitHub-hosted `production` job with Node 24 and a pinned
npm 11.6.2 client. It is token-free and proceeds only while the prepared SHA
is the exact `main` head after successful push-triggered CI. Do not dispatch CD
until the npm trusted-publisher binding is verified.
<!-- END PLASIUS RELEASE INTEGRITY -->

## Automatic npm releases

Run `.github/workflows/cd.yml` on `main` with `phase=prepare` and the intended
version bump. The schema-template pipeline prepares release metadata through a
pull request, waits for CI on that exact main commit, then publishes the sealed
package through npm trusted publishing in the `production` environment.
Normal privacy, audit, tests, coverage and artifact checks run automatically.
No separate release-owner or dependency-coordination admission is required.

`npm run privacy:check` checks repository path metadata. `npm run test:privacy`
tests the policy and release contract. `npm run pack:check` checks the package
against the reviewed inventory in `scripts/package-artifacts.json`; update that
inventory deliberately when public package files change. Add real notes under
`Unreleased`; only the release pipeline promotes them to a versioned section.

`npm run build` copies the required game CSS module into both ESM and CommonJS
outputs using Node. A missing source or failed copy stops the build, and
`npm run pack:check` requires both built copies in the package inventory.
