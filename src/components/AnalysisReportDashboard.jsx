const formatNumber = (value, fallback, suffix = '') => {
  const resolved = value ?? fallback;
  return `${Number(resolved).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}${suffix}`;
};

const scoreItems = [
  {
    key: 'ml',
    label: 'ML 기술 적합도',
    score: 95,
    reason: '연평균 일사량 3.7 kWh/m²/day · 계통연계 거리 150m 이내',
  },
  {
    key: 'vision',
    label: 'Vision AI 환경 평가',
    score: 98,
    reason: '평지붕 구조 · 장애물 적음 · 고정식 패널 최적 배치 가능',
  },
  {
    key: 'rule',
    label: 'Rule-based 규제 검토',
    score: 100,
    reason: '공공 유휴부지 특례 적용 · 이격거리 규제 미적용',
  },
];

const roofMetrics = [
  ['지붕 형태 및 구조', '평지붕', '콘크리트 슬래브'],
  ['지붕 경사도', '15.0°', '설치 가능한 완만한 경사'],
  ['장애물·음영 비율', '17.5%', '수평 음영 구역 약 5%'],
  ['장애물·음영 면적', '150.0 m²', '가용 면적에서 제외'],
  ['추천 모듈 방향', '정남향', '발전 효율 우선'],
  ['추천 설치 각도', '30°', '연간 발전량 최적화'],
];

const riskItems = [
  ['전력 계통 연계', '연계 가능', '인근 변전소 계통 용량 여유 확인 완료'],
  ['조례 및 법적 규제', '안전', '공공청사 옥상 설치로 이격거리 조례 대상 외'],
  ['주변 민원 가능성', '낮음', '주거지역과 이격되어 반사광 영향이 낮음'],
];

const checklistItems = [
  ['지붕 방수 및 누수 상태 확인', '시공 전 옥상 우수 방수층 사전 점검 필요'],
  ['건축물 구조안전진단 수행', '100kW 패널 하중 견딤 여부 안전진단 의뢰'],
  ['변전실 인입선로 용량 및 분전반 위치', '전기실 접속점까지 배선 경로 확인'],
];

