"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Icon from "../studio/Icon";
import Programme from "./Programme";
import {
  SCENARIOS,
  STORY_ASSIGNMENTS,
  RECORDING_ASSIGNMENTS,
  nextExercise,
  completedExerciseKeys,
  INTERVIEWS,
  TOPICS,
  STORY_FORMATS,
  FRAMEWORK,
  MILESTONES,
  HABITS,
  MODES,
  MAX_MEDIA_BYTES,
  MEDIA_ACCEPT,
} from "@/lib/ascent/catalog";
import s from "./ascent.module.css";
const NAV = [
  ["home", "Your studio", "layers"],
  ["programme", "Practice programme", "flow"],
  ["scenario", "Executive scenarios", "brief"],
  ["story", "Storytelling", "stories"],
  ["recording", "Recording studio", "play"],
  ["interview", "CDO interviews", "spark"],
  ["reflection", "Daily discipline", "check"],
  ["roadmap", "Your roadmap", "flow"],
  ["history", "Private library", "folder"],
];
const ACTIVE = ["queued", "processing", "transcribing", "reviewing"];
const stamp = (n) =>
  `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, "0")}`;
const date = (x) =>
  new Date(x).toLocaleDateString(undefined, { month: "short", day: "numeric" });
const day = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
async function api(path = "", body, method) {
  const response = await fetch(`/api/ascent${path}`, {
    method: method || (body ? "POST" : "GET"),
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw Error(
      "Connection interrupted. Check your library before submitting again.",
    );
  }
  if (!response.ok)
    throw Object.assign(Error(data.error || "Could not complete this request."), { status: response.status });
  return data;
}
function download(name, text, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Logo() {
  return (
    <div className={s.logo}>
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path
          d="M4 26 16 5l12 21M10 26l6-10 6 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
      <span>
        ASCENT<small>EXECUTIVE STUDIO</small>
      </span>
    </div>
  );
}
export function AscentEntry({ authError = false }) {
  const [state, setState] = useState(null);
  useEffect(() => {
    let active = true;
    api().then(data => { if (active) setState({ data }); })
      .catch(error => { if (active) setState({ error }); });
    return () => { active = false; };
  }, []);
  if (!state) return <main className={s.gate}><div><Logo /><p role="status">Opening your private studio…</p></div></main>;
  if (state.error) return <AscentGate authError={authError} denied={state.error.status === 403} unavailable={![401, 403].includes(state.error.status)} />;
  return <Ascent email={state.data.email || ""} initialData={state.data} />;
}
export function AscentGate({ denied = false, unavailable = false, authError = false }) {
  const [email, setEmail] = useState(""),
    [busy, setBusy] = useState(false),
    [sent, setSent] = useState(false),
    [error, setError] = useState(authError ? "This sign-in link could not be verified. Request a new link and open it in this browser." : "");
  return (
    <main className={s.gate}>
      <div>
        <Logo />
        <span className={s.kicker}>A PRIVATE SPACE TO GET BETTER</span>
        <h1>
          Less reaction.
          <br />
          More command.
        </h1>
        <p>
          Practise the difficult answer. Find the stronger story. Develop the
          executive you want to become.
        </p>
        <div className={s.gateLine} />
        <small>Private by design. Grounded in your actual work.</small>
      </div>
      <section>
        <Icon name="shield" size={30} />
        <h2>
          {denied ? "This studio is private." : "Welcome to your studio."}
        </h2>
        <p>
          {unavailable
            ? "Your studio could not be reached. Please reload to try again. Your saved work is unchanged."
            : denied
              ? "This signed-in account does not have access. Use your authorised email below to continue."
              : "Use your authorised email to receive a secure sign-in link."}
        </p>
        {!unavailable &&
          (sent ? (
            <div role="status" className={s.notice}>
              Check your inbox. Open the newest link in this browser to return to Ascent.{" "}
              <button className={s.textButton} onClick={() => setSent(false)}>
                Use another email
              </button>
            </div>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError("");
                try {
                  const r = await fetch("/api/team/auth", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      action: "signin",
                      email,
                      returnTo: "/ascent",
                    }),
                  });
                  const d = await r.json();
                  if (!r.ok) throw Error(d.error);
                  setSent(true);
                } catch (e) {
                  setError(e.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label>
                Email address
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                />
              </label>
              <button className={s.primary} disabled={busy}>
                {busy ? "Sending link…" : "Continue with email"}{" "}
                <Icon name="arrow" size={17} />
              </button>
            </form>
          ))}
        {error && (
          <p role="alert" className={s.error}>
            {error}
          </p>
        )}
        <Link href="/workspace">
          Return to StockedBy <span>↗</span>
        </Link>
      </section>
    </main>
  );
}
function Mountain() {
  return (
    <svg
      className={s.mountain}
      viewBox="0 0 430 225"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="ascentFill"
          x1="215"
          y1="25"
          x2="215"
          y2="225"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#7ca7ff" stopOpacity=".18" />
          <stop offset="1" stopColor="#7ca7ff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M0 224 87 137l45 36L252 26l66 96 34-27 78 129Z"
        fill="url(#ascentFill)"
      />
      <path
        d="m0 224 87-87 45 36L252 26l66 96 34-27 78 129"
        stroke="#7497ce"
        strokeWidth="1.4"
      />
      <path
        d="m156 147 38-26 58-95M252 26l-3 68 39 53M87 137l15 56M318 122l-8 44"
        stroke="#aec4e7"
        strokeWidth="1"
      />
      <path
        d="m18 219 81-44 55 17 67-49 34 10 75-5 62 71"
        stroke="#a9c1e4"
        strokeDasharray="4 5"
      />
      <circle cx="221" cy="143" r="5" fill="#3265cb" />
      <circle cx="221" cy="143" r="11" stroke="#3265cb" strokeOpacity=".2" />
    </svg>
  );
}
function Score({ value, label }) {
  return (
    <div className={s.score}>
      <strong>
        {value ?? "—"}
        {value !== null && value !== undefined && <small>/10</small>}
      </strong>
      <span>{label}</span>
    </div>
  );
}
function Report({ item, onRevise, onFollow, onCompare }) {
  const r = item.review;
  if (!r) return null;
  return (
    <section className={s.report} aria-label="AI coaching report">
      <div className={s.reportTop}>
        <div>
          <span className={s.kicker}>YOUR COACHING REVIEW</span>
          <h2>
            Keep the intent.
            <br />
            Strengthen the response.
          </h2>
        </div>
        <Score value={r.overallScore} label="This attempt" />
      </div>
      <p className={s.muted}>
        AI assessment · {item.rubric_version} · Text evidence only
      </p>
      <div className={s.dimensions}>
        {r.dimensions.map((d) => (
          <article key={d.key}>
            <div>
              <strong>{d.key.replaceAll("_", " ")}</strong>
              <span>{d.score ?? "—"} / 10</span>
            </div>
            <p>{d.evidence}</p>
            <small>{d.nextAction}</small>
          </article>
        ))}
      </div>
      <details className={s.rubric}>
        <summary>How the score works</summary>
        <p>
          0–2: major concerns · 3–4: significant gaps · 5–6: usable, needs work
          · 7–8: clear and credible · 9–10: unusually strong and well evidenced.
          A score describes this answer, not your worth or career readiness.
          Compare attempts on the same exercise and rubric.
        </p>
      </details>
      <div className={s.feedback}>
        <div>
          <h3>What worked</h3>
          <ul>
            {r.strengths.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Your next improvements</h3>
          <ol>
            {r.priorities.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ol>
        </div>
      </div>
      <section className={s.rewrite}>
        <span className={s.kicker}>A STRONGER VERSION · DRAFT</span>
        <p>{r.improvedResponse}</p>
        <button className={s.textButton} onClick={onRevise}>
          Rewrite in my own words <Icon name="edit" size={15} />
        </button>
      </section>
      <section className={s.challenge}>
        <span className={s.kicker}>NOW, THE TOUGHER QUESTION</span>
        <h3>{r.followUpChallenge}</h3>
        <p>{r.coachingNote}</p>
        <button className={s.secondary} onClick={onFollow}>
          Practise the follow-up <Icon name="arrow" size={16} />
        </button>
      </section>
      <div className={s.limitations}>
        <Icon name="shield" size={17} />
        <div>
          <strong>What this review can tell you</strong>
          {r.limitations.map((x, i) => (
            <p key={i}>{x}</p>
          ))}
        </div>
      </div>
      {item.parent_id && (
        <button className={s.secondary} onClick={onCompare}>
          Compare with the previous attempt
        </button>
      )}
      {item.kind === "recording" || item.kind === "story" ? (
        <details className={s.rubric}>
          <summary>Video-blog title, summary & caption</summary>
          <h3>{r.publication.title}</h3>
          <p>{r.publication.summary}</p>
          <p>{r.publication.caption}</p>
          <small>Private drafts only. Nothing is published.</small>
        </details>
      ) : null}
    </section>
  );
}
function MediaPlayer({ item, url, onRefresh, onNote, notesBusy }) {
  const player = useRef(null),
    [note, setNote] = useState(""),
    [seconds, setSeconds] = useState(0);
  const metrics = item.metrics;
  return (
    <section className={s.mediaPanel}>
      <div className={s.sectionTitle}>
        <h2>Your take</h2>
        <button className={s.textButton} onClick={onRefresh}>
          Refresh playback link
        </button>
      </div>
      {url ? (
        item.mime?.startsWith("audio/") ? (
          <audio ref={player} controls src={url} preload="metadata" />
        ) : (
          <video
            ref={player}
            controls
            playsInline
            src={url}
            preload="metadata"
          />
        )
      ) : (
        <p className={s.muted}>
          Playback becomes available after your upload finishes.
        </p>
      )}
      <p className={s.fine}>
        Playback links expire after five minutes. MOV/HEVC playback depends on
        your browser.{" "}
        <a href={url || undefined} target="_blank" rel="noreferrer">
          Open original recording ↗
        </a>
      </p>
      {metrics && (
        <div className={s.mediaMetrics}>
          <div>
            <strong>{stamp(metrics.durationSeconds || 0)}</strong>
            <span>Recording length</span>
          </div>
          <div>
            <strong>{metrics.wordCount}</strong>
            <span>Transcript words</span>
          </div>
          <div>
            <strong>{metrics.approxWordsPerMinute ?? "—"}</strong>
            <span>Approx. words / min</span>
          </div>
        </div>
      )}
      <p className={s.fine}>{metrics?.note}</p>
      {metrics && (
        <p className={s.fine}>
          Detected fillers: {metrics.fillerCount}. Repeated words:{" "}
          {metrics.repeatedWords
            ?.map((x) => `${x.word} (${x.count})`)
            .join(", ") || "none above the display threshold"}
          .
        </p>
      )}
      <div className={s.sectionTitle}>
        <h3>Transcript</h3>
        <button
          className={s.textButton}
          disabled={!item.transcript}
          onClick={() =>
            download("ascent-transcript.txt", item.transcript.text)
          }
        >
          Download
        </button>
      </div>
      {item.transcript ? (
        <div className={s.transcript}>
          {item.transcript.segments?.length ? (
            item.transcript.segments.map((seg, i) => (
              <button
                key={i}
                onClick={() => {
                  if (player.current) player.current.currentTime = seg.start;
                }}
              >
                <time>{stamp(seg.start)}</time>
                <span>{seg.text}</span>
              </button>
            ))
          ) : (
            <p>{item.transcript.text}</p>
          )}
        </div>
      ) : (
        <p className={s.muted}>
          Your transcript appears here after processing.
        </p>
      )}
      <div className={s.sectionTitle}>
        <h3>Timestamped notes</h3>
        <button
          className={s.textButton}
          onClick={() =>
            setSeconds(Math.floor(player.current?.currentTime || 0))
          }
        >
          Use playback time
        </button>
      </div>
      <form
        className={s.noteForm}
        onSubmit={async (e) => {
          e.preventDefault();
          if (
            await onNote({
              id: crypto.randomUUID(),
              seconds: Number(seconds),
              text: note,
            })
          )
            setNote("");
        }}
      >
        <label>
          Seconds
          <input
            type="number"
            min="0"
            max="180"
            value={seconds}
            onChange={(e) => setSeconds(e.target.value)}
          />
        </label>
        <label>
          Your observation
          <input
            maxLength={1500}
            placeholder="For example: lead with the recommendation."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            required
          />
        </label>
        <button className={s.secondary} disabled={notesBusy || !note.trim()}>
          Add note
        </button>
      </form>
      {item.notes?.map((n) => (
        <div className={s.savedNote} key={n.id}>
          <button
            className={s.textButton}
            onClick={() => {
              if (player.current) player.current.currentTime = n.seconds;
            }}
          >
            {stamp(n.seconds)}
          </button>
          <p>{n.text}</p>
        </div>
      ))}
    </section>
  );
}
export default function Ascent({ email, initialData = null }) {
  const [view, setView] = useState("home"),
    [data, setData] = useState(initialData),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [selected, setSelected] = useState(null),
    [mediaUrl, setMediaUrl] = useState(null);
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id),
    [interviewId, setInterviewId] = useState(INTERVIEWS[0].id),
    [replyMode, setReplyMode] = useState("email"),
    [audience, setAudience] = useState("MD / board"),
    [topic, setTopic] = useState(TOPICS[0]),
    [formatId, setFormatId] = useState("recommendation"),
    [storyAssignmentId, setStoryAssignmentId] = useState(STORY_ASSIGNMENTS[0].id),
    [recordingAssignmentId, setRecordingAssignmentId] = useState(RECORDING_ASSIGNMENTS[0].id),
    [duration, setDuration] = useState(90),
    [answer, setAnswer] = useState(""),
    [parent, setParent] = useState(null),
    [relation, setRelation] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all"),
    [comparison, setComparison] = useState(null),
    [deleteTarget, setDeleteTarget] = useState(null),
    [leaveTo, setLeaveTo] = useState(null),
    [mobileNav, setMobileNav] = useState(false);
  const [roadmap, setRoadmap] = useState(MILESTONES),
    [roadmapDirty, setRoadmapDirty] = useState(false),
    [habits, setHabits] = useState([]),
    [reflection, setReflection] = useState(""),
    [consent, setConsent] = useState(false),
    [uploadProgress, setUploadProgress] = useState(null),
    [uploadFile, setUploadFile] = useState(null),
    [uploadRow, setUploadRow] = useState(null),
    [teleprompter, setTeleprompter] = useState(false),
    [talkingPoints, setTalkingPoints] = useState(
      "Start with one business problem.\nName the trade-off.\nMake your recommendation.\nFinish with the measure that matters.",
    );
  const uploadCancelled = useRef(false),
    requestId = useRef(null),
    picker = useRef(null),
    main = useRef(null),
    xhr = useRef(null),
    dialog = useRef(null),
    initialised = useRef(false);
  const load = useCallback(async () => {
    const result = await api();
    setData(result);
    return result;
  }, []);
  useEffect(() => {
    let active = true;
    (initialData ? Promise.resolve(initialData) : api())
      .then((d) => {
        if (active) setData(d);
        if (active && !initialised.current) {
          initialised.current = true;
          setRoadmap(
            d.settings?.roadmap?.length ? d.settings.roadmap : MILESTONES,
          );
          const today = d.checkins.find((c) => c.day === day());
          if (today) {
            setHabits(today.habits);
            setReflection(today.reflection);
          }
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [load, initialData]);
  const selectedId = selected?.id,
    selectedStatus = selected?.status;
  useEffect(() => {
    if (!selectedId || !ACTIVE.includes(selectedStatus)) return;
    let active = true;
    const timer = setInterval(async () => {
      try {
        const result = await api(`/sessions/${selectedId}`);
        if (active) {
          setNow(Date.now());
          setSelected(result.session);
          setMediaUrl(result.mediaUrl);
          if (!ACTIVE.includes(result.session.status)) await load();
        }
      } catch (e) {
        if (active) setError(e.message);
      }
    }, 3000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [selectedId, selectedStatus, load]);
  const savedCheckin = data?.checkins.find(c => c.day === day());
  const reflectionDirty = !!data && (reflection !== (savedCheckin?.reflection || "") || JSON.stringify([...habits].sort()) !== JSON.stringify([...(savedCheckin?.habits || [])].sort()));
  useEffect(() => {
    if (!answer && !roadmapDirty && !reflectionDirty && uploadProgress === null) return;
    const prevent = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [answer, roadmapDirty, reflectionDirty, uploadProgress]);
  useEffect(() => {
    if (deleteTarget || leaveTo || comparison) {
      const prev = document.activeElement;
      dialog.current?.showModal();
      return () => prev?.focus();
    }
  }, [deleteTarget, leaveTo, comparison]);
  useEffect(() => () => xhr.current?.abort(), []);
  useEffect(() => {
    main.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [view]);
  const done = data?.progress.filter((x) => x.status === "ready") || [],
    todayDate = new Date().toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  const recommended = nextExercise(data?.progress || []);
  const coverage = completedExerciseKeys(data?.progress || []);
  const storyAssignment = STORY_ASSIGNMENTS.find(x => x.id === storyAssignmentId);
  const recordingAssignment = RECORDING_ASSIGNMENTS.find(x => x.id === recordingAssignmentId);
  const latest = done[0],
    chosen =
      view === "interview"
        ? INTERVIEWS.find((x) => x.id === interviewId)
        : SCENARIOS.find((x) => x.id === scenarioId);
  const navigate = (target) => {
    if (uploadProgress !== null) {
      setError("Cancel or finish the upload before switching views.");
      return;
    }
    if (answer || roadmapDirty || reflectionDirty) {
      setLeaveTo(target);
      return;
    }
    go(target);
  };
  const go = (target) => {
    setView(target);
    setSelected(null);
    setParent(null);
    setRelation(null);
    setAnswer("");
    requestId.current = null;
    setError("");
    setNotice("");
    setMobileNav(false);
    setComparison(null);
    if (reflectionDirty) {
      setReflection(savedCheckin?.reflection || "");
      setHabits(savedCheckin?.habits || []);
    }
    if (roadmapDirty) {
      setRoadmap(
        data?.settings?.roadmap?.length ? data.settings.roadmap : MILESTONES,
      );
      setRoadmapDirty(false);
    }
  };
  const startExercise = (exercise) => {
    go(exercise.kind);
    setAudience(exercise.audience || (exercise.role && ["CBO","COO","CFO","CIO","Head of Risk"].includes(exercise.role) ? exercise.role : "MD / board"));
    if (exercise.kind === "scenario") setScenarioId(exercise.id);
    if (exercise.kind === "interview") setInterviewId(exercise.id);
    if (exercise.kind === "story") { setStoryAssignmentId(exercise.id); setFormatId(exercise.formatId); setTopic(exercise.title); }
    if (exercise.kind === "recording") { setRecordingAssignmentId(exercise.id); setDuration(exercise.seconds); setTopic(exercise.title); setTalkingPoints(exercise.cue); }
  };
  const changeAnswer = (value) => {
    setAnswer(value);
    requestId.current = null;
  };
  async function openSession(row) {
    try {
      setBusy(true);
      const result = await api(`/sessions/${row.id}`);
      setSelected(result.session);
      setMediaUrl(result.mediaUrl);
      setView("session");
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function submit(kind = view, text = answer) {
    setMediaUrl(null);
    setBusy(true);
    setError("");
    requestId.current ||= crypto.randomUUID();
    try {
      const result = await api("/reviews", {
        id: requestId.current,
        kind,
        answer: text,
        scenarioId: kind === "interview" ? interviewId : scenarioId,
        replyMode,
        audience,
        topic,
        formatId,
        assignmentId: kind === "story" ? storyAssignmentId : null,
        targetSeconds: duration,
        parentId: parent?.id,
        relation,
      });
      setSelected(result.session);
      setView("session");
      setAnswer("");
      requestId.current = null;
      setParent(null);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function revise(item, follow = false) {
    setParent(item);
    setRelation(
      follow ? "followup" : item.kind === "recording" ? "take" : "revision",
    );
    setSelected(null);
    setView(item.kind);
    setAudience(item.audience);
    setTopic(item.context?.topic || TOPICS[0]);
    setStoryAssignmentId(item.kind === "story" ? item.context?.assignmentId || "" : storyAssignmentId);
    setRecordingAssignmentId(item.kind === "recording" ? item.context?.assignmentId || "" : recordingAssignmentId);
    setDuration(item.target_seconds);
    setReplyMode(item.context?.replyMode || "email");
    if (item.kind === "scenario")
      setScenarioId(item.context?.scenarioId || SCENARIOS[0].id);
    if (item.kind === "interview")
      setInterviewId(item.context?.scenarioId || INTERVIEWS[0].id);
    if (item.kind === "story")
      setFormatId(item.context?.formatId || "recommendation");
    if (item.kind === "reflection")
      setReflection(follow ? "" : item.answer || "");
    changeAnswer(
      follow || ["recording", "reflection"].includes(item.kind)
        ? ""
        : item.answer || "",
    );
    setNotice(
      follow
        ? "Answer this follow-up in your own words: " +
            item.review.followUpChallenge
        : "Keep what works. Change what the evidence calls for.",
    );
  }
  async function retry() {
    setBusy(true);
    setError("");
    try {
      const result = await api("/process", { id: selected.id });
      setSelected(result.session);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function upload(file) {
    if (!file) return;
    setMediaUrl(null);
    if (!consent) {
      setError("Confirm the privacy note before uploading.");
      return;
    }
    if (file.size > MAX_MEDIA_BYTES) {
      setError(
        "This file is over 50 MB. Trim it or export at a lower resolution, then select it again.",
      );
      return;
    }
    uploadCancelled.current = false;
    setUploadFile(file);
    setBusy(true);
    setUploadProgress(0);
    setError("");
    try {
      const bytes = await file.arrayBuffer(),
        hash = await crypto.subtle.digest("SHA-256", bytes),
        sha256 = [...new Uint8Array(hash)]
          .map((x) => x.toString(16).padStart(2, "0"))
          .join("");
      if (uploadCancelled.current) throw Error("Upload cancelled.");
      const result = await api("/recordings", {
        id: crypto.randomUUID(),
        filename: file.name,
        bytes: file.size,
        sha256,
        title: topic,
        assignmentId: recordingAssignmentId,
        topic,
        audience,
        targetSeconds: duration,
        parentId: parent?.id,
        relation: parent ? relation || "take" : null,
      });
      setUploadRow(result.session);
      if (uploadCancelled.current)
        throw Error(
          "Upload cancelled. The incomplete session can be removed from your library.",
        );
      if (result.upload) {
        await new Promise((resolve, reject) => {
          const request = new XMLHttpRequest();
          xhr.current = request;
          request.open("PUT", result.upload.url);
          request.setRequestHeader("Content-Type", result.upload.mime);
          request.timeout = 180000;
          request.upload.onprogress = (e) => {
            if (e.lengthComputable)
              setUploadProgress(Math.round((e.loaded / e.total) * 100));
          };
          request.onload = () =>
            (request.status >= 200 && request.status < 300) ||
            request.status === 409
              ? resolve()
              : reject(
                  Error(
                    "Upload did not complete. Your file remains on this device; retry it.",
                  ),
                );
          request.onerror = () =>
            reject(
              Error("Upload interrupted. Check your connection and retry."),
            );
          request.ontimeout = () =>
            reject(
              Error(
                "Upload timed out. Try a smaller recording or a stronger connection.",
              ),
            );
          request.onabort = () =>
            reject(
              Error(
                "Upload cancelled. You can retry this file or remove the incomplete session from your library.",
              ),
            );
          request.send(file);
        });
        if (uploadCancelled.current) throw Error("Upload cancelled before processing. The file remains private in your library.");
        const processed = await api("/process", { id: result.session.id });
        setSelected(processed.session);
      } else { const existing=await api(`/sessions/${result.session.id}`);setSelected(existing.session);setMediaUrl(existing.mediaUrl); }
      setView("session");
      setUploadFile(null);
      setUploadRow(null);
      setAnswer("");
      setParent(null);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setUploadProgress(null);
      setBusy(false);
      xhr.current = null;
    }
  }
  async function saveNotes(note) {
    setBusy(true);
    setError("");
    try {
      const result = await api(
        `/sessions/${selected.id}`,
        { notes: [...(selected.notes || []), note] },
        "PATCH",
      );
      setSelected(result.session);
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function compare() {
    setBusy(true);
    try {
      const result = await api(`/sessions/${selected.parent_id}`);
      setComparison(result.session);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const exportReport = (item) => {
    const r=item.review;
    const lines=[`ASCENT — ${item.title}`,`Saved: ${item.created_at}`,`Mode: ${MODES[item.kind]}`,`Rubric: ${item.rubric_version}`,"", "PROMPT",item.prompt,"", "YOUR RESPONSE",item.answer||item.transcript?.text||"", ""];
    if(r) lines.push(`OVERALL: ${r.overallScore??"Not scored"}/10`,...r.dimensions.map(d=>`${d.key}: ${d.score??"Not scored"}/10\nEvidence: ${d.evidence}\nNext action: ${d.nextAction}`),"", "WHAT WORKED",...r.strengths,"", "PRIORITIES",...r.priorities,"", "STRONGER RESPONSE — DRAFT",r.improvedResponse,"", "NEXT QUESTION",r.followUpChallenge,"",r.coachingNote,"", "LIMITATIONS",...r.limitations);
    if(item.notes?.length) lines.push("","YOUR NOTES",...item.notes.map(n=>`${stamp(n.seconds)} — ${n.text}`));
    if(r?.publication?.title) lines.push("","PUBLICATION DRAFT — NOT PUBLISHED",r.publication.title,r.publication.summary,r.publication.caption);
    download("ascent-coaching-report.txt",lines.join("\n"));
  };
  const isStalled =
    selected?.lease_until && new Date(selected.lease_until).getTime() < now;
  return (
    <div className={s.app}>
      <aside className={`${s.sidebar} ${mobileNav ? s.sidebarOpen : ""}`}>
        <Link className={s.brandLink} href="/ascent">
          <Logo />
        </Link>
        <div className={s.privateLabel}>
          <Icon name="shield" size={13} /> YOUR PRIVATE PRACTICE
        </div>
        <nav aria-label="Ascent navigation">
          {NAV.map(([key, label, icon]) => (
            <button
              key={key}
              className={view === key ? s.activeNav : ""}
              aria-current={view === key ? "page" : undefined}
              onClick={() => navigate(key)}
            >
              <Icon name={icon} size={18} />
              {label}
              {key === "recording" && <span className={s.navBadge}>NEW</span>}
            </button>
          ))}
        </nav>
        <section className={s.sidebarGoal}>
          <span>THE HORIZON</span>
          <strong>March 2027</strong>
          <p>
            Your next chapter starts
            <br />
            with today’s practice.
          </p>
          <div>
            <i
              style={{
                width: `${Math.round((roadmap.filter((m) => m.done).length / Math.max(1, roadmap.length)) * 100)}%`,
              }}
            />
          </div>
          <small>
            {roadmap.filter((m) => m.done).length} of {roadmap.length}{" "}
            milestones complete
          </small>
        </section>
        <div className={s.identity}>
          <span>{email.slice(0, 2).toUpperCase()}</span>
          <div>
            <strong>Your executive studio</strong>
            <small>Only you have access</small>
          </div>
        </div>
        <Link className={s.back} href="/workspace">
          ← StockedBy workspace
        </Link>
      </aside>
      {mobileNav && (
        <button
          className={s.navBackdrop}
          aria-label="Close navigation"
          onClick={() => setMobileNav(false)}
        />
      )}
      <main className={s.main} ref={main} tabIndex={-1}>
        <header className={s.topbar}>
          <div>
            <button
              className={s.menuButton}
              aria-label="Open navigation"
              onClick={() => setMobileNav(true)}
            >
              ☰
            </button>
            <span>
              ASCENT <i>/</i>{" "}
              <strong>
                {view === "session"
                  ? "Session review"
                  : NAV.find((n) => n[0] === view)?.[1]}
              </strong>
            </span>
          </div>
          <span className={s.privateStatus}>
            <Icon name="shield" size={14} /> Private to you
          </span>
        </header>
        <div className={s.content}>
          {error && (
            <div role="alert" className={s.error}>
              {error}
              <button aria-label="Dismiss error" onClick={() => setError("")}>
                ×
              </button>
            </div>
          )}
          {notice && (
            <div role="status" className={s.notice}>
              {notice}
            </div>
          )}
          {!data ? (
            <div className={s.loading}>
              <span className={s.spinner} />
              <h2>Opening your private studio…</h2>
              {error && (
                <button
                  className={s.secondary}
                  onClick={() => load().catch((e) => setError(e.message))}
                >
                  Try again
                </button>
              )}
            </div>
          ) : (
            <>
              {view === "home" && (
                <>
                  <div className={s.pageHeading}>
                    <div>
                      <span className={s.kicker}>{todayDate}</span>
                      <h1>
                        Make your next
                        <br />
                        answer count.
                      </h1>
                      <p>
                        A little deliberate practice. A more considered leader.
                      </p>
                    </div>
                    <button
                      className={s.secondary}
                      onClick={() => navigate("history")}
                    >
                      View your progress <Icon name="arrow" size={16} />
                    </button>
                  </div>
                  <section className={s.hero}>
                    <div>
                      <span className={s.kicker}>YOUR NEXT PRACTICE · {recommended.minutes} MINUTES</span>
                      <h2>{recommended.title}</h2>
                      <p>{MODES[recommended.kind]} · {recommended.level}<br />{recommended.cue}</p>
                      <button className={s.primary} onClick={() => startExercise(recommended)}>Start next practice <Icon name="arrow" size={17} /></button>
                      <small>
                        {recommended.kind === "recording" ? "Record your response. Get specific AI coaching." : "Write your real response. Get specific AI coaching."}
                      </small>
                    </div>
                    <div className={s.heroArt}>
                      <span>
                        THE WORK BETWEEN
                        <br />
                        HERE AND WHAT’S NEXT.
                      </span>
                      <Mountain />
                      <div>
                        <span>Practice</span>
                        <i />
                        <span>Reflect</span>
                        <i />
                        <span>Refine</span>
                      </div>
                    </div>
                  </section>
                  <div className={s.programmeBanner}><div><strong>200 exercises. A programme you can grow into.</strong><p>50 scenarios · 50 stories · 50 recording assignments · 50 interview questions. {coverage.size} {coverage.size === 1 ? "exercise" : "exercises"} reviewed.</p></div><button className={s.secondary} onClick={() => navigate("programme")}>Explore the programme <Icon name="arrow" size={16} /></button></div>
                  <div className={s.stats}>
                    <article>
                      <span>Completed practices</span>
                      <strong>{done.length.toString().padStart(2, "0")}</strong>
                      <small>
                        {done.length
                          ? "Real sessions. Real work."
                          : "Your first practice sets the baseline."}
                      </small>
                    </article>
                    <article>
                      <span>Recordings reviewed</span>
                      <strong>
                        {done
                          .filter((x) => x.kind === "recording")
                          .length.toString()
                          .padStart(2, "0")}
                      </strong>
                      <small>Each take is a chance to sharpen one thing.</small>
                    </article>
                    <article>
                      <span>Latest attempt</span>
                      <strong>
                        {latest?.overall_score ?? "—"}
                        {latest?.overall_score != null && <em>/10</em>}
                      </strong>
                      <small>
                        {latest
                          ? `${MODES[latest.kind]} · ${date(latest.created_at)}`
                          : "No invented readiness score."}
                      </small>
                    </article>
                  </div>
                  <div className={s.sectionTitle}>
                    <h2>Different moments. One stronger voice.</h2>
                    <span>YOUR PRACTICE ROOMS</span>
                  </div>
                  <div className={s.rooms}>
                    {[
                      [
                        "scenario",
                        "brief",
                        "The difficult conversation",
                        "Respond with clarity, evidence and a useful next step.",
                        "5 min",
                      ],
                      [
                        "story",
                        "stories",
                        "The story that lands",
                        "Turn real experience into a memorable business narrative.",
                        "8 min",
                      ],
                      [
                        "recording",
                        "play",
                        "Your next take",
                        "Record on your iPhone. Listen, review and try again.",
                        "10 min",
                      ],
                      [
                        "interview",
                        "spark",
                        "The seat at the table",
                        "Rehearse demanding CDO and board-level questions.",
                        "8 min",
                      ],
                    ].map(([key, icon, title, copy, time]) => (
                      <button key={key} onClick={() => navigate(key)}>
                        <span className={s.roomIcon}>
                          <Icon name={icon} size={22} />
                        </span>
                        <small>{time} practice</small>
                        <h3>{title}</h3>
                        <p>{copy}</p>
                        <span className={s.roomArrow}>
                          <Icon name="arrow" size={17} />
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className={s.bottomGrid}>
                    <section className={s.principle}>
                      <span className={s.kicker}>A PRINCIPLE TO PRACTISE</span>
                      <h2>
                        Start with the decision.
                        <br />
                        Then earn it with evidence.
                      </h2>
                      <p>
                        Before giving the background, tell your audience what
                        you recommend and why it matters. Let the detail support
                        the point.
                      </p>
                    </section>
                    <section className={s.recent}>
                      <div className={s.sectionTitle}>
                        <h2>Recently, in your studio</h2>
                        <button
                          className={s.textButton}
                          onClick={() => navigate("history")}
                        >
                          See all
                        </button>
                      </div>
                      {data.sessions.length ? (
                        data.sessions.slice(0, 3).map((item) => (
                          <button
                            key={item.id}
                            onClick={() => openSession(item)}
                          >
                            <span>
                              <strong>{item.title}</strong>
                              <small>
                                {MODES[item.kind]} · {date(item.created_at)}
                              </small>
                            </span>
                            <span className={s.status}>
                              {item.status === "ready"
                                ? "Reviewed"
                                : item.status}
                            </span>
                            <Icon name="arrow" size={15} />
                          </button>
                        ))
                      ) : (
                        <p className={s.empty}>
                          Your first session belongs here.
                          <br />
                          Start small. Give an honest answer.
                        </p>
                      )}
                    </section>
                  </div>
                </>
              )}
              {view === "programme" && <Programme progress={data.progress} onStart={startExercise} />}
              {["scenario", "story", "interview"].includes(view) && (
                <>
                  <div className={s.pageHeading}>
                    <div>
                      <span className={s.kicker}>
                        {view === "scenario"
                          ? "THINK CLEARLY UNDER PRESSURE"
                          : view === "story"
                            ? "MAKE THE COMPLEX FEEL CLEAR"
                            : "EARN THE NEXT QUESTION"}
                      </span>
                      <h1>
                        {view === "scenario"
                          ? "The executive response."
                          : view === "story"
                            ? "A story worth hearing."
                            : "The CDO conversation."}
                      </h1>
                      <p>
                        {view === "story"
                          ? "True experience. A clear point. A reason to care."
                          : "Practise the exact words you would use. No multiple-choice answers."}
                      </p>
                    </div>
                  </div>
                  <div className={s.programmeToolbar}><span>50 exercises · Foundation to boardroom</span><button className={s.textButton} onClick={() => navigate("programme")}>Browse all exercises →</button></div>
                  <div className={s.practiceGrid}>
                    <section className={s.exercise}>
                      <span className={s.kicker}>
                        {parent
                          ? relation === "followup"
                            ? "THE FOLLOW-UP"
                            : "ANOTHER ATTEMPT"
                          : view === "story"
                            ? "SHAPE YOUR STORY"
                            : "CHOOSE YOUR MOMENT"}
                      </span>
                      {!parent &&
                        (view === "story" ? (
                          <>
                            <label>Story assignment<select value={storyAssignmentId} onChange={e => { const x = STORY_ASSIGNMENTS.find(x => x.id === e.target.value); setStoryAssignmentId(e.target.value); if (x) {setFormatId(x.formatId);setTopic(x.title);setAudience(x.audience);} }}><option value="">My own topic</option>{STORY_ASSIGNMENTS.map(x => <option key={x.id} value={x.id}>{x.title} · {x.level}</option>)}</select></label>
                            <label>
                              Format
                              <select
                                value={formatId}
                                onChange={(e) => setFormatId(e.target.value)}
                              >
                                {STORY_FORMATS.map((f) => (
                                  <option key={f.id} value={f.id}>
                                    {f.title} · {f.seconds} seconds
                                  </option>
                                ))}
                              </select>
                            </label>
                            {!storyAssignment && <label>
                              Topic
                              <input
                                list="ascent-topics"
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                maxLength={120}
                              />
                            </label>}
                            <datalist id="ascent-topics">
                              {TOPICS.map((t) => (
                                <option key={t} value={t} />
                              ))}
                            </datalist>
                          </>
                        ) : (
                          <label>
                            Situation
                            <select
                              value={
                                view === "interview" ? interviewId : scenarioId
                              }
                              onChange={(e) =>
                                view === "interview"
                                  ? setInterviewId(e.target.value)
                                  : setScenarioId(e.target.value)
                              }
                            >
                              {(view === "interview"
                                ? INTERVIEWS
                                : SCENARIOS
                              ).map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.role} · {c.title}
                                </option>
                              ))}
                            </select>
                          </label>
                        ))}
                      <div className={s.scenarioPrompt}>
                        <span>
                          {view === "story" ? "THE STORY ARC" : chosen?.role}
                        </span>
                        <h2>
                          {parent
                            ? parent.title
                            : view === "story"
                              ? storyAssignment?.title || topic
                              : chosen?.title}
                        </h2>
                        <p>
                          {parent
                            ? relation === "followup"
                              ? parent.review.followUpChallenge
                              : parent.prompt
                            : view === "story"
                              ? storyAssignment?.prompt || "Move from the business problem to the decision that matters. Use only real outcomes. If the result is unknown, name the measurement plan."
                              : chosen?.prompt}
                        </p>
                      </div>
                      {view === "story" ? (
                        <ol className={s.storyArc}>
                          {FRAMEWORK.map((f, i) => (
                            <li key={f}>
                              <span>{String(i + 1).padStart(2, "0")}</span>
                              {f}
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <div className={s.cue}>
                          <Icon name="spark" size={18} />
                          <p>{chosen?.cue}</p>
                        </div>
                      )}
                      <p className={s.fine}>
                        Use roles such as CBO or MD. Leave out customer data,
                        confidential employer information and real colleagues’
                        names.
                      </p>
                    </section>
                    <section className={s.answerPanel}>
                      <div className={s.sectionTitle}>
                        <h2>Your actual words</h2>
                        {parent && <span>New attempt</span>}
                      </div>
                      <div className={s.answerControls}>
                        {view === "scenario" && (
                          <div
                            className={s.segmented}
                            aria-label="Response format"
                          >
                            {["email", "verbal"].map((mode) => (
                              <button
                                key={mode}
                                aria-pressed={replyMode === mode}
                                onClick={() => setReplyMode(mode)}
                              >
                                {mode === "email"
                                  ? "Email response"
                                  : "Verbal response"}
                              </button>
                            ))}
                          </div>
                        )}
                        <label>
                          Audience
                          <select
                            value={audience}
                            onChange={(e) => setAudience(e.target.value)}
                          >
                            {[
                              "MD / board",
                              "CBO",
                              "COO",
                              "CFO",
                              "CIO",
                              "Head of Risk",
                              "Product leaders",
                              "General audience",
                            ].map((a) => (
                              <option key={a}>{a}</option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <label htmlFor="ascent-answer">
                        {view === "story"
                          ? "Your spoken script"
                          : replyMode === "verbal"
                            ? "What would you say?"
                            : "What would you write?"}
                      </label>
                      <textarea
                        id="ascent-answer"
                        className={s.answer}
                        value={answer}
                        onChange={(e) => changeAnswer(e.target.value)}
                        maxLength={12000}
                        placeholder={
                          view === "story"
                            ? "Start with the one idea you want your audience to remember…"
                            : "Write your real response. We will work with the words you choose…"
                        }
                      />
                      <div className={s.answerFooter}>
                        <span>
                          {answer.trim()
                            ? answer.trim().split(/\s+/).length
                            : 0}{" "}
                          words · {answer.length}/12,000 characters
                        </span>
                        <span>Not submitted yet</span>
                      </div>
                      <div className={s.submitRow}>
                        <p>
                          Sent privately to OpenAI for coaching.
                          <br />
                          Your response and review are saved online.
                        </p>
                        <button
                          className={s.primary}
                          disabled={busy || answer.trim().length < 30}
                          onClick={() => submit()}
                        >
                          {busy ? "Submitting…" : "Get AI review"}
                          <Icon name="spark" size={17} />
                        </button>
                      </div>
                      <div className={s.expected}>
                        <span className={s.kicker}>WHAT COMES BACK</span>
                        <span>Evidence-backed score</span>
                        <span>Specific corrections</span>
                        <span>A stronger draft</span>
                        <span>A tougher question</span>
                      </div>
                    </section>
                  </div>
                </>
              )}
              {view === "recording" && (
                <>
                  <div className={s.pageHeading}>
                    <div>
                      <span className={s.kicker}>RECORD. LISTEN. REFINE.</span>
                      <h1>Your next take.</h1>
                      <p>
                        One idea. A clear audience. A stronger version of your
                        own voice.
                      </p>
                    </div>
                    <span className={s.pill}>iPhone Camera & Voice Memos</span>
                  </div>
                  <div className={s.programmeToolbar}><span>50 recording assignments · Practise one clear idea</span><button className={s.textButton} onClick={() => navigate("programme")}>Browse all exercises →</button></div>
                  <div className={s.recordGrid}>
                    <section className={s.exercise}>
                      {!parent && <label>Recording assignment<select value={recordingAssignmentId} onChange={e => { const x = RECORDING_ASSIGNMENTS.find(x => x.id === e.target.value); setRecordingAssignmentId(e.target.value); if(x){setTopic(x.title);setAudience(x.audience);setDuration(x.seconds);setTalkingPoints(x.cue);} }}><option value="">My own topic</option>{RECORDING_ASSIGNMENTS.map(x => <option key={x.id} value={x.id}>{x.title} · {x.level}</option>)}</select></label>}
                      {(parent || recordingAssignment) && <div className={s.scenarioPrompt}><span>{recordingAssignment?.domain || "YOUR ASSIGNMENT"}</span><h2>{parent?.title || recordingAssignment?.title}</h2><p>{parent?.prompt || recordingAssignment?.prompt}</p></div>}
                      {!parent && !recordingAssignment && <label>
                        Assignment / topic
                        <input
                          list="ascent-record-topics"
                          value={topic}
                          onChange={(e) => setTopic(e.target.value)}
                          maxLength={120}
                        />
                      </label>}
                      <datalist id="ascent-record-topics">
                        {TOPICS.map((t) => (
                          <option key={t} value={t} />
                        ))}
                      </datalist>
                      <label>
                        Audience
                        <select
                          value={audience}
                          onChange={(e) => setAudience(e.target.value)}
                        >
                          {[
                            "MD / board",
                            "Product leaders",
                            "General audience",
                          ].map((a) => (
                            <option key={a}>{a}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Target length
                        <select
                          value={duration}
                          onChange={(e) => setDuration(Number(e.target.value))}
                        >
                          {[60, 90, 180].map((n) => (
                            <option key={n} value={n}>
                              {n} seconds
                            </option>
                          ))}
                        </select>
                      </label>
                      {parent && (
                        <p className={s.notice}>
                          Take two · {parent.review?.coachingNote}
                        </p>
                      )}
                      <h3>Before you press record</h3>
                      <ol className={s.tips}>
                        <li>Choose one recommendation and one real example.</li>
                        <li>
                          Put the camera at eye level, find a quiet spot and
                          face the light.
                        </li>
                        <li>
                          Pause before the opening. Speak to one person, not a
                          room.
                        </li>
                      </ol>
                      <button
                        className={s.secondary}
                        onClick={() => setTeleprompter(!teleprompter)}
                      >
                        {teleprompter ? "Close" : "Open"} talking-point prompter
                      </button>
                      {teleprompter && (
                        <div className={s.prompter}>
                          <label>
                            Your prompts
                            <textarea
                              value={talkingPoints}
                              onChange={(e) => setTalkingPoints(e.target.value)}
                              maxLength={3000}
                            />
                          </label>
                          <p>
                            Scroll at your own pace. Use prompts, not a
                            memorised script.
                          </p>
                        </div>
                      )}
                    </section>
                    <section className={s.uploadPanel}>
                      <div className={s.recordSymbol}>
                        <Icon name="play" size={35} />
                      </div>
                      <h2>Bring your recording.</h2>
                      <p>
                        Record on your iPhone. Select it from Photos or Files.
                        <br />
                        Audio-only practice works just as well.
                      </p>
                      <div className={s.formatTags}>
                        <span>MOV</span>
                        <span>MP4</span>
                        <span>M4A</span>
                        <span>WAV / MP3 / WebM</span>
                      </div>
                      <label className={s.consent}>
                        <input
                          type="checkbox"
                          checked={consent}
                          onChange={(e) => setConsent(e.target.checked)}
                        />
                        <span>
                          I have removed confidential information and customer
                          details. I understand that extracted audio and
                          transcripts go to OpenAI for coaching. My recording
                          stays private.
                        </span>
                      </label>
                      <input
                        hidden
                        type="file"
                        accept={MEDIA_ACCEPT}
                        ref={picker}
                        onChange={(e) => {
                          upload(e.target.files[0]);
                          e.target.value = "";
                        }}
                        aria-label="Choose private recording"
                      />
                      {uploadProgress !== null ? (
                        <div className={s.uploading}>
                          <div role="status">
                            {uploadProgress === 100
                              ? "Upload complete · preparing processing…"
                              : `Uploading · ${uploadProgress}%`}
                          </div>
                          <progress value={uploadProgress} max={100} />
                          <button
                            className={s.secondary}
                            onClick={() => {
                              uploadCancelled.current = true;
                              xhr.current?.abort();
                            }}
                          >
                            Cancel upload
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            className={s.primary}
                            disabled={busy || !consent}
                            onClick={() => picker.current?.click()}
                          >
                            <Icon name="upload" size={18} /> Choose a recording
                          </button>
                          {uploadFile && (
                            <button
                              className={s.textButton}
                              disabled={busy}
                              onClick={() => upload(uploadFile)}
                            >
                              Retry {uploadFile.name}
                            </button>
                          )}
                          {uploadRow && (
                            <button
                              className={s.textButton}
                              onClick={() => openSession(uploadRow)}
                            >
                              Open saved upload session
                            </button>
                          )}
                        </>
                      )}
                      <p className={s.fine}>
                        Up to 50 MB · Up to 3 minutes · One file per take
                        <br />
                        For large iPhone videos, trim or export at a lower
                        resolution first.
                      </p>
                      <div className={s.uploadPromise}>
                        <Icon name="shield" size={18} />
                        <span>
                          Private storage. Secure playback. Yours to export or
                          delete.
                          <small>
                            No automatic publishing. No claims about body
                            language or vocal tone.
                          </small>
                        </span>
                      </div>
                    </section>
                  </div>
                </>
              )}
              {view === "session" && selected && (
                <>
                  <div className={s.pageHeading}>
                    <div>
                      <span className={s.kicker}>
                        {MODES[selected.kind]} · {date(selected.created_at)}
                      </span>
                      <h1>{selected.title}</h1>
                      <p>
                        {selected.status === "ready"
                          ? "Your response and coaching are saved in your private library."
                          : "Your session is saved. Processing can continue while you leave this page."}
                      </p>
                    </div>
                    <div className={s.actions}>
                      <button
                        className={s.secondary}
                        onClick={() => exportReport(selected)}
                      >
                        <Icon name="export" size={16} /> Export
                      </button>
                      <button
                        className={s.iconButton}
                        aria-label="Delete session"
                        onClick={() => setDeleteTarget(selected)}
                      >
                        <Icon name="trash" size={18} />
                      </button>
                    </div>
                  </div>
                  {selected.status !== "ready" && (
                    <section className={s.processing}>
                      <div>
                        {ACTIVE.includes(selected.status) && !isStalled ? (
                          <span className={s.spinner} />
                        ) : (
                          <Icon name="clock" size={27} />
                        )}
                        <h2>
                          {isStalled
                            ? "Processing was interrupted."
                            : selected.status === "failed"
                              ? "This take needs another try."
                              : selected.status === "uploading"
                                ? "Waiting for your upload."
                                : selected.status === "deleting"
                                  ? "Deletion needs to finish."
                                  : selected.status === "transcribing"
                                    ? "Finding your words."
                                    : selected.status === "reviewing"
                                      ? "Reviewing the evidence."
                                      : "Preparing your session."}
                        </h2>
                        <p>
                          {selected.error ||
                            (isStalled
                              ? "The processing window ended. Retry to resume the saved session."
                              : "Your previous work is safe. Status updates appear here automatically.")}
                        </p>
                        <div className={s.processingSteps}>
                          {[
                            "Upload",
                            "Process",
                            "Transcribe",
                            "Review",
                            "Ready",
                          ]
                            .filter(
                              (x) =>
                                selected.kind === "recording" ||
                                !["Upload", "Transcribe"].includes(x),
                            )
                            .map((x) => (
                              <span key={x}>{x}</span>
                            ))}
                        </div>
                        {(selected.status === "failed" ||
                          selected.status === "queued" ||
                          isStalled ||
                          selected.status === "uploading") && (
                          <button
                            className={s.primary}
                            disabled={busy}
                            onClick={retry}
                          >
                            {busy
                              ? "Starting…"
                              : selected.status === "uploading"
                                ? "Check completed upload"
                                : "Retry processing"}
                          </button>
                        )}
                        {selected.status === "deleting" && (
                          <button
                            className={s.secondary}
                            onClick={() => setDeleteTarget(selected)}
                          >
                            Finish deletion
                          </button>
                        )}
                        {selected.status === "uploading" && (
                          <button
                            className={s.secondary}
                            onClick={() => {
                              setView("recording");
                              setConsent(false);
                            }}
                          >
                            Select the file again
                          </button>
                        )}
                      </div>
                    </section>
                  )}
                  <div
                    className={
                      selected.kind === "recording"
                        ? s.sessionGrid
                        : s.textSessionGrid
                    }
                  >
                    {selected.kind === "recording" ? (
                      <MediaPlayer
                        item={selected}
                        url={mediaUrl}
                        onRefresh={() => openSession(selected)}
                        onNote={saveNotes}
                        notesBusy={busy}
                      />
                    ) : (
                      <section className={s.submitted}>
                        <span className={s.kicker}>THE MOMENT</span>
                        <p>{selected.prompt}</p>
                        <hr />
                        <span className={s.kicker}>
                          YOUR SUBMITTED RESPONSE
                        </span>
                        <p className={s.submittedAnswer}>{selected.answer}</p>
                        {selected.metrics && (
                          <small>
                            {selected.metrics.wordCount} words · estimated{" "}
                            {selected.metrics.estimatedScriptSeconds}s at 130
                            words/minute, not measured delivery
                          </small>
                        )}
                        <button
                          className={s.textButton}
                          disabled={selected.status !== "ready"}
                          onClick={() => revise(selected)}
                        >
                          Rewrite my original answer{" "}
                          <Icon name="edit" size={15} />
                        </button>
                      </section>
                    )}
                    <Report
                      item={selected}
                      onRevise={() => revise(selected)}
                      onFollow={() => {
                        if (selected.kind === "recording") {
                          setNotice(
                            "Record a new take answering this follow-up: " +
                              selected.review.followUpChallenge,
                          );
                          revise(selected, true);
                        } else revise(selected, true);
                      }}
                      onCompare={compare}
                    />
                  </div>
                </>
              )}
              {view === "history" && (
                <>
                  <div className={s.pageHeading}>
                    <div>
                      <span className={s.kicker}>PROOF OF THE WORK</span>
                      <h1>Your private library.</h1>
                      <p>
                        Responses, recordings and reflections. Every attempt
                        belongs to you.
                      </p>
                    </div>
                  </div>
                  <div className={s.filters}>
                    <label>
                      Search sessions
                      <input
                        placeholder="Find a topic or phrase…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </label>
                    <label>
                      Training mode
                      <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                      >
                        <option value="all">All practice</option>
                        {Object.entries(MODES).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className={s.historyList}>
                    {data.sessions
                      .filter(
                        (x) =>
                          (filter === "all" || x.kind === filter) &&
                          `${x.title} ${x.answer} ${x.transcript?.text || ""}`
                            .toLowerCase()
                            .includes(search.toLowerCase()),
                      )
                      .map((item) => (
                        <button key={item.id} onClick={() => openSession(item)}>
                          <span className={s.roomIcon}>
                            <Icon
                              name={
                                item.kind === "recording" ? "play" : "brief"
                              }
                              size={20}
                            />
                          </span>
                          <div>
                            <span className={s.kicker}>
                              {MODES[item.kind]} · {date(item.created_at)}
                            </span>
                            <h3>{item.title}</h3>
                            <p>
                              {item.parent_id ? "Continued practice · " : ""}
                              {item.status === "ready"
                                ? "Coaching ready"
                                : item.status}
                            </p>
                          </div>
                          <strong>
                            {item.review?.overallScore != null
                              ? `${item.review.overallScore}/10`
                              : "—"}
                          </strong>
                          <Icon name="arrow" size={17} />
                        </button>
                      ))}
                  </div>
                  {!data.sessions.length && (
                    <div className={s.empty}>
                      <h2>Your first practice is the starting point.</h2>
                      <button
                        className={s.primary}
                        onClick={() => navigate("scenario")}
                      >
                        Start a scenario
                      </button>
                    </div>
                  )}
                  {data.nextOffset !== null && (
                    <button
                      className={s.secondary}
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          const more = await api(`?offset=${data.nextOffset}`);
                          setData((d) => ({
                            ...d,
                            sessions: [...d.sessions, ...more.sessions],
                            nextOffset: more.nextOffset,
                          }));
                        } catch (e) {
                          setError(e.message);
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      Load more sessions
                    </button>
                  )}
                  <p className={s.fine}>
                    Search covers the {data.sessions.length} loaded sessions.
                    Scores compare best within the same exercise and rubric.
                  </p>
                </>
              )}
              {view === "roadmap" && (
                <>
                  <div className={s.pageHeading}>
                    <div>
                      <span className={s.kicker}>
                        OCTOBER 2026 → MARCH 2027
                      </span>
                      <h1>A considered path forward.</h1>
                      <p>
                        Edit the milestones to fit your circumstances. Progress
                        is yours to define.
                      </p>
                    </div>
                    <button
                      className={s.primary}
                      disabled={busy || !roadmapDirty}
                      onClick={async () => {
                        setBusy(true);
                        setError("");
                        try {
                          const result = await api("", {
                            action: "settings",
                            roadmap,
                            version: data.settings?.version || 0,
                          });
                          setData((d) => ({ ...d, settings: result.settings }));
                          setRoadmapDirty(false);
                          setNotice("Roadmap saved online.");
                        } catch (e) {
                          setError(e.message);
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      {busy ? "Saving…" : "Save roadmap"}
                    </button>
                  </div>
                  <div className={s.roadmap}>
                    {roadmap.map((m, index) => (
                      <article key={m.id}>
                        <div className={s.milestoneNumber}>
                          {m.done ? (
                            <Icon name="check" size={24} />
                          ) : (
                            String(index + 1).padStart(2, "0")
                          )}
                        </div>
                        <div>
                          <label>
                            Milestone
                            <input
                              value={m.title}
                              maxLength={150}
                              onChange={(e) => {
                                setRoadmap((items) =>
                                  items.map((x) =>
                                    x.id === m.id
                                      ? { ...x, title: e.target.value }
                                      : x,
                                  ),
                                );
                                setRoadmapDirty(true);
                              }}
                            />
                          </label>
                          <label>
                            What progress looks like
                            <textarea
                              value={m.detail}
                              maxLength={1000}
                              onChange={(e) => {
                                setRoadmap((items) =>
                                  items.map((x) =>
                                    x.id === m.id
                                      ? { ...x, detail: e.target.value }
                                      : x,
                                  ),
                                );
                                setRoadmapDirty(true);
                              }}
                            />
                          </label>
                        </div>
                        <div>
                          <label>
                            Target date
                            <input
                              type="date"
                              value={m.date}
                              onChange={(e) => {
                                setRoadmap((items) =>
                                  items.map((x) =>
                                    x.id === m.id
                                      ? { ...x, date: e.target.value }
                                      : x,
                                  ),
                                );
                                setRoadmapDirty(true);
                              }}
                            />
                          </label>
                          <label className={s.checkbox}>
                            <input
                              type="checkbox"
                              checked={m.done}
                              onChange={(e) => {
                                setRoadmap((items) =>
                                  items.map((x) =>
                                    x.id === m.id
                                      ? { ...x, done: e.target.checked }
                                      : x,
                                  ),
                                );
                                setRoadmapDirty(true);
                              }}
                            />
                            Completed
                          </label>
                        </div>
                      </article>
                    ))}
                  </div>
                  <p className={s.fine}>
                    These are development intentions, not a prediction of an
                    offer, promotion or resignation date.
                  </p>
                </>
              )}
              {view === "reflection" && (
                <>
                  <div className={s.pageHeading}>
                    <div>
                      <span className={s.kicker}>{todayDate}</span>
                      <h1>Close the day with intention.</h1>
                      <p>
                        Notice what helped. Choose one thing for tomorrow. No
                        streaks to protect.
                      </p>
                    </div>
                  </div>
                  <div className={s.practiceGrid}>
                    <section className={s.exercise}>
                      <h2>What made space for better work?</h2>
                      <p className={s.muted}>
                        Choose what felt useful today. This is a reflection, not
                        a scorecard.
                      </p>
                      <div className={s.habits}>
                        {HABITS.map((h, i) => (
                          <label key={h}>
                            <input
                              type="checkbox"
                              checked={habits.includes(i)}
                              onChange={(e) =>
                                setHabits((old) =>
                                  e.target.checked
                                    ? [...old, i]
                                    : old.filter((x) => x !== i),
                                )
                              }
                            />
                            <span>{h}</span>
                          </label>
                        ))}
                      </div>
                    </section>
                    <section className={s.answerPanel}>
                      <label htmlFor="reflection">
                        What triggered me? What would the executive version of
                        me say next time?
                      </label>
                      <textarea
                        id="reflection"
                        className={s.answer}
                        value={reflection}
                        onChange={(e) => setReflection(e.target.value)}
                        maxLength={6000}
                        placeholder="A short, honest reflection is enough…"
                      />
                      <div className={s.actions}>
                        <button
                          className={s.secondary}
                          disabled={busy}
                          onClick={async () => {
                            setBusy(true);
                            setError("");
                            try {
                              await api("", {
                                action: "checkin",
                                day: day(),
                                habits,
                                reflection,
                              });
                              setNotice("Today’s check-in is saved online.");
                              await load();
                            } catch (e) {
                              setError(e.message);
                            } finally {
                              setBusy(false);
                            }
                          }}
                        >
                          Save check-in
                        </button>
                        <button
                          className={s.primary}
                          disabled={busy || reflection.trim().length < 30}
                          onClick={() => submit("reflection", reflection)}
                        >
                          Get tomorrow’s drill <Icon name="spark" size={17} />
                        </button>
                      </div>
                      <p className={s.fine}>
                        AI reviews the reflection only when you request a drill.
                        Do not include sensitive personal or workplace details.
                      </p>
                    </section>
                  </div>
                  <section className={s.checkinHistory}>
                    <div className={s.sectionTitle}>
                      <h2>Previous check-ins</h2>
                      <button
                        className={s.textButton}
                        onClick={() =>
                          download(
                            "ascent-checkins.json",
                            JSON.stringify(data.checkins, null, 2),
                            "application/json",
                          )
                        }
                      >
                        Export check-ins
                      </button>
                    </div>
                    {data.checkins.slice(0, 20).map((c) => (
                      <article key={c.day}>
                        <strong>{c.day}</strong>
                        <p>{c.reflection || "A quiet check-in."}</p>
                        <small>{c.habits.length} intentional activities</small>
                        <button
                          className={s.textButton}
                          onClick={() =>
                            setDeleteTarget({
                              day: c.day,
                              title: "Check-in " + c.day,
                            })
                          }
                        >
                          Delete check-in
                        </button>
                      </article>
                    ))}
                    {!data.checkins.length && (
                      <p className={s.muted}>
                        Your saved reflections will appear here.
                      </p>
                    )}
                  </section>
                </>
              )}
            </>
          )}
          <footer className={s.footer}>
            <span>Less reaction. More command.</span>
            <span>Private practice · AI feedback needs your judgement</span>
          </footer>
        </div>
      </main>
      {(deleteTarget || leaveTo || comparison) && (
        <dialog
          ref={dialog}
          className={s.dialog}
          onCancel={() => {
            setDeleteTarget(null);
            setLeaveTo(null);
            setComparison(null);
          }}
        >
          <button
            className={s.dialogClose}
            aria-label="Close dialog"
            onClick={() => {
              setDeleteTarget(null);
              setLeaveTo(null);
              setComparison(null);
            }}
          >
            ×
          </button>
          {deleteTarget ? (
            <>
              <span className={s.kicker}>YOUR DATA. YOUR CHOICE.</span>
              <h2>Delete this {deleteTarget.day ? "check-in" : "session"}?</h2>
              <p>{deleteTarget.title}</p>
              <p>
                The recording, transcript, notes and review will be permanently
                removed. Download anything you want to keep first.
              </p>
              <div className={s.actions}>
                <button
                  className={s.secondary}
                  disabled={busy}
                  onClick={() => setDeleteTarget(null)}
                >
                  Keep it
                </button>
                <button
                  className={s.danger}
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    setError("");
                    try {
                      if (deleteTarget.day)
                        await api("", {
                          action: "delete_checkin",
                          day: deleteTarget.day,
                        });
                      else
                        await api(
                          `/sessions/${deleteTarget.id}`,
                          null,
                          "DELETE",
                        );
                      setDeleteTarget(null);
                      setSelected(null);
                      setView(deleteTarget.day ? "reflection" : "history");
                      await load();
                      setNotice("Deleted from your private studio.");
                    } catch (e) {
                      setError(e.message);
                      setDeleteTarget(null);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {busy ? "Deleting…" : "Delete permanently"}
                </button>
              </div>
            </>
          ) : leaveTo ? (
            <>
              <h2>Leave your unsaved work?</h2>
              <p>
                Your current response or roadmap edits have not been saved. Stay
                to finish them, or discard these edits.
              </p>
              <div className={s.actions}>
                <button className={s.primary} onClick={() => setLeaveTo(null)}>
                  Keep working
                </button>
                <button
                  className={s.secondary}
                  onClick={() => {
                    go(leaveTo);
                    setLeaveTo(null);
                  }}
                >
                  Discard edits & leave
                </button>
              </div>
            </>
          ) : comparison ? (
            <>
              <span className={s.kicker}>TWO ATTEMPTS. A CLEARER PICTURE.</span>
              <h2>What changed?</h2>
              <p>
                {comparison.rubric_version === selected.rubric_version &&
                comparison.prompt === selected.prompt &&
                comparison.audience === selected.audience &&
                comparison.usage?.model === selected.usage?.model &&
                selected.relation !== "followup"
                  ? "Same exercise and rubric. Read the evidence behind the scores."
                  : "The prompt, audience, model or rubric differs. Scores are not a direct measure of improvement."}
              </p>
              <div className={s.compare}>
                <section>
                  <Score
                    value={comparison.review?.overallScore}
                    label="Previous attempt"
                  />
                  <p>
                    {comparison.metrics?.wordCount ?? "—"} words ·{" "}
                    {comparison.metrics?.durationSeconds
                      ? stamp(comparison.metrics.durationSeconds)
                      : "No measured duration"}
                  </p>
                  <p>{comparison.answer || comparison.transcript?.text}</p>
                </section>
                <section>
                  <Score
                    value={selected.review?.overallScore}
                    label="This attempt"
                  />
                  <p>
                    {selected.metrics?.wordCount ?? "—"} words ·{" "}
                    {selected.metrics?.durationSeconds
                      ? stamp(selected.metrics.durationSeconds)
                      : "No measured duration"}
                  </p>
                  <p>{selected.answer || selected.transcript?.text}</p>
                </section>
              </div>
            </>
          ) : null}
        </dialog>
      )}
    </div>
  );
}
