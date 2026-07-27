export const SITE_SORT_OPTIONS = [
  { value: 'suitabilityScore', label: '적합도', direction: 'desc' },
  { value: 'areaM2', label: '설치 가능 면적', direction: 'desc' },
  { value: 'annualGenerationKwh', label: '예상 발전량', direction: 'desc' },
  { value: 'estimatedInstallationCost', label: '설치비', direction: 'asc' },
  { value: 'estimatedAnnualRevenue', label: '예상 연 수익', direction: 'desc' },
  { value: 'paybackPeriodYears', label: '투자 회수기간', direction: 'asc' },
];

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

export const sortSiteAnalyses = (sites, sortKey, sortDirection = 'desc') => {
  const direction = sortDirection === 'asc' ? 1 : -1;

  return [...(sites || [])].sort((left, right) => {
    const leftValue = toNumber(left?.[sortKey]);
    const rightValue = toNumber(right?.[sortKey]);

    if (leftValue === null && rightValue === null) return 0;
    if (leftValue === null) return 1;
    if (rightValue === null) return -1;
    if (leftValue === rightValue) return String(left?.address || '').localeCompare(String(right?.address || ''));

    return (leftValue - rightValue) * direction;
  });
};
