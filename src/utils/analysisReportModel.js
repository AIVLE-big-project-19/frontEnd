const SAMPLE_REPORT = {
  address: '충청남도 홍성군 홍북읍 충남대로 21',
  score: 98,
  usableAreaM2: 850,
  utilizationRate: 82.5,
  capacityKw: 100,
  annualGenerationKwh: 135000,
  annualRevenue: 24000000,
  roiPercent: 12.4,
  paybackYears: 6.5,
  scores: { ml: 95, vision: 98, regulation: 100 },
  roof: {
    type: '평지붕',
    structure: '콘크리트 슬래브',
    slopeDegrees: 15,
    shadowRate: 17.5,
    shadowAreaM2: 150,
    moduleDirection: '정남향',
    installAngleDegrees: 30,
  },
};

const numberOr = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeRisk = (risk, fallback) => ({
  key: risk?.key || fallback.key,
  label: risk?.label || fallback.label,
  status: risk?.status || fallback.status,
  level: risk?.level || fallback.level,
  detail: risk?.detail || fallback.detail,
});

const defaultRisks = [
  { key: 'grid', label: '전력 계통 연계', status: '연계 가능', level: 'good', detail: '인근 변전소 계통 용량 여유 확인 완료' },
  { key: 'regulation', label: '인허가·이격거리', status: '제약 낮음', level: 'good', detail: '공공청사 옥상 설치로 이격거리 조례 대상 외' },
  { key: 'structure', label: '구조 안전', status: '현장 확인', level: 'check', detail: '100kW 패널 하중에 대한 구조안전진단 필요' },
];

const defaultActions = [
  { key: 'waterproof', title: '옥상 방수 상태 점검', detail: '시공 전 우수 방수층과 누수 이력을 확인하세요.' },
  { key: 'structure', title: '구조안전진단 의뢰', detail: '패널 하중을 반영한 건축물 안전진단이 필요합니다.' },
  { key: 'electric', title: '인입선로·분전반 확인', detail: '전기실 접속점까지의 배선 경로와 용량을 확인하세요.' },
];

const monthlyGenerationShape = [0.62, 0.7, 0.88, 1.02, 1.14, 1.2, 1.18, 1.08, 0.94, 0.82, 0.68, 0.6];

const buildMonthlyGeneration = (source, annualGenerationKwh) => {
  const apiMonthly = source.generationForecast?.monthly
    || source.monthlyGenerationKwh
    || source.monthlyGeneration;
  const parsedApiMonthly = Array.isArray(apiMonthly)
    ? apiMonthly.slice(0, 12).map((item) => numberOr(
      typeof item === 'object' ? item.generationKwh ?? item.value : item,
      0,
    ))
    : [];
  const hasCompleteApiSeries = parsedApiMonthly.length === 12 && parsedApiMonthly.some((value) => value > 0);
  const values = hasCompleteApiSeries
    ? parsedApiMonthly
    : monthlyGenerationShape.map((weight) => {
      const totalWeight = monthlyGenerationShape.reduce((sum, item) => sum + item, 0);
      return annualGenerationKwh * weight / totalWeight;
    });
  const maxValue = Math.max(...values, 1);

  return values.map((value, index) => ({
    month: index + 1,
    value: Math.round(value),
    heightPercent: Math.max(8, Math.round(value / maxValue * 100)),
  }));
};

