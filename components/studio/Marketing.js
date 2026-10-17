"use client";
import Link from "next/link";
import { useState } from "react";
import Icon from "./Icon";
import s from "./marketing.module.css";
export function Brand() {
  return (
    <Link href="/" className={s.brand}>
      <span className={s.mark}>
        s<span>↗</span>
      </span>
      stockedby<span className={s.brandDot}>.</span>
    </Link>
  );
}
export function SiteNav() {
  return (
    <nav className={s.nav}>
      <Brand />
      <div className={s.navLinks}>
        <Link href="/#workflow">The workflow</Link>
        <Link href="/why">Why StockedBy</Link>
        <Link href="/guide">Field guide</Link>
      </div>
      <Link href="/workspace" className={s.navCta}>
        Open workspace <Icon name="arrow" size={15} />
      </Link>
    </nav>
  );
}
export function SiteFooter() {
  return (
    <footer className={s.footer}>
      <div>
        <Brand />
        <p>
          A little less process.
          <br />A lot more product.
        </p>
      </div>
      <div>
        <span>EXPLORE</span>
        <Link href="/workspace">Team workspace</Link>
        <Link href="/studio">Local studio</Link>
        <Link href="/studio?demo=1">Sample project</Link>
        <Link href="/guide">Field guide</Link>
      </div>
      <div>
        <span>STOCKEDBY</span>
        <Link href="/why">The idea</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/archive">Earlier experiments</Link>
      </div>
      <div className={s.footerBottom}>
        <span>© {new Date().getFullYear()} StockedBy</span>
        <span>Made for the people who make products.</span>
        <a href="#top">Back to top ↑</a>
      </div>
    </footer>
  );
}
const previews = [
  {
    label: "Requirements",
    icon: "layers",
    tone: "blue",
    id: "REQ-002",
    title: "Invite a teammate",
    body: "Administrators can invite colleagues and revoke outstanding invitations.",
    rule: "Invitation links must expire after 48 hours.",
    next: "STORY-002 → TEST-002",
    note: "One requirement. A connected delivery thread.",
  },
  {
    label: "User stories",
    icon: "stories",
    tone: "orange",
    id: "STORY-002",
    title: "Bring the team together",
    body: "As an administrator, I want to invite a colleague so we can start working together.",
    rule: "Given an expired invitation, access must be denied.",
    next: "REQ-002 → TEST-002",
    note: "Acceptance criteria that carry the context.",
  },
  {
    label: "Test plan",
    icon: "check",
    tone: "mint",
    id: "TEST-002",
    title: "The link has expired",
    body: "Open an invitation after its 48-hour validity period. Expect an expiry message and no access.",
    rule: "Linked to the original requirement and standard.",
    next: "REQ-002 → STORY-002",
    note: "Proposed tests. Ready for the team to review.",
  },
];
export default function Marketing() {
  const [preview, setPreview] = useState(0);
  const d = previews[preview];
  return (
    <div className={s.site} id="top">
      <SiteNav />
      <main>
        <section className={s.hero}>
          <div className={s.heroEyebrow}>
            <span /> FROM COMPANY CONTEXT TO REVIEWED DELIVERY{" "}
            <b>01 / STUDIO</b>
          </div>
          <div className={s.heroContent}>
            <div>
              <h1>
                From the brief.
                <br />
                <span>To the build.</span>
              </h1>
              <p>
                Requirements. Working prototypes. Clear decisions.
                <br />
                Turn your company context into a delivery package
                <br className={s.desktopBreak} /> your team can inspect,
                challenge and build.
              </p>
              <div className={s.heroActions}>
                <Link className={s.primary} href="/studio">
                  Build your workflow <Icon name="arrow" size={18} />
                </Link>
                <Link className={s.demoLink} href="/studio?demo=1">
                  <Icon name="play" size={13} /> Try the working sample
                </Link>
              </div>
              <span className={s.heroFine}>
                OpenAI powered <i /> No account to get started <i /> Saved on
                your browser
              </span>
            </div>
            <div className={s.heroAside}>
              <span className={s.orbitNumber}>↳</span>
              <div>EVIDENCE → EXPERIENCE → DELIVERY</div>
              <p>
                You bring the judgment.
                <br />
                AI keeps the thread.
              </p>
            </div>
          </div>
          <div className={s.preview}>
            <div className={s.previewBar}>
              <div className={s.windowDots}>
                <i />
                <i />
                <i />
              </div>
              <span>
                <Icon name="folder" size={13} /> Orbit / A better way to onboard
              </span>
              <span className={s.sampleLabel}>FICTIONAL SAMPLE</span>
              <Link href="/studio?demo=1">Open in studio ↗</Link>
            </div>
            <div className={s.previewWorkspace}>
              <aside className={s.previewSide}>
                <div className={s.previewWorkspaceLabel}>
                  <span>O</span>Orbit workspace
                </div>
                <div className={s.previewSideLabel}>WORKFLOW</div>
                <div className={s.previewSideActive}>
                  <Icon name="flow" size={14} /> Onboarding launch
                </div>
                <div>
                  <Icon name="shield" size={14} /> Company standards
                </div>
                <div>
                  <Icon name="link" size={14} /> Traceability
                </div>
                <div className={s.previewSideLabel}>DRAG IN WHAT YOU NEED</div>
                {[
                  "Product brief",
                  "Requirements",
                  "Process flow",
                  "User stories",
                  "Test plan",
                ].map((t, i) => (
                  <div className={s.previewLibrary} key={t}>
                    <Icon
                      name={["brief", "layers", "flow", "stories", "check"][i]}
                      size={14}
                    />
                    {t}
                    <Icon name="grip" size={11} />
                  </div>
                ))}
                <span className={s.previewSideBottom}>
                  <i /> Saved on this browser
                </span>
              </aside>
              <div className={s.previewCanvas}>
                <div className={s.previewCanvasHeader}>
                  <span>THE ONBOARDING WORKFLOW</span>
                  <span>SELECT A STEP TO EXPLORE ↓</span>
                </div>
                <div className={s.previewSource}>
                  <span>
                    <Icon name="folder" size={15} />
                  </span>
                  <div>
                    Project context<small>The brief + company standards</small>
                  </div>
                  <b>2 sources</b>
                </div>
                <div className={s.previewWire} />
                <div className={s.previewBrief}>
                  <span>
                    <Icon name="brief" size={18} />
                  </span>
                  <div>
                    <small>01 / DEFINE</small>
                    <b>Product brief</b>
                  </div>
                  <span className={s.draftLabel}>Draft</span>
                </div>
                <div className={s.branch}>
                  <span />
                  <span />
                  <span />
                </div>
                <div className={s.previewBranches}>
                  {previews.map((n, i) => (
                    <button
                      key={n.label}
                      className={`${s.previewNode} ${preview === i ? s.previewSelected : ""}`}
                      onClick={() => setPreview(i)}
                      aria-pressed={preview === i}
                    >
                      <span className={`${s.nodeIcon} ${s[n.tone]}`}>
                        <Icon name={n.icon} />
                      </span>
                      <small>
                        0{i + 2} / {["SPECIFY", "BUILD", "VALIDATE"][i]}
                      </small>
                      <b>{n.label}</b>
                      <span className={s.previewNodeLine} />
                      <span className={s.previewNodeBottom}>
                        Inspect document <Icon name="chevron" size={11} />
                      </span>
                    </button>
                  ))}
                </div>
                <div className={s.previewCanvasFoot}>
                  <span>◉ CONNECTED BY CONTEXT</span>
                  <span>Drag. Connect. Make it yours.</span>
                </div>
              </div>
              <aside className={s.previewInspector}>
                <div className={s.inspectorLabel}>
                  <Icon name="spark" size={13} /> DOCUMENT INSPECTOR
                </div>
                <div className={s.inspectorDoc}>
                  <code>{d.id}</code>
                  <h3>{d.title}</h3>
                  <p>{d.body}</p>
                  <div className={s.citation}>
                    <Icon name="shield" size={13} />
                    <span>
                      {d.rule}
                      <small>Experience standards · Sample source</small>
                    </span>
                  </div>
                  <div className={s.inspectorLinks}>
                    <span>CONNECTED TO</span>
                    <code>{d.next}</code>
                  </div>
                </div>
                <p className={s.inspectorNote}>{d.note}</p>
                <Link href="/studio?demo=1">
                  Explore this project <Icon name="arrow" size={15} />
                </Link>
              </aside>
            </div>
          </div>
          <div className={s.belowPreview}>
            <span>BUILT FOR PRODUCT MANAGERS & BUSINESS ANALYSTS</span>
            <div>
              Context in.<span>Clarity out.</span>
            </div>
            <span>A WORKSPACE, NOT ANOTHER CHAT WINDOW.</span>
          </div>
        </section>
        <section className={s.workflowSection} id="workflow">
          <div className={s.sectionIntro}>
            <span className={s.kicker}>01 — LESS CEREMONY. MORE MOMENTUM.</span>
            <h2>
              Your process.
              <br />
              Without the <span>process tax.</span>
            </h2>
            <p>
              Some projects need a full delivery package.
              <br />
              Others just need three good stories.
              <br />
              You choose the steps. StockedBy connects the work.
            </p>
          </div>
          <div className={s.workflowChoices}>
            <div className={s.workflowChoice}>
              <span>THE LEAN LAUNCH</span>
              <div>
                <b>Brief</b>
                <Icon name="arrow" />
                <b>Stories</b>
                <Icon name="arrow" />
                <b>Tests</b>
              </div>
              <p>A focused path from idea to buildable work.</p>
            </div>
            <div className={s.workflowChoice}>
              <span>THE FULL PICTURE</span>
              <div>
                <b>Brief</b>
                <Icon name="arrow" />
                <b>Requirements</b>
                <Icon name="arrow" />
                <b>Flow</b>
                <Icon name="arrow" />
                <b>Handoff</b>
              </div>
              <p>More context for a more involved conversation.</p>
            </div>
            <Link href="/studio">
              Create your own sequence <Icon name="arrow" size={18} />
            </Link>
          </div>
        </section>
        <section className={s.standardsSection}>
          <div className={s.standardsVisual}>
            <div className={s.sourceDocument}>
              <div>
                <span>
                  <Icon name="shield" /> COMPANY STANDARD
                </span>
                <span>v2.1</span>
              </div>
              <h3>The way we work.</h3>
              <span className={s.fakeLine} />
              <span className={s.fakeLine} />
              <p>
                “Invitation links must expire
                <br />
                after 48 hours.”
              </p>
              <span className={s.fakeLine} />
              <span className={s.fakeLine} />
            </div>
            <div className={s.ruleCard}>
              <span>
                <Icon name="link" size={14} /> SOURCE-BACKED RULE
              </span>
              <h4>Invitation expiry</h4>
              <p>
                Use a 48-hour validity period.
                <br />
                Flag conflicting requirements.
              </p>
              <div>
                <Icon name="check" size={14} /> Confirmed for this sample
                project
              </div>
            </div>
            <span className={s.visualCaption}>
              ILLUSTRATIVE STANDARD · YOUR RULES WILL BE DIFFERENT
            </span>
          </div>
          <div className={s.standardsCopy}>
            <span className={s.kicker}>02 — YOUR COMPANY IS THE CONTEXT.</span>
            <h2>
              Generic AI.
              <br />
              <span>Meet your standards.</span>
            </h2>
            <p>
              Upload the policies, templates and guidelines your team works by.
              Review the rules AI extracts, with the original passage beside
              every one.
            </p>
            <ul>
              <li>
                <Icon name="check" size={16} /> Original sources stay a click
                away.
              </li>
              <li>
                <Icon name="check" size={16} /> You confirm which rules apply.
              </li>
              <li>
                <Icon name="check" size={16} /> Missing decisions stay visible.
              </li>
            </ul>
            <Link href="/guide#standards">
              See how standards work <Icon name="arrow" size={16} />
            </Link>
          </div>
        </section>
        <section className={s.reviewSection}>
          <div>
            <span className={s.kicker}>
              03 — CHANGE YOUR MIND. KEEP THE THREAD.
            </span>
            <h2>
              One change.
              <br />
              See the <span>ripple.</span>
            </h2>
            <p>
              When context or an upstream document changes, downstream outputs
              are marked for review. Regenerate the draft, inspect the links and
              decide what’s ready.
            </p>
            <Link href="/studio?demo=1">
              Follow a requirement <Icon name="arrow" size={16} />
            </Link>
          </div>
          <div className={s.changeVisual}>
            <div className={s.changeTop}>
              <Icon name="edit" size={16} /> Requirement updated{" "}
              <span>REQ-002</span>
            </div>
            {[
              ["User stories", "stories"],
              ["Test plan", "check"],
              ["Delivery handoff", "export"],
            ].map(([n, i]) => (
              <div className={s.changeRow} key={n}>
                <span className={s.changeBranch} />
                <Icon name={i} size={16} />
                <strong>{n}</strong>
                <span>Needs update</span>
              </div>
            ))}
            <p>
              <Icon name="shield" size={13} /> AI drafts. Your judgment stays in
              the loop.
            </p>
          </div>
        </section>
        <section className={s.productDepth}>
          <div>
            <span className={s.kicker}>
              04 — PUT THE SPECIFICATION TO WORK.
            </span>
            <h2>
              Less handoff.
              <br />
              <span>More shared understanding.</span>
            </h2>
            <p>
              For PMs and BAs working through company rules, design questions
              and engineering reviews.
            </p>
          </div>
          <div className={s.depthGrid}>
            <Link href="/studio?demo=1&view=prototype">
              <span>01 / EXPERIENCE LAB</span>
              <Icon name="screen" size={28} />
              <h3>Try the product before the build.</h3>
              <p>
                Working forms, connected screens and simulated data. Exercise
                failure states and record scenario observations against the
                requirements.
              </p>
              <b>Open the interactive prototype ↗</b>
            </Link>
            <Link href="/studio">
              <span>02 / REVIEW DESK</span>
              <Icon name="check" size={28} />
              <h3>Every unresolved question has a place.</h3>
              <p>
                Inspect policy findings, test coverage gaps and screen feedback.
                Record an owner and rationale, then compare the next draft with
                its baseline.
              </p>
              <b>Open review & decisions ↗</b>
            </Link>
            <Link href="/studio">
              <span>03 / CONNECTED DELIVERY</span>
              <Icon name="link" size={28} />
              <h3>Take the context into the tools.</h3>
              <p>
                Jira import and controlled publishing. Figma frame context and
                requirement links. OAuth account setup is required; portable
                exports work now.
              </p>
              <b>Explore connection options ↗</b>
            </Link>
          </div>
          <p className={s.pilotNote}>
            Team workspaces add shared initiatives, role-based access and AI change reviews.
            A second teammate reviews proposed edits before they are applied.
            The local studio remains available without an account.
          </p>
        </section>
        <section className={s.closing}>
          <span className={s.kicker}>
            FROM THE FIRST NOTE TO THE NEXT HANDOFF.
          </span>
          <h2>
            Make room for
            <br />
            <span>the actual thinking.</span>
          </h2>
          <Link href="/studio" className={s.primary}>
            Open your workspace <Icon name="arrow" size={19} />
          </Link>
          <p>
            No account. No fixed process. Just a place to move work forward.
          </p>
          <div className={s.closingGlyph}>↗</div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
export function InformationPage({ kind }) {
  const guide = kind === "guide",
    privacy = kind === "privacy",
    archive = kind === "archive";
  const title = guide
    ? "A field guide to better handoffs."
    : privacy
      ? "Your work deserves clear boundaries."
      : archive
        ? "Earlier experiments."
        : "Good product work has a thread.";
  return (
    <div className={s.site} id="top">
      <SiteNav />
      <main className={s.info}>
        <span className={s.kicker}>
          {guide
            ? "THE FIELD GUIDE"
            : privacy
              ? "PRIVACY · 14 OCTOBER 2026"
              : archive
                ? "THE STOCKEDBY ARCHIVE"
                : "WHY STOCKEDBY"}
        </span>
        <h1>{title}</h1>
        {guide ? (
          <>
            <p className={s.infoLead}>
              Start small. Bring context, choose your steps, and review the work
              before it leaves your desk.
            </p>
            <div className={s.guideSections}>
              <section>
                <span>01</span>
                <div>
                  <h2>Start with a real problem.</h2>
                  <p>
                    Open the workspace, name your initiative and add a brief:
                    audience, problem, outcomes, constraints and open questions.
                    Add supporting documents as PDF, DOCX, TXT, Markdown, CSV or
                    JSON. Files must be under 3 MB and extracted text under
                    40,000 characters.
                  </p>
                </div>
              </section>
              <section id="standards">
                <span>02</span>
                <div>
                  <h2>Teach it your standards.</h2>
                  <p>
                    Open Company standards. Add relevant policies or templates,
                    then extract rules with AI. Read the quoted passage for each
                    rule and confirm only the ones that apply. Re-extracting
                    rules clears confirmations so you can review the new
                    interpretation.
                  </p>
                  <p>
                    AI review is a drafting aid, not a compliance certificate.
                    Missing evidence and unresolved decisions need human
                    judgment.
                  </p>
                </div>
              </section>
              <section>
                <span>03</span>
                <div>
                  <h2>Build the workflow you need.</h2>
                  <p>
                    Drag steps from the library or click to add them. Reorder
                    cards by dragging, or use Move up / Move down in the
                    inspector. Choose from briefs, requirements, flows, screen
                    specifications, working prototypes, business cases, stories,
                    test plans, readiness reviews and handoffs. No step is
                    compulsory.
                  </p>
                  <p>
                    Place Requirements before Stories and Tests if you want
                    requirement-level traceability. Each step uses the current
                    preceding documents, project sources and confirmed rules.
                  </p>
                </div>
              </section>
              <section>
                <span>04</span>
                <div>
                  <h2>Run, refine, review.</h2>
                  <p>
                    Run one step or the whole workflow. Results are drafts. Open
                    Documents to edit the narrative and structured items. Add
                    missing decisions in Review → Decision log, then regenerate.
                    Use Prototype to exercise forms, simulate failures and
                    record manual observations. A context or upstream edit marks
                    dependent documents as needing an update.
                  </p>
                  <p>
                    Mark a document reviewed after resolving blockers and
                    questions. The name you enter is a local record, not a
                    verified signature or team approval. Generated tests are
                    specifications; StockedBy does not execute them.
                  </p>
                </div>
              </section>
              <section>
                <span>05</span>
                <div>
                  <h2>Take the work with you.</h2>
                  <p>
                    Export Word for stakeholder conversations, Markdown for
                    documentation, or CSV for spreadsheets and a manually mapped
                    Jira import. Download a working prototype as HTML or a
                    screen as editable SVG. Jira and Figma connections use OAuth
                    and require site-owner setup followed by your account
                    authorization. Jira writes always require a preview and
                    confirmation. Export a JSON project backup to move or
                    protect the entire project. Imported backups require
                    reconfirming standards and reviews.
                  </p>
                  <p>
                    Local studio projects autosave in this browser only. Clearing
                    browser data can erase them. Team workspaces save shared
                    initiatives when you choose Save to team, with version checks
                    to prevent overwriting a teammate’s work. AI runs send project context to OpenAI;
                    only use information your organisation permits you to send.
                  </p>
                </div>
              </section>
            </div>
          </>
        ) : privacy ? (
          <div className={s.prose}>
            <p>
              The local Studio saves project briefs, extracted source text, standards,
              AI drafts and local review records in your browser. The Team Workspace
              saves initiatives, source text, comments, proposals, membership details
              and decision history in a dedicated Supabase database. Workspace members
              can read shared content; their role determines editing and review access.
              Sign-in uses Supabase Auth and session cookies. Local work is uploaded
              only when you explicitly import it into a team workspace.
            </p>
            <h2>When you use AI</h2>
            <p>
              When you run a step, extract rules or prepare a team change review, your project brief, source
              text, confirmed rules, step instructions and relevant preceding
              documents, previous versions used for refinement and accepted
              decisions are sent through StockedBy’s server to OpenAI. We
              request that the API response is not stored for later retrieval.
              This does not guarantee zero provider retention; provider
              processing and retention policies still apply. Only submit
              material you are authorised to process with these services.
            </p>
            <h2>When you import a document</h2>
            <p>
              Uploaded PDF and Word files are processed on the server to extract
              text. The extracted text is returned to your browser. Original uploaded files are not retained by the application. Extracted
              text is stored in Supabase when you save the containing initiative
              to your team. Hosting and service providers may
              maintain operational logs under their own policies.
            </p>
            <h2>Connected accounts and prototypes</h2>
            <p>
              Jira and Figma authorization tokens are stored in encrypted,
              HttpOnly session cookies, with a maximum session of one hour.
              StockedBy uses them server-side only for the operations you
              request. Imported issue and frame snapshots become project context
              and are sent to OpenAI when you run AI. Disconnect removes the
              local session; revoke the app in your provider account to remove
              authorization. Prototype previews run in isolated frames with
              network access disabled. Downloaded prototypes contain their
              sample data and run locally.
            </p>
            <h2>Analytics and usage limits</h2>
            <p>
              Optional Google Analytics measures public page visits. Studio and team workspace
              tracking are excluded by the application, and project names,
              documents, prompts and draft contents are not included in
              analytics events. In-memory request limits use your network
              address to limit AI and upload requests; these counters reset when
              the server restarts. Team AI review quotas are stored per workspace and day in Supabase.
            </p>
            <h2>Your controls</h2>
            <p>
              Export a project backup before clearing browser data. Removing a
              source removes it from that local project and marks existing
              outputs for review. Previously generated text may still contain
              information from that source, so remove or edit those outputs too.
              Downloaded backups remain on your device until you delete them. Workspace owners
              can revoke invitations and remove members. Shared proposals and audit
              records retain earlier text and decisions; contact us to request deletion
              of workspace data. Exported or already-downloaded copies cannot be recalled.
            </p>
            <h2>Earlier tools</h2>
            <p>
              The archived AI visibility and website tools still process entered
              brands, websites and questions for individual requests. Those
              tools may use Anthropic, Google or OpenAI. Requested fix emails
              use Resend. They do not save reports in a StockedBy database.
            </p>
            <h2>Questions</h2>
            <p>
              Contact{" "}
              <a href="mailto:privacy@stockedby.com">privacy@stockedby.com</a>{" "}
              about information handling.
            </p>
          </div>
        ) : archive ? (
          <>
            <p className={s.infoLead}>
              StockedBy began with AI visibility and commerce experiments. These
              earlier tools remain available separately from the product
              workspace.
            </p>
            <div className={s.archiveLinks}>
              {[
                [
                  "/test",
                  "AI visibility test",
                  "See how AI recommendations describe a brand.",
                ],
                [
                  "/audit",
                  "Website readiness check",
                  "Inspect a website’s machine-readable signals.",
                ],
                [
                  "/purchase-check/demo",
                  "Purchase Check demo",
                  "A fictional checkout QA workspace.",
                ],
              ].map(([href, label, desc]) => (
                <Link href={href} key={href}>
                  <h2>
                    {label} <Icon name="arrow" />
                  </h2>
                  <p>{desc}</p>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className={s.infoLead}>
              The problem isn’t a shortage of documents. It’s losing the
              reasoning between them.
            </p>
            <div className={s.prose}>
              <h2>From a decision to something buildable.</h2>
              <p>
                A product idea becomes a brief. The brief becomes requirements.
                Requirements become stories, designs and tests. Along the way,
                context gets rewritten, assumptions become facts and an
                important company rule can disappear.
              </p>
              <p>
                StockedBy puts that connected work in one workspace. You choose
                the steps, provide the standards and review the outputs. AI
                helps with drafting and finding gaps.
              </p>
              <h2>Every team works differently.</h2>
              <p>
                A small experiment may need only a brief and a few stories. A
                complex change may need a business requirements document,
                process flow, screen specification and test plan. The canvas
                lets you build either, without forcing every project through the
                same process.
              </p>
              <h2>Evidence before confidence.</h2>
              <p>
                Extracted rules include a source passage. Requirements and
                downstream items carry identifiers. Changed inputs mark existing
                outputs as needing review. These links help you inspect the
                work; they don’t replace a qualified reviewer.
              </p>
              <h2>A focused pilot.</h2>
              <p>
                This version covers product definition through delivery handoff.
                Use the local studio for individual drafting, or a team workspace for
                shared initiatives and authenticated change decisions. AI prepares
                text edits; a different owner or reviewer decides whether to apply them.
                Real-time co-editing and automatic external-tool synchronisation are not included.
              </p>
            </div>
          </>
        )}
        <div className={s.infoCta}>
          <Link className={s.primary} href="/workspace">
            Open workspace <Icon name="arrow" size={18} />
          </Link>
          <Link href="/studio?demo=1">Try a fictional sample ↗</Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
