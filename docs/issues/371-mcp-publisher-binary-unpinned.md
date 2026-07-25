# 371 — `mcp-publisher` Binary Downloaded Unpinned and Unverified

**Type:** Maintenance  
**Priority:** Medium  
**Area:** `infra`  
**Status:** Open

## Description

The MCP publish workflow fetches an executable from a mutable URL, pipes it straight
into `tar`, and runs it — all in the same job that holds `MCP_PRIVATE_KEY`:

```yaml
- name: Install mcp-publisher
  run: |
    curl -L "https://github.com/modelcontextprotocol/registry/releases/latest/download/mcp-publisher_$(...).tar.gz" | tar xz mcp-publisher
```

`releases/latest` resolves at run time, so the binary can change between runs without
any change on our side. There is no checksum check and no signature check, so a
compromised or simply broken upstream release runs with our signing key in scope.

Fix direction:

- Pin an explicit release tag instead of `latest` (e.g. `download/v1.2.3/...`).
- Record the expected SHA-256 and verify it before extracting.
- Download to a file first rather than piping the network stream into `tar`, so a
  truncated or substituted payload fails at the checksum step rather than being
  partially extracted and executed.
- Consider splitting the job so the download/verify step does not run in the same
  job as the one holding the publishing secret.

Related: [370](./370-mcp-private-key-on-command-line.md) covers the secret handling
in the same workflow.

## Steps to Reproduce

Static — inspect `.github/workflows/publish-mcp.yml:25-27`. The URL contains
`releases/latest`, and no `sha256sum -c` or signature verification follows.

## Affected Files

- `.github/workflows/publish-mcp.yml`

## Acceptance Criteria

- [ ] `mcp-publisher` version pinned to an explicit release tag
- [ ] Downloaded archive verified against a recorded SHA-256 before extraction
- [ ] Archive written to disk and verified before anything is extracted or executed
- [ ] A documented note on how to bump the pinned version
