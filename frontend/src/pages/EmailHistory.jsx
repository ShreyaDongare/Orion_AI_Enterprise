import React, { useEffect, useState } from 'react';
import {
  Mail,
  Copy,
  RefreshCw,
  Trash2,
  Inbox,
} from 'lucide-react';

import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Breadcrumb from '../components/Breadcrumb';

import emailService from '../services/emailService';

import toast from 'react-hot-toast';


export default function EmailHistory() {

  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);


  // ============================================================
  // LOAD REAL EMAILS
  // ============================================================

  const loadEmails = async () => {

    setIsLoading(true);
    setError(null);

    try {

      const data =
        await emailService.getEmails();

      const emailList =
        Array.isArray(data)
          ? data
          : [];

      setEmails(emailList);

      setSelectedEmail(
        emailList.length > 0
          ? emailList[0]
          : null
      );

    } catch (error) {

      console.error(
        'Failed to load emails:',
        error
      );

      setEmails([]);
      setSelectedEmail(null);

      setError(
        error?.response?.data?.message ||
        error?.message ||
        'Unable to load emails.'
      );

    } finally {

      setIsLoading(false);

    }
  };


  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {

    loadEmails();

  }, []);


  // ============================================================
  // COPY EMAIL
  // ============================================================

  const copyEmail = async (email) => {

    if (!email) {
      return;
    }

    const text = [
      email.subject
        ? `Subject: ${email.subject}`
        : '',
      '',
      email.body_text || '',
    ]
      .filter(Boolean)
      .join('\n');

    try {

      await navigator.clipboard.writeText(
        text
      );

      toast.success(
        'Email copied to clipboard.'
      );

    } catch (error) {

      console.error(
        'Failed to copy email:',
        error
      );

      toast.error(
        'Unable to copy email.'
      );
    }
  };


  // ============================================================
  // DELETE EMAIL
  // ============================================================

  const handleDelete = async (
    emailId
  ) => {

    if (!emailId) {
      return;
    }

    const confirmed = window.confirm(
      'Are you sure you want to delete this email?'
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);

    try {

      await emailService.deleteEmail(
        emailId
      );

      const remainingEmails =
        emails.filter(
          (email) =>
            email.id !== emailId
        );

      setEmails(
        remainingEmails
      );

      setSelectedEmail(
        remainingEmails.length > 0
          ? remainingEmails[0]
          : null
      );

      toast.success(
        'Email deleted successfully.'
      );

    } catch (error) {

      console.error(
        'Failed to delete email:',
        error
      );

      toast.error(
        error?.response?.data?.message ||
        error?.message ||
        'Unable to delete email.'
      );

    } finally {

      setIsDeleting(false);

    }
  };


  // ============================================================
  // FORMAT DATE
  // ============================================================

  const formatDate = (value) => {

    if (!value) {
      return '';
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return value;
    }

    return date.toLocaleString(
      undefined,
      {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }
    );
  };


  // ============================================================
  // STATUS
  // ============================================================

  const getStatusVariant = (
    status
  ) => {

    const normalized =
      String(
        status || 'draft'
      ).toLowerCase();

    if (normalized === 'sent') {
      return 'emerald';
    }

    if (
      normalized === 'failed'
    ) {
      return 'red';
    }

    return 'blue';
  };


  // ============================================================
  // PAGE
  // ============================================================

  return (

    <div className="space-y-6">

      <Breadcrumb
        items={[
          {
            label:
              'Executive Communications',
          },
        ]}
      />


      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="flex items-start justify-between gap-4">

        <div>

          <div className="flex items-center gap-3">

            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">

              <Mail className="w-5 h-5" />

            </div>

            <div>

              <h1 className="text-2xl font-extrabold font-heading text-slate-900">

                AI Email Synthesizer History

              </h1>

              <p className="text-sm text-slate-500 mt-1">

                Review, copy, and manage email drafts generated by the Strategic Email Synthesizer Agent.

              </p>

            </div>

          </div>

        </div>


        <Button
          variant="outline"
          size="sm"
          icon={RefreshCw}
          onClick={loadEmails}
          isLoading={isLoading}
        >
          Refresh
        </Button>

      </div>


      {/* ======================================================
          CONTENT
      ====================================================== */}

      {isLoading ? (

        <Card className="min-h-[420px] flex items-center justify-center bg-white border border-slate-200">

          <div className="flex flex-col items-center gap-3 text-slate-500">

            <RefreshCw className="w-7 h-7 animate-spin text-blue-600" />

            <p className="text-sm">
              Loading emails from database...
            </p>

          </div>

        </Card>

      ) : error ? (

        <Card className="min-h-[420px] flex items-center justify-center bg-white border border-red-200">

          <div className="text-center space-y-3">

            <div className="mx-auto w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">

              <Mail className="w-6 h-6 text-red-500" />

            </div>

            <h3 className="font-bold text-slate-900">

              Unable to load emails

            </h3>

            <p className="text-sm text-slate-500 max-w-md">

              {error}

            </p>

            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              onClick={loadEmails}
            >
              Try Again
            </Button>

          </div>

        </Card>

      ) : emails.length === 0 ? (

        <Card className="min-h-[420px] flex items-center justify-center bg-white border border-slate-200">

          <div className="text-center">

            <div className="mx-auto w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center">

              <Inbox className="w-8 h-8 text-blue-500" />

            </div>

            <h3 className="mt-4 text-base font-bold text-slate-900">

              No emails found

            </h3>

            <p className="mt-1 text-sm text-slate-500">

              Emails generated by the Email Agent will appear here.

            </p>

          </div>

        </Card>

      ) : (

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">


          {/* ==================================================
              EMAIL LIST
          ================================================== */}

          <div className="space-y-3">

            {emails.map((email) => (

              <div
                key={email.id}
                onClick={() =>
                  setSelectedEmail(email)
                }
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  selectedEmail?.id === email.id
                    ? 'bg-blue-50 border-blue-200 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >

                <div className="flex items-center justify-between mb-2">

                  <Badge
                    variant={getStatusVariant(
                      email.status
                    )}
                    size="sm"
                  >
                    {email.status || 'Draft'}
                  </Badge>

                  <span className="text-[10px] text-slate-400 font-mono">

                    {formatDate(
                      email.created_at
                    )}

                  </span>

                </div>


                <h3 className="text-sm font-bold text-slate-900 font-heading line-clamp-2">

                  {email.subject ||
                    'Untitled Email'}

                </h3>


                <p className="text-[11px] text-slate-500 mt-1 line-clamp-1 font-mono">

                  To:{' '}

                  {email.recipient ||
                    'No recipient'}

                </p>

              </div>

            ))}

          </div>


          {/* ==================================================
              SELECTED EMAIL
          ================================================== */}

          <div className="lg:col-span-2">

            {selectedEmail && (

              <Card className="space-y-4 bg-white border border-slate-200 p-6">


                {/* HEADER */}

                <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">

                  <div className="space-y-2 min-w-0">

                    <div className="flex items-center gap-2">

                      <Badge
                        variant={getStatusVariant(
                          selectedEmail.status
                        )}
                        size="sm"
                      >
                        {selectedEmail.status ||
                          'Draft'}
                      </Badge>

                    </div>


                    <h2 className="text-lg font-bold font-heading text-slate-900">

                      {selectedEmail.subject ||
                        'Untitled Email'}

                    </h2>


                    <p className="text-xs text-slate-500">

                      To:{' '}

                      <span className="text-blue-600 font-mono">

                        {selectedEmail.recipient ||
                          'No recipient'}

                      </span>

                    </p>

                  </div>


                  <div className="flex items-center gap-2 shrink-0">

                    <Button
                      variant="outline"
                      size="sm"
                      icon={Copy}
                      onClick={() =>
                        copyEmail(
                          selectedEmail
                        )
                      }
                    >
                      Copy Draft
                    </Button>


                    <Button
                      variant="ghost"
                      size="sm"
                      icon={Trash2}
                      isLoading={isDeleting}
                      onClick={() =>
                        handleDelete(
                          selectedEmail.id
                        )
                      }
                    >
                      Delete
                    </Button>

                  </div>

                </div>


                {/* EMAIL BODY */}

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">

                  <div className="whitespace-pre-wrap text-sm text-slate-800 leading-7">

                    {selectedEmail.body_text ||
                      selectedEmail.body_html ||
                      'No email content available.'}

                  </div>

                </div>


                {/* FOOTER */}

                <div className="flex items-center justify-between pt-2 text-xs text-slate-400 font-mono">

                  <span>

                    Created:{' '}

                    {formatDate(
                      selectedEmail.created_at
                    )}

                  </span>

                  {selectedEmail.sent_at && (

                    <span>

                      Sent:{' '}

                      {formatDate(
                        selectedEmail.sent_at
                      )}

                    </span>

                  )}

                </div>

              </Card>

            )}

          </div>

        </div>

      )}

    </div>
  );
}