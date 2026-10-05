# DNS — crabminer.com → GitHub Pages

The site is served by GitHub Pages from `crabminer/crabminer`, branch `main`, folder `/`.
Enter these records at the registrar for `crabminer.com`.

| Host | Type | Value |
| --- | --- | --- |
| `@` | A | `185.199.108.153` |
| `@` | A | `185.199.109.153` |
| `@` | A | `185.199.110.153` |
| `@` | A | `185.199.111.153` |
| `@` | AAAA | `2606:50c0:8000::153` |
| `@` | AAAA | `2606:50c0:8001::153` |
| `@` | AAAA | `2606:50c0:8002::153` |
| `@` | AAAA | `2606:50c0:8003::153` |
| `www` | CNAME | `crabminer.github.io.` |
| `_github-pages-challenge-crabminer` | TXT | token from the org's Pages settings |

No CNAME on the apex; it carries the A/AAAA records. The `www` CNAME and the TXT record
name the **`crabminer` organization**, not a personal account. Domain verification
does not transfer between accounts (see yodacon's `docs/DNS.md`).

## Steps

1. Get the verification token at <https://github.com/organizations/crabminer/settings/pages>
   → **Add a domain** → `crabminer.com`. There is no API for this.
2. Enter all records above; click **Verify** once the TXT record resolves.
3. In `crabminer/crabminer` → Settings → Pages: deploy from `main` `/`, custom domain
   `crabminer.com` (matches the repo's `CNAME` file).
4. Tick **Enforce HTTPS** once the certificate issues.

## Verify

    dig +short crabminer.com A
    dig +short crabminer.com AAAA
    dig +short www.crabminer.com CNAME
    dig +short TXT _github-pages-challenge-crabminer.crabminer.com
