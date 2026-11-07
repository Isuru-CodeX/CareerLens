import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Kanban,
  Table as TableIcon,
  Calendar,
  DollarSign,
  X,
  Trash2,
  Edit2,
  Bell
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Application, ApplicationStage, ApplicationStats } from '../types';
import { api } from '../services/api';
import { ConfirmModal } from '../components/ConfirmModal';

export const ApplicationsView: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [stats, setStats] = useState<ApplicationStats | null>(null);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<Application | null>(null);
  const [appToDelete, setAppToDelete] = useState<Application | null>(null);

  // Reminder Modal
  const [reminderAppId, setReminderAppId] = useState<string | null>(null);
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderDate, setReminderDate] = useState('');

  // Form State
  const [formCompany, setFormCompany] = useState('');
  const [formRole, setFormRole] = useState('');
  const [formStage, setFormStage] = useState<ApplicationStage>('applied');
  const [formLocation, setFormLocation] = useState('');
  const [formSalary, setFormSalary] = useState('');
  const [formSource, setFormSource] = useState('LinkedIn');
  const [formJobUrl, setFormJobUrl] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formContactName, setFormContactName] = useState('');
  const [formContactEmail, setFormContactEmail] = useState('');
  const [formInterviewDate, setFormInterviewDate] = useState('');

  const stages: { id: ApplicationStage; label: string; color: string }[] = [
    { id: 'interested', label: 'Interested', color: 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50' },
    { id: 'applied', label: 'Applied', color: 'border-blue-300 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20' },
    { id: 'assessment', label: 'Assessment', color: 'border-purple-300 dark:border-purple-900 bg-purple-50/50 dark:bg-purple-950/20' },
    { id: 'interview', label: 'Interview', color: 'border-amber-300 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20' },
    { id: 'offer', label: 'Offer', color: 'border-emerald-300 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20' },
    { id: 'rejected', label: 'Rejected', color: 'border-red-200 dark:border-red-950 bg-red-50/30 dark:bg-red-950/10' }
  ];

  const fetchApplications = useCallback(async () => {
    try {
      const [list, st] = await Promise.all([
        api.getApplications({
          q: searchQuery || undefined,
          stage: stageFilter || undefined
        }),
        api.getApplicationStats()
      ]);
      setApplications(list);
      setStats(st);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, stageFilter]);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      api.getApplications({
        q: searchQuery || undefined,
        stage: stageFilter || undefined
      }),
      api.getApplicationStats()
    ]).then(([list, st]) => {
      if (!isMounted) return;
      setApplications(list);
      setStats(st);
    }).catch((err) => {
      console.error(err);
    }).finally(() => {
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [searchQuery, stageFilter]);

  const handleStageChange = async (appId: string, newStage: ApplicationStage) => {
    try {
      await api.updateApplication(appId, { stage: newStage });
      if (newStage === 'offer') {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
      fetchApplications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenCreate = () => {
    setEditingApp(null);
    setFormCompany('');
    setFormRole('');
    setFormStage('applied');
    setFormLocation('');
    setFormSalary('');
    setFormSource('LinkedIn');
    setFormJobUrl('');
    setFormNotes('');
    setFormContactName('');
    setFormContactEmail('');
    setFormInterviewDate('');
    setCreateModalOpen(true);
  };

  const handleOpenEdit = (app: Application) => {
    setEditingApp(app);
    setFormCompany(app.company);
    setFormRole(app.role);
    setFormStage(app.stage);
    setFormLocation(app.location || '');
    setFormSalary(app.salary_range || '');
    setFormSource(app.source || 'LinkedIn');
    setFormJobUrl(app.job_url || '');
    setFormNotes(app.notes || '');
    setFormContactName(app.contact_name || '');
    setFormContactEmail(app.contact_email || '');
    setFormInterviewDate(app.interview_date ? app.interview_date.substring(0, 10) : '');
    setCreateModalOpen(true);
  };

  const handleSaveApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        company: formCompany,
        role: formRole,
        stage: formStage,
        location: formLocation || null,
        salary_range: formSalary || null,
        source: formSource || null,
        job_url: formJobUrl || null,
        notes: formNotes || null,
        contact_name: formContactName || null,
        contact_email: formContactEmail || null,
        interview_date: formInterviewDate ? new Date(formInterviewDate).toISOString() : null
      };

      if (editingApp) {
        await api.updateApplication(editingApp.id, payload);
      } else {
        await api.createApplication(payload);
      }
      setCreateModalOpen(false);
      fetchApplications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!appToDelete) return;
    try {
      await api.deleteApplication(appToDelete.id);
      setAppToDelete(null);
      fetchApplications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminderAppId || !reminderTitle || !reminderDate) return;
    try {
      await api.addReminder(reminderAppId, {
        title: reminderTitle,
        due_date: new Date(reminderDate).toISOString()
      });
      setReminderAppId(null);
      setReminderTitle('');
      setReminderDate('');
      fetchApplications();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 w-full max-w-[1720px] mx-auto">
      {/* Top Header & Pipeline Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Application Pipeline Tracker
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage your opportunities, schedule interview reminders, and track conversion velocity.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>New Application</span>
        </button>
      </div>

      {/* Stats Summary Bar */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Active Total</span>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
              {stats.total_applications}
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Interviews</span>
            <div className="text-xl font-black text-amber-500 mt-0.5">
              {stats.active_interviews}
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Offers</span>
            <div className="text-xl font-black text-emerald-500 mt-0.5">
              {stats.offers}
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Response Rate</span>
            <div className="text-xl font-black text-blue-500 mt-0.5">
              {stats.response_rate_percent}%
            </div>
          </div>
        </div>
      )}

      {/* Search, Filter & View Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search company, role, or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="">All Stages</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>

          {/* Toggle Kanban vs Table */}
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-lg text-xs font-semibold ${
                viewMode === 'kanban'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-400'
              }`}
              title="Kanban Board View"
            >
              <Kanban className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-semibold ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-400'
              }`}
              title="Table List View"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs animate-pulse">
          <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-1/4 mx-auto mb-4" />
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-48 bg-slate-100 dark:bg-slate-800/50 rounded-2xl" />
            ))}
          </div>
        </div>
      ) : viewMode === 'kanban' ? (
        /* Kanban View */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => {
            const colApps = applications.filter((a) => a.stage === stage.id);
            return (
              <div
                key={stage.id}
                className={`p-3 rounded-3xl border ${stage.color} flex flex-col min-h-[500px] space-y-3`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800">
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                    {stage.label}
                  </span>
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-extrabold bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-xs">
                    {colApps.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto">
                  {colApps.map((app) => (
                    <motion.div
                      key={app.id}
                      whileHover={{ y: -2 }}
                      className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5 text-xs"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-white line-clamp-1">
                            {app.company}
                          </h4>
                          <p className="text-[11px] text-slate-500 line-clamp-1">{app.role}</p>
                        </div>
                        <button
                          onClick={() => handleOpenEdit(app)}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {app.salary_range && (
                        <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
                          <DollarSign className="w-3 h-3" />
                          <span>{app.salary_range}</span>
                        </div>
                      )}

                      {app.interview_date && (
                        <div className="flex items-center gap-1 text-[11px] text-amber-600 font-medium bg-amber-50 dark:bg-amber-950/40 p-1.5 rounded-lg">
                          <Calendar className="w-3 h-3 shrink-0" />
                          <span>{new Date(app.interview_date).toLocaleDateString()}</span>
                        </div>
                      )}

                      {/* Stage Progression Quick Action */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px]">
                        <button
                          onClick={() => setReminderAppId(app.id)}
                          className="text-slate-400 hover:text-blue-600 flex items-center gap-1"
                          title="Add Reminder"
                        >
                          <Bell className="w-3 h-3" />
                          <span>Reminder</span>
                        </button>

                        <select
                          value={app.stage}
                          onChange={(e) => handleStageChange(app.id, e.target.value as ApplicationStage)}
                          className="text-[10px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-1 py-0.5 font-semibold text-slate-700 dark:text-slate-300"
                        >
                          {stages.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-4">Company</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Stage</th>
                  <th className="p-4">Location</th>
                  <th className="p-4">Salary Range</th>
                  <th className="p-4">Interview Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 font-bold text-slate-900 dark:text-white">{app.company}</td>
                    <td className="p-4 text-slate-700 dark:text-slate-300">{app.role}</td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                        {app.stage}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500">{app.location || '—'}</td>
                    <td className="p-4 text-emerald-600 font-semibold">{app.salary_range || '—'}</td>
                    <td className="p-4 text-slate-500">
                      {app.interview_date ? new Date(app.interview_date).toLocaleDateString() : '—'}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEdit(app)}
                        className="text-slate-400 hover:text-blue-600 p-1"
                        title="Edit Application"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setAppToDelete(app)}
                        className="text-slate-400 hover:text-red-600 p-1"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      <AnimatePresence>
        {createModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCreateModalOpen(false)}
            />

            <motion.div
              className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl z-10 max-h-[90vh] overflow-y-auto"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  {editingApp ? 'Edit Application' : 'Track New Application'}
                </h3>
                <button
                  onClick={() => setCreateModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveApplication} className="mt-4 space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Company *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Stripe, Figma"
                      value={formCompany}
                      onChange={(e) => setFormCompany(e.target.value)}
                      className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">Role Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Senior Software Engineer"
                      value={formRole}
                      onChange={(e) => setFormRole(e.target.value)}
                      className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Current Stage</label>
                    <select
                      value={formStage}
                      onChange={(e) => setFormStage(e.target.value as ApplicationStage)}
                      className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      {stages.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">Location</label>
                    <input
                      type="text"
                      placeholder="San Francisco, CA / Remote"
                      value={formLocation}
                      onChange={(e) => setFormLocation(e.target.value)}
                      className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Salary Range</label>
                    <input
                      type="text"
                      placeholder="e.g. $170k - $210k"
                      value={formSalary}
                      onChange={(e) => setFormSalary(e.target.value)}
                      className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">Source</label>
                    <input
                      type="text"
                      placeholder="Referral, LinkedIn, Direct"
                      value={formSource}
                      onChange={(e) => setFormSource(e.target.value)}
                      className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Job URL</label>
                  <input
                    type="url"
                    placeholder="https://jobs.example.com/posting"
                    value={formJobUrl}
                    onChange={(e) => setFormJobUrl(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Interview Date (if scheduled)</label>
                  <input
                    type="date"
                    value={formInterviewDate}
                    onChange={(e) => setFormInterviewDate(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Notes & Next Actions</label>
                  <textarea
                    rows={3}
                    placeholder="Recruiter contact, questions to prepare, follow-up dates..."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold shadow-xs"
                  >
                    {editingApp ? 'Save Changes' : 'Create Application'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Reminder Modal */}
      <AnimatePresence>
        {reminderAppId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setReminderAppId(null)}
            />

            <motion.div
              className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl z-10"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-3">
                Schedule Follow-up Reminder
              </h3>
              <form onSubmit={handleAddReminder} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold mb-1">Reminder Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Send thank-you note, follow up on take-home"
                    value={reminderTitle}
                    onChange={(e) => setReminderTitle(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={reminderDate}
                    onChange={(e) => setReminderDate(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setReminderAppId(null)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-xl bg-blue-600 text-white font-semibold"
                  >
                    Set Reminder
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!appToDelete}
        title="Delete Application"
        message={`Are you sure you want to remove "${appToDelete?.company} - ${appToDelete?.role}" from your tracking pipeline?`}
        confirmLabel="Remove"
        onConfirm={handleDelete}
        onCancel={() => setAppToDelete(null)}
      />
    </div>
  );
};
