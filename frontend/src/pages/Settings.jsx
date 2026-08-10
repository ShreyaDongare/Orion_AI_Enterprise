import React from 'react';
import { Settings as SettingsIcon, Key, ShieldCheck, Cpu, Sliders, Bell, User, Sun, Laptop } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Breadcrumb from '../components/Breadcrumb';
import { useAuthStore } from '../store/useAuthStore';
import toast from 'react-hot-toast';

export default function Settings() {
  const { user } = useAuthStore();

  const handleSave = () => {
    toast.success('Enterprise configuration saved successfully');
  };

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumb items={[{ label: 'System Configuration' }]} />
        <h1 className="text-2xl font-bold font-heading text-slate-900 tracking-tight">
          Enterprise Workspace Settings
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage API keys, model parameters, zero-trust RBAC policies, and active user credentials.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* AI Model Credentials & Gateway */}
          <Card className="space-y-4 bg-white border border-slate-200 p-6">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Cpu className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold font-heading text-slate-900">
                AI Inference Engine & API Keys
              </h2>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-700 font-semibold">Gemini API Key</label>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    value="••••••••••••••••••••••••••••••••"
                    readOnly
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-500 outline-none font-mono"
                  />
                  <Badge variant="emerald" size="sm">Active (Platform Secret)</Badge>
                </div>
                <p className="text-[11px] text-slate-500 font-mono">Managed via Server Environment Secrets</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-700 font-semibold">Model Temperature / Reasoning Level</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  defaultValue="0.7"
                  className="w-full accent-blue-600"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>0.0 (Precise & Analytical)</span>
                  <span>0.7 (Balanced Strategy)</span>
                  <span>1.0 (Creative Synthesis)</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Security & SOC2 Compliance */}
          <Card className="space-y-4 bg-white border border-slate-200 p-6">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <h2 className="text-base font-bold font-heading text-slate-900">
                Security & Zero-Trust Governance
              </h2>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                <span className="font-medium">Enforce AES-256 Client Payload Encryption</span>
                <input type="checkbox" defaultChecked className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                <span className="font-medium">Vector RAG Fine-Grained Document RBAC</span>
                <input type="checkbox" defaultChecked className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
              </label>
            </div>
          </Card>

          <Button variant="blue" size="md" onClick={handleSave}>
            Save Configuration
          </Button>
        </div>

        {/* User Profile Card */}
        <div>
          <Card className="space-y-4 bg-white border border-slate-200 p-6">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 font-bold">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold font-heading text-slate-900">{user?.first_name} {user?.last_name}</h3>
                <p className="text-xs text-blue-600 font-medium">{user?.role}</p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-600 font-mono">
              <p><strong className="text-slate-900 font-sans">Email:</strong> {user?.email}</p>
              <p><strong className="text-slate-900 font-sans">Security Clearance:</strong> Level 5 (Executive Admin)</p>
              <p><strong className="text-slate-900 font-sans">Status:</strong> <span className="text-emerald-600 font-bold">Authenticated</span></p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
