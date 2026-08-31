# Changelog

All notable changes to this project will be documented in this file.

The format is based on **[Keep a Changelog](https://keepachangelog.com/en/1.1.0/)**, and this project adheres to **[Semantic Versioning](https://semver.org/spec/v2.0.0.html)**.

---

## [Unreleased]

- **Added**
  - (placeholder)

- **Changed**
  - Bound npm publication to the exact prepared `main` commit after successful push-triggered CI.
  - (placeholder)

- **Fixed**
  - Added exact-commit CI dispatch and disabled package-manager cache finalization in both hosted validation jobs.
  - (placeholder)

- **Security**
  - Removed the npm write-token path, added a fail-closed npm 11.5.1-or-newer OIDC guard, and denied fork PR code access to reviewed CI.
  - Pinned patched transitive npm dependencies to clear the current audit baseline.
  - Moved reviewed CI to explicit GitHub-hosted runners while retaining the same-repository pull-request guard.
  - Added fail-closed source and npm-package admission for the administrative contributor registry and pinned the CI/CD runtime to Node.js 24.18.0 LTS.
  - Updated the release dependency graph to surviving `@plasius/error@1.0.22` and `@plasius/gpu-shared@1.0.14`, and removed an unused vulnerable router development dependency.
  - (placeholder)

## [1.0.20] - 2026-07-11

- **Added**
  - (placeholder)

- **Changed**
  - Refreshed direct runtime and development dependencies to the latest stable published versions available for the repository's compatibility constraints.
  - Retained TypeScript 6.x because the latest `@typescript-eslint/parser` release requires TypeScript `<6.1.0`; TypeScript 7.x is not a reproducible clean-install baseline until that peer range is updated upstream.

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [1.0.19] - 2026-06-22

- **Added**
  - (placeholder)

- **Changed**
  - (placeholder)

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [1.0.18] - 2026-06-22

- **Added**
  - (placeholder)

- **Changed**
  - (placeholder)

- **Fixed**
  - Removed the deprecated direct `@types/uuid` dev dependency because `uuid` now ships its own type definitions.
  - (placeholder)
  - Removed the empty `src/state/gameActions.ts` scaffold and added regression coverage so zero-byte TypeScript placeholders cannot slip back into the published source tree.

- **Security**
  - (placeholder)

## [1.0.15] - 2026-05-13

- **Added**
  - (placeholder)

- **Changed**
  - (placeholder)

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [1.0.14] - 2026-05-13

- **Added**
  - (placeholder)

- **Changed**
  - (placeholder)

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [1.0.13] - 2026-04-02

- **Added**
  - (placeholder)

- **Changed**
  - (placeholder)

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [1.0.12] - 2026-03-04

- **Added**
  - (placeholder)

- **Changed**
  - (placeholder)

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [1.0.8] - 2026-03-01

- **Added**
  - (placeholder)

- **Changed**
  - (placeholder)

- **Fixed**
  - Enforced CommonJS runtime compatibility for dual-build output by generating and validating `dist-cjs/package.json` (`type: commonjs`) during build and package verification.
  - (placeholder)

- **Security**
  - (placeholder)

## [1.0.7] - 2026-03-01

- **Added**
  - (placeholder)

- **Changed**
  - (placeholder)

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [1.0.6] - 2026-02-28

- **Added**
  - (placeholder)

- **Changed**
  - (placeholder)

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [1.0.5] - 2026-02-22

- **Added**
  - (placeholder)

- **Changed**
  - (placeholder)

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [1.0.4] - 2026-02-21

- **Added**
  - (placeholder)

- **Changed**
  - (placeholder)

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [1.0.3] - 2026-02-12

- **Added**
  - Standalone public package scaffold at repository root with independent CI/CD, ADRs, and legal governance assets.

- **Changed**
  - Add dual ESM + CJS build outputs with `exports` entries and CJS artifacts in `dist-cjs/`.

- **Fixed**
  - Removed monorepo-relative TypeScript configuration coupling for standalone builds.

- **Security**
  - Added baseline public package governance and CLA documentation.

---

## Release process (maintainers)

1. Update `CHANGELOG.md` under **Unreleased** with user-visible changes.
2. Bump version in `package.json` following SemVer (major/minor/patch).
3. Move entries from **Unreleased** to a new version section with the current date.
4. Tag the release in Git (`vX.Y.Z`) and push tags.
5. Publish to npm (via CI/CD or `npm publish`).

> Tip: Use Conventional Commits in PR titles/bodies to make changelog updates easier.

---

[Unreleased]: https://github.com/Plasius-LTD/hexagons/compare/v1.0.20...HEAD

## [1.0.0] - 2026-02-11

- **Added**
  - Initial release.

- **Changed**
  - (placeholder)

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)
[1.0.3]: https://github.com/Plasius-LTD/hexagons/releases/tag/v1.0.3
[1.0.4]: https://github.com/Plasius-LTD/hexagons/releases/tag/v1.0.4
[1.0.5]: https://github.com/Plasius-LTD/hexagons/releases/tag/v1.0.5
[1.0.6]: https://github.com/Plasius-LTD/hexagons/releases/tag/v1.0.6
[1.0.7]: https://github.com/Plasius-LTD/hexagons/releases/tag/v1.0.7
[1.0.8]: https://github.com/Plasius-LTD/hexagons/releases/tag/v1.0.8
[1.0.12]: https://github.com/Plasius-LTD/hexagons/releases/tag/v1.0.12
[1.0.13]: https://github.com/Plasius-LTD/hexagons/releases/tag/v1.0.13
[1.0.14]: https://github.com/Plasius-LTD/hexagons/releases/tag/v1.0.14
[1.0.15]: https://github.com/Plasius-LTD/hexagons/releases/tag/v1.0.15
[1.0.18]: https://github.com/Plasius-LTD/hexagons/releases/tag/v1.0.18
[1.0.19]: https://github.com/Plasius-LTD/hexagons/releases/tag/v1.0.19
[1.0.20]: https://github.com/Plasius-LTD/hexagons/releases/tag/v1.0.20
