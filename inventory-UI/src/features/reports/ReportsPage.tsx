import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText, BarChart3, Network, Activity, Wrench,
  Download, Mail, Clock, Plus, Trash2, ToggleLeft, ToggleRight,
  Send, CalendarClock, Filter, Key,
  Building2, Layers, X, Edit2
} from 'lucide-react';
import { LicenseStatus } from '@/services/license.service';
import { companyService } from '@/services/company.service';
import { categoryService } from '@/services/category.service';
import { departmentService } from '@/services/department.service';
import { reportsService, downloadReport, ScheduledReport } from '@/services/reports.service';
import { useAuthStore } from '@/store/auth.store';
import { AdminPermission } from '@/types';
import toast from 'react-hot-toast';
import DeleteConfirmationModal from '@/components/ui/DeleteConfirmationModal';

// ─── Report Type Config ────────────────────────────────────────────────────

const REPORT_TYPES = [
  {
    id: 'assets',
    label: 'Master Asset Register',
    description: 'Full detail of every asset — serial numbers, prices, assignments. Best for physical audits.',
    icon: FileText,
    color: '#3b82f6',
    filters: ['company', 'department', 'category', 'status', 'assignedTo', 'dateRange'],
  },
  {
    id: 'summary',
    label: 'Executive Summary',
    description: 'High-level asset counts & values by company and category. Board-ready overview.',
    icon: BarChart3,
    color: '#f59e0b',
    filters: ['company', 'category'],
  },
  {
    id: 'department',
    label: 'Department Report',
    description: 'All assets allocated to a specific department — current status and assignments.',
    icon: Network,
    color: '#10b981',
    filters: ['company', 'department', 'status'],
  },
  {
    id: 'activity',
    label: 'Activity Log',
    description: 'Full system event history — who did what and when. Filterable by date range.',
    icon: Activity,
    color: '#8b5cf6',
    filters: ['company', 'department', 'dateRange'],
  },
  {
    id: 'repair',
    label: 'Repair History',
    description: 'All repair-cycle events — sent to repair, returned, marked working/not working.',
    icon: Wrench,
    color: '#ef4444',
    filters: ['company', 'dateRange'],
  },
  {
    id: 'licenses',
    label: 'Software Licenses',
    description: 'Overview of digital assets, keys, and renewal statuses. Essential for compliance and IT planning.',
    icon: Key,
    color: '#10b981',
    filters: ['status', 'dateRange'],
  },
] as const;

const FREQ_OPTIONS = [
  { value: 'ONCE', label: 'Once (Specific Date)' },
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
];