export const buildAnalysisReportViewModel = ({
  analysis,
  address,
  areaM2,
  capacityKw,
}) => {
  const source = analysis || {};
  const hasAnalysis = Object.keys(source).length > 0;
  const scoreSource = source.scores || source.scoreDetails || {};
  const roofSource = source.roofAnalysis || source.visionAnalysis || {};
  const score = numberOr(source.suitabilityScore, SAMPLE_REPORT.score);
  const paybackYears = numberOr(source.paybackPeriodYears, SAMPLE_REPORT.paybackYears);
  const annualRevenue = numberOr(source.estimatedAnnualRevenue, SAMPLE_REPORT.annualRevenue);
  const annualGenerationKwh = numberOr(source.annualGenerationKwh, SAMPLE_REPORT.annualGenerationKwh);
  const installationCost = numberOr(source.estimatedInstallationCost, 0);
  const roiFromCost = installationCost > 0 ? annualRevenue / installationCost * 100 : null;
  const risks = Array.isArray(source.risks) && source.risks.length
    ? source.risks.slice(0, 3).map((risk, index) => normalizeRisk(risk, defaultRisks[index] || defaultRisks[2]))
    : defaultRisks;
  const actions = Array.isArray(source.checklist) && source.checklist.length
    ? source.checklist.slice(0, 3).map((item, index) => ({
      key: item.key || `action-${index}`,
      title: item.title || item.label,
      detail: item.detail || item.description || '',
    }))
    : defaultActions;

  return {
    source: hasAnalysis ? 'analysis' : 'sample',
    site: {
      address: address || source.address || SAMPLE_REPORT.address,
      totalAreaM2: numberOr(areaM2 || source.areaM2, 1200),
      usableAreaM2: numberOr(source.usableRoofAreaM2 ?? roofSource.usableAreaM2, SAMPLE_REPORT.usableAreaM2),
      utilizationRate: numberOr(source.roofUtilizationRate ?? roofSource.utilizationRate, SAMPLE_REPORT.utilizationRate),
    },
    decision: {
      score,
      grade: score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : 'D',
      label: score >= 80 ? '설치 권장' : score >= 70 ? '조건부 검토' : '재검토 필요',
      summary: score >= 80
        ? '수익성과 설치 여건이 양호합니다. 구조안전 확인 후 사업 추진을 권장합니다.'
        : '일부 조건을 보완한 뒤 사업 추진 여부를 다시 판단해야 합니다.',
    },
    economics: {
      capacityKw: numberOr(capacityKw || source.capacityKw, SAMPLE_REPORT.capacityKw),
      annualGenerationKwh,
      annualRevenue,
      roiPercent: numberOr(source.roiPercent ?? roiFromCost, SAMPLE_REPORT.roiPercent),
      paybackYears,
    },
    visuals: {
      monthlyGeneration: buildMonthlyGeneration(source, annualGenerationKwh),
      paybackScaleYears: Math.max(10, Math.ceil(paybackYears / 5) * 5),
      paybackMarkerPercent: Math.min(100, paybackYears / Math.max(10, Math.ceil(paybackYears / 5) * 5) * 100),
    },
    scores: [
      { key: 'ml', label: '입지·일사 조건', value: numberOr(scoreSource.ml ?? source.mlScore, SAMPLE_REPORT.scores.ml) },
      { key: 'vision', label: '옥상 설치 환경', value: numberOr(scoreSource.vision ?? source.visionScore, SAMPLE_REPORT.scores.vision) },
      { key: 'regulation', label: '규제·인허가', value: numberOr(scoreSource.regulation ?? source.regulationScore, SAMPLE_REPORT.scores.regulation) },
    ],
    risks,
    actions,
    roof: {
      type: roofSource.type || source.roofType || SAMPLE_REPORT.roof.type,
      structure: roofSource.structure || source.roofStructure || SAMPLE_REPORT.roof.structure,
      slopeDegrees: numberOr(roofSource.slopeDegrees ?? source.roofSlopeDegrees, SAMPLE_REPORT.roof.slopeDegrees),
      shadowRate: numberOr(roofSource.shadowRate ?? source.shadowRate, SAMPLE_REPORT.roof.shadowRate),
      shadowAreaM2: numberOr(roofSource.shadowAreaM2 ?? source.shadowAreaM2, SAMPLE_REPORT.roof.shadowAreaM2),
      moduleDirection: roofSource.moduleDirection || source.moduleDirection || SAMPLE_REPORT.roof.moduleDirection,
      installAngleDegrees: numberOr(roofSource.installAngleDegrees ?? source.installAngleDegrees, SAMPLE_REPORT.roof.installAngleDegrees),
    },
  };
};

export { SAMPLE_REPORT };
