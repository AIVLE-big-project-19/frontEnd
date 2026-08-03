const toNumberOrNull = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeRisk = (risk, index) => ({
  key: risk?.key || `risk-${index}`,
  label: risk?.label || '확인 필요',
  status: risk?.status || '-',
  level: risk?.level || 'check',
  detail: risk?.detail || '',
});

const monthlyGenerationShape = [0.62, 0.7, 0.88, 1.02, 1.14, 1.2, 1.18, 1.08, 0.94, 0.82, 0.68, 0.6];

const buildMonthlyGeneration = (source, annualGenerationKwh) => {
  const apiMonthly = source.generationForecast?.monthly
    || source.monthlyGenerationKwh
    || source.monthlyGeneration;
  const parsedApiMonthly = Array.isArray(apiMonthly)
    ? apiMonthly.slice(0, 12).map((item) => toNumberOrNull(
      typeof item === 'object' ? item.generationKwh ?? item.value : item,
    ) ?? 0)
    : [];
  const hasCompleteApiSeries = parsedApiMonthly.length === 12 && parsedApiMonthly.some((value) => value > 0);
  const values = hasCompleteApiSeries
    ? parsedApiMonthly
    : monthlyGenerationShape.map((weight) => {
      if (annualGenerationKwh === null) return 0;
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
  const generationForecast = source.generationForecast || null;
  const score = toNumberOrNull(source.suitabilityScore);
  const paybackYears = toNumberOrNull(source.paybackPeriodYears);
  const annualRevenue = toNumberOrNull(source.estimatedAnnualRevenue);
  const annualGenerationKwh = toNumberOrNull(
    generationForecast?.annualGenerationKwh ?? source.annualGenerationKwh,
  );
  const installationCost = toNumberOrNull(source.estimatedInstallationCost);
  const roiFromCost = installationCost > 0 ? annualRevenue / installationCost * 100 : null;
  const resolvedCapacityKw = toNumberOrNull(hasAnalysis ? source.capacityKw : capacityKw);
  const roiPercent = toNumberOrNull(source.roiPercent ?? roiFromCost);
  const risks = Array.isArray(source.risks) && source.risks.length
    ? source.risks.slice(0, 3).map(normalizeRisk)
    : [];
  const actions = Array.isArray(source.checklist) && source.checklist.length
    ? source.checklist.slice(0, 3).map((item, index) => ({
      key: item.key || `action-${index}`,
      title: item.title || item.label,
      detail: item.detail || item.description || '',
    }))
    : [];
  const siteType = source.siteType || source.targetType || 'LAND';
  const hasScore = score !== null;
  const hasEconomicEstimate = [
    resolvedCapacityKw,
    annualGenerationKwh,
    annualRevenue,
    paybackYears,
  ].every((value) => value !== null);
  const analysisStatus = !hasAnalysis ? 'empty' : hasEconomicEstimate ? 'complete' : 'partial';
  const decisionLabel = !hasScore
    ? '분석 데이터 없음'
    : !hasEconomicEstimate
    ? score >= 80 ? '입지 적합도 우수' : score >= 70 ? '입지 조건 검토' : '입지 재검토 필요'
    : score >= 80 ? '설치 권장' : score >= 70 ? '조건부 검토' : '재검토 필요';
  const decisionSummary = !hasScore
    ? '왼쪽 후보지 목록에서 분석할 대상을 선택하세요.'
    : !hasEconomicEstimate
    ? '입지 적합도 분석은 완료됐지만 경제성 지표가 미산정되어 설치 여부를 확정할 수 없습니다.'
    : score >= 80
    ? '수익성과 설치 여건이 양호합니다. 구조안전 확인 후 사업 추진을 권장합니다.'
    : '일부 조건을 보완한 뒤 사업 추진 여부를 다시 판단해야 합니다.';

  return {
    source: hasAnalysis ? 'analysis' : 'empty',
    analysisStatus,
    site: {
      address: source.address || address || '분석할 후보지를 선택하세요.',
      type: siteType,
      totalAreaM2: toNumberOrNull(hasAnalysis ? source.areaM2 : areaM2),
      usableAreaM2: toNumberOrNull(source.usableRoofAreaM2 ?? roofSource.usableAreaM2),
      utilizationRate: toNumberOrNull(source.roofUtilizationRate ?? roofSource.utilizationRate),
    },
    decision: {
      score,
      grade: source.grade || (hasScore ? (score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : 'D') : '-'),
      label: decisionLabel,
      summary: decisionSummary,
    },
    economics: {
      capacityKw: resolvedCapacityKw,
      annualGenerationKwh,
      annualRevenue,
      roiPercent,
      paybackYears,
      hasEstimate: hasEconomicEstimate,
    },
    visuals: {
      monthlyGeneration: buildMonthlyGeneration(source, annualGenerationKwh),
      generationForecast: generationForecast ? {
        source: generationForecast.source || null,
        method: generationForecast.method || null,
        fallback: Boolean(generationForecast.fallback),
        tiltDegrees: toNumberOrNull(generationForecast.tiltDegrees),
        azimuthDegrees: toNumberOrNull(generationForecast.azimuthDegrees),
        systemLossPercent: toNumberOrNull(generationForecast.systemLossPercent),
      } : null,
      paybackScaleYears: paybackYears === null ? 10 : Math.max(10, Math.ceil(paybackYears / 5) * 5),
      paybackMarkerPercent: paybackYears === null
        ? 0
        : Math.min(100, paybackYears / Math.max(10, Math.ceil(paybackYears / 5) * 5) * 100),
    },
    scores: [
      { key: 'ml', label: '입지·일사 조건', value: toNumberOrNull(scoreSource.ml ?? source.mlScore) },
      { key: 'vision', label: siteType === 'ROOF' ? '옥상 설치 환경' : '부지 설치 환경', value: toNumberOrNull(scoreSource.vision ?? source.visionScore) },
      { key: 'regulation', label: '규제·인허가', value: toNumberOrNull(scoreSource.regulation ?? source.regulationScore) },
    ],
    risks,
    actions,
    roof: {
      type: roofSource.type || source.roofType || null,
      structure: roofSource.structure || source.roofStructure || null,
      slopeDegrees: toNumberOrNull(roofSource.slopeDegrees ?? source.roofSlopeDegrees),
      shadowRate: toNumberOrNull(roofSource.shadowRate ?? source.shadowRate),
      shadowAreaM2: toNumberOrNull(roofSource.shadowAreaM2 ?? source.shadowAreaM2),
      moduleDirection: roofSource.moduleDirection || source.moduleDirection || null,
      installAngleDegrees: toNumberOrNull(roofSource.installAngleDegrees ?? source.installAngleDegrees),
    },
  };
};
