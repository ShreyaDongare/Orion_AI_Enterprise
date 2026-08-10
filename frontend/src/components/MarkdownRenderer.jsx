import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, ExternalLink } from 'lucide-react';

export default function MarkdownRenderer({ content, citations, id }) {
  const [copiedCode, setCopiedCode] = useState(null);

  const handleCopyCode = (codeText, idx) => {
    navigator.clipboard.writeText(codeText);
    setCopiedCode(idx);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div id={id} className="prose prose-invert max-w-none text-slate-200 text-sm leading-relaxed space-y-3">
      <ReactMarkdown
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const codeString = String(children).replace(/\n$/, '');
            const codeIndex = Math.random();

            return !inline && match ? (
              <div className="relative my-3 rounded-xl overflow-hidden border border-slate-700/80 bg-slate-950/90 shadow-xl">
                <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs text-slate-400 font-mono">
                  <span>{match[1]}</span>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(codeString, codeIndex)}
                    className="flex items-center gap-1 hover:text-slate-200 transition-colors"
                  >
                    {copiedCode === codeIndex ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>
                <SyntaxHighlighter
                  style={vscDarkPlus}
                  language={match[1]}
                  PreTag="div"
                  customStyle={{
                    margin: 0,
                    padding: '1rem',
                    fontSize: '0.85rem',
                    background: 'transparent',
                  }}
                  {...props}
                >
                  {codeString}
                </SyntaxHighlighter>
              </div>
            ) : (
              <code className="bg-slate-800/90 text-indigo-300 font-mono px-1.5 py-0.5 rounded text-xs border border-slate-700/60" {...props}>
                {children}
              </code>
            );
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto my-4 rounded-xl border border-slate-700/60 bg-slate-900/50 p-1">
                <table className="w-full text-left text-xs border-collapse">{children}</table>
              </div>
            );
          },
          thead({ children }) {
            return <thead className="bg-slate-800/80 text-slate-200 border-b border-slate-700">{children}</thead>;
          },
          th({ children }) {
            return <th className="p-3 font-semibold text-slate-100">{children}</th>;
          },
          td({ children }) {
            return <td className="p-3 border-b border-slate-800/60 text-slate-300">{children}</td>;
          },
          h1({ children }) {
            return <h1 className="text-lg font-bold text-slate-100 mt-4 mb-2 font-heading border-b border-slate-800 pb-1.5">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-base font-semibold text-slate-100 mt-3 mb-1.5 font-heading">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-sm font-semibold text-slate-200 mt-2 mb-1 font-heading">{children}</h3>;
          },
          p({ children }) {
            return <p className="mb-2 leading-relaxed text-slate-200">{children}</p>;
          },
          ul({ children }) {
            return <ul className="list-disc pl-5 space-y-1 my-2 text-slate-300">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal pl-5 space-y-1 my-2 text-slate-300">{children}</ol>;
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-indigo-500 bg-indigo-500/5 pl-4 py-2 italic my-3 text-slate-300 rounded-r-lg">
                {children}
              </blockquote>
            );
          }
        }}
      >
        {content}
      </ReactMarkdown>

      {/* RAG & Web Search Citations Footer */}
      {citations && citations.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Verified Sources & Citations:</p>
          <div className="flex flex-wrap gap-2">
            {citations.map((cite, i) => (
              <a
                key={i}
                href={cite.url || '#'}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs bg-slate-900/90 hover:bg-slate-800 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full transition-all duration-200 hover:border-indigo-400 shadow-sm"
              >
                <span>{cite.title}</span>
                <ExternalLink className="w-3 h-3 text-indigo-400" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
