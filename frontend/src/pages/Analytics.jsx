import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid, Legend } from 'recharts';
import { BarChart3, TrendingUp, Zap, Cpu, Activity, Clock } from 'lucide-react';
import Card from '../components/Card';
import StatCard from '../components/StatCard';
import Breadcrumb from '../components/Breadcrumb';

const TOKEN_USAGE_DATA = [
  { month: 'Jan', inputTokens: 450000, outputTokens: 320000 },
  { month: 'Feb', inputTokens: 520000, outputTokens: 410000 },
  { month: 'Mar', inputTokens: 610000, outputTokens: 480000 },
  { month: 'Apr', inputTokens: 780000, outputTokens: 620000 },
  { month: 'May', inputTokens: 920000, outputTokens: 740000 },
  { month: 'Jun', inputTokens: 1150000, outputTokens: 910000 },
];

const AGENT_PERFORMANCE_DATA = [
  { agent: 'Orchestrator', queries: 1420, avgTime: '1.2s' },
  { agent: 'Market Research', queries: 980, avgTime: '2.4s' },
  { agent: 'Financial Analyst', queries: 850, avgTime: '1.8s' },
  { agent: 'Slide Designer', queries: 620, avgTime: '3.1s' },
  { agent: 'Email Synthesizer', queries: 1100, avgTime: '0.9s' },
];

export default function Analytics() {
  return (
    <div className="space-y-6">
      <div>
        <Breadcrumb items={[{ label: 'System Analytics' }]} />
        <h1 className="text-2xl font-bold font-heading text-slate-900 tracking-tight">
          Enterprise Multi-Agent Analytics
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Monitor token consumption, agent response latencies, and cross-departmental throughput.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Tokens Processed"
          value="4.43 Million"
          change="+18.2%"
          isPositive={true}
          icon={Cpu}
        />
        <StatCard
          title="Avg Model Latency"
          value="1.48 Seconds"
          change="-0.3s"
          isPositive={true}
          icon={Clock}
        />
        <StatCard
          title="Vector Retrieval Hits"
          value="99.2% Acc"
          change="+1.4%"
          isPositive={true}
          icon={Activity}
        />
        <StatCard
          title="Est. Monthly Savings"
          value="$42,500"
          change="3.4x ROI"
          isPositive={true}
          icon={TrendingUp}
        />
      </div>

      {/* Token Usage Chart */}
      <Card className="space-y-4 bg-white border border-slate-200 p-5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold font-heading text-slate-900">
              Token Consumption Trajectory (2026)
            </h2>
          </div>
        </div>

        <div className="h-72 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={TOKEN_USAGE_DATA}>
              <defs>
                <linearGradient id="colorInput" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorOutput" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0284c7" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#0284c7" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', color: '#0f172a' }} />
              <Area type="monotone" dataKey="inputTokens" stroke="#2563eb" fillOpacity={1} fill="url(#colorInput)" name="Input Tokens" />
              <Area type="monotone" dataKey="outputTokens" stroke="#0284c7" fillOpacity={1} fill="url(#colorOutput)" name="Output Tokens" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Agent Workload Table */}
      <Card className="space-y-4 bg-white border border-slate-200 p-5">
        <h2 className="text-base font-bold font-heading text-slate-900">
          Agent Node Performance Breakdown
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider font-heading">
                <th className="py-3 px-4">Agent Node</th>
                <th className="py-3 px-4">Queries Handled</th>
                <th className="py-3 px-4">Avg Execution Latency</th>
                <th className="py-3 px-4">Health Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {AGENT_PERFORMANCE_DATA.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-slate-900">{row.agent}</td>
                  <td className="py-3.5 px-4 text-slate-600 font-mono">{row.queries.toLocaleString()}</td>
                  <td className="py-3.5 px-4 text-blue-600 font-mono font-medium">{row.avgTime}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[10px]">
                      Optimal
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
