import { SCENARIO_EXTENSION, INTERVIEW_EXTENSION, STORY_ASSIGNMENTS, RECORDING_ASSIGNMENTS, LEVELS } from "./curriculum.js";
export { STORY_ASSIGNMENTS, RECORDING_ASSIGNMENTS, LEVELS };
export const RUBRIC_VERSION = "ascent-2026-10-v1";
const ORIGINAL_SCENARIOS = [
  {
    id: "deadline",
    role: "CBO",
    title: "A date before the facts",
    skill: "Boundaries & accountability",
    minutes: 5,
    prompt:
      "The CBO says: “Give me the release date now. The board needs certainty.” Scope, integration testing and the vendor estimate are not validated. You lead Digital; IT owns integration and the vendor owns its delivery estimate. Respond with a useful commitment without inventing a date or shifting blame.",
    cue: "Acknowledge the need. Name the dependency. Commit to a decision process.",
  },
  {
    id: "criticism",
    role: "COO",
    title: "The email everyone saw",
    skill: "Composure & evidence",
    minutes: 5,
    prompt:
      "The COO copies senior leaders: “Digital has delayed the launch again.” You have a documented scope change and an unresolved operating-owner decision. Neither has a validated impact estimate. Write a concise response that corrects the record, accepts your part and moves the decision forward. Do not speculate about anyone’s motives.",
    cue: "Correct the facts, not the person. Propose a next decision.",
  },
  {
    id: "value",
    role: "MD",
    title: "Prove the business value",
    skill: "Commercial storytelling",
    minutes: 4,
    prompt:
      "The MD asks: “What business value has your digital function delivered?” You may use only outcomes you can substantiate. If you do not have verified numbers, state what evidence you would bring and how you would measure impact. Connect one real example to customers, revenue, cost or risk.",
    cue: "Lead with the outcome. Support it with evidence. Name the next opportunity.",
  },
  {
    id: "vendor",
    role: "CBO",
    title: "A pilot without an owner",
    skill: "Operating model",
    minutes: 5,
    prompt:
      "The CBO asks you to take ownership of an AI vendor pilot this week. There is no approved budget, accountable sponsor, operating owner or data-sharing review. Explain what Digital can own and the minimum decisions needed to proceed responsibly. Offer a bounded next step.",
    cue: "Separate exploration from a production commitment.",
  },
  {
    id: "board",
    role: "MD",
    title: "The uncomfortable board question",
    skill: "Executive presence",
    minutes: 4,
    prompt:
      "At a board review the MD asks: “Why do we need this expensive digital role? What would stop if we removed it?” Give the exact words you would say. Explain accountable business value without becoming personal, defensive or inventing achievements.",
    cue: "Pause. Give one clear answer. Back it with a real example.",
  },
  {
    id: "conflict",
    role: "CIO",
    title: "Whose dependency is it?",
    skill: "Cross-functional leadership",
    minutes: 5,
    prompt:
      "The CIO says Digital committed to a lending feature without confirming platform capacity. You believe your team shared requirements but cannot prove capacity was agreed. Respond to the CIO, clarify the evidence gap and establish joint ownership of a realistic plan.",
    cue: "Own the gap. Reconstruct the facts. Agree a decision owner.",
  },
  {
    id: "boundary",
    role: "Peer leader",
    title: "The information boundary",
    skill: "Confidentiality",
    minutes: 3,
    prompt:
      "A peer asks you to share confidential vendor pricing and your private assessment of a leadership decision. They say it will help their negotiation. Explain the boundary without repeating the information, accusing them or damaging the working relationship.",
    cue: "Give a clear boundary and a safe alternative.",
  },
  {
    id: "transition",
    role: "COO",
    title: "Lead well through a transition",
    skill: "Professional judgement",
    minutes: 4,
    prompt:
      "You are exploring your next career step while remaining accountable for delivery. The COO asks you to take on another open-ended workstream. Describe capacity, priorities and ownership without disclosing private job-search details or making promises you cannot keep.",
    cue: "Protect capacity through explicit priorities and commitments.",
  },
];
const ORIGINAL_INTERVIEWS = [
  {
    id: "appointment",
    role: "Board panel",
    title: "Why you, before the title?",
    skill: "Leadership narrative",
    prompt:
      "Why should we appoint you Chief Digital Officer when you have not held that title? Ground your answer in real scope, decisions and evidence. Distinguish demonstrated experience from capabilities you still need to develop.",
    cue: "Scope. Evidence. Judgement. A credible development plan.",
  },
  {
    id: "strategy",
    role: "Board panel",
    title: "Your first 100 days",
    skill: "Digital strategy",
    prompt:
      "You join a mid-sized bank with fragmented digital journeys and uncertain technology capacity. What would you prioritise in your first 100 days, and what would you deliberately defer? Explain how you would validate the commercial case and risk constraints.",
    cue: "Diagnose before promising. Make priorities and trade-offs explicit.",
  },
  {
    id: "economics",
    role: "CFO",
    title: "Growth that pays for itself",
    skill: "Commercial judgement",
    prompt:
      "A BNPL proposition grows quickly but loss rates and servicing costs are rising. What unit economics would you examine, what decisions could follow, and how would you balance acquisition, retention and responsible growth? Do not invent company metrics.",
    cue: "Separate volume from profitable, risk-adjusted growth.",
  },
  {
    id: "ai",
    role: "Head of Risk",
    title: "AI with accountable ownership",
    skill: "Responsible AI",
    prompt:
      "The board wants an AI-native bank. How would you select the first use cases, decide where human approval remains necessary, and establish data, model, security and operating controls? Give a practical example without asserting regulatory compliance.",
    cue: "Business problem first. Measurable pilot. Named controls and owners.",
  },
  {
    id: "setback",
    role: "Board panel",
    title: "A setback you actually owned",
    skill: "Learning & leadership",
    prompt:
      "Tell us about a real digital-product setback. What was your responsibility, what did you change, and what evidence shows the lesson affected your subsequent decisions? Avoid invented KPIs or blaming colleagues.",
    cue: "Situation. Your decision. Consequence. What changed.",
  },
];
const originalDomains = {
  deadline: "Transformation delivery", criticism: "People & influence", value: "Commercial strategy",
  vendor: "Operating model", board: "Executive narrative", conflict: "Platform & ecosystem",
  boundary: "Governance & risk", transition: "People & influence", appointment: "Executive narrative",
  strategy: "Commercial strategy", economics: "Commercial strategy", ai: "AI & data", setback: "Transformation delivery",
};
export const SCENARIOS = [...ORIGINAL_SCENARIOS.map(x => ({...x, domain:originalDomains[x.id],level:x.id === "board" ? "Boardroom" : "Foundation"})), ...SCENARIO_EXTENSION];
export const INTERVIEWS = [...ORIGINAL_INTERVIEWS.map(x => ({...x,domain:originalDomains[x.id],level:"Foundation",minutes:8})), ...INTERVIEW_EXTENSION];
export const EXERCISES = [SCENARIOS, STORY_ASSIGNMENTS, RECORDING_ASSIGNMENTS, INTERVIEWS].flatMap((list, i) => list.map(x => ({...x,kind:["scenario","story","recording","interview"][i]})));
export const DOMAINS = [...new Set(EXERCISES.map(x => x.domain))];
export function getExercise(kind, id) { return EXERCISES.find(x => x.kind === kind && x.id === id); }
export function completedExerciseKeys(progress = []) {
  return new Set(progress.filter(x => x.status === "ready" && x.relation !== "followup").flatMap(x => {
    const id = x.context?.exerciseId || x.context?.scenarioId;
    return getExercise(x.kind,id) ? [`${x.kind}:${id}`] : [];
  }));
}
export function nextExercise(progress = []) {
  const completed = completedExerciseKeys(progress);
  const path = Array.from({length:50}, (_,i) => [SCENARIOS[i],STORY_ASSIGNMENTS[i],RECORDING_ASSIGNMENTS[i],INTERVIEWS[i]].map((x,j) => ({...x,kind:["scenario","story","recording","interview"][j]}))).flat()
    .sort((a,b) => LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level));
  return path.find(x => !completed.has(`${x.kind}:${x.id}`)) || path[0];
}
export const TOPICS = [
  "Digital lending",
  "BNPL: conversion versus risk",
  "AI in banking",
  "KYC and identity",
  "Open finance",
  "Operational ownership",
  "Cost optimisation",
  "Leading transformation",
  "Launching a financial product",
];
export const STORY_FORMATS = [
  { id: "recommendation", title: "Boardroom recommendation", seconds: 45 },
  { id: "insight", title: "Business insight", seconds: 90 },
  { id: "pitch", title: "Product pitch", seconds: 180 },
  { id: "leadership", title: "Leadership story", seconds: 180 },
];
export const FRAMEWORK = [
  "Hook",
  "Business problem",
  "Tension / trade-off",
  "Action / recommendation",
  "Outcome / measure",
  "Takeaway",
];
export const MILESTONES = [
  {
    id: "baseline",
    date: "2026-11-15",
    title: "Build an honest baseline",
    detail:
      "Practise executive responses, outline three true leadership stories and save your first recording.",
    done: false,
  },
  {
    id: "business",
    date: "2026-12-15",
    title: "Make the business case",
    detail:
      "Refine 90-second insights, sharpen MD-level recommendations and assemble evidence for your leadership examples.",
    done: false,
  },
  {
    id: "narrative",
    date: "2027-01-15",
    title: "Shape your CDO narrative",
    detail:
      "Run mock board interviews and build case studies with verified outcomes or clearly labelled measurement plans.",
    done: false,
  },
  {
    id: "portfolio",
    date: "2027-02-15",
    title: "Take the work into the world",
    detail:
      "Develop a speaking cadence, build your leadership portfolio and make time for thoughtful networking and applications.",
    done: false,
  },
  {
    id: "readiness",
    date: "2027-03-15",
    title: "Rehearse the demanding conversation",
    detail:
      "Repeat difficult interviews, review evidence gaps and prepare a considered transition plan. No outcome is guaranteed.",
    done: false,
  },
];
export const HABITS = [
  "A difficult conversation handled professionally",
  "Strategic deep work or career preparation",
  "Clear, unhurried speaking practice",
  "Exercise or recovery",
  "Healthy confidentiality and availability boundaries",
  "Meaningful family time or rest",
];
export const MODES = {
  scenario: "Executive scenarios",
  story: "Storytelling",
  recording: "Recording studio",
  interview: "CDO interviews",
  reflection: "Daily discipline",
};
export const MAX_MEDIA_BYTES = 50 * 1024 * 1024;
export const MAX_MEDIA_SECONDS = 180;
export const MEDIA_ACCEPT = ".mov,.mp4,.m4a,.wav,.mp3,.webm";
