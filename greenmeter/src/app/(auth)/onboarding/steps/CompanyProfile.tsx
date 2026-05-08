"use client";

import { useState, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Upload, X } from "lucide-react";
import {
  companyProfileSchema,
  type CompanyProfile as CompanyProfileData,
  SECTORS,
  CURRENCIES,
} from "@/schemas/onboarding";

const COUNTRIES = [
  "India",
  "United States",
  "United Kingdom",
  "Germany",
  "France",
  "Singapore",
  "Australia",
  "Canada",
  "Japan",
  "Brazil",
  "South Africa",
  "United Arab Emirates",
] as const;

const ALLOWED_LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2 MB

interface CompanyProfileProps {
  defaultValues?: Partial<CompanyProfileData>;
  onSubmit: (data: CompanyProfileData) => void;
  isSubmitting?: boolean;
}

export function CompanyProfileStep({
  defaultValues,
  onSubmit,
  isSubmitting,
}: CompanyProfileProps) {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CompanyProfileData>({
    resolver: zodResolver(companyProfileSchema),
    defaultValues: {
      companyName: "",
      country: "India",
      currency: "INR",
      ...defaultValues,
    },
  });

  function handleLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setLogoError(null);

    if (!file) return;

    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      setLogoError("Invalid file type. Use PNG, JPEG, WebP, or SVG.");
      return;
    }

    if (file.size > MAX_LOGO_SIZE) {
      setLogoError("File size exceeds 2 MB limit.");
      return;
    }

    setLogoFile(file);
    const objectUrl = URL.createObjectURL(file);
    setLogoPreview(objectUrl);
  }

  function handleLogoRemove() {
    setLogoFile(null);
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(null);
    setLogoError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function uploadLogo(): Promise<void> {
    if (!logoFile) return;

    setIsUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("logo", logoFile);

      const res = await fetch("/api/onboarding/logo", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || "Failed to upload logo");
      }
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : "Logo upload failed");
      throw err;
    } finally {
      setIsUploadingLogo(false);
    }
  }

  async function handleFormSubmit(data: CompanyProfileData) {
    if (logoFile) {
      await uploadLogo();
    }
    onSubmit(data);
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <Input
        id="companyName"
        label="Company Name"
        placeholder="Enter your company name"
        error={errors.companyName?.message}
        {...register("companyName")}
      />

      <div className="mb-[13px]">
        <label className="block text-[11px] font-semibold text-[var(--tx2)] mb-[5px]">
          Company Logo
          <span className="font-normal text-[var(--tx3)] ml-1">(optional)</span>
        </label>

        {logoPreview ? (
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg border border-[var(--bdr)] bg-[var(--bg)] flex items-center justify-center overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoPreview}
                alt="Logo preview"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[var(--tx1)] truncate">{logoFile?.name}</p>
              <p className="text-[10px] text-[var(--tx3)]">
                {logoFile ? `${(logoFile.size / 1024).toFixed(1)} KB` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogoRemove}
              className="rounded-md p-1 text-[var(--tx3)] hover:text-[var(--red)] hover:bg-[var(--bg)] transition-colors"
              aria-label="Remove logo"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 rounded-[7px] border border-dashed border-[var(--bdr)] bg-[var(--bg)] px-4 py-3 text-xs text-[var(--tx3)] hover:border-[var(--t500)] hover:text-[var(--t700)] transition-colors"
          >
            <Upload className="h-3.5 w-3.5" />
            Upload logo (PNG, JPEG, WebP, SVG — max 2 MB)
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.webp,.svg"
          onChange={handleLogoSelect}
          className="hidden"
          aria-label="Logo file input"
        />
        {logoError && (
          <p className="text-[10px] text-[var(--red)] mt-1">{logoError}</p>
        )}
      </div>

      <div className="mb-[13px]">
        <label className="block text-[11px] font-semibold text-[var(--tx2)] mb-[5px]">
          Sector
        </label>
        <Controller
          name="sector"
          control={control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger>
                <SelectValue placeholder="Select sector" />
              </SelectTrigger>
              <SelectContent>
                {SECTORS.map((sector) => (
                  <SelectItem key={sector} value={sector}>
                    {sector}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.sector && (
          <p className="text-[10px] text-[var(--red)] mt-1">{errors.sector.message}</p>
        )}
      </div>

      <div className="mb-[13px]">
        <label className="block text-[11px] font-semibold text-[var(--tx2)] mb-[5px]">
          Country
        </label>
        <Controller
          name="country"
          control={control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger>
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((country) => (
                  <SelectItem key={country} value={country}>
                    {country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.country && (
          <p className="text-[10px] text-[var(--red)] mt-1">{errors.country.message}</p>
        )}
      </div>

      <div className="mb-[13px]">
        <label className="block text-[11px] font-semibold text-[var(--tx2)] mb-[5px]">
          Base Currency
        </label>
        <Controller
          name="currency"
          control={control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger>
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((currency) => (
                  <SelectItem key={currency} value={currency}>
                    {currency}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.currency && (
          <p className="text-[10px] text-[var(--red)] mt-1">{errors.currency.message}</p>
        )}
      </div>

      <div className="pt-2">
        <Button
          type="submit"
          size="lg"
          className="w-full justify-center"
          loading={isSubmitting || isUploadingLogo}
        >
          Continue
        </Button>
      </div>
    </form>
  );
}
