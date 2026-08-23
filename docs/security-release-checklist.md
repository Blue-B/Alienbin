# Security Release Checklist

Context: the v1 TTL defect is published as
[GHSA-hqvr-6v89-gwff / CVE-2026-31827](https://github.com/Blue-B/Alienbin/security/advisories/GHSA-hqvr-6v89-gwff)
with **patched versions: none**. After shipping v2, update the advisory so scanners and
audiences see the fix.

## Steps (manual, operator actions on GitHub)

1. Verify the release actually exists and passes CI:
   - `git tag v2.0.0` exists locally after all tests pass (the repo does not auto-push tags).
   - Push the branch and tag only after final review.
   - GitHub Actions workflow (`.github/workflows/ci.yml`) is green on the release commit.
2. Open the advisory:
   `https://github.com/Blue-B/Alienbin/security/advisories/GHSA-hqvr-6v89-gwff`
3. Edit "Patched versions" → add `2.0.0`.
4. In "Affected versions", keep `<= 1.0.0` as the vulnerable range.
5. Update the description's Remediation section to reference the actual fix:
   - per-record `expires_at` column (`migrations/0001_initial.sql`)
   - expiry enforced in every read path (`src/worker/repositories/paste-repository.ts`)
   - regression test proving TTL isolation (`tests/`, TTL isolation suite)
   - link to `docs/adr/adr-002-per-record-expires-at.md`
6. Publish/update the advisory; confirm CVE-2026-31827 metadata reflects the fixed version
   (GitHub propagates to the NVD feed automatically for reviewed advisories).
7. Cross-check: the README section "TTL isolation and CVE fix" links to this checklist.

## Do NOT

- Do not mark 1.x as patched.
- Do not close the advisory before a tagged release exists — an untagged claim is not
  verifiable by third parties.
