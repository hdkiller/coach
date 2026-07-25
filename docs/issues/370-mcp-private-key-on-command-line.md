# 370 — MCP Registry Private Key Passed on the Command Line

**Type:** Bug  
**Priority:** High  
**Area:** `infra`  
**Status:** Open

## Description

The MCP publish workflow interpolates the signing key directly into a `run:` string:

```yaml
- name: Authenticate to MCP Registry
  run: ./mcp-publisher login http --domain coachwatts.com --private-key "${{ secrets.MCP_PRIVATE_KEY }}"
```

Two problems with this:

1. **The expression is substituted before the shell runs.** The secret becomes a
   literal in the generated script, so it lands in the process argument list, where
   any other process on the runner can read it from `/proc/<pid>/cmdline`, and it
   can surface in shell traces, `ps` output, or a crash dump.
2. **It defeats log masking in the failure path.** GitHub masks known secret values
   in log output, but a key that gets mangled by shell quoting (or partially
   expanded) may no longer match the masked string, and an error message echoing the
   received argument would then print in the clear.

Secrets should reach a process through the environment, never through `argv`:

```yaml
- name: Authenticate to MCP Registry
  env:
    MCP_PRIVATE_KEY: ${{ secrets.MCP_PRIVATE_KEY }}
  run: ./mcp-publisher login http --domain coachwatts.com --private-key "$MCP_PRIVATE_KEY"
```

Check whether `mcp-publisher` supports reading the key from an environment variable
or a file directly — if it does, prefer that over passing it as a flag at all.

This is the credential that signs releases published under the `coachwatts.com`
domain to the public MCP registry, so exposure would let someone publish a server
entry as us.

## Steps to Reproduce

Static — inspect `.github/workflows/publish-mcp.yml:33`. The rendered step script
contains the key verbatim, and the key is visible in the `mcp-publisher` process's
command line while the step runs.

## Affected Files

- `.github/workflows/publish-mcp.yml`

## Acceptance Criteria

- [ ] `MCP_PRIVATE_KEY` is passed via `env:` and referenced as a shell variable
- [ ] No secret value appears in any `run:` block after expression substitution
- [ ] Confirmed whether `mcp-publisher` can read the key from env/file without a flag
- [ ] Repo scanned for the same pattern in other workflows (`grep -rn 'secrets\.' .github/workflows | grep 'run:'`)