const FORMAT_OPTIONS = [
  { value: 'PDF', label: 'PDF Only' },
  { value: 'EXCEL', label: 'Excel Only' },
  { value: 'BOTH', label: 'Both Formats' },
];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'builder' | 'email' | 'schedules'>('builder');
  const hasPermission = useAuthStore(s => s.hasPermission);
  const canExport = hasPermission(AdminPermission.EXPORT_DATA) || hasPermission(AdminPermission.VIEW_REPORTS);

  return (
    <div style={{ padding: '0 0 60px' }}>
      {/* Page Header */}
      <header style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: 'var(--text-main)', margin: '0 0 6px', letterSpacing: '-0.5px' }}>
          Report Management Centre
        </h1>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13.5, fontWeight: 500 }}>
          Generate reports, dispatch email newsletters, and schedule automated delivery.
        </p>
      </header>

      {/* Tab Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 28, borderBottom: '1px solid var(--border-dark)', paddingBottom: 0 }}>
        {[
          { id: 'builder', label: 'Report Builder', icon: Filter },
          { id: 'email', label: 'Email Dispatch', icon: Mail },
          { id: 'schedules', label: 'Scheduled Jobs', icon: CalendarClock },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 16px', background: 'transparent', border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid var(--accent-yellow)' : '2px solid transparent',
              color: activeTab === tab.id ? 'var(--accent-yellow)' : 'var(--text-muted)',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              marginBottom: -1, transition: 'all 0.2s', whiteSpace: 'nowrap',
            }}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'builder' && <ReportBuilderTab canExport={canExport} />}
      {activeTab === 'email' && <EmailDispatchTab />}
      {activeTab === 'schedules' && <ScheduledJobsTab />}
    </div>
  );
}

// ─── Tab 1: Report Builder ─────────────────────────────────────────────────

function ReportBuilderTab({ canExport }: { canExport: boolean }) {
  const [selectedType, setSelectedType] = useState<string>('assets');
  const [filters, setFilters] = useState<any>({});
  const [isGenerating, setIsGenerating] = useState('');

  const { data: companiesRaw } = useQuery({ queryKey: ['companies', 'all'], queryFn: () => companyService.getCompanies({ limit: 100 }) });
  const { data: categoriesRaw } = useQuery({ queryKey: ['categories', 'all'], queryFn: () => categoryService.getCategories({ limit: 100 }) });
  const { data: deptsRaw } = useQuery({
    queryKey: ['departments', filters.companyId],
    queryFn: () => departmentService.getDepartments(filters.companyId, { limit: 100 }),
    enabled: !!filters.companyId,
  });

  const companies = useMemo(() => (Array.isArray(companiesRaw) ? companiesRaw : (companiesRaw as any)?.data ?? []), [companiesRaw]);
  const categories = useMemo(() => (Array.isArray(categoriesRaw) ? categoriesRaw : (categoriesRaw as any)?.data ?? []), [categoriesRaw]);
  const departments = useMemo(() => (Array.isArray(deptsRaw) ? deptsRaw : (deptsRaw as any)?.data ?? []), [deptsRaw]);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  useEffect(() => {
    const r = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', r);
    return () => window.removeEventListener('resize', r);
  }, []);

  const currentType = REPORT_TYPES.find(t => t.id === selectedType)!;

  const handleDownload = (fmt: 'excel' | 'pdf') => {
    if (!canExport) { toast.error('You do not have export permission'); return; }
    setIsGenerating(fmt);
    toast.loading(`Generating ${fmt.toUpperCase()}...`, { id: 'report-gen', duration: 3000 });
    downloadReport(selectedType, fmt, filters);
    setTimeout(() => setIsGenerating(''), 2500);
  };

  const showFilter = (f: string) => (currentType.filters as readonly string[]).includes(f);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'clamp(200px, 25%, 260px) 1fr', gap: 24 }}
      className="report-builder-grid"
    >
      {/* Left: Report Type Selector */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px 4px' }}>
          Select Report Type
        </p>
        <div style={{ 
          display: isMobile ? 'grid' : 'flex', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          flexDirection: 'column', 
          gap: 10 
        }}>
          {REPORT_TYPES.map(rt => {
            const isActive = selectedType === rt.id;
            return (
              <button
                key={rt.id}
                onClick={() => { setSelectedType(rt.id); setFilters({}); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: isMobile ? '10px 12px' : '14px 16px',
                  borderRadius: 12, border: `1px solid ${isActive ? rt.color : 'var(--border-dark)'}`,
                  background: isActive ? `${rt.color}12` : 'rgba(255,255,255,0.02)',
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
                  height: '100%'
                }}
              >
                <div style={{
                  width: isMobile ? 32 : 36, height: isMobile ? 32 : 36, borderRadius: 10, flexShrink: 0,
                  background: isActive ? `${rt.color}20` : 'rgba(255,255,255,0.05)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: isActive ? rt.color : 'var(--text-muted)',
                }}>
                  <rt.icon size={isMobile ? 16 : 18} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: isMobile ? 12 : 13, fontWeight: 700, color: isActive ? 'var(--text-main)' : 'var(--text-muted)' }}>
                    {rt.label}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: Filters + Download */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Filters Panel */}
        <div className="dark-card" style={{ padding: '22px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <Filter size={16} color="var(--accent-yellow)" />
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--text-main)' }}>Filter Options</h3>
            {Object.values(filters).some(Boolean) && (
              <button
                onClick={() => setFilters({})}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <X size={12} /> Reset
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            {showFilter('company') && (
              <FilterField label="Company" icon={<Building2 size={13} />}>
                <select value={filters.companyId || ''} onChange={e => setFilters({ ...filters, companyId: e.target.value, departmentId: '' })} style={fStyle}>
                  <option value="">All Companies</option>
                  {companies.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </FilterField>
            )}
            {showFilter('department') && (
              <FilterField label="Department" icon={<Network size={13} />}>
                <select value={filters.departmentId || ''} onChange={e => setFilters({ ...filters, departmentId: e.target.value })} style={{ ...fStyle, opacity: !filters.companyId ? 0.5 : 1 }} disabled={!filters.companyId}>
                  <option value="">All Departments</option>
                  {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </FilterField>
            )}
            {showFilter('category') && (
              <FilterField label="Category" icon={<Layers size={13} />}>
                <select value={filters.categoryId || ''} onChange={e => setFilters({ ...filters, categoryId: e.target.value })} style={fStyle}>
                  <option value="">All Categories</option>
                  {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </FilterField>
            )}
            {showFilter('status') && (
              <FilterField label="Status" icon={<Activity size={13} />}>
                <select value={filters.status || ''} onChange={e => setFilters({ ...filters, status: e.target.value })} style={fStyle}>
                  <option value="">Any Status</option>
                  {selectedType === 'licenses' ? (
                    Object.values(LicenseStatus).map(s => (
                      <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                    ))
                  ) : (
                    ['IN_USE', 'WAREHOUSE', 'IN_REPAIR', 'SENT_TO_REPAIR', 'LOST', 'DISPOSED'].map(s => (
                      <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                    ))
                  )}
                </select>
              </FilterField>
            )}
            {showFilter('assignedTo') && (
              <FilterField label="Assigned To">
                <input type="text" placeholder="Name or Emp ID..." value={filters.assignedTo || ''} onChange={e => setFilters({ ...filters, assignedTo: e.target.value })} style={fStyle} />
              </FilterField>
            )}
            {showFilter('dateRange') && (
              <>
                <FilterField label="From Date">
                  <input type="date" value={filters.dateFrom || ''} onChange={e => setFilters({ ...filters, dateFrom: e.target.value })} style={fStyle} />
                </FilterField>
                <FilterField label="To Date">
                  <input type="date" value={filters.dateTo || ''} onChange={e => setFilters({ ...filters, dateTo: e.target.value })} style={fStyle} />
                </FilterField>
              </>
            )}
          </div>
        </div>

        {/* Active report type card */}
        <div className="dark-card" style={{
          padding: '20px 22px', display: 'flex', alignItems: 'flex-start', gap: 16,
          borderLeft: `4px solid ${currentType.color}`,
          flexWrap: 'wrap',
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: `${currentType.color}15`, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: currentType.color,
          }}>
            <currentType.icon size={26} />
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: 'var(--text-main)' }}>
              {currentType.label}
            </h2>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              {currentType.description}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', flexShrink: 0 }}>
            <button
              onClick={() => handleDownload('excel')}
              disabled={isGenerating !== ''}
              className="outline-btn"
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 10, opacity: isGenerating ? 0.6 : 1 }}
            >
              <Download size={15} /> Excel
            </button>
            <button
              onClick={() => handleDownload('pdf')}
              disabled={isGenerating !== ''}
              className="primary-btn"
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 10, opacity: isGenerating ? 0.6 : 1 }}
            >
              <FileText size={15} /> PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tab 2: Email Dispatch ─────────────────────────────────────────────────

function EmailDispatchTab() {
  const [recipientInput, setRecipientInput] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachReport, setAttachReport] = useState(false);
  const [reportType, setReportType] = useState('assets');
  const [fileFormat, setFileFormat] = useState<'PDF' | 'EXCEL' | 'BOTH'>('PDF');
  const [reportFilters, setReportFilters] = useState<any>({});
  const [sending, setSending] = useState(false);

  const { data: companiesRaw } = useQuery({ queryKey: ['companies', 'all'], queryFn: () => companyService.getCompanies({ limit: 100 }) });
  const companies = useMemo(() => (Array.isArray(companiesRaw) ? companiesRaw : (companiesRaw as any)?.data ?? []), [companiesRaw]);

  const parseEmails = (raw: string) => raw.split(/[,\n]/).map(e => e.trim()).filter(Boolean);

  const handleSend = async () => {
    const emails = parseEmails(recipientInput);
    if (emails.length === 0) { toast.error('Add at least one recipient email'); return; }
    if (!subject.trim()) { toast.error('Subject is required'); return; }
    if (!body.trim()) { toast.error('Message body is required'); return; }

    setSending(true);
    try {
      const payload: any = { recipientEmails: emails, subject, body };
      if (attachReport) {
        payload.reportType = reportType;
        payload.fileFormat = fileFormat;
        payload.filters = reportFilters;
      }
      const result = await reportsService.sendEmail(payload);
      toast.success(result.message || `Email sent to ${emails.length} recipient(s)!`);
      setRecipientInput(''); setSubject(''); setBody(''); setAttachReport(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', width: '100%' }}>
      <div className="dark-card" style={{ padding: 'clamp(18px, 4vw, 32px)', display: 'flex', flexDirection: 'column', gap: 22 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
            <Mail size={24} />
          </div>
          <div>
            <h2 style={{ margin: '0 0 3px', fontSize: 18, fontWeight: 800, color: 'var(--text-main)' }}>Email Dispatch</h2>
            <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-muted)' }}>Send a custom message — with or without a report attachment.</p>
          </div>
        </div>

        <div style={{ height: 1, background: 'var(--border-dark)' }} />

        {/* Recipients */}
        <FormField label="Recipients" hint="Separate multiple emails with commas or new lines">
          <textarea
            placeholder="admin@company.com, owner@example.com..."
            value={recipientInput}
            onChange={e => setRecipientInput(e.target.value)}
            rows={2}
            style={{ ...fStyle, resize: 'vertical' }}
          />
        </FormField>

        {/* Subject */}
        <FormField label="Subject">
          <input type="text" placeholder="Monthly Asset Report — April 2026" value={subject} onChange={e => setSubject(e.target.value)} style={fStyle} />
        </FormField>

        {/* Body */}
        <FormField label="Message">
          <textarea
            placeholder="Dear team,&#10;&#10;Please find this month's inventory summary attached for your review..."
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={6}
            style={{ ...fStyle, resize: 'vertical' }}
          />
        </FormField>

        {/* Attach Report Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid var(--border-dark)' }}>
          <button
            onClick={() => setAttachReport(v => !v)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: attachReport ? 'var(--accent-yellow)' : 'var(--text-muted)', display: 'flex' }}
          >
            {attachReport ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
          </button>
          <div>
            <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>Attach a Report</p>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>Generate and attach a report file to this email</p>
          </div>
        </div>

        {/* Report options (conditional) */}
        {attachReport && (
          <div style={{ padding: '20px', background: 'rgba(255,240,31,0.03)', borderRadius: 12, border: '1px solid rgba(255,240,31,0.1)', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
              <FormField label="Report Type">
                <select value={reportType} onChange={e => setReportType(e.target.value)} style={fStyle}>
                  {REPORT_TYPES.map(rt => <option key={rt.id} value={rt.id}>{rt.label}</option>)}
                </select>
              </FormField>
              <FormField label="Format">
                <select value={fileFormat} onChange={e => setFileFormat(e.target.value as any)} style={fStyle}>
                  {FORMAT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </FormField>
              <FormField label="Filter by Company">
                <select value={reportFilters.companyId || ''} onChange={e => setReportFilters({ ...reportFilters, companyId: e.target.value })} style={fStyle}>
                  <option value="">All Companies</option>
                  {companies.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </FormField>
            </div>
          </div>
        )}

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={sending}
          className="primary-btn"
          style={{ alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 28px', borderRadius: 12, fontSize: 14, opacity: sending ? 0.7 : 1 }}
        >
          <Send size={16} />
          {sending ? 'Sending...' : 'Send Email'}
        </button>
      </div>
    </div>
  );
}

// ─── Tab 3: Scheduled Jobs ─────────────────────────────────────────────────

function ScheduledJobsTab() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const defaultForm = {
    reportType: 'summary',
    subject: '',
    bodyMessage: '',
    recipientEmails: '',
    frequency: 'ONCE',
    timeOfDay: '08:00',
    specificDate: new Date().toISOString().split('T')[0],
    dayOfMonth: 1,
    dayOfWeek: 1,
    fileFormat: 'BOTH',
  };
  const [form, setForm] = useState<any>(defaultForm);

  const { data: schedules = [], isLoading } = useQuery<ScheduledReport[]>({
    queryKey: ['schedules'],
    queryFn: reportsService.getSchedules,
  });

  const createMut = useMutation({
    mutationFn: reportsService.createSchedule,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['schedules'] }); toast.success('Scheduled job created!'); setShowForm(false); setForm(defaultForm); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to create schedule'),
  });

  const fullUpdateMut = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: any }) => reportsService.updateSchedule(id, dto),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['schedules'] }); toast.success('Scheduled job updated!'); setEditingId(null); setShowForm(false); setForm(defaultForm); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to update schedule'),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => reportsService.updateSchedule(id, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['schedules'] }),
  });

   const deleteMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => reportsService.deleteSchedule(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast.success('Schedule removed');
      setDeletingId(null);
    },
  });

  const handleSave = () => {
    const emails = form.recipientEmails.split(/[,\n]/).map((e: string) => e.trim()).filter(Boolean);
    if (!form.subject || emails.length === 0) { toast.error('Subject and at least one recipient are required'); return; }

    const payload = {
      ...form,
      recipientEmails: emails,
      dayOfMonth: form.frequency === 'MONTHLY' ? Number(form.dayOfMonth) : null,
      dayOfWeek: form.frequency === 'WEEKLY' ? Number(form.dayOfWeek) : null,
      specificDate: form.frequency === 'ONCE' ? form.specificDate : null,
    };

    if (editingId) {
      fullUpdateMut.mutate({ id: editingId, dto: payload });
    } else {
      createMut.mutate(payload);
    }
  };

  const startEdit = (s: ScheduledReport) => {
    setEditingId(s.id);
    setForm({
      reportType: s.reportType,
      subject: s.subject || '',
      bodyMessage: s.bodyMessage || '',
      recipientEmails: s.recipientEmails?.join(', ') || '',
      frequency: s.frequency,
      timeOfDay: s.timeOfDay || '08:00',
      specificDate: s.specificDate || new Date().toISOString().split('T')[0],
      dayOfMonth: s.dayOfMonth || 1,
      dayOfWeek: s.dayOfWeek || 1,
      fileFormat: s.fileFormat,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const rtLabel = (id: string) => REPORT_TYPES.find(r => r.id === id)?.label ?? id;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 900, margin: '0 auto', width: '100%' }}>
      {/* Action Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div>
          <h2 style={{ margin: '0 0 3px', fontSize: 17, fontWeight: 800, color: 'var(--text-main)' }}>Automated Report Jobs</h2>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>Schedule recurring emails — the system will generate and send at the configured time.</p>
        </div>
        <button onClick={() => { setShowForm(v => !v); setEditingId(null); setForm(defaultForm); }} className="primary-btn" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 12 }}>
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Cancel' : 'New Schedule'}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="dark-card" style={{ padding: '24px 28px', border: '1px solid rgba(255,240,31,0.15)', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 800, color: 'var(--accent-yellow)' }}>{editingId ? 'Edit Schedule' : 'Configure New Schedule'}</h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
            <FormField label="Report Type">
              <select value={form.reportType} onChange={e => setForm({ ...form, reportType: e.target.value })} style={fStyle}>
                {REPORT_TYPES.map(rt => <option key={rt.id} value={rt.id}>{rt.label}</option>)}
              </select>
            </FormField>
            <FormField label="Format">
              <select value={form.fileFormat} onChange={e => setForm({ ...form, fileFormat: e.target.value })} style={fStyle}>
                {FORMAT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </FormField>
            <FormField label="Frequency">
              <select value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })} style={fStyle}>
                {FREQ_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </FormField>
            {form.frequency === 'ONCE' && (
              <FormField label="Specific Date">
                <input type="date" value={form.specificDate} onChange={e => setForm({ ...form, specificDate: e.target.value })} style={fStyle} />
              </FormField>
            )}
            {form.frequency === 'WEEKLY' && (
              <FormField label="Day of Week">
                <select value={form.dayOfWeek} onChange={e => setForm({ ...form, dayOfWeek: e.target.value })} style={fStyle}>
                  {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
              </FormField>
            )}
            {form.frequency === 'MONTHLY' && (
              <FormField label="Day of Month">
                <input type="number" min={1} max={28} value={form.dayOfMonth} onChange={e => setForm({ ...form, dayOfMonth: e.target.value })} style={fStyle} />
              </FormField>
            )}
            <FormField label="Send Time (HH:MM)">
              <input type="time" value={form.timeOfDay} onChange={e => setForm({ ...form, timeOfDay: e.target.value })} style={fStyle} />
            </FormField>
          </div>

          <FormField label="Email Subject">
            <input type="text" placeholder="Monthly Asset Overview — {{month}}" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} style={fStyle} />
          </FormField>

          <FormField label="Recipients" hint="Comma or newline separated email addresses">
            <textarea rows={2} placeholder="ceo@company.com, operations@company.com" value={form.recipientEmails} onChange={e => setForm({ ...form, recipientEmails: e.target.value })} style={{ ...fStyle, resize: 'vertical' }} />
          </FormField>

          <FormField label="Custom Message (optional)">
            <textarea rows={3} placeholder="Please find the attached monthly report..." value={form.bodyMessage} onChange={e => setForm({ ...form, bodyMessage: e.target.value })} style={{ ...fStyle, resize: 'vertical' }} />
          </FormField>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={handleSave} disabled={createMut.isPending || fullUpdateMut.isPending} className="primary-btn" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderRadius: 12 }}>
              <Clock size={15} />
              {(createMut.isPending || fullUpdateMut.isPending) ? 'Saving...' : editingId ? 'Save Changes' : 'Create Schedule'}
            </button>
          </div>
        </div>
      )}

      {/* Schedule List */}
      {isLoading ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Loading schedules...</div>
      ) : schedules.length === 0 ? (
        <div className="dark-card" style={{ padding: 60, textAlign: 'center' }}>
          <CalendarClock size={40} style={{ opacity: 0.2, margin: '0 auto 16px', display: 'block' }} />
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-main)' }}>No scheduled jobs yet</p>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>Create your first automated report above.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {schedules.map(s => (
            <div key={s.id} className="dark-card" style={{
              padding: '18px 22px', display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap',
              opacity: s.isActive ? 1 : 0.55,
              borderLeft: `3px solid ${s.isActive ? 'var(--accent-yellow)' : 'var(--border-dark)'}`,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-main)' }}>{s.subject}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 10px', borderRadius: 50, textTransform: 'uppercase',
                    background: s.isActive ? 'rgba(16,185,129,0.1)' : 'rgba(100,116,139,0.1)',
                    color: s.isActive ? '#10b981' : '#64748b',
                    border: `1px solid ${s.isActive ? 'rgba(16,185,129,0.2)' : 'rgba(100,116,139,0.2)'}`,
                  }}>
                    {s.isActive ? 'Active' : 'Paused'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>📊 {rtLabel(s.reportType)}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>🔁 {s.frequency === 'ONCE' ? `ONCE on ${s.specificDate}` : s.frequency} at {s.timeOfDay}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>📁 {s.fileFormat}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>👥 {s.recipientEmails.length} recipient(s)</span>
                  {s.nextRunAt && <span style={{ fontSize: 12, color: 'var(--accent-yellow)' }}>⏰ Next: {new Date(s.nextRunAt).toLocaleString()}</span>}
                  {s.lastSentAt && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>✓ Last sent: {new Date(s.lastSentAt).toLocaleDateString()}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => startEdit(s)}
                  title="Edit schedule"
                  style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 8, padding: '6px', cursor: 'pointer', color: '#3b82f6', display: 'flex' }}
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => toggleMut.mutate({ id: s.id, isActive: !s.isActive })}
                  title={s.isActive ? 'Pause schedule' : 'Activate schedule'}
                  style={{ background: 'none', border: '1px solid var(--border-dark)', borderRadius: 8, padding: '6px', cursor: 'pointer', color: s.isActive ? '#f59e0b' : '#10b981', display: 'flex' }}
                >
                  {s.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                </button>
                <button
                  onClick={() => setDeletingId(s.id)}
                  title="Delete schedule"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 8, padding: '6px', cursor: 'pointer', color: '#ef4444', display: 'flex' }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!deletingId}
        loading={deleteMut.isPending}
        title="Delete Automated Report?"
        message="This will permanently remove the automated schedule. No further reports will be sent for this configuration."
        onClose={() => setDeletingId(null)}
        onConfirm={(reason) => deleteMut.mutate({ id: deletingId!, reason })}
      />
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function FilterField({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
        {icon}{label}
      </label>
      {children}
    </div>
  );
}

function FormField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>
        {label}{hint && <span style={{ fontWeight: 500, marginLeft: 6, opacity: 0.7 }}>— {hint}</span>}
      </label>
      {children}
    </div>
  );
}

const fStyle: React.CSSProperties = {
  width: '100%', padding: '9px 13px', borderRadius: 8,
  border: '1px solid var(--border-dark)', background: 'var(--search-bg)',
  color: 'var(--text-main)', fontSize: 13, outline: 'none',
  fontFamily: 'inherit', cursor: 'pointer',
  boxSizing: 'border-box',
  colorScheme: 'dark',
};
