import { useState, useEffect } from 'react';
import { alertsService, settingsService } from '../services/api';
import {
    Bell,
    Settings,
    History,
    AlertTriangle,
    CheckCircle2,
    Activity,
    Cpu,
    MemoryStick,
    HardDrive,
    Save,
    Clock,
    Send,
    Mail
} from 'lucide-react';

interface AlertRule {
    id: number;
    metricType: number; // 0: Cpu, 1: Memory, 2: Disk
    threshold: number;
    cooldownSeconds: number;
    isActive: boolean;
}

interface AlertHistory {
    id: number;
    alertRuleId: number;
    alertRule: AlertRule;
    message: string;
    triggeredAt: string;
}

interface NotificationSettings {
    id: number;
    telegramEnabled: boolean;
    telegramBotToken: string;
    telegramChatId: string;
    emailEnabled: boolean;
    smtpHost: string;
    smtpPort: number;
    smtpEnableSsl: boolean;
    smtpUser: string;
    smtpPass: string;
    fromEmail: string;
    toEmail: string;
}

const MetricIcons = [
    <Cpu size={16} className="text-brand-primary" />,
    <MemoryStick size={16} className="text-brand-secondary" />,
    <HardDrive size={16} className="text-emerald-400" />
];

const MetricNames = ["CPU_LOAD", "MEMORY_USAGE", "DISK_SPACE"];

