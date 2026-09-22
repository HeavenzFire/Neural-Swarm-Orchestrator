import React, { useState, useRef, useEffect } from 'react';
import {
  CloudUpload,
  Download,
  Filter,
  Search,
  Terminal,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
} from 'lucide-react';
import { TelemetryLog } from '../types/orchestrator';

interface RealtimeLogsProps {
  logs: TelemetryLog[];
  onClear: () => void;
  onCloudExport: () => Promise<{ success: boolean; uri: string; count: number; hash: string }>;
}

export const RealtimeLogs: React.FC<RealtimeLogsProps> = ({
  logs,
  onClear,
  onCloudExport,
}) => {
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = 0;
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter((log) => {
    if (filterLevel !== 'ALL' && log.level !== filterLevel) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSource = log.source.toLowerCase().includes(q);
      const matchEvent = log.event.toLowerCase().includes(q);
      const matchDetails = log.details.toLowerCase().includes(q);
      return matchSource || matchEvent || matchDetails;
    }
    return true;
  });

  const handleTriggerExport = async () => {
    setIsExporting(true);
    setExportNotice(null);
    try {
      const result = await onCloudExport();
      setExportNotice(`Exported ${result.count} logs to ${result.uri} (SHA3: ${result.hash})`);
      setTimeout(() => setExportNotice(null), 5000);
    } catch {
      setExportNotice('Export failed.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadJson = () => {
    const jsonStr = JSON.stringify(logs, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orchestrator-audit-logs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLevelBadge = (level: TelemetryLog['level']) => {
    switch (level) {
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
            <CheckCircle2 className="w-3 h-3" />
            SUCCESS
          </span>
        );
      case 'WARN':
        return (
          <span className="inline-flex items-center gap-1 text-amber-400 font-bold">
            <AlertTriangle className="w-3 h-3" />
            WARN
          </span>
        );
      case 'ERROR':
        return (
          <span className="inline-flex items-center gap-1 text-rose-400 font-bold">
            <AlertCircle className="w-3 h-3" />
            ERROR
          </span>
        );
      case 'INFO':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-sky-400 font-bold">
            <Info className="w-3 h-3" />
            INFO
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Terminal className="w-4 h-4 text-sky-400" />
            <span>Real-Time Handshake Metrics & Audit Stream</span>
            <span className="text-xs font-mono text-slate-400">
              ({filteredLogs.length} events)
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Streaming socket telemetry, encryption handshakes, error handling catches, and daemon logs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-download-logs-json"
            onClick={handleDownloadJson}
            title="Download JSON audit log payload"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-medium rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download JSON</span>
          </button>

          <button
            id="btn-cloud-export-logs"
            onClick={handleTriggerExport}
            disabled={isExporting || logs.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 shadow-sm"
          >
            <CloudUpload className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Streaming to S3...' : 'Export to Cloud Storage'}</span>
          </button>

          <button
            id="btn-clear-logs"
            onClick={onClear}
            title="Clear current log buffer"
            className="p-1.5 text-slate-400 hover:text-rose-300 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Export notification alert */}
      {exportNotice && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 overflow-x-auto">
          {['ALL', 'INFO', 'SUCCESS', 'WARN', 'ERROR'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setFilterLevel(lvl)}
              className={`px-2.5 py-1 rounded-md font-mono font-medium transition-colors ${
                filterLevel === lvl
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search logs by keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-sky-500 font-mono"
            />
          </div>

          <label className="flex items-center gap-1.5 text-slate-400 cursor-pointer select-none text-[11px]">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded bg-slate-950 border-slate-800 text-sky-500 focus:ring-0"
            />
            <span>Auto-top</span>
          </label>
        </div>
      </div>

      {/* Console View Window */}
      <div
        ref={logContainerRef}
        className="bg-slate-950 border border-slate-800 rounded-xl p-3 h-80 overflow-y-auto font-mono text-xs space-y-1.5"
      >
        {filteredLogs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400 italic">
            No telemetry records match current filters.
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-2 hover:bg-slate-900/60 p-1.5 rounded transition-colors"
            >
              <span className="text-slate-400 shrink-0 select-none text-[11px]">
                {log.timestamp.substring(11, 23)}
              </span>

              <span className="w-20 shrink-0 select-none text-[11px]">
                {getLevelBadge(log.level)}
              </span>

              <span className="text-slate-400 font-semibold shrink-0 text-[11px]">
                [{log.source}]
              </span>

              <span className="text-sky-300 font-bold shrink-0 text-[11px]">
                {log.event}:
              </span>

              <span className="text-slate-300 break-words flex-1 text-[11px]">
                {log.details}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
