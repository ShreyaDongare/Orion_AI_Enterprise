import React, { useEffect, useState } from 'react';
import {
  Copy,
  Download,
  FileText,
  RefreshCw,
  Trash2,
} from 'lucide-react';

import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Breadcrumb from '../components/Breadcrumb';

import toast from 'react-hot-toast';

import reportService from '../services/reportService';


export default function Reports() {

  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);

  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);


  // ==========================================================
  // LOAD REPORTS
  // ==========================================================

  const loadReports = async () => {

    try {

      setLoading(true);

      const data =
        await reportService.getReports();

      const reportList =
        Array.isArray(data)
          ? data
          : [];

      setReports(reportList);

      // ------------------------------------------------------
      // Automatically select first report
      // ------------------------------------------------------

      if (reportList.length > 0) {

        setSelectedReport(
          reportList[0]
        );

      } else {

        setSelectedReport(null);
      }

    } catch (error) {

      console.error(
        'Failed to load reports:',
        error
      );

      toast.error(
        'Unable to load reports'
      );

    } finally {

      setLoading(false);
    }
  };


  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {

    loadReports();

  }, []);


  // ==========================================================
  // COPY MARKDOWN
  // ==========================================================

  const handleCopy = async () => {

    if (!selectedReport) {
      return;
    }

    try {

      await navigator.clipboard.writeText(
        selectedReport.content_markdown || ''
      );

      toast.success(
        'Report markdown copied'
      );

    } catch (error) {

      console.error(
        'Copy failed:',
        error
      );

      toast.error(
        'Unable to copy report'
      );
    }
  };


  // ==========================================================
  // DOWNLOAD PDF
  // ==========================================================

  const handleDownload = async () => {

    if (!selectedReport) {
      return;
    }

    try {

      setDownloading(true);

      await reportService.downloadReport(
        selectedReport.id,
        selectedReport.title
      );

      toast.success(
        'Report PDF downloaded successfully'
      );

    } catch (error) {

      console.error(
        'Report download failed:',
        error
      );

      toast.error(
        'Unable to download report'
      );

    } finally {

      setDownloading(false);
    }
  };


  // ==========================================================
  // DELETE REPORT
  // ==========================================================

  const handleDelete = async () => {

    if (!selectedReport) {
      return;
    }

    const confirmed =
      window.confirm(
        'Are you sure you want to delete this report? This action cannot be undone.'
      );

    if (!confirmed) {
      return;
    }

    try {

      setDeleting(true);

      await reportService.deleteReport(
        selectedReport.id
      );

      toast.success(
        'Report deleted successfully'
      );

      // ------------------------------------------------------
      // Remove from local list
      // ------------------------------------------------------

      const remainingReports =
        reports.filter(
          report =>
            report.id !== selectedReport.id
        );

      setReports(
        remainingReports
      );

      // ------------------------------------------------------
      // Select next report
      // ------------------------------------------------------

      if (
        remainingReports.length > 0
      ) {

        setSelectedReport(
          remainingReports[0]
        );

      } else {

        setSelectedReport(null);
      }

    } catch (error) {

      console.error(
        'Delete report failed:',
        error
      );

      toast.error(
        'Unable to delete report'
      );

    } finally {

      setDeleting(false);
    }
  };


  // ==========================================================
  // FORMAT DATE
  // ==========================================================

  const formatDate = (date) => {

    if (!date) {
      return '';
    }

    try {

      return new Date(
        date
      ).toLocaleDateString(
        'en-GB',
        {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }
      );

    } catch {

      return '';
    }
  };


  // ==========================================================
  // LOADING STATE
  // ==========================================================

  if (loading) {

    return (
      <div className="space-y-6">

        <Breadcrumb
          items={[
            {
              label: 'Generated Reports',
            },
          ]}
        />

        <div className="flex items-center justify-center min-h-[400px]">

          <div className="flex items-center gap-3 text-slate-500">

            <RefreshCw
              className="w-5 h-5 animate-spin"
            />

            <span>
              Loading reports...
            </span>

          </div>

        </div>

      </div>
    );
  }


  return (

    <div className="space-y-6">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div>

        <Breadcrumb
          items={[
            {
              label: 'Generated Reports',
            },
          ]}
        />

        <div className="flex items-start justify-between mt-4">

          <div className="flex items-start gap-4">

            <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">

              <FileText
                className="w-5 h-5 text-blue-600"
              />

            </div>

            <div>

              <h1 className="text-2xl font-extrabold font-heading text-slate-900">

                Executive AI Reports & Briefings

              </h1>

              <p className="text-sm text-slate-500 mt-1">

                Reports generated and stored by the OrionAI backend.

              </p>

            </div>

          </div>


          {/* REFRESH */}

          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            onClick={loadReports}
          >

            Refresh

          </Button>

        </div>

      </div>


      {/* =====================================================
          EMPTY STATE
      ===================================================== */}

      {reports.length === 0 ? (

        <Card className="min-h-[450px] flex flex-col items-center justify-center text-center">

          <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-5">

            <FileText
              className="w-8 h-8 text-blue-600"
            />

          </div>

          <h2 className="text-lg font-bold text-slate-900">

            No reports found

          </h2>

          <p className="text-sm text-slate-500 mt-2 max-w-md">

            Reports generated by the Report Agent will appear here.

          </p>

        </Card>

      ) : (

        /* ===================================================
           REPORT LAYOUT
        =================================================== */

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">


          {/* =================================================
              REPORT LIST
          ================================================= */}

          <div className="space-y-3">

            {reports.map(
              (report) => {

                const isSelected =
                  selectedReport?.id ===
                  report.id;

                return (

                  <button
                    key={report.id}
                    onClick={() =>
                      setSelectedReport(
                        report
                      )
                    }
                    className={`
                      w-full
                      text-left
                      p-4
                      rounded-xl
                      border
                      transition-all
                      duration-200
                      ${
                        isSelected
                          ? 'bg-blue-50 border-blue-200 shadow-sm'
                          : 'bg-white border-slate-200 hover:border-blue-200 hover:bg-slate-50'
                      }
                    `}
                  >

                    <div className="flex items-center justify-between mb-3">

                      <Badge
                        variant="blue"
                        size="sm"
                      >

                        AI Report

                      </Badge>

                      <span className="text-[10px] text-slate-400 font-mono">

                        {formatDate(
                          report.created_at
                        )}

                      </span>

                    </div>


                    <h3 className="text-sm font-bold text-slate-900 line-clamp-2">

                      {report.title ||
                        'Untitled Report'}

                    </h3>


                    <p className="text-[11px] text-slate-500 mt-2 font-mono">

                      Project ID:{' '}

                      {report.project_id}

                    </p>

                  </button>

                );
              }
            )}

          </div>


          {/* =================================================
              REPORT CONTENT
          ================================================= */}

          <div className="lg:col-span-2">

            {selectedReport && (

              <Card className="bg-white border border-slate-200 overflow-hidden">


                {/* ===========================================
                    REPORT HEADER
                =========================================== */}

                <div className="p-6 border-b border-slate-100">

                  <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">

                    <div className="min-w-0">

                      <Badge
                        variant="blue"
                        size="sm"
                      >

                        AI Report

                      </Badge>


                      <h2 className="text-xl font-bold font-heading text-slate-900 mt-3">

                        {selectedReport.title ||
                          'Untitled Report'}

                      </h2>


                      <p className="text-xs text-slate-500 mt-2">

                        Created:{' '}

                        {formatDate(
                          selectedReport.created_at
                        )}

                      </p>

                    </div>


                    {/* =======================================
                        ACTION BUTTONS
                    ======================================= */}

                    <div className="flex items-center gap-2 shrink-0">

                      {/* COPY */}

                      <Button
                        variant="outline"
                        size="sm"
                        icon={Copy}
                        onClick={
                          handleCopy
                        }
                      >

                        Copy Markdown

                      </Button>


                      {/* DOWNLOAD */}

                      <Button
                        variant="primary"
                        size="sm"
                        icon={Download}
                        loading={
                          downloading
                        }
                        onClick={
                          handleDownload
                        }
                      >

                        Download PDF

                      </Button>


                      {/* DELETE */}

                      <Button
                        variant="danger"
                        size="sm"
                        icon={Trash2}
                        loading={
                          deleting
                        }
                        onClick={
                          handleDelete
                        }
                      >

                        Delete

                      </Button>

                    </div>

                  </div>

                </div>


                {/* ===========================================
                    REPORT CONTENT
                =========================================== */}

                <div className="p-6">

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">

                    <div className="whitespace-pre-wrap text-sm text-slate-700 leading-7">

                      {selectedReport.content_markdown ||
                        'No report content available.'}

                    </div>

                  </div>

                </div>

              </Card>

            )}

          </div>

        </div>

      )}

    </div>
  );
}