export default function Alerts() {
    const [rules, setRules] = useState<AlertRule[]>([]);
    const [history, setHistory] = useState<AlertHistory[]>([]);
    const [settings, setSettings] = useState<NotificationSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState<number | null>(null);
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'rules' | 'notifications'>('rules');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [rulesData, historyData, settingsData] = await Promise.all([
                alertsService.getRules(),
                alertsService.getHistory(),
                settingsService.getNotificationSettings()
            ]);
            setRules(rulesData);
            setHistory(historyData);
            setSettings(settingsData);
        } catch (err) {
            console.error("Failed to fetch alerts data:", err);
            setErrorMsg("Failed to synchronize with Alert Engine.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateSettings = async () => {
        if (!settings) return;
        setIsSavingSettings(true);
        try {
            await settingsService.updateNotificationSettings(settings);
            setErrorMsg(null);
        } catch (err) {
            setErrorMsg("Failed to update notification protocols.");
        } finally {
            setIsSavingSettings(false);
        }
    };

    const handleUpdateRule = async (rule: AlertRule) => {
        setIsSaving(rule.id);
        try {
            await alertsService.updateRule(rule);
            setRules(prev => prev.map(r => r.id === rule.id ? rule : r));
        } catch (err) {
            setErrorMsg("Failed to commit rule transformation.");
        } finally {
            setIsSaving(null);
        }
    };

    const toggleRuleActive = (rule: AlertRule) => {
        handleUpdateRule({ ...rule, isActive: !rule.isActive });
    };

    const updateThreshold = (rule: AlertRule, value: string) => {
        const threshold = parseFloat(value);
        if (!isNaN(threshold)) {
            setRules(prev => prev.map(r => r.id === rule.id ? { ...r, threshold } : r));
        }
    };

    const updateCooldown = (rule: AlertRule, value: string) => {
        const cooldownSeconds = parseInt(value);
        if (!isNaN(cooldownSeconds)) {
            setRules(prev => prev.map(r => r.id === rule.id ? { ...r, cooldownSeconds } : r));
        }
    };

    return (
        <div className="min-h-screen bg-obsidian-950 text-slate-300 font-sans selection:bg-brand-primary/30 flex-1 pl-0 lg:pl-20 xl:pl-72 transition-all duration-500">
            {/* Background Texture Overlay */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-0" 
                 style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
            </div>

            <main className="max-w-7xl mx-auto px-6 lg:px-8 py-16 relative z-10">
                <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-accent/10 border border-brand-accent/20 text-brand-accent text-[10px] font-black uppercase tracking-widest mb-6">
                            <Bell size={12} /> Sentinel Configuration
                        </div>
                        <h1 className="text-5xl font-black text-white tracking-tighter mb-4 italic">Alert <span className="text-brand-accent">Engine</span></h1>
                        <p className="text-slate-400 max-w-xl text-sm leading-relaxed uppercase tracking-tight">
                            Define security thresholds and monitor system anomalies. The sentinel broadcasts triggers in real-time to all connected nodes.
                        </p>
                    </div>

                    <button 
                        onClick={fetchData}
                        className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all flex items-center gap-3"
                    >
                        <Activity size={14} className={isLoading ? 'animate-spin' : ''} />
                        Sync Engine
                    </button>
                </header>

                {/* Navigation Tabs */}
                <div className="flex items-center gap-2 mb-10 p-1 bg-white/5 rounded-2xl w-fit border border-white/5">
                    <button 
                        onClick={() => setActiveTab('rules')}
                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'rules' ? 'bg-brand-primary text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                    >
                        Sentinel Rules
                    </button>
                    <button 
                        onClick={() => setActiveTab('notifications')}
                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'notifications' ? 'bg-brand-secondary text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                    >
                        Notifications
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    <div className="lg:col-span-2 space-y-8">
                        {activeTab === 'rules' ? (
                            <>
                                <div className="flex items-center gap-3 mb-2">
                                    <Settings size={18} className="text-brand-primary" />
                                    <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">Threshold Protocols</h3>
                                </div>

                                <div className="grid grid-cols-1 gap-6">
                                    {rules.map((rule) => (
                                        <div key={rule.id} className="glass-panel rounded-3xl p-6 border-white/5 hover:border-brand-primary/20 transition-all group">
                                            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                                                <div className="flex items-center gap-5 w-full md:w-auto">
                                                    <div className="w-12 h-12 rounded-2xl bg-obsidian-900 border border-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                        {MetricIcons[rule.metricType]}
                                                    </div>
                                                    <div>
                                                        <div className="text-white font-black text-sm uppercase tracking-tight">{MetricNames[rule.metricType]}</div>
                                                        <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Status: {rule.isActive ? 'OPERATIONAL' : 'DORMANT'}</div>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                                                    <div className="flex flex-col gap-1">
                                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Threshold</label>
                                                        <div className="flex items-center gap-2">
                                                            <input 
                                                                type="number" 
                                                                value={rule.threshold}
                                                                onChange={(e) => updateThreshold(rule, e.target.value)}
                                                                className="w-16 bg-obsidian-950 border border-white/5 rounded-xl px-2 py-2 text-xs font-mono font-black text-brand-primary focus:outline-none focus:border-brand-primary/50"
                                                            />
                                                            <span className="text-[10px] font-black text-slate-500">%</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col gap-1">
                                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Cooldown</label>
                                                        <div className="flex items-center gap-2">
                                                            <input 
                                                                type="number" 
                                                                value={rule.cooldownSeconds}
                                                                onChange={(e) => updateCooldown(rule, e.target.value)}
                                                                className="w-16 bg-obsidian-950 border border-white/5 rounded-xl px-2 py-2 text-xs font-mono font-black text-brand-secondary focus:outline-none focus:border-brand-secondary/50"
                                                            />
                                                            <span className="text-[10px] font-black text-slate-500">s</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-3">
                                                        <button 
                                                            onClick={() => toggleRuleActive(rule)}
                                                            className={`w-12 h-6 rounded-full p-1 transition-all flex items-center ${rule.isActive ? 'bg-brand-primary shadow-[0_0_12px_rgba(167,139,250,0.4)]' : 'bg-slate-800'}`}
                                                        >
                                                            <div className={`w-4 h-4 rounded-full bg-white transition-all transform ${rule.isActive ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                                        </button>

                                                        <button 
                                                            onClick={() => handleUpdateRule(rule)}
                                                            disabled={isSaving === rule.id}
                                                            className="p-3 bg-white/5 hover:bg-brand-primary hover:text-white rounded-xl text-slate-400 transition-all group/btn"
                                                        >
                                                            <Save size={16} className={isSaving === rule.id ? 'animate-pulse' : ''} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {!rules.length && !isLoading && (
                                        <div className="py-20 glass-panel rounded-3xl border-dashed border-white/5 flex flex-col items-center justify-center opacity-40">
                                            <Settings size={40} className="mb-4 text-slate-500" />
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em]">No protocols initialized</p>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="space-y-10 animate-fade-in">
                                <div className="flex items-center gap-3 mb-2">
                                    <Send size={18} className="text-brand-secondary" />
                                    <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">Transmission Protocols</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Telegram Settings */}
                                    <div className="glass-panel rounded-3xl p-8 border-white/5 hover:border-brand-secondary/20 transition-all flex flex-col gap-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                                                    <Send size={18} />
                                                </div>
                                                <div>
                                                    <h4 className="text-white font-black text-sm uppercase tracking-tight">Telegram Bot</h4>
                                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-0.5">Instant Messaging Hub</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => setSettings(s => s ? { ...s, telegramEnabled: !s.telegramEnabled } : null)}
                                                className={`w-12 h-6 rounded-full p-1 transition-all flex items-center ${settings?.telegramEnabled ? 'bg-sky-500 shadow-[0_0_12px_rgba(14,165,233,0.4)]' : 'bg-slate-800'}`}
                                            >
                                                <div className={`w-4 h-4 rounded-full bg-white transition-all transform ${settings?.telegramEnabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                            </button>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex flex-col gap-2">
                                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Bot Token</label>
                                                <input 
                                                    type="password"
                                                    value={settings?.telegramBotToken || ''}
                                                    onChange={(e) => setSettings(s => s ? { ...s, telegramBotToken: e.target.value } : null)}
                                                    placeholder="0000000000:AA..."
                                                    className="w-full bg-obsidian-950 border border-white/5 rounded-2xl px-4 py-3 text-xs font-mono font-black text-white focus:outline-none focus:border-sky-500/50"
                                                />
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Chat ID</label>
                                                <input 
                                                    type="text"
                                                    value={settings?.telegramChatId || ''}
                                                    onChange={(e) => setSettings(s => s ? { ...s, telegramChatId: e.target.value } : null)}
                                                    placeholder="eg. -100123456789"
                                                    className="w-full bg-obsidian-950 border border-white/5 rounded-2xl px-4 py-3 text-xs font-mono font-black text-white focus:outline-none focus:border-sky-500/50"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Email Settings */}
                                    <div className="glass-panel rounded-3xl p-8 border-white/5 hover:border-brand-secondary/20 transition-all flex flex-col gap-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                                                    <Mail size={18} />
                                                </div>
                                                <div>
                                                    <h4 className="text-white font-black text-sm uppercase tracking-tight">SMTP Email</h4>
                                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-0.5">Reliable Reporting</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => setSettings(s => s ? { ...s, emailEnabled: !s.emailEnabled } : null)}
                                                className={`w-12 h-6 rounded-full p-1 transition-all flex items-center ${settings?.emailEnabled ? 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.4)]' : 'bg-slate-800'}`}
                                            >
                                                <div className={`w-4 h-4 rounded-full bg-white transition-all transform ${settings?.emailEnabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                            </button>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="grid grid-cols-3 gap-4">
                                                <div className="col-span-2 flex flex-col gap-2">
                                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">SMTP Host</label>
                                                    <input 
                                                        type="text"
                                                        value={settings?.smtpHost || ''}
                                                        onChange={(e) => setSettings(s => s ? { ...s, smtpHost: e.target.value } : null)}
                                                        className="w-full bg-obsidian-950 border border-white/5 rounded-2xl px-4 py-3 text-xs font-mono font-black text-white focus:outline-none focus:border-rose-500/50"
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-2">
                                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Port</label>
                                                    <input 
                                                        type="number"
                                                        value={settings?.smtpPort || 587}
                                                        onChange={(e) => setSettings(s => s ? { ...s, smtpPort: parseInt(e.target.value) } : null)}
                                                        className="w-full bg-obsidian-950 border border-white/5 rounded-2xl px-4 py-3 text-xs font-mono font-black text-white focus:outline-none focus:border-rose-500/50"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                    <input 
                                                        type="checkbox"
                                                        checked={settings?.smtpEnableSsl || false}
                                                        onChange={(e) => setSettings(s => s ? { ...s, smtpEnableSsl: e.target.checked } : null)}
                                                        className="accent-rose-500"
                                                    />
                                                    Enable SSL/TLS
                                                </label>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Recipient (To Email)</label>
                                                <input 
                                                    type="email"
                                                    value={settings?.toEmail || ''}
                                                    onChange={(e) => setSettings(s => s ? { ...s, toEmail: e.target.value } : null)}
                                                    className="w-full bg-obsidian-950 border border-white/5 rounded-2xl px-4 py-3 text-xs font-mono font-black text-white focus:outline-none focus:border-rose-500/50"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end">
                                    <button 
                                        onClick={handleUpdateSettings}
                                        disabled={isSavingSettings}
                                        className="px-10 py-5 bg-brand-secondary hover:bg-white hover:text-brand-secondary rounded-3xl text-[12px] font-black uppercase tracking-widest transition-all flex items-center gap-4 shadow-[0_15px_35px_rgba(20,184,166,0.3)] hover:shadow-white/20 active:scale-95 disabled:opacity-50"
                                    >
                                        {isSavingSettings ? <Activity size={18} className="animate-spin" /> : <Save size={18} />}
                                        Commit Protocol Updates
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Alert History */}
                    <div className="space-y-8">
                        <div className="flex items-center gap-3 mb-2">
                            <History size={18} className="text-brand-accent" />
                            <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">Incident Log</h3>
                        </div>

                        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                            {history.map((item) => (
                                <div key={item.id} className="p-5 rounded-2xl bg-brand-accent/5 border border-brand-accent/10 hover:border-brand-accent/30 transition-all group animate-fade-in">
                                    <div className="flex items-start gap-4">
                                        <div className="mt-1">
                                            <AlertTriangle size={16} className="text-brand-accent" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[11px] font-black text-white uppercase tracking-tighter leading-relaxed mb-3 wrap-break-word">
                                                {item.message}
                                            </p>
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-2 text-slate-500">
                                                    <Clock size={10} />
                                                    <span className="text-[9px] font-mono font-bold">
                                                        {new Date(item.triggeredAt).toLocaleString()}
                                                    </span>
                                                </div>
                                                <div className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[8px] font-black text-slate-500 uppercase tracking-widest">
                                                    Critical
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {!history.length && !isLoading && (
                                <div className="py-32 glass-panel rounded-3xl border-dashed border-white/5 flex flex-col items-center justify-center opacity-20">
                                    <CheckCircle2 size={40} className="mb-4 text-emerald-400" />
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em]">System State: Nominal</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {errorMsg && (
                    <div className="fixed bottom-10 right-10 z-50 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-[10px] font-black uppercase tracking-widest animate-slide-up flex items-center gap-3">
                        <AlertTriangle size={16} />
                        {errorMsg}
                        <button onClick={() => setErrorMsg(null)} className="ml-4 hover:text-white">DISMISS</button>
                    </div>
                )}
            </main>
        </div>
    );
}