const AnalysisReportDashboard = ({
  analysis,
  address,
  areaM2,
  capacityKw,
  onDownload,
}) => {
  const score = analysis?.suitabilityScore ?? 98;
  const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : 'D';
  const annualGeneration = analysis?.annualGenerationKwh ?? 135000;
  const annualRevenue = analysis?.estimatedAnnualRevenue ?? 24000000;
  const paybackYears = analysis?.paybackPeriodYears ?? 6.5;
  const roi = paybackYears ? (100 / Number(paybackYears) * 0.806).toFixed(1) : '12.4';
  const reportAddress = address || analysis?.address || '충청남도 홍성군 홍북읍 충남대로 21';
  const totalArea = Number(areaM2) || analysis?.areaM2 || 1200;
  const usableArea = analysis?.usableRoofAreaM2 ?? 850;
  const utilization = analysis?.roofUtilizationRate ?? 82.5;
  const reportCapacity = Number(capacityKw) || analysis?.capacityKw || 100;

  return (
    <section className="analysis-report" aria-labelledby="analysis-report-title">
      <div className="analysis-report-header">
        <div>
          <p>AI ROOFTOP FEASIBILITY REPORT</p>
          <h2 id="analysis-report-title">옥상형 태양광 입지 분석</h2>
          <span>{reportAddress}</span>
        </div>
        <div className="report-header-actions">
          <span className="report-sample-badge">첨부 보고서 샘플</span>
          <button type="button" onClick={() => onDownload('ROOF')}>PDF 보고서</button>
        </div>
      </div>

      <div className="report-decision-grid">
        <article className="readiness-card">
          <div className="readiness-ring" style={{ '--report-score': `${score * 3.6}deg` }}>
            <div><strong>{score}</strong><span>/ 100</span></div>
          </div>
          <div className="readiness-copy">
            <span>종합 평가 결과</span>
            <h3>{grade} Grade · 설치 최적</h3>
            <p>충청남도 공공부지 중 <strong>우선순위 1위</strong></p>
          </div>
        </article>

        <article className="ai-summary-card">
          <span className="section-kicker">AI 판단 요약</span>
          <h3>낮은 규제 리스크와 높은 옥상 활용성</h3>
          <ul>
            <li><span className="positive">+</span> 인근 변전소와 가까워 초기 구축비 절감</li>
            <li><span className="positive">+</span> 공공건물 활용으로 민원 가능성 최소화</li>
            <li><span className="caution">!</span> 구조물 주변 약 5% 수평 음영 구역 존재</li>
          </ul>
        </article>
      </div>

      <div className="report-kpi-grid">
        <article><span>가용 지붕 면적</span><strong>{formatNumber(usableArea, 850, ' m²')}</strong><small>전체 {formatNumber(totalArea, 1200, ' m²')} · 가용률 {utilization}%</small></article>
        <article><span>추천 설치 용량</span><strong>{formatNumber(reportCapacity, 100, ' kW')}</strong><small>고정식 패널 · 정남향</small></article>
        <article className="accent"><span>연간 예상 발전량</span><strong>{formatNumber(annualGeneration, 135000, ' kWh')}</strong><small>월평균 약 {formatNumber(annualGeneration / 12, 11250, ' kWh')}</small></article>
        <article className="accent"><span>연간 예상 수익</span><strong>{formatNumber(annualRevenue / 10000, 2400, ' 만원')}</strong><small>예상 ROI {roi}% · 회수 {formatNumber(paybackYears, 6.5, '년')}</small></article>
      </div>

      <div className="report-content-grid">
        <article className="report-section score-evidence-card">
          <div className="report-section-heading">
            <div><span className="section-kicker">01 · READINESS</span><h3>AI 종합 적합도 근거</h3></div>
            <span className="section-status success">3개 항목 통과</span>
          </div>
          <div className="report-score-list">
            {scoreItems.map((item) => (
              <div key={item.key}>
                <div className="report-score-label"><strong>{item.label}</strong><b>{item.score}점</b></div>
                <div className="report-score-track"><i style={{ width: `${item.score}%` }} /></div>
                <p>{item.reason}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="report-section roof-analysis-card">
          <div className="report-section-heading">
            <div><span className="section-kicker">02 · VISION AI</span><h3>영상 기반 옥상 분석</h3></div>
            <span className="section-status">배치 가능</span>
          </div>
          <div className="roof-metric-grid">
            {roofMetrics.map(([label, value, help]) => (
              <div key={label}><span>{label}</span><strong>{value}</strong><small>{help}</small></div>
            ))}
          </div>
        </article>

        <article className="report-section risk-card">
          <div className="report-section-heading">
            <div><span className="section-kicker">03 · RISK</span><h3>규칙 기반 종합 리스크</h3></div>
            <span className="section-status success">안전 등급</span>
          </div>
          <div className="risk-list">
            {riskItems.map(([label, status, detail], index) => (
              <div key={label}>
                <span className={`risk-icon risk-${index}`}>{index === 0 ? '✓' : index === 1 ? '§' : '○'}</span>
                <div><strong>{label}</strong><p>{detail}</p></div>
                <b>{status}</b>
              </div>
            ))}
          </div>
          <div className="support-programs">
            <span>추천 연계 사업</span>
            <div><strong>2026 신재생에너지 지역지원사업</strong><strong>공공기관 태양광 보급 확대 지원사업</strong></div>
          </div>
        </article>

        <article className="report-section checklist-card">
          <div className="report-section-heading">
            <div><span className="section-kicker">04 · NEXT STEP</span><h3>현장조사 전 체크리스트</h3></div>
            <span className="section-status pending">승인 전 확인</span>
          </div>
          <div className="report-checklist">
            {checklistItems.map(([title, detail]) => (
              <label key={title}>
                <input type="checkbox" />
                <span><strong>{title}</strong><small>{detail}</small></span>
              </label>
            ))}
          </div>
          <div className="approval-row">
            <span>자동 분석 시스템 검토 완료</span>
            <div>담당자 승인 <i /></div>
          </div>
        </article>
      </div>
    </section>
  );
};

export default AnalysisReportDashboard;
