"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from "@/components/ui/Modal";

interface IntegrationConfig {
  configId: string;
  integrationType: string;
  label: string;
  endpoint: string;
  authKeyMasked: string;
  scheduleCron: string;
  enabled: boolean;
  configured: true;
  updatedAt: string;
}

interface UnconfiguredIntegration {
  integrationType: string;
  label: string;
  configured: false;
}

type IntegrationEntry = IntegrationConfig | UnconfiguredIntegration;

const INTEGRATION_DESCRIPTIONS: Record<string, string> = {
  sap: "Sync KPI data from SAP ERP systems",
  darwinbox: "Import HR metrics from Darwinbox HRMS",
  llm: "Configure LLM provider for document extraction and AI features",
};

const INTEGRATION_ICONS: Record<string, string> = {
  sap: "\u{1F3ED}",
  darwinbox: "\u{1F465}",
  llm: "\u{1F916}",
};

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<IntegrationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editType, setEditType] = useState<string | null>(null);

  // Form state
  const [formEndpoint, setFormEndpoint] = useState("");
  const [formAuthKey, setFormAuthKey] = useState("");
  const [formSchedule, setFormSchedule] = useState("0 2 * * *");
  const [formEnabled, setFormEnabled] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSaving, setFormSaving] = useState(false);

  // Test connection state
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    latencyMs?: number;
  } | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  const fetchIntegrations = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/config/integrations");

      if (res.status === 401 || res.status === 403) {
        setUnauthorized(true);
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error?.message ?? "Failed to load integrations");
        return;
      }

      const json = await res.json();
      setIntegrations(json.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch integrations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  function openConfigModal(integrationType: string, existing?: IntegrationConfig) {
    setEditType(integrationType);
    setFormEndpoint(existing?.endpoint ?? "");
    setFormAuthKey("");
    setFormSchedule(existing?.scheduleCron ?? "0 2 * * *");
    setFormEnabled(existing?.enabled ?? true);
    setFormError(null);
    setTestResult(null);
    setModalOpen(true);
  }

  async function handleTestConnection() {
    if (!formEndpoint || !formAuthKey) {
      setTestResult({ success: false, message: "Endpoint and auth key are required" });
      return;
    }

    setTestLoading(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/config/integrations/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          integrationType: editType,
          endpoint: formEndpoint,
          authKey: formAuthKey,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        setTestResult(json.data);
      } else {
        setTestResult({ success: false, message: json.error?.message ?? "Test failed" });
      }
    } catch (err: unknown) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : "Connection test failed",
      });
    } finally {
      setTestLoading(false);
    }
  }

  async function handleSave() {
    if (!editType) return;

    setFormSaving(true);
    setFormError(null);

    try {
      const res = await fetch("/api/config/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          integrationType: editType,
          endpoint: formEndpoint,
          authKey: formAuthKey,
          scheduleCron: formSchedule,
          enabled: formEnabled,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setFormError(json?.error?.message ?? "Failed to save configuration");
        return;
      }

      setModalOpen(false);
      await fetchIntegrations();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setFormSaving(false);
    }
  }

  if (unauthorized) {
    return (
      <div>
        <PageHeader title="Integrations" description="Manage external system connections" />
        <div className="p-4 rounded-lg bg-[var(--redbg)] text-[var(--redtx)] text-xs">
          You do not have permission to view this page. Admin access required.
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Integrations"
        description="Configure external system connections for automated data sync"
      />

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-[var(--redbg)] text-[var(--redtx)] text-xs">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-[var(--tx3)] text-xs">Loading integrations...</div>
      ) : (
        <div className="grid gap-4">
          {integrations.map((integration) => {
            const type = integration.integrationType;
            const configured = integration.configured;

            return (
              <Card key={type}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{INTEGRATION_ICONS[type] ?? "\u{1F517}"}</span>
                    <div>
                      <CardTitle>
                        {configured ? (integration as IntegrationConfig).label ?? type.toUpperCase() : integration.label}
                      </CardTitle>
                      <p className="text-[10px] text-[var(--tx3)] mt-0.5">
                        {INTEGRATION_DESCRIPTIONS[type] ?? "External integration"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {configured ? (
                      <>
                        <Badge variant={(integration as IntegrationConfig).enabled ? "success" : "neutral"}>
                          {(integration as IntegrationConfig).enabled ? "Active" : "Disabled"}
                        </Badge>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openConfigModal(type, integration as IntegrationConfig)}
                        >
                          Edit
                        </Button>
                      </>
                    ) : (
                      <>
                        <Badge variant="neutral">Not Configured</Badge>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => openConfigModal(type)}
                        >
                          Configure
                        </Button>
                      </>
                    )}
                  </div>
                </CardHeader>

                {configured && (
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-xs">
                      <div>
                        <span className="text-[var(--tx3)] text-[10px] block mb-0.5">Endpoint</span>
                        <span className="text-[var(--tx1)] font-mono text-[11px] break-all">
                          {(integration as IntegrationConfig).endpoint}
                        </span>
                      </div>
                      <div>
                        <span className="text-[var(--tx3)] text-[10px] block mb-0.5">API Key</span>
                        <span className="text-[var(--tx1)] font-mono text-[11px]">
                          {(integration as IntegrationConfig).authKeyMasked}
                        </span>
                      </div>
                      <div>
                        <span className="text-[var(--tx3)] text-[10px] block mb-0.5">Schedule</span>
                        <span className="text-[var(--tx1)] font-mono text-[11px]">
                          {(integration as IntegrationConfig).scheduleCron}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                )}

                {configured && (
                  <CardFooter>
                    <span className="text-[10px] text-[var(--tx3)]">
                      Last updated: {new Date((integration as IntegrationConfig).updatedAt).toLocaleString()}
                    </span>
                  </CardFooter>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Configuration Modal */}
      <Modal open={modalOpen} onOpenChange={setModalOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>
              {editType ? `Configure ${editType.toUpperCase()} Integration` : "Configure Integration"}
            </ModalTitle>
            <ModalDescription>
              Enter the connection details for this integration. Credentials are encrypted at rest.
            </ModalDescription>
          </ModalHeader>

          <div className="space-y-0">
            <Input
              label="API Endpoint"
              id="endpoint"
              type="url"
              placeholder="https://api.example.com"
              value={formEndpoint}
              onChange={(e) => setFormEndpoint(e.target.value)}
            />

            <Input
              label="API Key / Auth Token"
              id="authKey"
              type="password"
              placeholder="Enter API key"
              value={formAuthKey}
              onChange={(e) => setFormAuthKey(e.target.value)}
            />

            <Input
              label="Sync Schedule (Cron)"
              id="schedule"
              placeholder="0 2 * * *"
              value={formSchedule}
              onChange={(e) => setFormSchedule(e.target.value)}
            />
            <p className="text-[10px] text-[var(--tx3)] -mt-2 mb-3">
              Standard cron format. Example: &quot;0 2 * * *&quot; runs daily at 2:00 AM
            </p>

            <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                id="enabled"
                checked={formEnabled}
                onChange={(e) => setFormEnabled(e.target.checked)}
                className="w-3.5 h-3.5 accent-[var(--t700)]"
              />
              <label htmlFor="enabled" className="text-xs text-[var(--tx1)]">
                Enable this integration
              </label>
            </div>
          </div>

          {/* Test Connection */}
          <div className="mb-4">
            <Button
              variant="secondary"
              size="sm"
              loading={testLoading}
              onClick={handleTestConnection}
              disabled={!formEndpoint || !formAuthKey}
            >
              Test Connection
            </Button>

            {testResult && (
              <div
                className={`mt-2 p-2 rounded text-[11px] ${
                  testResult.success
                    ? "bg-[var(--grnbg)] text-[var(--grntx)]"
                    : "bg-[var(--redbg)] text-[var(--redtx)]"
                }`}
              >
                {testResult.message}
                {testResult.latencyMs != null && (
                  <span className="ml-2 opacity-70">({testResult.latencyMs}ms)</span>
                )}
              </div>
            )}
          </div>

          {formError && (
            <div className="p-2 rounded bg-[var(--redbg)] text-[var(--redtx)] text-xs mb-4">
              {formError}
            </div>
          )}

          <ModalFooter>
            <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={formSaving}
              onClick={handleSave}
              disabled={!formEndpoint || !formAuthKey || !formSchedule}
            >
              Save Configuration
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
