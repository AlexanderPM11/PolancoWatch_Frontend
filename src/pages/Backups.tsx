import { useState, useEffect, useRef } from 'react';
import { 
  Database, 
  FolderSync, 
  Download, 
  Trash2, 
  Cloud, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Calendar,
  Plus,
  FileArchive,
  Search,
  ChevronDown,
  Settings,
  AlertCircle,
  X
} from 'lucide-react';
import { backupService } from '../services/api';
import { backupSignalRService } from '../services/backupSignalR';
import { format } from 'date-fns';
import Toast, { type ToastType } from '../components/Toast';

interface Backup {
  id: string;
  name: string;
  type: number; // 0: Volume, 1: Database
  format: number; // 0: Zip, 1: TarGz
  filePath: string;
  size: number;
  createdAt: string;
  status: number; // 0: Pending, 1: InProgress, 2: Completed, 3: Failed
  errorMessage?: string;
  cloudSyncStatus: number; // 0: NotSynced, 1: Synced, 2: Failed
  cloudLink?: string;
}

interface BackupSchedule {
  id: string;
  name: string;
  type: number;
  target?: string;
  format: number;
  intervalMinutes: number;
  isActive: boolean;
  syncToCloud: boolean;
  keepLocal: boolean;
  cloudFolderId?: string;
  lastRun?: string;
  nextRun?: string;
}

interface BackupProgress {
  backupId: string;
  percentage: number;
  message: string;
}

