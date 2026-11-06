// src/components/deepmatch/DeepMatchPanel.tsx - the 8-tab Deep Match result panel
import React, { useState } from 'react';
import { ScoreGauge } from '../ScoreGauge';
import { RequirementsTable } from './RequirementsTable';
import { ScoreBreakdown } from './ScoreBreakdown';
import type { DeepReport } from '../../types/deepMatch';

const TABS = ['Overview', 'Requirements', 'Experience', 'Keywords', 'Tailor', 'Roadmap', 'Interview', 'Job intel'] as const;
type Tab = (typeof TABS)[number];

const card = 'p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs';
const SEV: Record<string, string> = { high: 'text-red-600', medium: 'text-amber-600', low: 'text-slate-500' };

const Empty: React.FC<{ report: DeepReport }> = ({ report }) => (
  <p className="text-xs text-slate-500">
    {report.engine === 'heuristic'
      ? 'This section needs the AI engine. Add an API key in the server .env file to unlock it.'
      : 'Nothing to show for this section.'}
  </p>
);

export const DeepMatchPanel: React.FC<{ report: DeepReport; onTailor?: () => void }> = ({ report, onTailor }) => {
  const [tab, setTab] = useState<Tab>('Overview');
  const a = report.analysis;
  const jp = report.job_profile;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className={`${card} flex flex-col items-center justify-center`}>
          <ScoreGauge score={report.score.overall} size={150} label="Match score" sublabel={report.score.verdict.replace('_', ' ')} />
        </div>
        <div className={`${card} md:col-span-2 space-y-2`}>
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm">Executive summary</h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
              {report.engine === 'llm' ? `AI · ${report.model}` : 'Basic engine'}
            </span>
          </div>
          <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">{a.executive_summary}</p>
          {report.warnings.map((w) => <p key={w} className="text-[11px] text-amber-700 dark:text-amber-300">⚠ {w}</p>)}
          {onTailor && (
            <button onClick={onTailor} className="mt-1 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold">
              Tailor resume with AI
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${tab === t ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-300 dark:border-slate-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className={card}><h4 className="font-bold text-sm mb-3">Score breakdown</h4><ScoreBreakdown report={report} /></div>
          <div className={card}>
            <h4 className="font-bold text-sm mb-3">Fix these first</h4>
            <ul className="space-y-2 text-xs">
              {report.what_if.map((w) => (
                <li key={w.requirement} className="flex justify-between gap-2">
                  <span>{w.requirement} <span className="text-slate-400">({w.importance})</span></span>
                  <span className="font-bold text-emerald-600">+{w.gain}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className={`${card} space-y-3`}>
            <h4 className="font-bold text-sm">Strengths &amp; risks</h4>
            {a.strengths.length + a.risks.length === 0 && <Empty report={report} />}
            {a.strengths.map((s) => <p key={s.title} className="text-xs"><b className="text-emerald-600">✓ {s.title}.</b> {s.detail}</p>)}
            {a.risks.map((r) => (
              <p key={r.title} className="text-xs"><b className={SEV[r.severity]}>! {r.title} ({r.severity}).</b> {r.detail} <i>Fix: {r.mitigation}</i></p>
            ))}
          </div>
        </div>
      )}

      {tab === 'Requirements' && <RequirementsTable report={report} />}

      {tab === 'Experience' && (
        <div className={`${card} space-y-2 text-xs`}>
          <p><b>Total experience (from resume dates):</b> {report.candidate_years} yrs</p>
          <p><b>Relevant experience:</b> {a.experience_fit.candidate_relevant_years ?? 'n/a'} yrs · <b>Required:</b> {jp.min_years_experience ?? 'not stated'} yrs</p>
          <p><b>Seniority signal:</b> {a.experience_fit.seniority_signal}</p>
          <p>{a.experience_fit.reasoning}</p>
          {a.experience_fit.career_gaps.map((g) => <p key={g} className="text-amber-700">Gap: {g}</p>)}
        </div>
      )}

      {tab === 'Keywords' && (
        <div className={`${card} space-y-3`}>
          <div className="flex flex-wrap gap-2">
            {jp.ats_keywords.map((k) => <span key={k} className="px-2 py-0.5 rounded-full text-[11px] bg-slate-100 dark:bg-slate-800">{k}</span>)}
          </div>
          {a.keyword_gaps.length === 0 ? <Empty report={report} /> : a.keyword_gaps.map((k) => (
            <p key={k.keyword} className="text-xs"><b>{k.keyword}</b> → add to <i>{k.where_to_add}</i>. {k.truthful_note}</p>
          ))}
        </div>
      )}

      {tab === 'Tailor' && (
        <div className="space-y-4">
          {a.summary_suggestion && <div className={card}><h4 className="font-bold text-sm mb-2">Suggested summary</h4><p className="text-xs">{a.summary_suggestion}</p></div>}
          {a.bullet_rewrites.length === 0 && <Empty report={report} />}
          {a.bullet_rewrites.map((b) => (
            <div key={b.original} className={`${card} text-xs space-y-1`}>
              <p className="text-slate-500 line-through">{b.original}</p>
              <p className="font-semibold">{b.improved}</p>
              <p className="text-slate-500">{b.why}</p>
              {b.needs_user_input.length > 0 && <p className="text-amber-700">You must confirm: {b.needs_user_input.join('; ')}</p>}
            </div>
          ))}
        </div>
      )}

      {tab === 'Roadmap' && (
        <div className="grid md:grid-cols-2 gap-4">
          {a.skill_roadmap.length === 0 && <Empty report={report} />}
          {a.skill_roadmap.map((r) => (
            <div key={r.skill} className={`${card} text-xs space-y-1`}>
              <p className="font-bold">{r.skill} <span className="font-normal text-slate-400">· {r.priority} · ~{r.est_weeks} wk</span></p>
              <p>{r.proof_project}</p>
              <ul className="list-disc pl-4 text-slate-500">{r.resources.map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
          ))}
        </div>
      )}

      {tab === 'Interview' && (
        <div className="space-y-3">
          {a.interview_prep.length === 0 && <Empty report={report} />}
          {a.interview_prep.map((q) => (
            <div key={q.question} className={`${card} text-xs space-y-1`}>
              <p className="font-bold">{q.question}</p><p className="text-slate-500">Why asked: {q.why_asked}</p>
              <ul className="list-disc pl-4">{q.talking_points.map((t) => <li key={t}>{t}</li>)}</ul>
            </div>
          ))}
        </div>
      )}

      {tab === 'Job intel' && (
        <div className={`${card} text-xs space-y-2`}>
          <p><b>Title:</b> {jp.title} · <b>Level:</b> {jp.seniority} · <b>Mode:</b> {jp.work_mode} · <b>Location:</b> {jp.location ?? 'not stated'}</p>
          <p><b>Pay:</b> {jp.salary_text ?? 'not stated in the post'}</p>
          <p><b>Tech stack:</b> {jp.tech_stack.join(', ') || '—'}</p>
          {jp.culture_signals.length > 0 && <p><b>Culture signals:</b> {jp.culture_signals.join('; ')}</p>}
          {jp.jd_red_flags.map((f) => <p key={f} className="text-amber-700">⚠ Job post: {f}</p>)}
          {jp.ambiguities.map((f) => <p key={f} className="text-slate-500">? Unclear in post: {f}</p>)}
        </div>
      )}
    </div>
  );
};
