import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Clock, CheckCircle, AlertCircle, Search,
  Filter, ChevronDown, UserCheck, RefreshCw, Eye, Wrench,
  TrendingUp, Activity, X, ShieldCheck, Zap, Trash2, AlertTriangle, BarChart3, LayoutList
} from 'lucide-react';
import API from '../api/api';
import { useAuth } from '../context/AuthContext';
import TicketAnalyticsBoard from '../components/Ticket/TicketAnalyticsBoard';

/* ─── Design Tokens ──────────────────────────────────────────────────────── */
const TOKEN = {
  bg:        '#F8FAFC',
  surface:   '#FFFFFF',
  surfaceEl: '#F1F5F9',
  border:    'rgba(0,0,0,0.08)',
  borderHov: 'rgba(0,0,0,0.12)',
  textPri:   '#0F172A',
  textSec:   '#475569',
  textMut:   '#94A3B8',
};

/* ─── Status Config ──────────────────────────────────────────────────────── */
const STATUS = {
  OPEN:        { label:'Open',        color:'#3B82F6', bg:'rgba(59,130,246,0.12)',  glow:'rgba(59,130,246,0.35)',  border:'rgba(59,130,246,0.4)'  },
  IN_PROGRESS: { label:'In Progress', color:'#F59E0B', bg:'rgba(245,158,11,0.12)', glow:'rgba(245,158,11,0.35)', border:'rgba(245,158,11,0.4)' },
  RESOLVED:    { label:'Resolved',    color:'#10B981', bg:'rgba(16,185,129,0.12)', glow:'rgba(16,185,129,0.35)', border:'rgba(16,185,129,0.4)' },
  REJECTED:    { label:'Rejected',    color:'#EF4444', bg:'rgba(239,68,68,0.12)',  glow:'rgba(239,68,68,0.35)',  border:'rgba(239,68,68,0.4)'  },
  CLOSED:      { label:'Closed',      color:'#6B7280', bg:'rgba(107,114,128,0.12)',glow:'rgba(107,114,128,0.3)', border:'rgba(107,114,128,0.35)'},
};

/* ─── Priority Config ────────────────────────────────────────────────────── */
const PRIORITY = {
  LOW:      { color:'#22D3EE', bg:'rgba(34,211,238,0.1)',   stripe:'rgba(34,211,238,0.08)'  },
  MEDIUM:   { color:'#FBBF24', bg:'rgba(251,191,36,0.1)',   stripe:'rgba(251,191,36,0.06)'  },
  HIGH:     { color:'#FB923C', bg:'rgba(251,146,60,0.1)',   stripe:'rgba(251,146,60,0.07)'  },
  CRITICAL: { color:'#F472B6', bg:'rgba(244,114,182,0.1)',  stripe:'rgba(244,114,182,0.08)' },
};

/* ─── Stat Cards Config ──────────────────────────────────────────────────── */
const STAT_CARDS = [
  { key:'ALL',         label:'Total',       icon:Activity,    from:'#6366F1', to:'#818CF8', shadow:'rgba(99,102,241,0.4)'  },
  { key:'OPEN',        label:'Open',        icon:Zap,         from:'#2563EB', to:'#3B82F6', shadow:'rgba(59,130,246,0.4)'  },
  { key:'IN_PROGRESS', label:'In Progress', icon:Clock,       from:'#D97706', to:'#F59E0B', shadow:'rgba(245,158,11,0.4)'  },
  { key:'RESOLVED',    label:'Resolved',    icon:CheckCircle, from:'#059669', to:'#10B981', shadow:'rgba(16,185,129,0.4)'  },
  { key:'CLOSED',      label:'Closed',      icon:ShieldCheck, from:'#475569', to:'#64748B', shadow:'rgba(71,85,105,0.4)'  },
  { key:'unassigned',  label:'Unassigned',  icon:Users,       from:'#DC2626', to:'#EF4444', shadow:'rgba(239,68,68,0.4)'   },
];

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const timeSince = (iso) => {
  if (!iso) return '—';
  const m = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};



const initials = (name) => name?.split(' ').map(n => n[0]).join('').slice(0,2) || '?';

