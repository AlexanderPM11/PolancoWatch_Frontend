import { useState, useEffect } from 'react';
import { 
    Activity, 
    Plus, 
    Trash2, 
    ExternalLink, 
    ShieldCheck, 
    ShieldAlert, 
    Clock, 
    RefreshCw,
    ToggleLeft,
    ToggleRight,
    Search,
    Filter,
    Pencil
} from 'lucide-react';
import { webMonitorService } from '../services/api';
import type { WebMonitor, WebCheck } from '../services/api';
import Modal from '../components/Modal';

const formatInterval = (seconds: number): string => {
    if (seconds >= 86400 && seconds % 86400 === 0) return `${seconds / 86400}d`;
    if (seconds >= 3600 && seconds % 3600 === 0) return `${seconds / 3600}h`;
    if (seconds >= 60 && seconds % 60 === 0) return `${seconds / 60}m`;
    return `${seconds}s`;
};

const StatusBadge = ({ up }: { up: boolean }) => (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
        up 
        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
    }`}>
        <div className={`w-1.5 h-1.5 rounded-full ${up ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></div>
        {up ? 'Operational' : 'Down'}
    </div>
);

const MonitorCard = ({ monitor, confirmDelete, onToggle, onEdit }: { 
    monitor: WebMonitor, 
    confirmDelete: (id: number) => void,
    onToggle: (id: number) => void,
    onEdit: (monitor: WebMonitor) => void 
}) => {
    const [history, setHistory] = useState<WebCheck[]>([]);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const data = await webMonitorService.getHistory(monitor.id, 20);
                setHistory(data);
            } catch (err) {
                console.error("Failed to fetch monitor history", err);
            }
        };
        fetchHistory();
    }, [monitor.id, monitor.lastCheckTime]);

    return (
        <div className="bg-obsidian-900/40 backdrop-blur-3xl border border-white/5 rounded-3xl p-6 transition-all duration-300 hover:border-brand-primary/30 group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-brand-primary/10 transition-colors"></div>
            
            <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="space-y-1">
                    <h3 className="text-lg font-black tracking-tight text-white group-hover:text-brand-primary transition-colors">
                        {monitor.name}
                    </h3>
                    <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                        <span className="truncate max-w-[200px]">{monitor.url}</span>
                        <a href={monitor.url} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                            <ExternalLink size={12} />
                        </a>
                    </div>
                </div>
                <StatusBadge up={monitor.lastStatusUp && monitor.isActive} />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <div className="flex items-center gap-2 text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">
                        <Activity size={10} className="text-brand-primary" />
                        Latency
                    </div>
                    <div className="text-xl font-black text-white">
                        {monitor.lastLatencyMs > 0 ? `${monitor.lastLatencyMs.toFixed(0)}ms` : '--'}
                    </div>
                </div>
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <div className="flex items-center gap-2 text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">
                        <Clock size={10} className="text-brand-secondary" />
                        Interval
                    </div>
                    <div className="text-xl font-black text-white">
                        {formatInterval(monitor.checkIntervalSeconds)}
                    </div>
                </div>
            </div>

            {/* Sparkline-like history */}
            <div className="flex gap-1 h-6 mb-6">
                {Array.from({ length: 20 }).map((_, i) => {
                    const check = history[19 - i]; // Reverse order to show left-to-right
                    const status = check ? (check.isUp ? 'bg-emerald-500/40' : 'bg-rose-500/40') : 'bg-white/5';
                    return (
                        <div 
                            key={i} 
                            className={`flex-1 rounded-sm ${status} transition-all duration-300 hover:scale-y-125`}
                            title={check ? `${new Date(check.timestamp).toLocaleTimeString()}: ${check.isUp ? 'UP' : 'DOWN'}` : 'No data'}
                        ></div>
                    );
                })}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-white/5 relative z-10">
                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                    Last Check: {monitor.lastCheckTime ? new Date(monitor.lastCheckTime).toLocaleTimeString() : 'Never'}
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => onToggle(monitor.id)}
                        className={`p-2 rounded-xl transition-all ${
                            monitor.isActive 
                            ? 'text-brand-primary hover:bg-brand-primary/10' 
                            : 'text-slate-500 hover:bg-white/5'
                        }`}
                        title={monitor.isActive ? "Deactivate" : "Activate"}
                    >
                        {monitor.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                    </button>
                    <button 
                        onClick={() => onEdit(monitor)}
                        className="p-2 rounded-xl text-slate-500 hover:text-brand-primary hover:bg-brand-primary/10 transition-all"
                        title="Edit Monitor"
                    >
                        <Pencil size={18} />
                    </button>
                    <button 
                        onClick={() => confirmDelete(monitor.id)}
                        className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                        title="Delete Monitor"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default function WebMonitors() {
    const [monitors, setMonitors] = useState<WebMonitor[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingMonitor, setEditingMonitor] = useState<WebMonitor | null>(null);
    const [newMonitor, setNewMonitor] = useState({ name: '', url: '', interval: 1 });
    const [intervalUnit, setIntervalUnit] = useState<'seconds' | 'minutes' | 'hours' | 'days'>('minutes');
    const [searchQuery, setSearchQuery] = useState('');

    const unitToSeconds = { seconds: 1, minutes: 60, hours: 3600, days: 86400 };

    const fetchMonitors = async () => {
        try {
            const data = await webMonitorService.getMonitors();
            setMonitors(data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMonitors();
        const interval = setInterval(fetchMonitors, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleAddMonitor = async (e: React.FormEvent) => {
        e.preventDefault();
        const intervalSeconds = newMonitor.interval * unitToSeconds[intervalUnit];
        try {
            if (editingMonitor) {
                await webMonitorService.updateMonitor(editingMonitor.id, {
                    ...editingMonitor,
                    name: newMonitor.name,
                    url: newMonitor.url,
                    checkIntervalSeconds: intervalSeconds
                });
            } else {
                await webMonitorService.createMonitor({
                    name: newMonitor.name,
                    url: newMonitor.url,
                    checkIntervalSeconds: intervalSeconds,
                    isActive: true
                });
            }
            setShowAddModal(false);
            setEditingMonitor(null);
            setNewMonitor({ name: '', url: '', interval: 60 });
            fetchMonitors();
        } catch (err) {
            console.error(err);
        }
    };

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [monitorToDelete, setMonitorToDelete] = useState<number | null>(null);

    const handleEditMonitor = (monitor: WebMonitor) => {
        setEditingMonitor(monitor);
        // Convert stored seconds back to a friendly unit
        let unit: 'seconds' | 'minutes' | 'hours' | 'days' = 'seconds';
        let val = monitor.checkIntervalSeconds;
        if (val % 86400 === 0) { unit = 'days'; val = val / 86400; }
        else if (val % 3600 === 0) { unit = 'hours'; val = val / 3600; }
        else if (val % 60 === 0) { unit = 'minutes'; val = val / 60; }
        setIntervalUnit(unit);
        setNewMonitor({
            name: monitor.name,
            url: monitor.url,
            interval: val
        });
        setShowAddModal(true);
    };

    const handleCloseModal = () => {
        setShowAddModal(false);
        setEditingMonitor(null);
        setNewMonitor({ name: '', url: '', interval: 1 });
        setIntervalUnit('minutes');
    };

    const confirmDelete = (id: number) => {
        setMonitorToDelete(id);
        setShowDeleteConfirm(true);
    };

    const handleDeleteMonitor = async () => {
        if (monitorToDelete === null) return;
        try {
            await webMonitorService.deleteMonitor(monitorToDelete);
            setShowDeleteConfirm(false);
            setMonitorToDelete(null);
            fetchMonitors();
        } catch (err) {
            console.error(err);
        }
    };

    const handleToggleMonitor = async (id: number) => {
        try {
            await webMonitorService.toggleMonitor(id);
            fetchMonitors();
        } catch (err) {
            console.error(err);
        }
    };

    const filteredMonitors = monitors.filter(m => 
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        m.url.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="w-full">
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10">
            <Modal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                title="Confirm Removal"
                type="danger"
                footer={
                    <>
                        <button onClick={() => setShowDeleteConfirm(false)} className="px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-500 hover:text-white transition-all">Cancel</button>
                        <button onClick={handleDeleteMonitor} className="bg-rose-500 text-white px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20">Remove Monitor</button>
                    </>
                }
            >
                Are you sure you want to decommission this monitoring node? This action is irreversible and all historical latency data will be purged.
            </Modal>
            <div className="max-w-7xl mx-auto space-y-12">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary shadow-[0_0_20px_rgba(167,139,250,0.1)]">
                                <ShieldCheck size={24} />
                            </div>
                            <span className="text-xs font-black uppercase tracking-[0.3em] text-brand-primary">Module: Web_Monitor_v1</span>
                        </div>
                        <h1 className="text-5xl font-black tracking-tighter text-white">
                            Web <span className="text-brand-secondary">Monitors</span>
                        </h1>
                        <p className="text-slate-400 max-w-lg text-lg leading-relaxed font-medium">
                            Real-time health tracking and alert management for your distributed web applications.
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-primary transition-colors" size={18} />
                            <input 
                                type="text"
                                placeholder="Search monitors..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-12 pr-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus:outline-hidden focus:border-brand-primary/50 focus:ring-4 focus:ring-brand-primary/10 transition-all w-64 md:w-80 font-medium"
                            />
                        </div>
                        <button 
                            onClick={() => setShowAddModal(true)}
                            className="bg-brand-primary hover:bg-brand-primary/90 text-obsidian-950 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-brand-primary/20 active:scale-95 flex items-center gap-3"
                        >
                            <Plus size={18} />
                            Add Monitor
                        </button>
                    </div>
                </div>

                {/* Dashboard Stats (Optional) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white/5 rounded-3xl p-6 border border-white/5 flex items-center gap-6">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                            <ShieldCheck size={24} />
                        </div>
                        <div>
                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Healthy Sites</div>
                            <div className="text-3xl font-black text-white">{monitors.filter(m => m.lastStatusUp && m.isActive).length}</div>
                        </div>
                    </div>
                    <div className="bg-white/5 rounded-3xl p-6 border border-white/5 flex items-center gap-6">
                        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-400">
                            <ShieldAlert size={24} />
                        </div>
                        <div>
                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Down Sites</div>
                            <div className="text-3xl font-black text-white">{monitors.filter(m => !m.lastStatusUp && m.isActive).length}</div>
                        </div>
                    </div>
                    <div className="bg-white/5 rounded-3xl p-6 border border-white/5 flex items-center gap-6">
                        <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                            <RefreshCw size={24} className={isLoading ? "animate-spin" : ""} />
                        </div>
                        <div>
                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Monitored</div>
                            <div className="text-3xl font-black text-white">{monitors.length}</div>
                        </div>
                    </div>
                </div>

                {/* Monitors Grid */}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-6">
                        <div className="w-12 h-12 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin"></div>
                        <span className="text-xs font-black uppercase tracking-widest text-slate-500">Retrieving Telemetry...</span>
                    </div>
                ) : filteredMonitors.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                        {filteredMonitors.map(monitor => (
                            <MonitorCard 
                                key={monitor.id} 
                                monitor={monitor} 
                                confirmDelete={confirmDelete}
                                onToggle={handleToggleMonitor}
                                onEdit={handleEditMonitor}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="bg-white/5 border border-white/5 rounded-[40px] p-24 text-center">
                        <div className="w-20 h-20 bg-brand-primary/10 rounded-3xl flex items-center justify-center text-brand-primary mx-auto mb-8">
                            <Filter size={32} />
                        </div>
                        <h2 className="text-3xl font-black text-white mb-4">No monitors found</h2>
                        <p className="text-slate-500 max-w-sm mx-auto text-lg mb-12">
                            {searchQuery ? "Try adjusting your search filters." : "Start by adding your first web application to the monitor."}
                        </p>
                        {!searchQuery && (
                            <button 
                                onClick={() => setShowAddModal(true)}
                                className="bg-white/10 hover:bg-white/15 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                            >
                                Get Started
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Add Monitor Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-6 sm:p-0">
                    <div className="absolute inset-0 bg-obsidian-950/80 backdrop-blur-xl animate-fade-in" onClick={handleCloseModal}></div>
                    <div className="bg-obsidian-900 border border-white/10 rounded-[40px] p-8 md:p-12 w-full max-w-xl relative z-10 animate-slide-up shadow-2xl">
                        <div className="space-y-4 mb-10">
                            <h2 className="text-4xl font-black text-white tracking-tighter">{editingMonitor ? 'Edit' : 'Add'} <span className="text-brand-primary">Monitor</span></h2>
                            <p className="text-slate-400 font-medium">{editingMonitor ? 'Update configuration for this endpoint.' : 'Configure a new endpoint for continuous monitoring.'}</p>
                        </div>

                        <form onSubmit={handleAddMonitor} className="space-y-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Application Name</label>
                                <input 
                                    required
                                    type="text"
                                    placeholder="e.g. Production API"
                                    value={newMonitor.name}
                                    onChange={e => setNewMonitor({...newMonitor, name: e.target.value})}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-hidden focus:border-brand-primary/50 transition-all font-medium"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Endpoint URL</label>
                                <input 
                                    required
                                    type="url"
                                    placeholder="https://api.myapp.com/health"
                                    value={newMonitor.url}
                                    onChange={e => setNewMonitor({...newMonitor, url: e.target.value})}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-hidden focus:border-brand-primary/50 transition-all font-medium"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Check Interval</label>
                                <div className="flex gap-3">
                                    <input 
                                        required
                                        type="number"
                                        min="1"
                                        value={newMonitor.interval}
                                        onChange={e => setNewMonitor({...newMonitor, interval: parseInt(e.target.value) || 1})}
                                        className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-hidden focus:border-brand-primary/50 transition-all font-medium"
                                    />
                                    <select
                                        value={intervalUnit}
                                        onChange={e => setIntervalUnit(e.target.value as typeof intervalUnit)}
                                        className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-brand-primary/50 transition-all font-medium text-sm cursor-pointer"
                                    >
                                        <option value="seconds" className="bg-obsidian-900">Seconds</option>
                                        <option value="minutes" className="bg-obsidian-900">Minutes</option>
                                        <option value="hours" className="bg-obsidian-900">Hours</option>
                                        <option value="days" className="bg-obsidian-900">Days</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button 
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="flex-1 px-8 py-5 rounded-3xl font-black text-xs uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="flex-1 bg-brand-primary text-obsidian-950 px-8 py-5 rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl shadow-brand-primary/20 hover:scale-105 active:scale-95 transition-all"
                                >
                                    {editingMonitor ? 'Update' : 'Create'} Monitor
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </main>
        </div>
    );
}
