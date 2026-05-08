"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
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
import { SupplierScorecard } from "./SupplierScorecard";
import type { SupplierDetail, UpsertAssessmentInput } from "@/hooks/useSuppliers";

interface SupplierDetailPanelProps {
  supplier: SupplierDetail;
  onClose: () => void;
  onUpsertAssessment: (supplierId: string, input: UpsertAssessmentInput) => void;
  isAssessmentLoading: boolean;
  onGeneratePortalLink?: (supplierId: string) => void;
  isPortalLinkLoading?: boolean;
}

export function SupplierDetailPanel({
  supplier,
  onClose,
  onUpsertAssessment,
  isAssessmentLoading,
  onGeneratePortalLink,
  isPortalLinkLoading,
}: SupplierDetailPanelProps) {
  const [showAssessmentForm, setShowAssessmentForm] = useState(false);
  const [fiscalYear, setFiscalYear] = useState("");
  const [envScore, setEnvScore] = useState("");
  const [socialScore, setSocialScore] = useState("");
  const [govScore, setGovScore] = useState("");
  const [scope3, setScope3] = useState("");

  const handleSubmitAssessment = () => {
    const input: UpsertAssessmentInput = {
      fiscalYear,
      ...(envScore ? { environmentalScore: parseFloat(envScore) } : {}),
      ...(socialScore ? { socialScore: parseFloat(socialScore) } : {}),
      ...(govScore ? { governanceScore: parseFloat(govScore) } : {}),
      ...(scope3 ? { scope3Contribution: parseFloat(scope3) } : {}),
    };

    onUpsertAssessment(supplier.supplierId, input);
    setShowAssessmentForm(false);
    setFiscalYear("");
    setEnvScore("");
    setSocialScore("");
    setGovScore("");
    setScope3("");
  };

  const riskVariant =
    supplier.riskLevel === "low"
      ? "success"
      : supplier.riskLevel === "medium"
        ? "warning"
        : supplier.riskLevel === "high" || supplier.riskLevel === "critical"
          ? "error"
          : "neutral";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[var(--tx1)]">{supplier.name}</h2>
          <p className="text-[11px] text-[var(--tx3)]">
            {supplier.sector ?? "No sector"} &middot; {supplier.country ?? "No country"} &middot;{" "}
            {supplier.category ?? "Uncategorized"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={riskVariant as "success" | "warning" | "error" | "neutral"}>
            {supplier.riskLevel
              ? supplier.riskLevel.charAt(0).toUpperCase() + supplier.riskLevel.slice(1) + " Risk"
              : "Unassessed"}
          </Badge>
          {onGeneratePortalLink && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onGeneratePortalLink(supplier.supplierId)}
              loading={isPortalLinkLoading}
            >
              Portal Link
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {/* Contact info */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[var(--tx3)]">Contact Name</span>
              <p className="font-medium">{supplier.contactName ?? "-"}</p>
            </div>
            <div>
              <span className="text-[var(--tx3)]">Contact Email</span>
              <p className="font-medium">{supplier.contactEmail ?? "-"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scorecard */}
      <SupplierScorecard scorecard={supplier.scorecard} supplierName={supplier.name} />

      {/* Assessment history */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Assessment History</CardTitle>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowAssessmentForm(true)}
          >
            + Assessment
          </Button>
        </CardHeader>
        <CardContent>
          {supplier.assessments.length === 0 ? (
            <p className="text-xs text-[var(--tx3)]">No assessments yet.</p>
          ) : (
            <div className="space-y-2">
              {supplier.assessments.map((a) => (
                <div
                  key={a.assessmentId}
                  className="flex items-center justify-between py-2 border-b border-[var(--bdr2)] last:border-0"
                >
                  <div>
                    <span className="text-xs font-medium">{a.fiscalYear}</span>
                    <div className="flex gap-3 mt-0.5 text-[10px] text-[var(--tx3)]">
                      <span>
                        E: {a.environmentalScore ?? "N/A"}
                      </span>
                      <span>
                        S: {a.socialScore ?? "N/A"}
                      </span>
                      <span>
                        G: {a.governanceScore ?? "N/A"}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold font-[var(--fm)]">
                      {a.overallScore ?? "-"}
                    </span>
                    <div className="text-[10px] text-[var(--tx3)]">
                      {a.surveyStatus ?? "pending"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assessment form modal */}
      <Modal open={showAssessmentForm} onOpenChange={setShowAssessmentForm}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>New Assessment</ModalTitle>
            <ModalDescription>
              Enter ESG assessment scores for {supplier.name}
            </ModalDescription>
          </ModalHeader>
          <div className="space-y-1">
            <Input
              label="Fiscal Year"
              id="fiscalYear"
              placeholder="e.g., FY2025-26"
              value={fiscalYear}
              onChange={(e) => setFiscalYear(e.target.value)}
            />
            <Input
              label="Environmental Score (0-100)"
              id="envScore"
              type="number"
              min="0"
              max="100"
              value={envScore}
              onChange={(e) => setEnvScore(e.target.value)}
            />
            <Input
              label="Social Score (0-100)"
              id="socialScore"
              type="number"
              min="0"
              max="100"
              value={socialScore}
              onChange={(e) => setSocialScore(e.target.value)}
            />
            <Input
              label="Governance Score (0-100)"
              id="govScore"
              type="number"
              min="0"
              max="100"
              value={govScore}
              onChange={(e) => setGovScore(e.target.value)}
            />
            <Input
              label="Scope 3 Contribution (tCO2e)"
              id="scope3"
              type="number"
              min="0"
              value={scope3}
              onChange={(e) => setScope3(e.target.value)}
            />
          </div>
          <ModalFooter>
            <Button
              variant="secondary"
              onClick={() => setShowAssessmentForm(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitAssessment}
              disabled={!fiscalYear}
              loading={isAssessmentLoading}
            >
              Save Assessment
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
