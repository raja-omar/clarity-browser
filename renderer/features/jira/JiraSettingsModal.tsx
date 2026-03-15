import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AlertCircle, CheckCircle2, Loader2, X } from "lucide-react";

interface JiraSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSyncComplete: () => void;
}

const DEFAULT_JQL =
  "assignee = currentUser() AND sprint in openSprints() ORDER BY priority DESC";

export function JiraSettingsModal({
  open,
  onOpenChange,
  onSyncComplete,
}: JiraSettingsModalProps) {
  const [domain, setDomain] = useState("");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [jql, setJql] = useState(DEFAULT_JQL);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    setTestResult(null);
    if (!window.clarity?.getJiraSettings) return;

    void window.clarity.getJiraSettings().then((settings) => {
      if (!settings) return;
      setDomain(settings.domain);
      setEmail(settings.email);
      setJql(settings.jql);
    });
  }, [open]);

  async function handleSave() {
    if (!domain || !email || !token || !window.clarity?.saveJiraSettings) return;
    setSaving(true);
    try {
      await window.clarity.saveJiraSettings({ domain, email, token, jql });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleTestConnection() {
    if (!domain || !email || !token || !window.clarity?.saveJiraSettings || !window.clarity?.syncJira) {
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      await window.clarity.saveJiraSettings({ domain, email, token, jql });
      const tasks = await window.clarity.syncJira();
      const jiraCount = tasks.filter((task) => task.source === "jira").length;
      setTestResult({ ok: true, message: `Connected - ${jiraCount} Jira issues found` });
      onSyncComplete();
    } catch (error) {
      setTestResult({
        ok: false,
        message: error instanceof Error ? error.message : "Connection failed",
      });
    } finally {
      setTesting(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[440px] max-w-[90vw] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-slate-900/95 p-6 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-base font-semibold text-white">
              Jira Integration
            </Dialog.Title>
            <Dialog.Close className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="mt-1 text-xs text-slate-400">
            Connect Atlassian so your task list uses live Jira tickets.
          </Dialog.Description>

          <div className="mt-5 space-y-4">
            <Field
              label="Jira Domain"
              placeholder="your-team"
              suffix=".atlassian.net"
              value={domain}
              onChange={setDomain}
            />
            <Field
              label="Email"
              placeholder="you@company.com"
              value={email}
              onChange={setEmail}
              type="email"
            />
            <Field
              label="API Token"
              placeholder="Paste your Atlassian API token"
              value={token}
              onChange={setToken}
              type="password"
            />
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-300">JQL Query</label>
              <textarea
                value={jql}
                onChange={(event) => setJql(event.target.value)}
                rows={2}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-indigo-400/40 focus:ring-1 focus:ring-indigo-400/20"
              />
            </div>
            {testResult && (
              <div
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
                  testResult.ok
                    ? "border border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                    : "border border-red-400/20 bg-red-500/10 text-red-200"
                }`}
              >
                {testResult.ok ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                )}
                {testResult.message}
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => void handleTestConnection()}
              disabled={testing || !domain || !email || !token}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-200 transition hover:bg-white/10 disabled:pointer-events-none disabled:opacity-40"
            >
              {testing ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Testing...
                </span>
              ) : (
                "Test Connection"
              )}
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || !domain || !email || !token}
              className="rounded-lg bg-indigo-500/20 px-4 py-2 text-xs font-medium text-indigo-200 transition hover:bg-indigo-500/30 disabled:pointer-events-none disabled:opacity-40"
            >
              {saving ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Saving...
                </span>
              ) : (
                "Save Settings"
              )}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Field({
  label,
  placeholder,
  suffix,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  placeholder: string;
  suffix?: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-300">{label}</label>
      <div className="flex items-center gap-0">
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-indigo-400/40 focus:ring-1 focus:ring-indigo-400/20 ${suffix ? "rounded-r-none border-r-0" : ""}`}
        />
        {suffix ? (
          <span className="whitespace-nowrap rounded-r-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-500">
            {suffix}
          </span>
        ) : null}
      </div>
    </div>
  );
}
