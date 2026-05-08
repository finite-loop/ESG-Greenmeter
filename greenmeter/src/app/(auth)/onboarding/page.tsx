"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { WizardStepper } from "./WizardStepper";
import { CompanyProfileStep } from "./steps/CompanyProfile";
import { FrameworkSelectionStep } from "./steps/FrameworkSelection";
import { OrgHierarchyStep } from "./steps/OrgHierarchy";
import { FiscalYearSetupStep } from "./steps/FiscalYearSetup";
import type { CompanyProfile, FrameworkSelection, OrgNodeInput } from "@/schemas/onboarding";

const STEPS = [
  { label: "Company Profile", description: "Basic information" },
  { label: "Frameworks", description: "Reporting standards" },
  { label: "Organisation", description: "Org hierarchy" },
  { label: "Fiscal Year", description: "Reporting periods" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileData, setProfileData] = useState<CompanyProfile | undefined>();

  async function handleProfileSubmit(data: CompanyProfile) {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/onboarding/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || "Failed to save profile");
      }

      setProfileData(data);
      setCurrentStep(1);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleFrameworkSubmit(data: FrameworkSelection) {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/onboarding/frameworks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || "Failed to save frameworks");
      }

      setCurrentStep(2);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleOrgNodesSubmit(nodes: OrgNodeInput[]) {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/onboarding/org-nodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodes }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || "Failed to save org hierarchy");
      }

      setCurrentStep(3);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleFiscalYearSubmit(startMonth: number) {
    setIsSubmitting(true);
    try {
      // Save fiscal year and generate periods
      const fyRes = await fetch("/api/onboarding/fiscal-year", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startMonth }),
      });

      if (!fyRes.ok) {
        const err = await fyRes.json();
        throw new Error(err.error?.message || "Failed to save fiscal year");
      }

      // Mark onboarding as complete
      const completeRes = await fetch("/api/onboarding/complete", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });

      if (!completeRes.ok) {
        const err = await completeRes.json();
        throw new Error(err.error?.message || "Failed to complete onboarding");
      }

      router.push("/");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-lg rounded-xl border border-[var(--bdr)] bg-[var(--surf)] p-8">
      <h1 className="mb-1 text-lg font-bold text-[var(--tx1)] text-center">
        Welcome to GreenMeter AI
      </h1>
      <p className="mb-6 text-xs text-[var(--tx3)] text-center">
        Set up your organisation to get started with ESG reporting.
      </p>

      <WizardStepper
        steps={STEPS}
        currentStep={currentStep}
        onStepClick={(step) => {
          if (step < currentStep) setCurrentStep(step);
        }}
      />

      {currentStep === 0 && (
        <CompanyProfileStep
          defaultValues={profileData}
          onSubmit={handleProfileSubmit}
          isSubmitting={isSubmitting}
        />
      )}

      {currentStep === 1 && (
        <FrameworkSelectionStep
          onSubmit={handleFrameworkSubmit}
          onBack={() => setCurrentStep(0)}
          isSubmitting={isSubmitting}
        />
      )}

      {currentStep === 2 && (
        <OrgHierarchyStep
          onSubmit={handleOrgNodesSubmit}
          onBack={() => setCurrentStep(1)}
          isSubmitting={isSubmitting}
          companyName={profileData?.companyName}
        />
      )}

      {currentStep === 3 && (
        <FiscalYearSetupStep
          onSubmit={handleFiscalYearSubmit}
          onBack={() => setCurrentStep(2)}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}