/* ─── Global Styles ──────────────────────────────────────────────────────── */
const globalStyle = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

  .adm-root { font-family: 'Outfit', sans-serif; background-color: #F8FAFC;}
  .adm-root * { box-sizing: border-box; }

  .adm-input {
    width: 100%;
    background: #FFFFFF;
    border: 1px solid rgba(0,0,0,0.1);
    border-radius: 10px;
    color: #0F172A;
    font-family: 'Outfit', sans-serif;
    font-size: 0.9rem;
    padding: 10px 14px;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .adm-input::placeholder { color: #94A3B8; }
  .adm-input:focus {
    border-color: rgba(37,99,235,0.6);
    box-shadow: 0 0 0 3px rgba(37,99,235,0.12);
  }

  .adm-btn-ghost {
    background: rgba(0,0,0,0.03);
    border: 1px solid rgba(0,0,0,0.06);
    border-radius: 8px;
    color: #475569;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: 'Outfit', sans-serif;
    font-size: 0.88rem;
    font-weight: 600;
    padding: 9px 16px;
    transition: all 0.18s;
  }
  .adm-btn-ghost:hover {
    background: rgba(0,0,0,0.06);
    border-color: rgba(0,0,0,0.12);
    color: #0F172A;
  }

  .adm-btn-primary {
    background: linear-gradient(135deg,#1E3A8A,#2563EB);
    border: none;
    border-radius: 10px;
    color: #fff;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-family: 'Outfit', sans-serif;
    font-size: 0.9rem;
    font-weight: 600;
    padding: 11px 22px;
    transition: opacity 0.18s, transform 0.15s, box-shadow 0.15s;
    box-shadow: 0 4px 12px rgba(37,99,235,0.25);
  }
  .adm-btn-primary:hover { opacity: 0.92; transform: translateY(-1px); box-shadow: 0 6px 16px rgba(37,99,235,0.35); }
  .adm-btn-primary:active { transform: translateY(0); box-shadow: 0 2px 8px rgba(37,99,235,0.2); }
  .adm-btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }

  .adm-row-hover { transition: background 0.15s; }
  .adm-row-hover:hover { background: rgba(0,0,0,0.02) !important; }

  .adm-action-btn {
    align-items: center;
    background: #F1F5F9;
    border: 1px solid rgba(0,0,0,0.05);
    border-radius: 8px;
    color: #64748B;
    cursor: pointer;
    display: flex;
    justify-content: center;
    padding: 7px;
    transition: all 0.18s;
  }

  @keyframes adm-fade-in {
    from { opacity:0; transform:translateY(10px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes adm-spin {
    to { transform: rotate(360deg); }
  }
  .adm-spin { animation: adm-spin 1s linear infinite; }
  .adm-fade-in { animation: adm-fade-in 0.35s ease forwards; }

  .adm-scrollbar::-webkit-scrollbar { width: 5px; }
  .adm-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .adm-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 99px; }
`;

/* ─── StatusBadge ────────────────────────────────────────────────────────── */
const StatusBadge = ({ status }) => {
  const s = STATUS[status] || STATUS.CLOSED;
  return (
    <span style={{
      alignItems:'center', background:s.bg, border:`1px solid ${s.border}`,
      borderRadius:'20px', color:s.color, display:'inline-flex', fontSize:'0.75rem',
      fontWeight:700, gap:'5px', letterSpacing:'0.03em', padding:'4px 11px', whiteSpace:'nowrap',
    }}>
      <span style={{ background:s.color, borderRadius:'50%', display:'inline-block', height:'6px', width:'6px', flexShrink:0, boxShadow:`0 0 6px ${s.glow}` }} />
      {s.label}
    </span>
  );
};

/* ─── PriorityBadge ──────────────────────────────────────────────────────── */
const PriorityBadge = ({ priority }) => {
  const p = PRIORITY[priority] || PRIORITY.MEDIUM;
  return (
    <span style={{
      background:p.bg, borderRadius:'6px', color:p.color,
      fontSize:'0.72rem', fontWeight:800, letterSpacing:'0.08em',
      padding:'3px 9px', textTransform:'uppercase', whiteSpace:'nowrap',
    }}>
      {priority}
    </span>
  );
};

/* ─── Stat Card ──────────────────────────────────────────────────────────── */
const StatCard = ({ icon: Icon, label, value, from, to, shadow }) => (
  <div style={{
    background:`linear-gradient(135deg,${from}18,${to}08)`,
    border:`1px solid ${from}30`,
    borderRadius:'16px',
    padding:'22px 24px',
    position:'relative',
    overflow:'hidden',
    animation:'adm-fade-in 0.4s ease forwards',
  }}>
    <div style={{
      position:'absolute', top:0, right:0, width:'90px', height:'90px',
      background:`radial-gradient(circle at 70% 30%, ${to}22, transparent 70%)`,
      pointerEvents:'none',
    }} />
    <div style={{
      alignItems:'center', background:`linear-gradient(135deg,${from},${to})`,
      borderRadius:'10px', boxShadow:`0 6px 18px ${shadow}`,
      display:'inline-flex', justifyContent:'center', marginBottom:'14px',
      padding:'9px',
    }}>
      <Icon size={18} color="#fff" />
    </div>
    <p style={{ color:TOKEN.textSec, fontSize:'0.78rem', fontWeight:600, letterSpacing:'0.06em', margin:'0 0 4px', textTransform:'uppercase' }}>
      {label}
    </p>
    <p style={{ color:TOKEN.textPri, fontSize:'2.1rem', fontWeight:800, lineHeight:1, margin:0, fontVariantNumeric:'tabular-nums' }}>
      {value}
    </p>
  </div>
);

/* ─── Overlay ────────────────────────────────────────────────────────────── */
const Overlay = ({ children, onClose }) => (
  <div style={{
    alignItems:'center', background:'rgba(0,0,0,0.75)', backdropFilter:'blur(8px)',
    bottom:0, display:'flex', justifyContent:'center', left:0, padding:'20px',
    position:'fixed', right:0, top:0, zIndex:1000,
  }}>
    <div className="adm-fade-in adm-scrollbar" style={{
      background:TOKEN.surface, border:`1px solid ${TOKEN.border}`, borderRadius:'20px',
      boxShadow:'0 32px 80px rgba(0,0,0,0.6)', maxHeight:'90vh', maxWidth:'540px',
      overflowY:'auto', padding:'32px', position:'relative', width:'100%',
    }}>
      <button onClick={onClose} style={{
        background:'rgba(0,0,0,0.06)', border:`1px solid ${TOKEN.border}`,
        borderRadius:'8px', color:TOKEN.textSec, cursor:'pointer', padding:'6px',
        position:'absolute', right:'16px', top:'16px', display:'flex',
        transition:'all 0.15s',
      }}>
        <X size={16} />
      </button>
      {children}
    </div>
  </div>
);

/* ─── Assign Modal ───────────────────────────────────────────────────────── */
const AssignModal = ({ ticket, technicians, onClose, onAssigned }) => {
  const [selectedName, setSelectedName] = useState(ticket.assignedTechnician || '');
  const [selectedId, setSelectedId]     = useState(ticket.assignedTechnicianId || '');
  const [custom, setCustom]             = useState('');
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');

  const techName = custom.trim() || selectedName;
  const techId   = custom.trim() ? null : selectedId;

  // 🧠 Intelligent Sorting: Specialists first
  const sortedTechnicians = useMemo(() => {
    return [...technicians].sort((a, b) => {
      const aMatches = a.techCategory === ticket.category;
      const bMatches = b.techCategory === ticket.category;
      if (aMatches && !bMatches) return -1;
      if (!aMatches && bMatches) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [technicians, ticket.category]);

  const handleAssign = async () => {
    if (!techName) { setError('Please select or enter a technician.'); return; }
    setLoading(true);
    try {
      await API.patch(`/tickets/${ticket.id}/status`, {
        status: ticket.status === 'OPEN' ? 'IN_PROGRESS' : ticket.status,
        assignedTechnician: techName,
        assignedTechnicianId: techId
      });
      onAssigned(); onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to assign.');
    } finally { setLoading(false); }
  };

  const avatarColors = ['#6366F1','#10B981','#F59E0B','#EF4444','#3B82F6','#EC4899'];

  return (
    <Overlay onClose={onClose}>
      <h3 style={{ color:TOKEN.textPri, fontSize:'1.2rem', fontWeight:800, margin:'0 0 4px' }}>Assign Technician</h3>
      <p style={{ color:TOKEN.textSec, fontSize:'0.87rem', margin:'0 0 24px' }}>
        Ticket <span style={{ color:'#818CF8', fontWeight:700 }}>#{ticket.id.slice(-5)}</span> · {ticket.category?.replace(/_/g,' ')}
      </p>

      <p style={{ color:TOKEN.textMut, fontSize:'0.72rem', fontWeight:700, letterSpacing:'0.1em', margin:'0 0 10px', textTransform:'uppercase' }}>
        Recommended Specialists
      </p>
      <div style={{ display:'flex', flexDirection:'column', gap:'6px', marginBottom:'20px' }}>
        {sortedTechnicians.map((t, i) => {
          const active = selectedId === t.id && !custom;
          const isSpecialist = t.techCategory === ticket.category;
          return (
            <button key={t.id} onClick={() => { setSelectedName(t.name); setSelectedId(t.id); setCustom(''); }} style={{
              alignItems:'center', background: active ? 'rgba(37,99,235,0.08)' : (isSpecialist ? 'rgba(16,185,129,0.04)' : 'rgba(0,0,0,0.02)'),
              border:`1px solid ${active ? 'rgba(37,99,235,0.4)' : (isSpecialist ? 'rgba(16,185,129,0.3)' : TOKEN.border)}`,
              borderRadius:'10px', color: active ? '#1E3A8A' : TOKEN.textSec, cursor:'pointer',
              display:'flex', gap:'10px', fontFamily:'Outfit,sans-serif', fontSize:'0.88rem',
              fontWeight: active ? 700 : 500, padding:'11px 14px', textAlign:'left', transition:'all 0.15s',
            }}>
              <div style={{
                alignItems:'center', background: active ? '#2563EB' : (isSpecialist ? '#10B981' : avatarColors[i % avatarColors.length] + '25'),
                borderRadius:'50%', color: (active || isSpecialist) ? '#fff' : avatarColors[i % avatarColors.length],
                display:'flex', flexShrink:0, fontSize:'0.72rem', fontWeight:800,
                height:'32px', justifyContent:'center', width:'32px',
              }}>
                {isSpecialist && !active ? <Wrench size={14} /> : initials(t.name)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                  {t.name}
                  {isSpecialist && <span style={{ background:'rgba(16,185,129,0.1)', color:'#10B981', fontSize:'0.65rem', fontWeight:800, padding:'2px 8px', borderRadius:'4px', letterSpacing:'0.05em' }}>EXPERT MATCH</span>}
                </div>
                {isSpecialist && <p style={{ margin:0, fontSize:'0.7rem', color:'#10B981', fontWeight:500 }}>Specializes in {t.techCategory.replace(/_/g,' ')}</p>}
              </div>
              {active && <span style={{ marginLeft:'auto', background:'rgba(37,99,235,0.1)', border:'1px solid rgba(37,99,235,0.3)', borderRadius:'6px', color:'#2563EB', fontSize:'0.7rem', fontWeight:700, padding:'2px 8px' }}>Selected</span>}
            </button>
          );
        })}
      </div>

      <p style={{ color:TOKEN.textMut, fontSize:'0.72rem', fontWeight:700, letterSpacing:'0.1em', margin:'0 0 8px', textTransform:'uppercase' }}>
        Or enter custom name
      </p>
      <input className="adm-input" placeholder="Type technician name…" value={custom}
        onChange={e => { setCustom(e.target.value); setSelectedName(''); setSelectedId(''); }}
        style={{ marginBottom:'16px' }} />

      {error && <p style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:'8px', color:'#FCA5A5', fontSize:'0.83rem', margin:'0 0 12px', padding:'10px 14px' }}>⚠ {error}</p>}
      {ticket.status === 'OPEN' && (
        <p style={{ background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.25)', borderRadius:'8px', color:'#FCD34D', fontSize:'0.82rem', margin:'0 0 20px', padding:'10px 14px' }}>
          ℹ Assigning will automatically move ticket to <strong>In Progress</strong>.
        </p>
      )}

      <div style={{ display:'flex', gap:'10px', justifyContent:'flex-end' }}>
        <button className="adm-btn-ghost" onClick={onClose} disabled={loading}>Cancel</button>
        <button className="adm-btn-primary" onClick={handleAssign} disabled={loading}>
          {loading ? 'Assigning…' : <><UserCheck size={15} />Assign</>}
        </button>
      </div>
    </Overlay>
  );
};

/* ─── Status Modal ───────────────────────────────────────────────────────── */
const StatusModal = ({ ticket, onClose, onUpdated }) => {
  const nextMap = {
    OPEN:['IN_PROGRESS','REJECTED'], IN_PROGRESS:['RESOLVED','REJECTED'],
    RESOLVED:['CLOSED'], REJECTED:['CLOSED'],
  };
  const options = nextMap[ticket.status] || [];
  const [newStatus, setNewStatus] = useState(options[0] || '');
  const [notes, setNotes]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const needsNotes = newStatus === 'RESOLVED' || newStatus === 'REJECTED';

  const handleUpdate = async () => {
    if (needsNotes && !notes.trim()) { setError('Please provide notes.'); return; }
    setLoading(true);
    try {
      await API.patch(`/tickets/${ticket.id}/status`, {
        status: newStatus,
        resolutionNotes: newStatus === 'RESOLVED' ? notes : null,
        rejectionReason: newStatus === 'REJECTED' ? notes : null,
      });
      onUpdated(); onClose();
    } catch (err) { setError(err.response?.data?.message || 'Update failed.'); }
    finally { setLoading(false); }
  };

  if (!options.length) return (
    <Overlay onClose={onClose}>
      <h3 style={{ color:TOKEN.textPri, margin:'0 0 12px' }}>No Transitions Available</h3>
      <p style={{ color:TOKEN.textSec }}>Ticket is <strong style={{ color:'#818CF8' }}>{ticket.status}</strong> and cannot move further.</p>
      <div style={{ display:'flex', justifyContent:'flex-end', marginTop:'24px' }}>
        <button className="adm-btn-ghost" onClick={onClose}>Close</button>
      </div>
    </Overlay>
  );

  return (
    <Overlay onClose={onClose}>
      <h3 style={{ color:TOKEN.textPri, fontSize:'1.2rem', fontWeight:800, margin:'0 0 4px' }}>Update Status</h3>
      <p style={{ color:TOKEN.textSec, fontSize:'0.87rem', margin:'0 0 24px', display:'flex', alignItems:'center', gap:'8px' }}>
        Ticket <span style={{ color:'#818CF8', fontWeight:700 }}>#{ticket.id.slice(-5)}</span>
        · currently <StatusBadge status={ticket.status} />
      </p>

      <p style={{ color:TOKEN.textMut, fontSize:'0.72rem', fontWeight:700, letterSpacing:'0.1em', margin:'0 0 10px', textTransform:'uppercase' }}>
        Move to
      </p>
      <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'20px' }}>
        {options.map(s => {
          const meta = STATUS[s];
          const active = newStatus === s;
          return (
            <button key={s} onClick={() => setNewStatus(s)} style={{
              background: active ? meta.bg : 'rgba(0,0,0,0.03)',
              border:`2px solid ${active ? meta.border : TOKEN.border}`,
              borderRadius:'10px', color: active ? meta.color : TOKEN.textSec,
              cursor:'pointer', fontFamily:'Outfit,sans-serif', fontSize:'0.88rem',
              fontWeight:700, padding:'10px 20px', transition:'all 0.15s',
            }}>
              {meta.label}
            </button>
          );
        })}
      </div>

      {needsNotes && (
        <>
          <p style={{ color:TOKEN.textMut, fontSize:'0.72rem', fontWeight:700, letterSpacing:'0.1em', margin:'0 0 8px', textTransform:'uppercase' }}>
            {newStatus === 'RESOLVED' ? 'Resolution Notes' : 'Rejection Reason'}
          </p>
          <textarea className="adm-input" rows={4} style={{ resize:'vertical', marginBottom:'12px' }}
            placeholder={newStatus === 'RESOLVED' ? 'Describe how the issue was resolved…' : 'Explain why this is being rejected…'}
            value={notes} onChange={e => setNotes(e.target.value)} />
        </>
      )}

      {error && <p style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:'8px', color:'#FCA5A5', fontSize:'0.83rem', margin:'0 0 12px', padding:'10px 14px' }}>⚠ {error}</p>}

      <div style={{ display:'flex', gap:'10px', justifyContent:'flex-end', marginTop:'8px' }}>
        <button className="adm-btn-ghost" onClick={onClose} disabled={loading}>Cancel</button>
        <button className="adm-btn-primary" onClick={handleUpdate} disabled={loading}>
          {loading ? 'Updating…' : 'Confirm Update'}
        </button>
      </div>
    </Overlay>
  );
};

/* ─── Main AdminView ─────────────────────────────────────────────────────── */
const AdminView = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [tickets, setTickets]           = useState([]);
  const [technicians, setTechnicians]   = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriority]   = useState('ALL');
  const [sortBy, setSortBy]             = useState('createdAt');
  const [assignTarget, setAssignTarget] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]           = useState(false);
  const [viewMode, setViewMode]           = useState('list'); // 'list' or 'analytics'
  const [stats, setStats]                 = useState(null);
  const [loadingStats, setLoadingStats]   = useState(false);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter !== 'ALL')   params.status   = statusFilter;
      if (priorityFilter !== 'ALL') params.priority = priorityFilter;
      const res = await API.get('/tickets', { params });
      setTickets(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load tickets.');
    } finally { setLoading(false); }
  }, [statusFilter, priorityFilter]);

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const res = await API.get('/tickets/stats');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to load stats', err);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const fetchTechnicians = useCallback(async () => {
    try {
      const res = await API.get('/auth/users');
      setTechnicians(res.data.filter(u => u.role === 'TECHNICIAN'));
    } catch (err) {
      console.error('Failed to load technicians', err);
    }
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await API.delete(`/tickets/${deleteTarget.id}`);
      setTickets(prev => prev.filter(t => t.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      alert('Failed to delete ticket.');
    } finally { setDeleting(false); }
  };

  useEffect(() => {
    if (!authLoading) { 
      if (user) {
        fetchTickets();
        fetchTechnicians();
        fetchStats();
      } else {
        setError('You must be logged in.');
      }
    }
  }, [authLoading, user, fetchTickets, fetchTechnicians, fetchStats]);

  const counts = {
    ALL:         tickets.length,
    OPEN:        tickets.filter(t => t.status === 'OPEN').length,
    IN_PROGRESS: tickets.filter(t => t.status === 'IN_PROGRESS').length,
    RESOLVED:    tickets.filter(t => t.status === 'RESOLVED').length,
    REJECTED:    tickets.filter(t => t.status === 'REJECTED').length,
    CLOSED:      tickets.filter(t => t.status === 'CLOSED').length,
    unassigned:  tickets.filter(t => !t.assignedTechnician && t.status !== 'CLOSED' && t.status !== 'RESOLVED').length,
  };

  const filtered = tickets
    .filter(t => {
      const q = search.toLowerCase();
      return t.description?.toLowerCase().includes(q) || t.contactName?.toLowerCase().includes(q)
        || t.id?.toLowerCase().includes(q) || t.resourceLocation?.toLowerCase().includes(q)
        || t.category?.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sortBy === 'createdAt') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'priority') {
        const o = { CRITICAL:0, HIGH:1, MEDIUM:2, LOW:3 };
        return (o[a.priority] ?? 99) - (o[b.priority] ?? 99);
      }
      return 0;
    });

  if (authLoading) return (
    <div className="adm-root" style={{ alignItems:'center', color:TOKEN.textSec, display:'flex', height:'60vh', justifyContent:'center' }}>
      Checking authentication…
    </div>
  );

  if (error) return (
    <div className="adm-root" style={{ alignItems:'center', color:'#FCA5A5', display:'flex', flexDirection:'column', height:'60vh', justifyContent:'center', gap:'12px' }}>
      <AlertCircle size={48} color="#EF4444" />
      <p style={{ fontWeight:600 }}>{error}</p>
    </div>
  );

  const techAvatarColor = (name) => {
    const palette = ['#6366F1','#10B981','#F59E0B','#EF4444','#3B82F6','#EC4899','#8B5CF6','#06B6D4'];
    return palette[(name?.charCodeAt(0) || 0) % palette.length];
  };

  return (
    <div className="adm-root adm-fade-in" style={{ maxWidth:'1440px', margin:'0 auto', minHeight:'100vh', padding:'0 0 60px' }}>
      <style>{globalStyle}</style>

      {/* ── Page Header ── */}
      <div style={{
        alignItems:'flex-end', display:'flex', flexWrap:'wrap', gap:'16px',
        justifyContent:'space-between', marginBottom:'36px',
      }}>
        <div>
          <div style={{ alignItems:'center', display:'flex', gap:'10px', marginBottom:'10px' }}>
            <div style={{
              alignItems:'center', background:'linear-gradient(135deg,#6366F1,#818CF8)',
              borderRadius:'10px', boxShadow:'0 4px 14px rgba(99,102,241,0.4)',
              display:'flex', justifyContent:'center', padding:'9px',
            }}>
              <ShieldCheck size={18} color="#fff" />
            </div>
            <span style={{ color:'#818CF8', fontSize:'0.75rem', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase' }}>
              Admin Console
            </span>
          </div>
          <h1 style={{
            background:'linear-gradient(135deg, #F0F4FF 30%, #818CF8)',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
            fontFamily:'Outfit,sans-serif', fontSize:'2.4rem', fontWeight:800,
            lineHeight:1.15, margin:'0 0 8px',
          }}>
            Ticket Management
          </h1>
          <p style={{ color:TOKEN.textSec, fontSize:'0.95rem', margin:0 }}>
            Oversee, assign, and resolve all campus maintenance requests.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.04)', padding: '4px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)' }}>
            <button 
              onClick={() => setViewMode('list')}
              style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s', background: viewMode === 'list' ? '#FFFFFF' : 'transparent', color: viewMode === 'list' ? '#2563EB' : '#64748B', boxShadow: viewMode === 'list' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none' }}>
              <LayoutList size={16} /> List View
            </button>
            <button 
              onClick={() => setViewMode('analytics')}
              style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s', background: viewMode === 'analytics' ? '#FFFFFF' : 'transparent', color: viewMode === 'analytics' ? '#2563EB' : '#64748B', boxShadow: viewMode === 'analytics' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none' }}>
              <BarChart3 size={16} /> Analytics Board
            </button>
          </div>
          <button className="adm-btn-ghost" onClick={() => { fetchTickets(); fetchStats(); }} style={{ height:'fit-content' }}>
            <RefreshCw size={15} className={(loading || loadingStats) ? 'adm-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {viewMode === 'analytics' ? (
        <TicketAnalyticsBoard stats={stats} role="ADMIN" />
      ) : (
        <>
          {/* ── Stat Cards ── */}
          <div style={{ display:'grid', gap:'16px', gridTemplateColumns:'repeat(auto-fit,minmax(195px,1fr))', marginBottom:'32px' }}>
            {STAT_CARDS.map(({ key, label, icon, from, to, shadow }) => (
              <StatCard key={key} icon={icon} label={label} value={counts[key] ?? 0} from={from} to={to} shadow={shadow} />
            ))}
          </div>

      {/* ── Filter Bar ── */}
      <div style={{
        background:TOKEN.surface, border:`1px solid ${TOKEN.border}`,
        borderRadius:'16px', marginBottom:'20px', padding:'18px 20px',
      }}>
        <div style={{ alignItems:'center', display:'flex', flexWrap:'wrap', gap:'12px' }}>

          {/* Search */}
          <div style={{ position:'relative', flex:'1', minWidth:'220px', maxWidth:'340px' }}>
            <Search size={15} color={TOKEN.textMut} style={{ left:'12px', pointerEvents:'none', position:'absolute', top:'50%', transform:'translateY(-50%)' }} />
            <input className="adm-input" placeholder="Search tickets, names, locations…"
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft:'38px' }} />
          </div>

          {/* Status Tabs */}
          <div style={{ alignItems:'center', background:'rgba(0,0,0,0.03)', border:`1px solid ${TOKEN.border}`, borderRadius:'10px', display:'flex', flexWrap:'wrap', gap:'2px', padding:'3px' }}>
            {['ALL','OPEN','IN_PROGRESS','RESOLVED','REJECTED','CLOSED'].map(s => {
              const active = statusFilter === s;
              const meta = STATUS[s];
              return (
                <button key={s} onClick={() => setStatusFilter(s)} style={{
                  alignItems:'center', background: active ? (meta ? meta.bg : 'rgba(99,102,241,0.15)') : 'transparent',
                  border: active ? `1px solid ${meta ? meta.border : 'rgba(99,102,241,0.4)'}` : '1px solid transparent',
                  borderRadius:'7px', color: active ? (meta ? meta.color : '#A5B4FC') : TOKEN.textSec,
                  cursor:'pointer', display:'flex', fontFamily:'Outfit,sans-serif', fontSize:'0.78rem',
                  fontWeight:700, gap:'5px', padding:'6px 10px', transition:'all 0.15s', whiteSpace:'nowrap',
                }}>
                  {s === 'ALL' ? 'All' : meta?.label}
                  <span style={{
                    background: active ? (meta ? meta.color : '#6366F1') : TOKEN.border,
                    borderRadius:'99px', color:'#fff', fontSize:'0.68rem', fontWeight:800,
                    lineHeight:1, minWidth:'18px', padding:'2px 5px', textAlign:'center',
                  }}>
                    {s === 'ALL' ? counts.ALL : counts[s] ?? 0}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Priority select */}
          <div style={{ position:'relative' }}>
            <select className="adm-input" value={priorityFilter} onChange={e => setPriority(e.target.value)}
              style={{ appearance:'none', minWidth:'135px', paddingRight:'34px' }}>
              <option value="ALL">All Priorities</option>
              {['CRITICAL','HIGH','MEDIUM','LOW'].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <ChevronDown size={13} color={TOKEN.textMut} style={{ pointerEvents:'none', position:'absolute', right:'11px', top:'50%', transform:'translateY(-50%)' }} />
          </div>

          {/* Sort select */}
          <div style={{ position:'relative' }}>
            <select className="adm-input" value={sortBy} onChange={e => setSortBy(e.target.value)}
              style={{ appearance:'none', minWidth:'135px', paddingRight:'34px' }}>
              <option value="createdAt">Newest First</option>
              <option value="priority">By Priority</option>
            </select>
            <ChevronDown size={13} color={TOKEN.textMut} style={{ pointerEvents:'none', position:'absolute', right:'11px', top:'50%', transform:'translateY(-50%)' }} />
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div style={{ alignItems:'center', background:TOKEN.surface, border:`1px solid ${TOKEN.border}`, borderRadius:'16px', color:TOKEN.textSec, display:'flex', flexDirection:'column', gap:'12px', justifyContent:'center', minHeight:'260px' }}>
          <RefreshCw size={28} className="adm-spin" style={{ opacity:.5 }} />
          <p style={{ color:TOKEN.textSec, fontSize:'0.9rem', fontWeight:600, margin:0 }}>Loading tickets…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ alignItems:'center', background:TOKEN.surface, border:`1px solid ${TOKEN.border}`, borderRadius:'16px', color:TOKEN.textSec, display:'flex', flexDirection:'column', gap:'12px', justifyContent:'center', minHeight:'260px' }}>
          <Filter size={40} style={{ opacity:.2 }} />
          <div style={{ textAlign:'center' }}>
            <p style={{ color:TOKEN.textPri, fontWeight:700, margin:'0 0 4px' }}>No tickets found</p>
            <p style={{ fontSize:'0.88rem', margin:0 }}>Try adjusting your search or filters.</p>
          </div>
        </div>
      ) : (
        <div style={{ background:TOKEN.surface, border:`1px solid ${TOKEN.border}`, borderRadius:'16px', overflow:'hidden' }}>

          {/* Header Row */}
          <div style={{
            background:'rgba(0,0,0,0.03)', borderBottom:`1px solid ${TOKEN.border}`,
            display:'grid', gap:'0',
            gridTemplateColumns:'88px 1fr 120px 108px 152px 148px 140px',
            padding:'13px 20px',
          }}>
            {['Ticket','Description','Category','Priority','Status','Technician','Actions'].map(h => (
              <span key={h} style={{ color:TOKEN.textMut, fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.09em', textTransform:'uppercase' }}>
                {h}
              </span>
            ))}
          </div>

          {/* Data Rows */}
          {filtered.map((ticket, idx) => {
            const pMeta = PRIORITY[ticket.priority] || PRIORITY.MEDIUM;
            const avatarBg = techAvatarColor(ticket.assignedTechnician);
            return (
              <div
                key={ticket.id}
                className="adm-row-hover"
                style={{
                  alignItems:'center', borderBottom: idx < filtered.length-1 ? `1px solid ${TOKEN.border}` : 'none',
                  borderLeft:`3px solid ${pMeta.color}40`,
                  display:'grid', gap:'0',
                  gridTemplateColumns:'88px 1fr 120px 108px 152px 148px 140px',
                  padding:'16px 20px',
                  background: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.012)',
                  transition:'background 0.15s',
                }}
              >
                {/* ID + time */}
                <div>
                  <p style={{ color:'#818CF8', fontFamily:'JetBrains Mono,monospace', fontSize:'0.82rem', fontWeight:600, margin:'0 0 3px' }}>
                    #{ticket.id.slice(-5)}
                  </p>
                  <p style={{ color:TOKEN.textMut, fontSize:'0.72rem', margin:0 }}>
                    {timeSince(ticket.createdAt)}
                  </p>
                </div>

                {/* Description + reporter */}
                <div style={{ paddingRight:'14px' }}>
                  <p style={{
                    color:TOKEN.textPri, display:'-webkit-box', fontSize:'0.86rem', fontWeight:600,
                    lineHeight:'1.4', margin:'0 0 4px', overflow:'hidden',
                    WebkitBoxOrient:'vertical', WebkitLineClamp:2,
                  }}>
                    {ticket.description}
                  </p>
                  <p style={{ color:TOKEN.textMut, fontSize:'0.73rem', margin:0 }}>
                    {ticket.contactName} · {ticket.resourceLocation}
                  </p>
                </div>

                {/* Category */}
                <div>
                  <span style={{
                    background:'rgba(0,0,0,0.06)', borderRadius:'7px', color:TOKEN.textSec,
                    fontSize:'0.75rem', fontWeight:600, padding:'4px 9px', whiteSpace:'nowrap',
                  }}>
                    {ticket.category?.replace(/_/g,' ') || '—'}
                  </span>
                </div>

                {/* Priority */}
                <div><PriorityBadge priority={ticket.priority} /></div>

                {/* Status */}
                <div><StatusBadge status={ticket.status} /></div>

                {/* Technician */}
                <div>
                  {ticket.assignedTechnician ? (
                    <div style={{ alignItems:'center', display:'flex', gap:'7px' }}>
                      <div style={{
                        alignItems:'center', background:avatarBg + '25',
                        border:`1px solid ${avatarBg}50`, borderRadius:'50%',
                        color:avatarBg, display:'flex', flexShrink:0,
                        fontSize:'0.62rem', fontWeight:800, height:'26px',
                        justifyContent:'center', width:'26px',
                      }}>
                        {initials(ticket.assignedTechnician)}
                      </div>
                      <span style={{ color:TOKEN.textSec, fontSize:'0.8rem', fontWeight:600 }}>
                        {ticket.assignedTechnician.split(' ')[0]}
                      </span>
                    </div>
                  ) : (
                    <span style={{ alignItems:'center', color:'#FCA5A5', display:'flex', fontSize:'0.78rem', fontWeight:700, gap:'5px' }}>
                      <span style={{ background:'#EF4444', borderRadius:'50%', display:'inline-block', height:'5px', width:'5px' }} />
                      Unassigned
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div style={{ alignItems:'center', display:'flex', gap:'6px' }}>
                  <button title="View" className="adm-action-btn"
                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                    onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(129,140,248,0.5)'; e.currentTarget.style.color='#818CF8'; e.currentTarget.style.background='rgba(99,102,241,0.1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor=TOKEN.border; e.currentTarget.style.color=TOKEN.textSec; e.currentTarget.style.background='rgba(0,0,0,0.04)'; }}>
                    <Eye size={14} />
                  </button>

                  {ticket.status !== 'CLOSED' && (
                    <button title="Assign" className="adm-action-btn"
                      onClick={() => setAssignTarget(ticket)}
                      onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(16,185,129,0.5)'; e.currentTarget.style.color='#34D399'; e.currentTarget.style.background='rgba(16,185,129,0.1)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor=TOKEN.border; e.currentTarget.style.color=TOKEN.textSec; e.currentTarget.style.background='rgba(0,0,0,0.04)'; }}>
                      <Wrench size={14} />
                    </button>
                  )}

                  {ticket.status !== 'CLOSED' && (
                    <button title="Update status" className="adm-action-btn"
                      onClick={() => setStatusTarget(ticket)}
                      onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(245,158,11,0.5)'; e.currentTarget.style.color='#FBBF24'; e.currentTarget.style.background='rgba(245,158,11,0.1)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor=TOKEN.border; e.currentTarget.style.color=TOKEN.textSec; e.currentTarget.style.background='rgba(0,0,0,0.04)'; }}>
                      <TrendingUp size={14} />
                    </button>
                  )}

                  <button title="Delete" className="adm-action-btn"
                    onClick={() => setDeleteTarget(ticket)}
                    onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(239,68,68,0.5)'; e.currentTarget.style.color='#EF4444'; e.currentTarget.style.background='rgba(239,68,68,0.1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor=TOKEN.border; e.currentTarget.style.color=TOKEN.textSec; e.currentTarget.style.background='rgba(0,0,0,0.04)'; }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Footer */}
          <div style={{
            alignItems:'center', background:'rgba(0,0,0,0.02)', borderTop:`1px solid ${TOKEN.border}`,
            display:'flex', justifyContent:'space-between', padding:'13px 20px',
          }}>
            <span style={{ color:TOKEN.textMut, fontSize:'0.8rem' }}>
              Showing <strong style={{ color:TOKEN.textSec }}>{filtered.length}</strong> of <strong style={{ color:TOKEN.textSec }}>{tickets.length}</strong> tickets
            </span>
            <div style={{ alignItems:'center', color:TOKEN.textMut, display:'flex', fontSize:'0.75rem', gap:'12px' }}>
              <span style={{ alignItems:'center', display:'flex', gap:'4px' }}><Eye size={12} /> View</span>
              <span style={{ alignItems:'center', display:'flex', gap:'4px' }}><Wrench size={12} /> Assign</span>
              <span style={{ alignItems:'center', display:'flex', gap:'4px' }}><TrendingUp size={12} /> Status</span>
            </div>
          </div>
        </div>
      )}
    </>
  )}

      {assignTarget && <AssignModal ticket={assignTarget} technicians={technicians} onClose={() => setAssignTarget(null)} onAssigned={fetchTickets} />}
      {statusTarget && <StatusModal ticket={statusTarget} onClose={() => setStatusTarget(null)} onUpdated={fetchTickets} />}

      {/* Deletion Modal */}
      {deleteTarget && (
        <Overlay onClose={() => setDeleteTarget(null)}>
          <div style={{ textAlign:'center' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%', background: '#FEF2F2',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#DC2626', margin: '0 auto 20px'
            }}>
              <AlertTriangle size={32} />
            </div>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1.4rem', fontWeight: 800, color: '#1E293B' }}>
              Confirm Deletion
            </h3>
            <p style={{ color: '#64748B', marginBottom: '28px', fontSize: '0.95rem', lineHeight: '1.6' }}>
              Permanently delete **Ticket #{deleteTarget.id.slice(-5)}**? This action cannot be undone.
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="adm-btn-ghost" style={{ flex:1 }} onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="adm-btn-primary" style={{ flex:1, background:'#DC2626', boxShadow:'0 8px 16px rgba(220,38,38,0.25)' }} 
                disabled={deleting} onClick={handleDelete}>
                {deleting ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </Overlay>
      )}
    </div>
  );
};

export default AdminView;
