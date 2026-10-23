import { samplePrototype, prototypeArtifact } from "./prototype.js";
import { newProject } from "./model.js";
export function demoProject() {
  const p = newProject("A better way to onboard");
  p.demo = true;
  p.brief =
    "Design a self-service onboarding experience for Orbit, a fictional B2B workspace. A new administrator should be able to create a workspace, invite colleagues and complete setup without contacting support. Measure completion rate and time to first invitation. Team size and launch date are still to be decided. This is sample content for exploring StockedBy.";
  p.sources = [
    {
      id: "SRC-001",
      name: "Orbit · Experience standards (sample)",
      kind: "standard",
      text: "Every form must have visible field labels and inline error messages. Invitation links must expire after 48 hours. Administrators must be able to revoke an outstanding invitation. Never reveal whether an email belongs to an existing customer.",
    },
  ];
  p.rules = [
    {
      id: "RULE-001",
      title: "Clear form feedback",
      detail: "Use visible labels and inline errors.",
      sourceId: "SRC-001",
      quote:
        "Every form must have visible field labels and inline error messages.",
      approved: true,
    },
    {
      id: "RULE-002",
      title: "Invitation expiry",
      detail: "Invitation links expire after 48 hours.",
      sourceId: "SRC-001",
      quote: "Invitation links must expire after 48 hours.",
      approved: true,
    },
  ];
  const item = (id, title, detail, req = [], ac = []) => ({
    id,
    title,
    detail,
    sourceIds: ["SRC-001"],
    requirementIds: req,
    acceptanceCriteria: ac,
  });
  const artifacts = {
    brief: {
      title: "A simpler first five minutes",
      summary:
        "Help new administrators reach their first team invitation with fewer interruptions.",
      content:
        "## The opportunity\nNew administrators need a clear path from an empty workspace to a team that can collaborate.\n\n## The outcome\nCreate a workspace, invite a colleague and understand the next step.\n\n## How we will measure it\nTrack setup completion and time to first invitation. Baselines and targets need validation.\n\n## Out of scope\nBilling, enterprise provisioning and bulk migration.",
      items: [
        item(
          "GOAL-01",
          "First invitation",
          "Make the first successful invitation the activation milestone.",
        ),
      ],
      questions: ["What is the launch cohort and target completion rate?"],
      findings: [],
    },
    requirements: {
      title: "Workspace onboarding",
      summary:
        "Three connected requirements, grounded in the sample experience standard.",
      content:
        "## Scope\nA guided setup for workspace administrators. Every step exposes an obvious next action and a recoverable error state.\n\n## Decisions to confirm\nAn invitation lasts 48 hours, as specified by the sample policy. Launch timing and analytics targets are still open.",
      items: [
        item(
          "REQ-001",
          "Create a workspace",
          "The administrator enters a workspace name and receives immediate validation feedback.",
          [],
          [
            "Given an empty workspace name, show an inline error and retain entered data.",
          ],
        ),
        item(
          "REQ-002",
          "Invite a teammate",
          "Send an invitation with a clear expiry and a revocation option.",
          [],
          [
            "An invitation expires 48 hours after creation.",
            "A revoked invitation cannot be used.",
          ],
        ),
        item(
          "REQ-003",
          "Recover from an error",
          "Show actionable guidance without exposing account existence.",
          [],
          [
            "An invitation response does not reveal existing customer membership.",
          ],
        ),
      ],
      questions: ["Who owns invitation delivery failures?"],
      findings: [
        {
          severity: "warning",
          issue:
            "Define an owner and recovery path for email delivery failure.",
          sourceId: "SRC-001",
          quote: "",
        },
      ],
    },
    stories: {
      title: "From requirements to buildable work",
      summary:
        "Stories inherit requirement IDs so the team can follow the reasoning.",
      content:
        "## Delivery slice\nBuild workspace creation before team invitations. Include validation and error states within each story.",
      items: [
        item(
          "STORY-001",
          "Create my workspace",
          "As an administrator, I want to create a named workspace so my team has a shared place to work.",
          ["REQ-001"],
          [
            "Given a valid name, when I submit, then a workspace is created.",
            "Given no name, show an inline validation message.",
          ],
        ),
        item(
          "STORY-002",
          "Invite and revoke",
          "As an administrator, I want to invite colleagues and revoke pending invitations.",
          ["REQ-002", "REQ-003"],
          [
            "Expired invitations cannot grant access.",
            "Revoking an invitation invalidates its link.",
          ],
        ),
      ],
      questions: [],
      findings: [],
    },
    tests: {
      title: "Check the paths that matter",
      summary:
        "Coverage of the happy path, validation errors and invitation boundaries.",
      content:
        "## Test approach\nUse a non-production environment and synthetic email addresses. These are test specifications; no tests have been executed.",
      items: [
        item(
          "TEST-001",
          "Empty workspace name",
          "Submit an empty workspace name. Expect inline feedback and no workspace creation.",
          ["REQ-001"],
        ),
        item(
          "TEST-002",
          "Expired invitation",
          "Open an invitation after 48 hours. Expect an expiry message and no access.",
          ["REQ-002"],
        ),
        item(
          "TEST-003",
          "Revoked invitation",
          "Revoke a pending invitation, then open its link. Expect no access.",
          ["REQ-002"],
        ),
        item(
          "TEST-004",
          "Account privacy",
          "Compare invitation responses for existing and new email addresses. Expect no membership disclosure.",
          ["REQ-003"],
        ),
      ],
      questions: [],
      findings: [],
    },
  };
  p.nodes = p.nodes.map((n) => ({
    ...n,
    artifact: {
      ...(n.type === "prototype"
        ? prototypeArtifact(samplePrototype(), {
            upstream: [
              { type: "requirements", items: artifacts.requirements.items },
            ],
          })
        : n.type === "review"
          ? {
              title: "Orbit · Readiness review",
              summary: "Two decisions remain before delivery.",
              content:
                "The sample supports workspace creation and invitation review. Invitation expiry is specified but is not enforced by the prototype runtime. Confirm the release scope and operational ownership before implementation.",
              items: [],
              questions: [
                "Who owns invitation delivery failures?",
                "What is the first release scope and target date?",
              ],
              findings: [
                {
                  severity: "warning",
                  issue:
                    "Prototype simulations do not validate server-side invitation expiry or permissions.",
                  sourceId: "SRC-001",
                  quote: "Invitation links must expire after 48 hours.",
                },
              ],
              rules: [],
            }
          : artifacts[n.type]),
      status: "draft",
      approval: null,
      model: "Sample content",
      generatedAt: p.createdAt,
    },
  }));
  const sample = {
    opportunity: {problem:"New Orbit administrators need to set up a workspace and invite colleagues without waiting for support.",evidence:"Fictional demonstration only. No customer research or measured baseline has been supplied.",hypothesis:"We believe clearer self-service setup will improve completion and reduce time to first invitation. Validate with pilot administrators."},
    decision: {choice:"Test a guided workspace setup and invitation journey before extending it to all administrators.",alternatives:"Keep assisted setup; simplify only the invitation step; or build a guided setup. The prototype explores the third option, not a final release decision.",owner:"Product owner to be assigned. Team size, pilot cohort and launch timing remain open."},
    experience: {journey:"Create workspace → invite colleagues → review pending invitations. Invalid form entries stay editable with inline errors.",prototype:"Open the Orbit onboarding prototype in this project. It is an interactive simulation with fictional data.",learning:"Observe whether a pilot administrator can finish setup and recover from an invalid invitation. No sessions have been run."},
    behaviour: {rules:"Forms use visible labels and inline errors. Invitations expire after 48 hours under the sample standard. Administrators can revoke pending invitations.",edges:"Invalid email, pending invitation, revoked invitation and an unavailable service need explicit recovery. Never expose whether an address is already a customer.",ai:"Not applicable to Orbit's proposed onboarding experience. StockedBy uses AI to draft this plan, which is a separate concern."},
    measurement: {metric:"Track completion rate and time to first invitation. Baseline, target, window and owner remain to be agreed.",tracking:"Proposed events: workspace_created, invitation_submitted and setup_completed. Review properties and data minimisation before instrumentation.",evaluation:"Run the prototype's manual scenarios. Production expiry and access controls require separate integration tests; no tests have been recorded as passed."},
    scope: {included:"Workspace creation, first invitation and a pending invitation view for administrators.",excluded:"Billing, organisation-wide SSO and complex role administration are proposed non-goals for this pilot.",dependencies:"Confirm invitation delivery, access model and pilot ownership with engineering. Apply the attached sample experience standards."},
    rollout: {exposure:"Agree a limited pilot cohort and review window before release. Do not treat a prototype as a production rollout.",rollback:"Assign an operator and agree stop conditions before enabling the pilot. Preserve an assisted setup path.",operations:"Support guidance, failure monitoring and invitation delivery checks remain to be planned."},
    release: {criteria:"Check visible form labels, invalid email recovery, invitation state transitions and production access controls. Record a reviewer and result for each check.",decision:"Hold production release. This is a fictional working example with unresolved pilot and implementation decisions.",learning:"No launch results exist. Add observations after the pilot and decide whether to iterate, scale or stop."}
  };
  for(const [id,fields] of Object.entries(sample)) p.productPlan.sections[id].fields=fields;
  return p;
}
