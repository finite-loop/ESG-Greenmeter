'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';

interface PortalSupplier {
  supplierId: string;
  supplierName: string;
}

type PortalState =
  | { status: 'loading' }
  | { status: 'invalid' }
  | { status: 'ready'; supplier: PortalSupplier }
  | { status: 'submitting' }
  | { status: 'submitted'; assessmentId: string }
  | { status: 'error'; message: string };

export default function SupplierPortalPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [state, setState] = useState<PortalState>({ status: 'loading' });
  const [fiscalYear, setFiscalYear] = useState('');
  const [scope3Contribution, setScope3Contribution] = useState('');
  const [environmentalScore, setEnvironmentalScore] = useState('');
  const [socialScore, setSocialScore] = useState('');
  const [governanceScore, setGovernanceScore] = useState('');

  useEffect(() => {
    async function validate() {
      try {
        const res = await fetch('/api/supply-chain/portal/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        if (!res.ok) {
          setState({ status: 'invalid' });
          return;
        }

        const json = await res.json();
        setState({ status: 'ready', supplier: json.data });
      } catch {
        setState({ status: 'error', message: 'Unable to validate portal link. Please try again.' });
      }
    }

    if (token) {
      validate();
    }
  }, [token]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const scope3Num = parseFloat(scope3Contribution);
      if (!fiscalYear.trim() || Number.isNaN(scope3Num) || scope3Num < 0) {
        setState({ status: 'error', message: 'Please fill in fiscal year and Scope 3 contribution.' });
        return;
      }

      setState({ status: 'submitting' });

      const payload: Record<string, unknown> = {
        token,
        fiscalYear: fiscalYear.trim(),
        scope3Contribution: scope3Num,
      };

      const envNum = parseFloat(environmentalScore);
      if (!Number.isNaN(envNum)) payload.environmentalScore = envNum;

      const socNum = parseFloat(socialScore);
      if (!Number.isNaN(socNum)) payload.socialScore = socNum;

      const govNum = parseFloat(governanceScore);
      if (!Number.isNaN(govNum)) payload.governanceScore = govNum;

      try {
        const res = await fetch('/api/supply-chain/portal/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setState({
            status: 'error',
            message: body?.error?.message ?? 'Submission failed. Please try again.',
          });
          return;
        }

        const json = await res.json();
        setState({ status: 'submitted', assessmentId: json.data.assessmentId });
      } catch {
        setState({ status: 'error', message: 'Network error. Please try again.' });
      }
    },
    [token, fiscalYear, scope3Contribution, environmentalScore, socialScore, governanceScore]
  );

  if (state.status === 'loading') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.spinner} />
          <p style={styles.text}>Validating portal link...</p>
        </div>
      </div>
    );
  }

  if (state.status === 'invalid') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.heading}>Invalid Portal Link</h1>
          <p style={styles.text}>
            This link is invalid or has expired. Please contact the requesting organisation for a new link.
          </p>
        </div>
      </div>
    );
  }

  if (state.status === 'submitted') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.successIcon}>&#10003;</div>
          <h1 style={styles.heading}>Submission Received</h1>
          <p style={styles.text}>
            Thank you! Your emissions data has been submitted and is pending verification.
          </p>
          <p style={styles.subtext}>Reference: {state.assessmentId}</p>
        </div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.heading}>Error</h1>
          <p style={styles.errorText}>{state.message}</p>
          <button
            style={styles.button}
            onClick={() => setState({ status: 'loading' })}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const supplier = state.status === 'ready' ? state.supplier : null;
  const isSubmitting = state.status === 'submitting';

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logoArea}>
          <h1 style={styles.brandTitle}>GreenMeter AI</h1>
          <p style={styles.brandSub}>Supplier Emissions Portal</p>
        </div>

        <div style={styles.welcomeBox}>
          <p style={styles.welcomeText}>
            Welcome, <strong>{supplier?.supplierName}</strong>
          </p>
          <p style={styles.subtext}>
            Please provide your emissions data for the requested fiscal year.
            All fields marked with * are required.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.fieldGroup}>
            <label style={styles.label} htmlFor="fiscalYear">
              Fiscal Year *
            </label>
            <input
              id="fiscalYear"
              type="text"
              style={styles.input}
              placeholder="e.g., FY2025-26"
              value={fiscalYear}
              onChange={(e) => setFiscalYear(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label} htmlFor="scope3">
              Scope 3 Cat 1 Emissions (tCO2e) *
            </label>
            <input
              id="scope3"
              type="number"
              min="0"
              step="0.01"
              style={styles.input}
              placeholder="e.g., 28400"
              value={scope3Contribution}
              onChange={(e) => setScope3Contribution(e.target.value)}
              required
              disabled={isSubmitting}
            />
            <p style={styles.hint}>
              Total greenhouse gas emissions in tonnes of CO2 equivalent
            </p>
          </div>

          <div style={styles.divider} />
          <p style={styles.sectionTitle}>ESG Scores (Optional)</p>

          <div style={styles.scoreRow}>
            <div style={styles.fieldGroup}>
              <label style={styles.label} htmlFor="envScore">
                Environmental (0–100)
              </label>
              <input
                id="envScore"
                type="number"
                min="0"
                max="100"
                step="0.1"
                style={styles.input}
                placeholder="e.g., 75"
                value={environmentalScore}
                onChange={(e) => setEnvironmentalScore(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label} htmlFor="socScore">
                Social (0–100)
              </label>
              <input
                id="socScore"
                type="number"
                min="0"
                max="100"
                step="0.1"
                style={styles.input}
                placeholder="e.g., 68"
                value={socialScore}
                onChange={(e) => setSocialScore(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label} htmlFor="govScore">
                Governance (0–100)
              </label>
              <input
                id="govScore"
                type="number"
                min="0"
                max="100"
                step="0.1"
                style={styles.input}
                placeholder="e.g., 80"
                value={governanceScore}
                onChange={(e) => setGovernanceScore(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <button
            type="submit"
            style={{
              ...styles.submitButton,
              ...(isSubmitting ? styles.submitButtonDisabled : {}),
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Emissions Data'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f0f4f8',
    padding: 24,
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  card: {
    background: '#fff',
    borderRadius: 12,
    padding: 32,
    maxWidth: 560,
    width: '100%',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
  },
  logoArea: {
    textAlign: 'center',
    marginBottom: 24,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: '#0d9488',
    margin: 0,
  },
  brandSub: {
    fontSize: 13,
    color: '#64748b',
    margin: '4px 0 0',
  },
  welcomeBox: {
    background: '#f0fdfa',
    border: '1px solid #99f6e4',
    borderRadius: 8,
    padding: '12px 16px',
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 14,
    color: '#134e4a',
    margin: 0,
  },
  heading: {
    fontSize: 20,
    fontWeight: 700,
    color: '#1e293b',
    textAlign: 'center',
    margin: '0 0 12px',
  },
  text: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    margin: 0,
  },
  subtext: {
    fontSize: 12,
    color: '#94a3b8',
    margin: '8px 0 0',
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
    textAlign: 'center',
    margin: '0 0 16px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: '#475569',
  },
  input: {
    padding: '8px 12px',
    borderRadius: 6,
    border: '1px solid #cbd5e1',
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.15s',
  },
  hint: {
    fontSize: 11,
    color: '#94a3b8',
    margin: 0,
  },
  divider: {
    height: 1,
    background: '#e2e8f0',
    margin: '4px 0',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#64748b',
    margin: 0,
  },
  scoreRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: 12,
  },
  submitButton: {
    padding: '10px 24px',
    borderRadius: 8,
    border: 'none',
    background: '#0d9488',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 8,
    transition: 'background-color 0.15s',
  },
  submitButtonDisabled: {
    background: '#94a3b8',
    cursor: 'not-allowed',
  },
  button: {
    padding: '8px 20px',
    borderRadius: 8,
    border: 'none',
    background: '#0d9488',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'block',
    margin: '0 auto',
  },
  spinner: {
    width: 32,
    height: 32,
    border: '3px solid #e2e8f0',
    borderTopColor: '#0d9488',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    margin: '0 auto 12px',
  },
  successIcon: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    background: '#10b981',
    color: '#fff',
    fontSize: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 12px',
  },
};
