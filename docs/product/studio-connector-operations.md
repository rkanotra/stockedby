# Studio connector operations

## Owner setup

Create a StockedBy OAuth application with each provider. Register the production callback URLs exactly:

- Jira: `https://stockedby.com/api/studio/connectors/jira/callback`
- Figma: `https://stockedby.com/api/studio/connectors/figma/callback`

Set these server-side deployment variables through the hosting provider's secret settings:

- `STUDIO_CONNECTOR_SECRET`: independently generated cryptographically random secret of at least 32 characters. Rotation invalidates existing sessions and previews.
- `JIRA_CLIENT_ID`, `JIRA_CLIENT_SECRET`
- `FIGMA_CLIENT_ID`, `FIGMA_CLIENT_SECRET`
- `NEXT_PUBLIC_SITE_URL=https://stockedby.com` (used to pin the callback origin)

Do not prefix secrets with NEXT_PUBLIC, put them in Git, send them to the browser, or ask customers to supply API tokens. Configure test deployment callbacks separately when testing other origins. Use provider application distribution/review requirements before offering connections to external customers.

Jira permissions: `read:jira-work`, `write:jira-work`. Figma: `file_content:read`, with PKCE. No offline access or refresh token storage. Access tokens are AES-GCM encrypted into HttpOnly, SameSite=Lax cookies scoped to connector API routes for at most one hour. Production cookies use Secure. Disconnect clears the local session; provider account revocation is separate.

## Acceptance checks after setup

1. Connect each provider, validate account permissions and expiry; reject a modified/expired state callback.
2. Load an authorized Jira site/project/type. Import fictional test issues and verify text, status and links.
3. Confirm mandatory unsupported Jira fields prevent publication. Review a signed preview and explicitly authorize a test issue creation.
4. Preview an update, edit the issue directly in Jira, and confirm StockedBy refuses the stale update. Preview again to continue.
5. For any ambiguous timeout, inspect Jira before retrying. Search labels are best-effort reconciliation, not atomic idempotency. This limitation requires durable storage and provider-aware retry handling before batch automation.
6. Import a test Figma file and a specific frame URL; verify selected frame text and requirement mapping. Ensure inaccessible files return a useful error.
7. Verify network requests, exports, AI payloads and logs contain no connector credentials.

## Scope and recovery

Projects, snapshots, imported source text and published issue references remain local to the browser. Back up projects regularly. Imported projects discard review assertions, prototype observation records, delivery references and version history; decisions require reconfirmation. Connectors do not synchronize in the background. To refresh Jira source context, import the same keys again. Re-import Figma frames when designs change.

Jira descriptions are replaced on an explicitly confirmed update. The preview displays the previous description. StockedBy does not write custom fields, transition statuses, delete issues or send emails. Figma is read-only. SVG is a separate editable export, not a remote Figma canvas update.

Do not log request bodies or provider tokens. User-visible provider errors are sanitized. Current in-memory limits and browser-local approvals are pilot controls, not an enterprise security boundary.