const Combobox = ({ 
  options, 
  value, 
  onChange, 
  placeholder = "Select an option..." 
}: { 
  options: { name: string, path: string }[], 
  value: string, 
  onChange: (val: string) => void,
  placeholder?: string
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter(opt => 
    opt.name.toLowerCase().includes(search.toLowerCase()) || 
    opt.path.toLowerCase().includes(search.toLowerCase())
  );

  const selectedOption = options.find(o => o.path === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3 cursor-pointer hover:border-brand-primary/50 transition-all"
      >
        <div className="flex flex-col">
          <span className={value ? "text-white text-xs font-black truncate max-w-[200px]" : "text-slate-500 text-sm"}>
            {selectedOption ? selectedOption.name : placeholder}
          </span>
          {selectedOption && <span className="text-[8px] text-slate-500 font-bold truncate max-w-[200px]">{selectedOption.path}</span>}
        </div>
        <ChevronDown size={16} className={`text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-obsidian-900 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="p-2 border-b border-white/5">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                autoFocus
                type="text" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Find volume..."
                className="w-full bg-white/5 border-none rounded-lg pl-9 pr-4 py-2 text-xs text-white focus:ring-1 focus:ring-brand-primary/50 outline-none"
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            {filteredOptions.map((opt) => (
              <div 
                key={opt.path}
                onClick={() => {
                  onChange(opt.path);
                  setIsOpen(false);
                  setSearch("");
                }}
                className="px-4 py-3 hover:bg-white/5 cursor-pointer transition-colors border-b border-white/5 last:border-none group"
              >
                <p className="text-xs font-black text-slate-300 group-hover:text-brand-primary transition-colors">{opt.name}</p>
                <p className="text-[9px] text-slate-500 font-bold mt-1 truncate">{opt.path}</p>
              </div>
            ))}
            {filteredOptions.length === 0 && (
              <div className="px-4 py-8 text-center text-[10px] text-slate-500 uppercase font-black tracking-widest">
                No matching volumes
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const VaultOverlay = ({ isOpen, onClose, title, children, footer }: { 
  isOpen: boolean, 
  onClose: () => void, 
  title: string, 
  children: React.ReactNode, 
  footer?: React.ReactNode 
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-150 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-obsidian-950/80 backdrop-blur-xl animate-fade-in" onClick={onClose}></div>
      <div className="relative w-full max-w-lg glass-panel rounded-[2.5rem] border border-white/10 p-8 shadow-[0_0_100px_rgba(0,0,0,0.5)] animate-float-up">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-brand-primary/10 rounded-2xl border border-brand-primary/20 text-brand-primary">
              <Settings size={20} />
            </div>
            <h2 className="text-xl font-black text-white tracking-tighter uppercase italic">{title}</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-6">
          {children}
        </div>
        {footer && <div className="mt-8 pt-6 border-t border-white/5 flex justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
};

const Backups = () => {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [schedules, setSchedules] = useState<BackupSchedule[]>([]);
  const [availableVolumes, setAvailableVolumes] = useState<{ name: string, path: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<Record<string, BackupProgress>>({});
  const [driveConnected, setDriveConnected] = useState<boolean | null>(null);
  const [connectingDrive, setConnectingDrive] = useState(false);
  
  // Modals state
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [backupToDelete, setBackupToDelete] = useState<string | null>(null);

  // Toast System
  const [toast, setToast] = useState<{ message: string, type: ToastType } | null>(null);
  const showToast = (message: string, type: ToastType) => {
    setToast({ message, type });
  };
  
  // New Backup Form
  const [newBackupType, setNewBackupType] = useState<number>(1); // 1: DB, 0: Volume
  const [newBackupTarget, setNewBackupTarget] = useState("");
  const [newBackupName, setNewBackupName] = useState("");
  // storage: 'local' | 'both' | 'drive'
  const [newBackupStorage, setNewBackupStorage] = useState<'local' | 'both' | 'drive'>('local');
  const [newBackupCloudFolderId, setNewBackupCloudFolderId] = useState("");

  // New Schedule Form
  const [newSchedName, setNewSchedName] = useState("");
  const [newSchedType, setNewSchedType] = useState<number>(1);
  const [newSchedTarget, setNewSchedTarget] = useState("");
  const [newSchedInterval, setNewSchedInterval] = useState(1440); // 24h
  const [newSchedStorage, setNewSchedStorage] = useState<'local' | 'both' | 'drive'>('local');
  const [newSchedCloudFolderId, setNewSchedCloudFolderId] = useState("");

  const parseFolderId = (value: string) => {
    // Check for Google Drive URL pattern
    const match = value.match(/folders\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : value.trim();
  };

  useEffect(() => {
    fetchData();
    
    const handleProgress = (id: string, p: number, m: string) => {
      setProgress(prev => ({
        ...prev,
        [id]: { backupId: id, percentage: p, message: m }
      }));
      if (p === 100) {
        setTimeout(fetchData, 1000);
        // Clear progress after 5 seconds
        setTimeout(() => {
          setProgress(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
        }, 5000);
      }
    };

    backupSignalRService.connect(handleProgress);
    return () => backupSignalRService.disconnect(handleProgress);
  }, []);

  const fetchData = async () => {
    try {
      const [backupsData, schedulesData, volumesData, driveStatus] = await Promise.all([
        backupService.getBackups(),
        backupService.getSchedules(),
        backupService.getAvailableVolumes(),
        backupService.getDriveStatus().catch(() => ({ isAuthenticated: false }))
      ]);
      setBackups(backupsData);
      setSchedules(schedulesData);
      setAvailableVolumes(volumesData);
      setDriveConnected(driveStatus.isAuthenticated);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectDrive = async () => {
    try {
      setConnectingDrive(true);
      const { url } = await backupService.getDriveAuthUrl();
      window.open(url, '_blank', 'width=600,height=700');
      // Poll for connection after user authorizes
      const poll = setInterval(async () => {
        const status = await backupService.getDriveStatus().catch(() => ({ isAuthenticated: false }));
        if (status.isAuthenticated) {
          setDriveConnected(true);
          setConnectingDrive(false);
          clearInterval(poll);
          showToast('Google Drive connected successfully!', 'success');
        }
      }, 3000);
      // Stop polling after 3 minutes
      setTimeout(() => { clearInterval(poll); setConnectingDrive(false); }, 180000);
    } catch (error: any) {
      showToast(error.response?.data || 'Failed to get authorization URL', 'error');
      setConnectingDrive(false);
    }
  };

  const handleDisconnectDrive = async () => {
    try {
      if (confirm('¿Estás seguro de que quieres desconectar Google Drive? Esto detendrá los backups automáticos a la nube hasta que vuelvas a conectar.')) {
        await backupService.revokeDriveAuth();
        setDriveConnected(false);
        showToast('Google Drive disconnected.', 'info');
      }
    } catch (error) {
      console.error('Failed to disconnect Drive:', error);
      showToast('Failed to disconnect Drive.', 'error');
    }
  };

  const handleRunBackup = async () => {
    try {
      showToast("Initializing PolancoVault...", "loading");
      const syncToCloud = newBackupStorage !== 'local';
      const keepLocal = newBackupStorage !== 'drive';
      const cloudFolderId = syncToCloud ? newBackupCloudFolderId : undefined;

      if (newBackupType === 1) {
        await backupService.triggerDatabaseBackup('Zip', syncToCloud, cloudFolderId || undefined, newBackupName || undefined, keepLocal);
      } else {
        if (!newBackupTarget) {
          showToast("Please select a target volume", "error");
          return;
        }
        await backupService.triggerVolumeBackup(newBackupTarget, 'Zip', syncToCloud, cloudFolderId || undefined, newBackupName || undefined, keepLocal);
      }
      setIsBackupModalOpen(false);
      setNewBackupName("");
      showToast("Backup initiated successfully", "success");
      fetchData();
    } catch (error: any) {
      showToast(error.response?.data || 'Backup failed to start', "error");
    }
  };

  const handleCreateSchedule = async () => {
    try {
      if (!newSchedName) {
        showToast("Enter a policy identifier", "error");
        return;
      }
      
      const syncToCloud = newSchedStorage !== 'local';
      const keepLocal = newSchedStorage !== 'drive';

      await backupService.createSchedule({
        name: newSchedName,
        type: newSchedType,
        target: newSchedType === 0 ? newSchedTarget : null,
        intervalMinutes: newSchedInterval,
        format: 0,
        isActive: true,
        syncToCloud,
        keepLocal,
        cloudFolderId: syncToCloud ? newSchedCloudFolderId : undefined
      });
      setIsScheduleModalOpen(false);
      showToast("Automation protocol established", "success");
      fetchData();
    } catch (error) {
      showToast("Protocol failure", "error");
    }
  };

  const handleDelete = (id: string) => {
    setBackupToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!backupToDelete) return;
    try {
      showToast("Deleting backup...", "loading");
      await backupService.deleteBackup(backupToDelete);
      showToast("Backup deleted", "success");
      setIsDeleteModalOpen(false);
      setBackupToDelete(null);
      fetchData();
    } catch (error) {
      showToast("Failed to delete backup", "error");
    }
  };

  const handleDownload = async (id: string, name: string, path: string) => {
    try {
      showToast("Preparing download...", "loading");
      const fileName = path.split('\\').pop()?.split('/').pop() || `${name}.zip`;
      await backupService.downloadBackup(id, fileName);
      showToast("Download started", "success");
    } catch (error) {
      showToast("Download failed", "error");
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status: number) => {
    switch (status) {
      case 1: return <Loader2 className="w-4 h-4 text-brand-primary animate-spin" />;
      case 2: return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 3: return <XCircle className="w-4 h-4 text-rose-400" />;
      default: return <Clock className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="p-8 pb-20 max-w-7xl mx-auto space-y-12 h-screen overflow-y-auto custom-scrollbar">
      {/* Header */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4 text-brand-primary">
          <div className="p-3 bg-brand-primary/10 rounded-2xl border border-brand-primary/20">
            <Database className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tight text-white uppercase italic leading-none">Polanco<span className="text-brand-primary">Vault</span></h1>
            <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px] mt-2">Enterprise Backup & Recovery System</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsScheduleModalOpen(true)}
            className="bg-white/5 border border-white/10 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2"
          >
            <Calendar size={14} />
            Schedules
          </button>
          <button 
            onClick={() => setIsBackupModalOpen(true)}
            className="bg-brand-primary text-obsidian-950 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-secondary transition-all shadow-2xl shadow-brand-primary/20 flex items-center gap-2"
          >
            <Plus size={14} />
            Immediate Backup
          </button>
        </div>
      </section>

      {/* Stats / Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Backups', val: backups.length, icon: <FileArchive className="text-brand-primary" /> },
          { label: 'Cloud Synced', val: backups.filter(b => b.cloudSyncStatus === 1).length, icon: <Cloud className="text-brand-secondary" /> },
          { label: 'Active Schedules', val: schedules.filter(s => s.isActive).length, icon: <Clock className="text-emerald-400" /> },
          { label: 'Failed Ops', val: backups.filter(b => b.status === 3).length, icon: <AlertCircle className="text-rose-400" /> },
        ].map(stat => (
          <div key={stat.label} className="bg-white/5 border border-white/5 rounded-3xl p-5 flex items-center gap-4">
            <div className="p-3 bg-white/5 rounded-xl">{stat.icon}</div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider">{stat.label}</p>
              <p className="text-xl font-black text-white">{stat.val}</p>
            </div>
          </div>
        ))}
      </div>
      {/* Google Drive Connection Panel */}
      <section className="animate-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1.5 h-1.5 rounded-full bg-slate-700"></div>
          <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 italic">Cloud Relay Status</h2>
        </div>
        <div className={`p-6 rounded-3xl border flex items-center justify-between gap-4 ${
          driveConnected 
            ? 'bg-emerald-500/5 border-emerald-500/20' 
            : 'bg-white/5 border-white/5'
        }`}>
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${
              driveConnected ? 'bg-emerald-500/10' : 'bg-white/5'
            }`}>
              <Cloud size={22} className={driveConnected ? 'text-emerald-400' : 'text-slate-500'} />
            </div>
            <div>
              <p className="text-xs font-black text-white uppercase tracking-widest">Google Drive</p>
              <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${
                driveConnected === null ? 'text-slate-600' : driveConnected ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {driveConnected === null ? 'Checking...' : driveConnected ? '● Connected — Backups will sync to Drive' : '○ Not Connected — Click to authorize'}
              </p>
            </div>
          </div>
          {!driveConnected && (
            <button
              onClick={handleConnectDrive}
              disabled={connectingDrive}
              className="bg-brand-primary text-obsidian-950 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-secondary transition-all shadow-lg shadow-brand-primary/20 flex items-center gap-2 disabled:opacity-50"
            >
              {connectingDrive ? <Loader2 size={14} className="animate-spin" /> : <Cloud size={14} />}
              {connectingDrive ? 'Waiting...' : 'Connect Drive'}
            </button>
          )}
          {driveConnected && (
            <div className="flex items-center gap-3">
              <span className="text-[9px] font-black uppercase text-emerald-400/60 tracking-widest hidden sm:inline">✓ Authorized</span>
              <button
                onClick={handleDisconnectDrive}
                className="bg-rose-500/10 text-rose-400 px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest border border-rose-500/20 hover:bg-rose-500/20 transition-all"
              >
                Disconnect
              </button>
            </div>
          )}
        </div>
      </section>


      {/* Active Progress */}
      {Object.keys(progress).length > 0 && (
        <section className="animate-fade-in">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse shadow-[0_0_10px_#a78bfa]"></div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Active Pipelines</h2>
          </div>
          <div className="grid gap-3">
            {Object.entries(progress).map(([id, p]) => (
              <div key={id} className="bg-brand-primary/5 border border-brand-primary/10 p-5 rounded-3xl relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
                  <div 
                    className={`h-full transition-all duration-1000 shadow-[0_0_15px_#a78bfa] ${p.message.toLowerCase().includes('failed') || p.message.toLowerCase().includes('error') ? 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)]' : 'bg-brand-primary'}`} 
                    style={{ width: `${p.percentage}%` }}
                  ></div>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <div className="flex items-center gap-3 text-brand-primary">
                    {p.percentage === 100 ? (
                      <CheckCircle2 size={16} className="text-emerald-400" />
                    ) : (
                      <Loader2 size={16} className="animate-spin" />
                    )}
                    <span className={`text-[10px] font-black uppercase tracking-widest ${p.percentage === 100 ? 'text-emerald-400' : p.message.toLowerCase().includes('failed') || p.message.toLowerCase().includes('error') ? 'text-rose-400' : ''}`}>
                      {p.message}
                    </span>
                  </div>
                  <span className="text-xs font-black text-white">{p.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* History Table */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-700"></div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 italic">Inventory History</h2>
          </div>
          <Settings className="w-4 h-4 text-slate-700 cursor-pointer hover:text-slate-400 transition-colors" />
        </div>

        <div className="bg-obsidian-900/50 border border-white/10 rounded-[2.5rem] overflow-hidden backdrop-blur-3xl shadow-2xl">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/2">
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Resource</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Type</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Cloud</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Metric</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Timestamp</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Ops</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {backups.map((backup) => (
                  <tr key={backup.id} className="hover:bg-white/2 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-white/5">
                        {getStatusIcon(backup.status)}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-white tracking-tight uppercase">{backup.name}</span>
                        {backup.status === 3 && backup.errorMessage && (
                          <span className="text-[9px] text-rose-400/80 font-bold uppercase mt-1 flex items-center gap-1">
                            <AlertCircle size={10} /> {backup.errorMessage}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500 font-bold truncate max-w-[200px] mt-1">{backup.filePath}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg border ${
                        backup.type === 1 
                        ? 'bg-brand-primary/10 text-brand-primary border-brand-primary/20' 
                        : 'bg-brand-secondary/10 text-brand-secondary border-brand-secondary/20'
                      }`}>
                        {backup.type === 1 ? 'DATABASE' : 'VOLUME'}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-center">
                      {backup.cloudSyncStatus === 1 ? (
                        <a href={backup.cloudLink} target="_blank" rel="noopener noreferrer" className="inline-flex p-2 bg-emerald-500/10 text-emerald-400 rounded-xl hover:scale-110 transition-transform">
                          <Cloud size={16} />
                        </a>
                      ) : backup.cloudSyncStatus === 2 ? (
                        <div className="flex flex-col items-center gap-1 group/error">
                          <div className="inline-flex p-2 bg-rose-500/10 text-rose-400 rounded-xl cursor-help">
                            <XCircle size={16} />
                          </div>
                          {backup.errorMessage && (
                            <span className="text-[8px] text-rose-400/80 font-black uppercase tracking-tighter max-w-[80px] text-center leading-[1.1]">
                              {backup.errorMessage}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-800 font-black">⎯</span>
                      )}
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <span className="text-xs font-black text-slate-300">{formatSize(backup.size)}</span>
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">{backup.format === 0 ? 'ZIP' : 'TAR.GZ'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-[10px] text-slate-500 font-black uppercase">
                      {format(new Date(backup.createdAt), 'MMM dd | HH:mm:ss')}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                        <button 
                          onClick={() => handleDownload(backup.id, backup.name, backup.filePath)}
                          className="p-2.5 bg-white/5 text-slate-400 hover:text-white rounded-xl transition-colors"
                        >
                          <Download size={14} />
                        </button>
                        <button onClick={() => handleDelete(backup.id)} className="p-2.5 bg-rose-500/5 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {backups.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className="px-8 py-32 text-center">
                      <div className="flex flex-col items-center gap-6 opacity-20">
                        <Database size={64} className="animate-pulse" />
                        <span className="text-xs font-black uppercase tracking-[0.8em]">Vault is empty</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Modals */}
      <VaultOverlay 
        isOpen={isBackupModalOpen} 
        onClose={() => setIsBackupModalOpen(false)} 
        title="PolancoVault Injection"
        footer={
          <>
             <button onClick={() => setIsBackupModalOpen(false)} className="px-6 py-2.5 text-[10px] font-black uppercase text-slate-500 hover:text-white transition-colors">Discard</button>
             <button onClick={handleRunBackup} className="bg-brand-primary text-obsidian-950 px-8 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-secondary transition-all shadow-[0_0_20px_#a78bfa33]">Initiate Operation</button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => setNewBackupType(1)}
            className={`p-4 rounded-3xl border transition-all text-center space-y-2 ${newBackupType === 1 ? 'bg-brand-primary/10 border-brand-primary text-brand-primary shadow-[0_0_20px_#a78bfa22]' : 'bg-white/5 border-white/5 text-slate-500'}`}
          >
            <Database className="w-5 h-5 mx-auto" />
            <p className="text-[10px] font-black uppercase tracking-widest">Database Snapshot</p>
          </button>
          <button 
            onClick={() => setNewBackupType(0)}
            className={`p-4 rounded-3xl border transition-all text-center space-y-2 ${newBackupType === 0 ? 'bg-brand-secondary/10 border-brand-secondary text-brand-secondary shadow-[0_0_20px_#22d3ee22]' : 'bg-white/5 border-white/5 text-slate-500'}`}
          >
            <FolderSync className="w-5 h-5 mx-auto" />
            <p className="text-[10px] font-black uppercase tracking-widest">Docker Volumes</p>
          </button>
        </div>

        {newBackupType === 0 && (
          <div className="space-y-3 px-1">
            <label className="text-[8px] font-black uppercase text-slate-500 tracking-widest ml-1">Volume Resource</label>
            <Combobox 
              options={availableVolumes} 
              value={newBackupTarget} 
              onChange={setNewBackupTarget} 
              placeholder="Select volume asset..."
            />
          </div>
        )}

        <div className="space-y-3 px-1">
          <label className="text-[8px] font-black uppercase text-slate-500 tracking-widest ml-1">Destination Identity (Optional)</label>
          <input 
            type="text" 
            placeholder="System will generate alias..." 
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs text-white outline-none focus:border-brand-primary/50"
            value={newBackupName}
            onChange={(e) => setNewBackupName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
          />
        </div>

        <div className="p-5 bg-white/5 rounded-4xl border border-white/5 space-y-4">
          <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest ml-1">Storage Destination</p>
          <div className="grid grid-cols-3 gap-2">
            {(['local', 'both', 'drive'] as const).map((opt) => {
              const labels: Record<string, { icon: string, title: string, sub: string }> = {
                local:  { icon: '🖥', title: 'Local Only',  sub: 'Server storage' },
                both:   { icon: '⇅',  title: 'Server + Drive', sub: 'Keep both copies' },
                drive:  { icon: '☁',  title: 'Drive Only',  sub: 'Delete after upload' },
              };
              const l = labels[opt];
              const active = newBackupStorage === opt;
              return (
                <button
                  key={opt}
                  onClick={() => setNewBackupStorage(opt)}
                  className={`p-4 rounded-2xl border text-center transition-all space-y-1 ${
                    active
                      ? opt === 'local' ? 'bg-slate-700/40 border-slate-500 text-white'
                        : opt === 'both' ? 'bg-brand-primary/10 border-brand-primary text-brand-primary'
                        : 'bg-brand-secondary/10 border-brand-secondary text-brand-secondary'
                      : 'bg-white/3 border-white/5 text-slate-600 hover:border-white/10'
                  }`}
                >
                  <p className="text-base">{l.icon}</p>
                  <p className="text-[9px] font-black uppercase tracking-wider leading-tight">{l.title}</p>
                  <p className="text-[8px] text-slate-600 uppercase font-bold">{l.sub}</p>
                </button>
              );
            })}
          </div>
          {newBackupStorage !== 'local' && (
            <div className="space-y-2 animate-fade-in">
              <input
                type="text"
                placeholder="Target Folder ID (uses default if empty)"
                className="w-full bg-black/40 border border-brand-secondary/20 rounded-2xl px-5 py-3 text-xs text-brand-secondary placeholder:text-slate-700 outline-none focus:border-brand-secondary/50"
                value={newBackupCloudFolderId}
                onChange={(e) => setNewBackupCloudFolderId(parseFolderId(e.target.value))}
              />
            </div>
          )}
        </div>
      </VaultOverlay>

      <VaultOverlay
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        title="Automation Protocol"
        footer={
          <>
             <button onClick={() => setIsScheduleModalOpen(false)} className="px-6 py-2.5 text-[10px] font-black uppercase text-slate-500 hover:text-white transition-colors">Abort</button>
             <button onClick={handleCreateSchedule} className="bg-emerald-500 text-obsidian-950 px-8 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-400 transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)]">Commit Task</button>
          </>
        }
      >
        <div className="space-y-6">
          <div className="space-y-3 px-1">
            <label className="text-[8px] font-black uppercase text-slate-500 tracking-widest ml-1">Protocol Alias</label>
            <input 
              type="text" 
              placeholder="e.g. Daily Vault Sync" 
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white outline-none focus:border-brand-primary/50"
              value={newSchedName}
              onChange={(e) => setNewSchedName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3 px-1">
              <label className="text-[8px] font-black uppercase text-slate-500 tracking-widest ml-1">Asset Class</label>
              <select 
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs text-white outline-none appearance-none"
                value={newSchedType}
                onChange={(e) => setNewSchedType(Number(e.target.value))}
              >
                <option value={1} className="bg-obsidian-900 text-white">Database Instance</option>
                <option value={0} className="bg-obsidian-900 text-white">Docker Volume</option>
              </select>
            </div>
            <div className="space-y-3 px-1">
              <label className="text-[8px] font-black uppercase text-slate-500 tracking-widest ml-1">Recurrence (Minutes)</label>
              <input 
                type="number" 
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs text-white outline-none"
                value={newSchedInterval}
                onChange={(e) => setNewSchedInterval(Number(e.target.value))}
              />
            </div>
          </div>

          {newSchedType === 0 && (
            <div className="space-y-3 px-1">
              <label className="text-[8px] font-black uppercase text-slate-500 tracking-widest ml-1">Target Volume</label>
              <Combobox 
                options={availableVolumes} 
                value={newSchedTarget} 
                onChange={setNewSchedTarget} 
              />
            </div>
          )}

          <div className="space-y-4">
            <label className="text-[8px] font-black uppercase text-slate-500 tracking-widest ml-1">Vault Destination</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'local', label: 'Local', desc: 'Secure Server', icon: FolderSync },
                { id: 'both', label: 'Both', desc: 'Server + Cloud', icon: Cloud },
                { id: 'drive', label: 'Drive', desc: 'Cloud Only', icon: Download }
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setNewSchedStorage(opt.id as any)}
                  className={`p-4 rounded-3xl border text-left transition-all ${
                    newSchedStorage === opt.id 
                      ? 'bg-brand-primary/10 border-brand-primary shadow-[0_0_20px_rgba(167,139,250,0.1)]' 
                      : 'bg-white/5 border-white/5 hover:border-white/10'
                  }`}
                >
                  <opt.icon size={16} className={newSchedStorage === opt.id ? 'text-brand-primary' : 'text-slate-500'} />
                  <p className={`text-[9px] font-black uppercase mt-3 tracking-widest ${newSchedStorage === opt.id ? 'text-white' : 'text-slate-400'}`}>{opt.label}</p>
                  <p className="text-[7px] font-bold text-slate-600 uppercase mt-1 leading-tight">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {newSchedStorage !== 'local' && (
            <div className="p-6 bg-brand-primary/5 rounded-3xl border border-brand-primary/10 space-y-4 animate-fade-in">
               <div className="flex items-center gap-2 mb-2">
                 <Cloud size={14} className="text-brand-primary" />
                 <span className="text-[10px] font-black uppercase text-brand-primary tracking-widest">Cloud Relay Identity</span>
               </div>
               <input 
                type="text" 
                placeholder="Google Drive Parent ID" 
                className="w-full bg-black/40 border border-brand-primary/20 rounded-2xl px-5 py-3.5 text-xs text-brand-primary placeholder:text-slate-700 outline-none focus:border-brand-primary/50"
                value={newSchedCloudFolderId}
                onChange={(e) => setNewSchedCloudFolderId(parseFolderId(e.target.value))}
              />
              <p className="text-[8px] text-slate-600 font-bold uppercase italic tracking-tighter">System default will be utilized if empty</p>
            </div>
          )}
        </div>
      </VaultOverlay>

      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      {/* Existing Schedules Display (Bottom Section) */}
      <section className="mt-12 space-y-6">
        <div className="flex items-center gap-3">
          <Clock className="w-4 h-4 text-emerald-400" />
          <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Automation Protocols</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {schedules.map(s => (
            <div key={s.id} className="bg-white/5 border border-white/5 rounded-3xl p-6 flex flex-col justify-between group hover:border-emerald-500/20 transition-all">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-sm font-black text-white uppercase">{s.name}</h3>
                  <p className="text-[9px] text-slate-500 uppercase font-black mt-1">
                    Every {s.intervalMinutes} min | 
                    <span className="text-emerald-400 ml-1">{s.type === 1 ? 'DATABASE' : 'VOLUME'}</span>
                  </p>
                </div>
                <div className={`px-2 py-1 rounded bg-white/5 text-[8px] font-black uppercase ${s.isActive ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {s.isActive ? 'Active' : 'Paused'}
                </div>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg border ${
                    !s.syncToCloud ? 'bg-slate-500/5 border-slate-500/10 text-slate-500' :
                    s.keepLocal ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400' :
                    'bg-brand-primary/5 border-brand-primary/10 text-brand-primary'
                  }`}>
                    {!s.syncToCloud ? <FolderSync size={10} /> : s.keepLocal ? <Cloud size={10} /> : <Download size={10} />}
                  </div>
                  <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">
                    {!s.syncToCloud ? 'Local Only' : s.keepLocal ? 'Server + Cloud' : 'Cloud Only'}
                  </span>
                </div>
                <span className="text-[8px] text-slate-600 font-bold uppercase">Next: {s.nextRun ? format(new Date(s.nextRun), 'HH:mm | MMM dd') : 'N/A'}</span>
                <div className="flex gap-2">
                  {s.syncToCloud && <Cloud size={14} className="text-brand-secondary" />}
                  <button className="text-slate-600 hover:text-rose-400 transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
          {schedules.length === 0 && (
            <div className="col-span-full py-12 text-center bg-white/1 border border-dashed border-white/10 rounded-3xl">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">No automated tasks defined</p>
            </div>
          )}
        </div>
      </section>

      <VaultOverlay
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Sanitize Protocol"
        footer={
          <>
             <button onClick={() => setIsDeleteModalOpen(false)} className="px-6 py-2.5 text-[10px] font-black uppercase text-slate-500 hover:text-white transition-colors">Abort</button>
             <button onClick={confirmDelete} className="bg-rose-500 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-400 transition-all shadow-[0_0_20px_rgba(244,63,94,0.3)] border border-rose-400/50">Confirm Deletion</button>
          </>
        }
      >
        <div className="py-8 space-y-6 text-center">
          <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto border border-rose-500/20 animate-pulse">
            <Trash2 className="w-8 h-8 text-rose-500" />
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">Permanent Purge</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-relaxed">
              Are you sure you want to sanitize this resource?<br/>
              <span className="text-rose-400/80 italic">This action cannot be rolled back.</span>
            </p>
          </div>
        </div>
      </VaultOverlay>
    </div>
  );
};

export default Backups;
