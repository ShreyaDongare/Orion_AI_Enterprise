import React, { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

import {
  BarChart3,
  TrendingUp,
  Cpu,
  Activity,
  Clock,
} from 'lucide-react';

import Card from '../components/Card';
import StatCard from '../components/StatCard';
import Breadcrumb from '../components/Breadcrumb';

import { analyticsService } from '../services/analyticsService';

// ============================================================
// HELPERS
// ============================================================

const formatNumber = (value) => {
  const number = Number(value || 0);

  if (number >= 1000000) {
    return `${(number / 1000000).toFixed(2)} Million`;
  }

  if (number >= 1000) {
    return `${(number / 1000).toFixed(1)}K`;
  }

  return number.toLocaleString();
};

const formatLatency = (value) => {
  const number = Number(value || 0);

  return `${number.toFixed(2)} Seconds`;
};

const formatCurrency = (value) => {
  const number = Number(value || 0);

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(number);
};

const getHealthStatus = (latency) => {
  const value = Number(latency || 0);

  if (value <= 2) {
    return {
      label: 'Optimal',
      className:
        'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
  }

  if (value <= 5) {
    return {
      label: 'Good',
      className:
        'bg-amber-50 text-amber-700 border-amber-200',
    };
  }

  return {
    label: 'Needs Attention',
    className:
      'bg-red-50 text-red-700 border-red-200',
  };
};

// ============================================================
// COMPONENT
// ============================================================

export default function Analytics() {
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // ==========================================================
  // LOAD ANALYTICS
  // ==========================================================

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const data =
        await analyticsService.getAnalytics();

      setAnalytics({
        summary: {
          totalTokens: Number(
            data?.summary?.totalTokens || 0
          ),

          avgLatency: Number(
            data?.summary?.avgLatency || 0
          ),

          retrievalAccuracy: Number(
            data?.summary?.retrievalAccuracy || 0
          ),

          monthlySavings: Number(
            data?.summary?.monthlySavings || 0
          ),

          tokenChange: Number(
            data?.summary?.tokenChange || 0
          ),

          latencyChange: Number(
            data?.summary?.latencyChange || 0
          ),

          retrievalChange: Number(
            data?.summary?.retrievalChange || 0
          ),

          roi: Number(
            data?.summary?.roi || 0
          ),
        },

        tokenUsage: Array.isArray(
          data?.tokenUsage
        )
          ? data.tokenUsage
          : [],

        agentPerformance:
          Array.isArray(
            data?.agentPerformance
          )
            ? data.agentPerformance
            : [],

        activity: data?.activity || {},
      });

    } catch (err) {
      console.error(
        'Failed to load analytics:',
        err
      );

      setError(
        err?.message ||
        'Unable to load analytics.'
      );

      setAnalytics(null);

    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    loadAnalytics();
  }, []);

  const summary =
    analytics?.summary || {
      totalTokens: 0,
      avgLatency: 0,
      retrievalAccuracy: 0,
      monthlySavings: 0,
      tokenChange: 0,
      latencyChange: 0,
      retrievalChange: 0,
      roi: 0,
    };

  const tokenUsage =
    analytics?.tokenUsage || [];

  const agentPerformance =
    analytics?.agentPerformance || [];

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="space-y-6">

      <Breadcrumb
        items={[
          {
            label: 'System Analytics',
          },
        ]}
      />

      {/* HEADER */}

      <div>
        <h1 className="text-2xl font-bold font-heading text-slate-900">
          Enterprise Multi-Agent Analytics
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Monitor real OrionAI usage, agent response
          latencies, and operational throughput.
        </p>
      </div>

      {/* ======================================================
          LOADING
      ====================================================== */}

      {isLoading && (
        <Card className="p-6">
          <div className="flex items-center gap-3 text-slate-500">

            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />

            <span>
              Loading analytics...
            </span>

          </div>
        </Card>
      )}

      {/* ======================================================
          ERROR
      ====================================================== */}

      {!isLoading && error && (
        <Card className="p-5 border-red-200 bg-red-50">

          <div className="flex items-center justify-between gap-4">

            <div>
              <p className="font-semibold text-red-700">
                Unable to load analytics
              </p>

              <p className="text-sm text-red-600 mt-1">
                {error}
              </p>
            </div>

            <button
              type="button"
              onClick={loadAnalytics}
              className="px-4 py-2 rounded-lg bg-white border border-red-200 text-red-700 text-sm font-semibold hover:bg-red-100"
            >
              Retry
            </button>

          </div>

        </Card>
      )}

      {/* ======================================================
          ANALYTICS CONTENT
      ====================================================== */}

      {!isLoading && !error && (
        <>

          {/* ==================================================
              SUMMARY CARDS
          ================================================== */}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

            <StatCard
              title="Total Tokens Processed"
              value={formatNumber(
                summary.totalTokens
              )}
              change={
                `${summary.tokenChange >= 0 ? '+' : ''}` +
                `${summary.tokenChange}%`
              }
              isPositive={
                summary.tokenChange >= 0
              }
              icon={Cpu}
            />

            <StatCard
              title="Avg Model Latency"
              value={formatLatency(
                summary.avgLatency
              )}
              change={
                `${summary.latencyChange >= 0 ? '+' : ''}` +
                `${summary.latencyChange}s`
              }
              isPositive={
                summary.latencyChange <= 0
              }
              icon={Clock}
            />

            <StatCard
              title="Vector Retrieval Hits"
              value={
                `${summary.retrievalAccuracy.toFixed(1)}% Acc`
              }
              change={
                `${summary.retrievalChange >= 0 ? '+' : ''}` +
                `${summary.retrievalChange}%`
              }
              isPositive={
                summary.retrievalChange >= 0
              }
              icon={Activity}
            />

            <StatCard
              title="Est. Monthly Savings"
              value={formatCurrency(
                summary.monthlySavings
              )}
              change={
                `${summary.roi.toFixed(1)}x ROI`
              }
              isPositive={true}
              icon={TrendingUp}
            />

          </div>

          {/* ==================================================
              TOKEN CONSUMPTION
          ================================================== */}

          <Card className="space-y-4 bg-white border border-slate-200 p-5">

            <div className="flex items-center justify-between pb-2 border-b border-slate-100">

              <div className="flex items-center gap-2">

                <BarChart3 className="w-5 h-5 text-blue-600" />

                <h2 className="text-base font-bold font-heading text-slate-900">
                  Token Consumption Trajectory
                </h2>

              </div>

            </div>

            <div className="h-72 w-full pt-4">

              {tokenUsage.length === 0 ? (

                <div className="h-full flex items-center justify-center text-sm text-slate-400">
                  No token usage data available yet.
                </div>

              ) : (

                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >

                  <AreaChart
                    data={tokenUsage}
                  >

                    <defs>

                      <linearGradient
                        id="colorInput"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >

                        <stop
                          offset="5%"
                          stopColor="#2563eb"
                          stopOpacity={0.3}
                        />

                        <stop
                          offset="95%"
                          stopColor="#2563eb"
                          stopOpacity={0}
                        />

                      </linearGradient>

                      <linearGradient
                        id="colorOutput"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >

                        <stop
                          offset="5%"
                          stopColor="#0284c7"
                          stopOpacity={0.3}
                        />

                        <stop
                          offset="95%"
                          stopColor="#0284c7"
                          stopOpacity={0}
                        />

                      </linearGradient>

                    </defs>

                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#e2e8f0"
                    />

                    <XAxis
                      dataKey="month"
                      stroke="#64748b"
                      fontSize={11}
                    />

                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                    />

                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#e2e8f0',
                        borderRadius: '12px',
                        color: '#0f172a',
                      }}
                    />

                    <Area
                      type="monotone"
                      dataKey="inputTokens"
                      stroke="#2563eb"
                      fillOpacity={1}
                      fill="url(#colorInput)"
                      name="Input Tokens"
                    />

                    <Area
                      type="monotone"
                      dataKey="outputTokens"
                      stroke="#0284c7"
                      fillOpacity={1}
                      fill="url(#colorOutput)"
                      name="Output Tokens"
                    />

                  </AreaChart>

                </ResponsiveContainer>

              )}

            </div>

          </Card>

          {/* ==================================================
              AGENT PERFORMANCE
          ================================================== */}

          <Card className="space-y-4 bg-white border border-slate-200 p-5">

            <h2 className="text-base font-bold font-heading text-slate-900">
              Agent Node Performance Breakdown
            </h2>

            <div className="overflow-x-auto">

              {agentPerformance.length === 0 ? (

                <div className="py-10 text-center text-sm text-slate-400">
                  No agent activity has been recorded yet.
                </div>

              ) : (

                <table className="w-full text-left text-xs">

                  <thead>

                    <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider font-heading">

                      <th className="py-3 px-4">
                        Agent Node
                      </th>

                      <th className="py-3 px-4">
                        Queries Handled
                      </th>

                      <th className="py-3 px-4">
                        Avg Execution Latency
                      </th>

                      <th className="py-3 px-4">
                        Health Status
                      </th>

                    </tr>

                  </thead>

                  <tbody className="divide-y divide-slate-100">

                    {agentPerformance.map(
                      (row, index) => {

                        const health =
                          getHealthStatus(
                            row.avgTime
                          );

                        return (
                          <tr
                            key={
                              row.agent ||
                              index
                            }
                            className="hover:bg-slate-50 transition-colors"
                          >

                            <td className="py-3.5 px-4 font-semibold text-slate-900">
                              {row.agent}
                            </td>

                            <td className="py-3.5 px-4 text-slate-600 font-mono">
                              {Number(
                                row.queries || 0
                              ).toLocaleString()}
                            </td>

                            <td className="py-3.5 px-4 text-blue-600 font-mono font-medium">
                              {formatLatency(
                                row.avgTime
                              )}
                            </td>

                            <td className="py-3.5 px-4">

                              <span
                                className={
                                  `px-2 py-0.5 rounded-md border ` +
                                  `font-semibold text-[10px] ` +
                                  health.className
                                }
                              >
                                {health.label}
                              </span>

                            </td>

                          </tr>
                        );
                      }
                    )}

                  </tbody>

                </table>

              )}

            </div>

          </Card>

          {/* ==================================================
              REAL ACTIVITY COUNTS
          ================================================== */}

          <Card className="bg-white border border-slate-200 p-5">

            <h2 className="text-base font-bold font-heading text-slate-900 mb-4">
              Platform Activity
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">
                  Projects
                </p>

                <p className="text-xl font-bold text-slate-900 mt-1">
                  {Number(
                    analytics?.activity?.projects || 0
                  ).toLocaleString()}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">
                  Reports
                </p>

                <p className="text-xl font-bold text-slate-900 mt-1">
                  {Number(
                    analytics?.activity?.reports || 0
                  ).toLocaleString()}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">
                  Presentations
                </p>

                <p className="text-xl font-bold text-slate-900 mt-1">
                  {Number(
                    analytics?.activity?.presentations || 0
                  ).toLocaleString()}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">
                  Emails
                </p>

                <p className="text-xl font-bold text-slate-900 mt-1">
                  {Number(
                    analytics?.activity?.emails || 0
                  ).toLocaleString()}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">
                  Documents
                </p>

                <p className="text-xl font-bold text-slate-900 mt-1">
                  {Number(
                    analytics?.activity?.documents || 0
                  ).toLocaleString()}
                </p>
              </div>

            </div>

          </Card>

        </>
      )}

    </div>
  );
}