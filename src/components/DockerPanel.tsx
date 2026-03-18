import React from 'react';
import { Box, Activity, Cpu } from 'lucide-react';
import type { DockerContainerMetrics } from '../hooks/useMetrics';

interface DockerPanelProps {
    containers: DockerContainerMetrics[];
}

export const DockerPanel: React.FC<DockerPanelProps> = ({ containers }) => {
    return (
        <div className="glass-card rounded-4xl p-8 border-white/5">
            <div className="flex justify-between items-center mb-8">
                <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
                    <Box size={18} className="text-brand-primary" /> Docker Containers
                </h3>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    {containers?.length || 0} RUNNING
                </span>
            </div>

            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {containers?.map((container) => (
                    <div 
                        key={container.containerId} 
                        className="p-5 rounded-2xl bg-white/2 border border-white/5 hover:bg-white/4 transition-all group relative overflow-hidden"
                    >
                        <div className="flex justify-between items-start mb-3 relative z-10">
                            <div className="flex flex-col">
                                <span className="text-xs font-black text-white uppercase tracking-wider truncate max-w-[180px]">
                                    {container.name}
                                </span>
                                <span className="text-[9px] text-slate-500 font-mono mt-0.5 truncate max-w-[150px]">
                                    {container.image}
                                </span>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-tighter ${
                                    container.state === 'running' 
                                        ? 'bg-brand-secondary/10 text-brand-secondary border-brand-secondary/20' 
                                        : 'bg-amber-400/10 text-amber-400 border-amber-400/20'
                                }`}>
                                    {container.state}
                                </span>
                                <span className="text-[8px] text-slate-500 font-bold mt-1 uppercase">
                                    {container.status}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <div className="flex items-center gap-3 bg-white/3 p-2 rounded-xl border border-white/5">
                                <Cpu size={12} className="text-brand-primary opacity-70" />
                                <div className="flex flex-col">
                                    <span className="text-[8px] text-slate-500 font-black uppercase tracking-tighter">CPU Usage</span>
                                    <span className="text-xs font-black text-white font-mono">{container.cpuPercentage.toFixed(1)}%</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 bg-white/3 p-2 rounded-xl border border-white/5">
                                <Activity size={12} className="text-brand-secondary opacity-70" />
                                <div className="flex flex-col">
                                    <span className="text-[8px] text-slate-500 font-black uppercase tracking-tighter">Memory</span>
                                    <span className="text-xs font-black text-white font-mono">
                                        {(container.memoryUsageBytes / 1024 / 1024).toFixed(1)}MB
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Progress bar for CPU simplified */}
                        <div className="w-full bg-white/5 h-1 rounded-full mt-4 overflow-hidden">
                            <div 
                                className="h-full bg-brand-primary transition-all duration-1000"
                                style={{ width: `${Math.min(container.cpuPercentage, 100)}%` }}
                            ></div>
                        </div>
                    </div>
                ))}

                {(!containers || containers.length === 0) && (
                    <div className="flex flex-col items-center justify-center py-16 opacity-30">
                        <Box size={40} className="mb-4 text-slate-500" />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">No Containers Detected</p>
                    </div>
                )}
            </div>
        </div>
    );
};
