import React, { useState } from 'react';
import { FileText, Download, Check } from 'lucide-react';
import MarkdownRenderer from '../MarkdownRenderer';
import Button from '../Button';
import { reportService } from '../../services/reportService';
import toast from 'react-hot-toast';

export default function ReportAgentUI({ content, id }) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    await reportService.downloadReport('generated_report');
    toast.success('Enterprise report generated & downloaded!');
    setDownloading(false);
  };

  return (
    <div id={id} className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
            <FileText className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider font-heading">
            Executive Report Generation Specialist
          </span>
        </div>
        <Button
          variant="clay"
          size="sm"
          icon={downloading ? Check : Download}
          isLoading={downloading}
          onClick={handleDownload}
        >
          Download PDF Report
        </Button>
      </div>

      <div className="p-5 rounded-3xl bg-slate-900/80 border border-purple-500/20 shadow-xl space-y-3">
        <MarkdownRenderer content={content} />
      </div>
    </div>
  );
}
