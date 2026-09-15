# StockedBy
AI & agentic commerce intelligence for brands in India, UAE & Saudi Arabia.
stockedby.com · Measure / Improve / Protect

Read CLAUDE.md first. Build phases are listed there; current phase at the top.

## Purchase Check

The current paid-product implementation is Purchase Check. Start with the
[one-person operations guide](docs/product/purchase-check-operations.md).

- Product preview: `/purchase-check`
- Interactive customer/operator demo: `/purchase-check/demo`
- Merchant workspace: `/dashboard/purchase-check`
- Owner controls: `/dashboard/operations`

`npm run dev` starts the local website. `npm test`, `npm run lint` and
`npm run build` verify the app. The operations guide includes browser/database
fixture tests, worker hosting, UPI setup and the staging launch checklist.

Payments and the scheduled worker require explicit configuration. The older
Agent Storefront prototype remains in the repository with its sales flag off.
