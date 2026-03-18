import React, { useEffect, useRef, useState } from 'react';
import { Trash2, AlertCircle, Loader2, Download } from 'lucide-react';
import { logsService } from '../services/logsService';

interface LogViewerProps {
  containerId: string;
  containerName: string;
}

export const LogViewer: React.FC<LogViewerProps> = ({ containerId, containerName }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    const handleLog = (message: string) => {
      // Docker logs often come with some binary header or redundant newlines
      // Clean up common artifacts if necessary, though SignalR usually handles strings well
      setLogs(prev => [...prev, message]);
      setStatus('connected');
    };

    const startStreaming = async () => {
      setStatus('connecting');
      try {
        await logsService.startLogs(containerId, handleLog);
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };

    startStreaming();

    return () => {
      logsService.stopLogs();
    };
  }, [containerId]);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isAtBottom = scrollHeight - scrollTop <= clientHeight + 50;
    setAutoScroll(isAtBottom);
  };

  const clearLogs = () => setLogs([]);

  const downloadLogs = () => {
    const blob = new Blob([logs.join('')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${containerName}_logs.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-[500px] w-full bg-obsidian-950/40 rounded-3xl border border-white/5 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/2">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full animate-pulse ${
            status === 'connected' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 
            status === 'connecting' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 
            'bg-rose-500'
          }`} />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            {containerName} • {status}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={downloadLogs}
            disabled={logs.length === 0}
            className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-all disabled:opacity-30"
            title="Download Logs"
          >
            <Download size={14} />
          </button>
          <button 
            onClick={clearLogs}
            className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-400/5 rounded-lg transition-all"
            title="Clear Console"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Log Output */}
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-6 font-mono text-[11px] leading-relaxed custom-scrollbar selection:bg-brand-primary/30"
      >
        {status === 'connecting' && logs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-500">
            <Loader2 size={24} className="animate-spin text-brand-primary" />
            <span className="uppercase tracking-[0.2em] font-black text-[9px]">Initializing Stream...</span>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-rose-400 p-8 text-center">
            <AlertCircle size={32} className="opacity-50" />
            <p className="font-bold uppercase tracking-widest text-[10px]">{error || 'Connection Failed'}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest"
            >
              Retry Connection
            </button>
          </div>
        )}

        {logs.map((line, i) => (
          <div key={i} className="whitespace-pre-wrap break-all py-0.5 border-l-2 border-transparent hover:border-brand-primary/20 hover:bg-white/1 px-2 transition-colors">
            <span className="text-slate-600 mr-3 select-none opacity-50">{(i + 1).toString().padStart(4, '0')}</span>
            <span className="text-slate-300">{line}</span>
          </div>
        ))}

        {status === 'connected' && logs.length === 0 && (
          <div className="text-slate-500 italic uppercase tracking-widest text-[9px] opacity-50 px-2 mt-4">
            Waiting for log output...
          </div>
        )}
      </div>

      {/* Footer Info */}
      {!autoScroll && logs.length > 0 && (
        <button 
          onClick={() => setAutoScroll(true)}
          className="absolute bottom-12 left-1/2 -translate-x-1/2 px-4 py-2 bg-brand-primary/20 backdrop-blur-md border border-brand-primary/40 rounded-full text-[9px] font-black text-white hover:bg-brand-primary/30 transition-all animate-bounce flex items-center gap-2"
        >
          Resume Auto-scroll
        </button>
      )}
    </div>
  );
};
