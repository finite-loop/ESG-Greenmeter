import type ExcelJS from 'exceljs';

// ── Pillar inference ────────────────────────────────────────────

export function inferPillarBRSR(section: string): string {
  const s = section.trim();
  if (s.startsWith('P6')) return 'E';
  if (s.startsWith('P2')) return 'E';
  if (s.startsWith('P3') || s.startsWith('P4') || s.startsWith('P5') || s.startsWith('P8') || s.startsWith('P9')) return 'S';
  if (s.startsWith('A') || s.startsWith('B') || s.startsWith('P1') || s.startsWith('P7')) return 'G';
  return 'G';
}

export function inferPillarESRS(esrsStd: string): string {
  const s = esrsStd.trim().toUpperCase();
  if (/\bE[1-5]\b/.test(s)) return 'E';
  if (/\bS[1-4]\b/.test(s)) return 'S';
  return 'G';
}

export function inferPillarGRI(griSeries: string): string {
  const s = griSeries.trim();
  const num = parseInt(s.replace(/\D/g, ''), 10);
  if (num >= 300 && num < 400) return 'E';
  if (num >= 400 && num < 500) return 'S';
  if (num >= 200 && num < 300) return 'G';
  return 'G'; // GRI 2 (governance/general)
}

// ── Data type inference ─────────────────────────────────────────

export function inferDataType(unit: string): string {
  const u = unit.trim().toLowerCase();
  if (u === '%' || u.includes('%') || u.includes('percent')) return 'percentage';
  if (u === 'y/n') return 'yes_no';
  if (u === 'score' || u === 'rating') return 'rating';
  if (u === 'year' || u === 'wks') return 'number';
  return 'number';
}

// ── Direction inference ─────────────────────────────────────────

export function inferDirection(paramName: string, _unit: string): string {
  const lower = paramName.toLowerCase();
  // Higher is better
  if (lower.includes('renewable') || lower.includes('female') ||
      lower.includes('trained') || lower.includes('recycl') ||
      lower.includes('coverage') || lower.includes('revenue') ||
      lower.includes('independent') || lower.includes('collective bargaining') ||
      lower.includes('return on') || lower.includes('r&d') ||
      lower.includes('csr spend') || lower.includes('green') ||
      lower.includes('board oversight') || lower.includes('transition plan') ||
      lower.includes('esg policy') || lower.includes('sustainability') ||
      lower.includes('(y/n)')) {
    return 'higher_is_better';
  }
  // Lower is better
  if (lower.includes('emission') || lower.includes('ghg') ||
      lower.includes('waste') || lower.includes('fatality') || lower.includes('fatal') ||
      lower.includes('injury') || lower.includes('incident') ||
      lower.includes('violation') || lower.includes('complaint') ||
      lower.includes('turnover') || lower.includes('spill') ||
      lower.includes('consumption') || lower.includes('intensity') ||
      lower.includes('fossil') || lower.includes('pollution') ||
      lower.includes('water withdrawal') || lower.includes('hazardous')) {
    return 'lower_is_better';
  }
  return 'lower_is_better'; // default
}

// ── Category inference ──────────────────────────────────────────

export function inferCategoryBRSR(section: string, disclosure: string): string {
  const s = section.trim();
  if (s.startsWith('P6')) return 'Environment';
  if (s.startsWith('P3')) return 'Workforce';
  if (s.startsWith('P4')) return 'Stakeholders';
  if (s.startsWith('P5')) return 'Human Rights';
  if (s.startsWith('P8')) return 'Inclusion';
  if (s.startsWith('P9')) return 'Consumer';
  if (s.startsWith('P1')) return 'Ethics';
  if (s.startsWith('P2')) return 'Sustainability';
  if (s.startsWith('P7')) return 'Policy';
  if (s.startsWith('B')) return 'Management';
  return disclosure || 'General';
}

// ── Code generation ─────────────────────────────────────────────

export function generateCode(standard: string, pillar: string, paramName: string): string {
  const slug = paramName
    .replace(/[^A-Za-z0-9 ]/g, '')
    .trim()
    .split(/\s+/)
    .join('_')
    .toUpperCase()
    .substring(0, 40);
  return `${standard}-${pillar}-${slug}`;
}

// ── Indicator type inference ────────────────────────────────────

export function inferIndicatorType(section: string, standard: string): string {
  if (standard === 'BRSR') {
    const s = section.trim();
    if (s.startsWith('A') || s.startsWith('B')) return 'essential';
    if (s.startsWith('P')) return 'leadership';
  }
  if (standard === 'ESRS') return 'mandatory';
  if (standard === 'GRI') return 'voluntary';
  return 'voluntary';
}

// ── Cell value extraction ───────────────────────────────────────

export function cellStr(cell: ExcelJS.CellValue): string {
  if (cell == null) return '';
  if (typeof cell === 'object' && 'richText' in cell) {
    return cell.richText.map((part) => part.text).join('').trim();
  }
  return String(cell).trim();
}

export function isSectionHeader(firstCell: string): boolean {
  return firstCell.startsWith('\u25B6') || // ▶
    firstCell.startsWith('Reference Revenue') ||
    firstCell.startsWith('VENDOR') ||
    firstCell.startsWith('SUPPLIER');
}
