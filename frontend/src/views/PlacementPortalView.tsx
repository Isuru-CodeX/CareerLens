import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Users,
  TrendingUp,
  AlertTriangle,
  Briefcase,
  Search,
  Building,
  FileSpreadsheet
} from 'lucide-react';
import { api } from '../services/api';
import { CohortTelemetryResponse } from '../types';

export const PlacementPortalView: React.FC = () => {
  const [selectedBatch, setSelectedBatch] = useState<string>('Class of 2026');
  const [telemetry, setTelemetry] = useState<CohortTelemetryResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    let active = true;
    api.getPlacementTelemetry(selectedBatch).then((data) => {
      if (active) setTelemetry(data);
    }).catch(console.error);
    return () => { active = false; };
  }, [selectedBatch]);

  const filteredStudents = (telemetry?.students || []).filter((s) => {
    const matchesQuery = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.target_role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.verified_skills.some(sk => sk.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || s.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesQuery && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <span className="p-3 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
              <GraduationCap className="w-7 h-7" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  University Placement Cell & Career Services Portal
                </h1>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Module 12 (Enterprise SaaS)
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Cohort readiness analytics, systemic curriculum deficit alerts, and recruiter candidate roster management
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-200"
            >
              <option value="Class of 2026">Class of 2026</option>
              <option value="Class of 2025">Class of 2025</option>
              <option value="all">All Cohorts</option>
            </select>

            <a
              href={api.getPlacementExportUrl(selectedBatch)}
              download
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-all"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Export Roster (CSV)
            </a>
          </div>
        </div>

        {/* Top 4 Telemetry Stats */}
        {telemetry && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-600" /> Total Cohort
              </span>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                {telemetry.total_students} Candidates
              </div>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 block">
                100% profile completeness
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> Avg. ATS Readiness
              </span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {telemetry.average_ats_readiness}%
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Benchmark target: ≥75%
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-purple-600" /> Placement Conversion
              </span>
              <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
                {telemetry.placement_rate_percentage}%
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                {telemetry.placed_students_count} placed / offers accepted
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-amber-600" /> Active Hiring Screens
              </span>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                {telemetry.active_interviews_ongoing} Ongoing
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Across {telemetry.top_recruiter_partners.length} tech partners
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Skill Deficit Curriculum Alerts */}
      {telemetry && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Critical Curriculum Deficit Alerts (Incoming Recruiter Demand vs. Cohort Coverage)
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Automated AI syllabus recommendation engine
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {telemetry.skill_deficit_alerts.map((alert, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/40 dark:bg-amber-950/20 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    alert.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200' :
                    'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200'
                  }`}>
                    {alert.severity} GAP
                  </span>
                  <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
                    -{alert.deficit_gap}% Deficit
                  </span>
                </div>

                <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {alert.skill}
                </div>

                <div className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  {alert.recommendation}
                </div>

                <div className="pt-2 border-t border-amber-200/60 dark:border-amber-800/60 flex items-center justify-between text-[10px] text-slate-500">
                  <span>Recruiter Demand: {alert.demand_percentage}%</span>
                  <span>Cohort: {alert.cohort_proficiency}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Candidate Roster Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" />
            Verified Candidate Roster ({filteredStudents.length} Students)
          </h2>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search candidates or skills..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-slate-800 dark:text-slate-200"
            >
              <option value="all">All Statuses</option>
              <option value="placed">Placed</option>
              <option value="offer received">Offer Received</option>
              <option value="interviewing">Interviewing</option>
              <option value="needs mentorship">Needs Mentorship</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <th className="py-3 px-3 font-semibold">Candidate</th>
                <th className="py-3 px-3 font-semibold">Degree / Program</th>
                <th className="py-3 px-3 font-semibold">Target Role</th>
                <th className="py-3 px-3 font-semibold">ATS Readiness</th>
                <th className="py-3 px-3 font-semibold">Verified Tech Skills</th>
                <th className="py-3 px-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredStudents.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-3">
                    <div className="font-bold text-slate-900 dark:text-slate-100">{s.name}</div>
                    <div className="text-[11px] text-slate-400">{s.email}</div>
                  </td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-300">{s.degree}</td>
                  <td className="py-3 px-3 font-medium text-indigo-600 dark:text-indigo-400">{s.target_role}</td>
                  <td className="py-3 px-3">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      {s.readiness_score}%
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex flex-wrap gap-1">
                      {s.verified_skills.slice(0, 3).map((sk, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-slate-700 dark:text-slate-300">
                          {sk}
                        </span>
                      ))}
                      {s.verified_skills.length > 3 && (
                        <span className="text-[10px] text-slate-400">+{s.verified_skills.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      s.status === 'Placed' || s.status === 'Offer Received'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : s.status === 'Interviewing'
                        ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}>
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
