const formatNumber = (value, suffix = '') => {
  if (value === undefined || value === null || value === '' || !Number.isFinite(Number(value))) {
    return '-';
  }
  return `${Number(value).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}${suffix}`;
};

const getScoreState = (value) => {
  if (value == null) return { label: '미산정', className: 'unavailable' };
  if (value >= 80) return { label: '양호', className: 'good' };
  if (value >= 70) return { label: '검토', className: 'review' };
  return { label: '주의', className: 'caution' };
};

const getSiteTypeLabel = (type) => {
  if (type === 'ROOF') return '건물 지붕형';
  if (type === 'PARKING_LOT') return '주차장형';
  if (type === 'LAND') return '토지형';
  return type || '미확인';
};

const KpiHelp = ({ label, formula, description, checks, sources }) => (
  <span className="kpi-help">
    <button
      type="button"
      className="kpi-help-trigger"
      aria-label={`${label} 산정 기준과 출처 보기`}
      aria-haspopup="dialog"
    >
      i
    </button>
    <span className="kpi-help-popover" role="dialog" aria-label={`${label} 산정 기준과 공식 출처`}>
      <strong>{label}</strong>
      <code>{formula}</code>
      <span>{description}</span>
      <b>직접 확인할 사항</b>
      <span>{checks}</span>
      <b>공식 자료</b>
      <span className="kpi-help-sources">
        {sources.map((source) => (
          <a key={source.href} href={source.href} target="_blank" rel="noreferrer">
            {source.label}<span aria-hidden="true"> ↗</span>
          </a>
        ))}
      </span>
    </span>
  </span>
);

const AnalysisReportDashboard = ({ report, onDownload }) => {
  const forecast = report.visuals.generationForecast;
  const capacityEstimate = report.economics.capacityEstimate;
  const economicAssumptions = report.economics.economicAssumptions;
  const registeredType = capacityEstimate?.registeredType || report.site.type;
  const capacityTypeLabel = getSiteTypeLabel(registeredType);
  const installationCostPerKw = economicAssumptions?.installationCostPerKw
    ?? (registeredType === 'PARKING_LOT' ? 1500000 : registeredType === 'ROOF' ? 1300000 : 1200000);
  const annualOmRatePercent = economicAssumptions?.annualOmRatePercent ?? 1.5;
  const visionTypeLabel = getSiteTypeLabel(capacityEstimate?.visionType);
  const areaPerKwM2 = capacityEstimate?.areaPerKwM2
    ?? (registeredType === 'ROOF' ? 7.5 : 10);
  const capacityAreaM2 = capacityEstimate?.availableAreaM2 ?? report.site.usableAreaM2;
  const capacityFormula = capacityAreaM2 == null
    ? `max(3kW, 반올림(가용 면적 ÷ ${formatNumber(areaPerKwM2, '㎡/kW')}))`
    : `max(3kW, 반올림(${formatNumber(capacityAreaM2, '㎡')} ÷ ${formatNumber(areaPerKwM2, '㎡/kW')}))`;
  const visionReference = capacityEstimate?.visionType
    ? ` Vision AI 참고 유형은 ${visionTypeLabel}입니다.`
    : ' Vision AI 유형 정보는 제공되지 않았습니다.';
  const capacityCoefficientRationale = registeredType === 'ROOF'
    ? ' 7.5㎡/kW는 약 5㎡/kW의 모듈 면적에 점검 통로·가장자리 이격·장애물 여유를 더한 보수적 초기 배치 가정입니다. 7㎡/kW를 적용하면 용량이 약 7.1% 증가하지만, 현재 AI 가용면적의 검증 한계를 고려해 7.5㎡/kW를 적용합니다.'
    : '';
  const hasLocationForecast = forecast?.method === 'LOCATION_BASED_PV_SIMULATION' && !forecast.fallback;
  const usesPvoutForecast = forecast?.method === 'PVOUT_DAILY_SPECIFIC_YIELD';
  const generationLabel = hasLocationForecast
    ? '위치 기반 예상 발전량'
    : usesPvoutForecast
    ? '후보지 발전원단위 기반 예상 발전량'
    : '고정 발전원단위 기반 예상 발전량';
  const generationBasis = hasLocationForecast
    ? `${forecast.source}·경사 ${formatNumber(forecast.tiltDegrees, '°')}·손실 ${formatNumber(forecast.systemLossPercent, '%')}`
    : usesPvoutForecast
    ? `pvout ${formatNumber(forecast.pvoutAvgDaily, 'kWh/kWp·일')} · 연간 ${formatNumber(forecast.specificYieldKwhPerKwpYear, 'kWh/kWp')}`
    : `${formatNumber(forecast?.specificYieldKwhPerKwpYear ?? 1300, 'kWh/kWp·년')} 고정 가정`;

  return (
  <section className="decision-report" aria-labelledby="decision-report-title">
    <div className="decision-report-header">
      <div>
        <div className="report-context">
          <span>{report.analysisStatus === 'partial' ? '입지 분석 완료' : report.source === 'analysis' ? '분석 완료' : '후보지 선택 대기'}</span>
          <span>{report.site.type === 'ROOF' ? '옥상형 태양광' : '토지형 태양광'}</span>
        </div>
        <h2 id="decision-report-title">{report.site.address}</h2>
      </div>
      <button type="button" disabled={report.source !== 'analysis'} onClick={() => onDownload(report.site.type)}>분석 보고서 조회</button>
    </div>

    <div className="decision-summary">
      <div
        className="decision-score"
        role="meter"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={Number(report.decision.score) || 0}
        aria-label={`종합점수 ${formatNumber(report.decision.score, '점')}`}
      >
        <div><strong>{formatNumber(report.decision.score)}</strong><em>점</em></div>
        <span>종합점수</span>
        <i aria-hidden="true"><b style={{ width: `${Math.max(0, Math.min(100, Number(report.decision.score) || 0))}%` }} /></i>
      </div>
      <div className="decision-copy">
        <div><span className="decision-grade">{report.decision.grade}</span><h3>{report.decision.label}</h3></div>
        <p>{report.decision.summary}</p>
      </div>
      <div className="decision-primary-action">
        <span>다음 필수 단계</span>
        <strong>{report.site.type === 'ROOF' ? '구조안전진단' : '현장 부지조사'}</strong>
      </div>
    </div>

    {report.analysisStatus === 'partial' && (
      <div className="decision-data-notice" role="status">
        <strong>경제성 지표 미산정</strong>
        <span>설치용량·발전량·수익·회수기간을 확인한 뒤 최종 사업성을 판단하세요.</span>
      </div>
    )}

    <dl className="decision-kpis">
      <div>
        <span className="kpi-mark area" aria-hidden="true">㎡</span>
        <dt>
          AI 추정 가용 면적
          <KpiHelp
            label="AI 추정 가용 면적"
            formula="탐지 픽셀 면적 × 영상 해상도"
            description="위성영상에서 AI가 탐지한 영역을 ㎡로 환산한 개략값입니다. 현재 EPSG:3857 영상 좌표를 사용하므로 실제 지표면 면적과 차이가 날 수 있습니다."
            checks={report.site.type === 'ROOF'
              ? '건축물대장·건축물현황도와 현장 실측으로 실제 설치 가능 면적을 확인하세요.'
              : '토지대장·지적도와 현장 실측으로 경계 및 실제 설치 가능 면적을 확인하세요.'}
            sources={[
              { label: 'EPSG:3857 공식 설명', href: 'https://epsg.org/crs_3857/WGS-84-Pseudo-Mercator.html' },
              report.site.type === 'ROOF'
                ? { label: '정부24 건축물대장 열람', href: 'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=15000000098&tp_seq=03' }
                : { label: '정부24 토지·임야대장 열람', href: 'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=13100000026&HighCtgCD=A02001001&Mcode=10207' },
            ]}
          />
        </dt>
        <dd>{formatNumber(report.site.usableAreaM2, ' m²')}</dd>
        {report.site.utilizationRate != null ? (
          <small>{report.site.type === 'ROOF' ? 'AI 추정 지붕 활용률' : 'AI 추정 부지 활용률'} {formatNumber(report.site.utilizationRate, '%')}</small>
        ) : (
          <small aria-hidden="true">&nbsp;</small>
        )}
      </div>
      <div>
        <span className="kpi-mark capacity" aria-hidden="true">kW</span>
        <dt>
          면적 기반 개략 용량
          <KpiHelp
            label="면적 기반 개략 용량"
            formula={capacityFormula}
            description={`등록 유형 ${capacityTypeLabel}을 계산 기준으로 적용했습니다. ${formatNumber(areaPerKwM2, '㎡')}당 1kW, 최소 3kW를 가정한 초기 검토값입니다.${capacityCoefficientRationale}${visionReference} 실제 용량은 패널 규격, 이격거리, 통로, 장애물과 구조하중에 따라 달라집니다.`}
            checks="시공사의 패널 배치도와 구조안전 검토를 통해 최종 설치용량을 확인하세요."
            sources={registeredType === 'ROOF' ? [
              { label: 'PVGIS 설비용량·모듈 효율 공식 설명', href: 'https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis/getting-started-pvgis/using-pvgis-frequently-asked-questions_en' },
              { label: '미 에너지부 태양광 모듈 규격·효율 사례', href: 'https://www.energy.gov/cmei/systems/solar-photovoltaic-system-cost-benchmarks' },
              { label: '정부24 건축물대장 열람', href: 'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=15000000098&tp_seq=03' },
            ] : [
              { label: 'PVGIS 설비용량·모듈 효율 공식 설명', href: 'https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis/getting-started-pvgis/using-pvgis-frequently-asked-questions_en' },
              { label: 'NREL 지상형 태양광 토지 사용량', href: 'https://research-hub.nlr.gov/en/publications/land-use-requirements-for-solar-power-plants-in-the-united-states/' },
            ]}
          />
        </dt>
        <dd>{formatNumber(report.economics.capacityKw, ' kW')}</dd>
        <small>{capacityTypeLabel}·{formatNumber(areaPerKwM2, '㎡/kW')} 가정</small>
      </div>
      <div>
        <span className="kpi-mark generation" aria-hidden="true">↗</span>
        <dt>
          {generationLabel}
          <KpiHelp
            label={generationLabel}
            formula={hasLocationForecast
              ? '후보지 좌표 + 설치용량 + 경사·방향 + 시스템 손실률'
              : usesPvoutForecast
              ? '설치용량(kWp) × pvout_avg_daily(kWh/kWp·일) × 365일'
              : '개략 용량 × 1,300kWh/kW·년'}
            description={hasLocationForecast
              ? `${forecast.source}의 위치별 일사량 자료로 12개월 발전량을 계산하고 그 합계를 연간 발전량으로 사용했습니다. 현장 음영과 계통 출력제어는 별도 확인이 필요합니다.`
              : usesPvoutForecast
              ? 'PVGIS 호출이 실패했을 때 후보지별 1kWp당 일평균 예상 발전량인 pvout_avg_daily를 365일로 환산해 사용합니다. 월별 값은 연간 발전량을 내부 계절 가중치로 배분한 추정치입니다.'
              : '외부 위치 기반 계산을 사용할 수 없어 전국 공통 연간 발전계수와 내부 계절 가중치를 적용한 참고값입니다.'}
            checks="지역 기상자료와 설계 경사·방위·음영을 반영한 발전량 시뮬레이션을 확인하세요."
            sources={hasLocationForecast ? [
              { label: 'EU JRC PVGIS 공식 설명', href: 'https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis_en' },
              { label: 'PVGIS API 산정 항목', href: 'https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis/using-pvgis-5/api-non-interactive-service_en' },
            ] : usesPvoutForecast ? [
              { label: 'PVGIS 설비용량·발전량 원단위 설명', href: 'https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis/getting-started-pvgis/using-pvgis-frequently-asked-questions_en' },
              { label: '한국에너지공단 재생에너지 클라우드', href: 'https://recloud.energy.or.kr/main/main.do' },
            ] : [
              { label: '한국에너지공단 공공 태양광 사례', href: 'https://www.energy.or.kr/energy_issue/mail_vol269/pdf/issue_372_03_all.pdf' },
              { label: '한국에너지공단 재생에너지 클라우드', href: 'https://recloud.energy.or.kr/main/main.do' },
            ]}
          />
        </dt>
        <dd>{formatNumber(report.economics.annualGenerationKwh, ' kWh')}</dd>
        <small>{generationBasis}</small>
      </div>
      <div className="primary">
        <span className="kpi-mark revenue" aria-hidden="true">₩</span>
        <dt>
          기본 가정 기준 연간 예상 매출
          <KpiHelp
            label="기본 가정 기준 연간 예상 매출"
            formula={`매출 = 예상 발전량 × 160원/kWh · 순수익 = 매출 - (설비용량 × ${formatNumber(installationCostPerKw, '원/kW')} × ${formatNumber(annualOmRatePercent, '%')})`}
            description={`${capacityTypeLabel} 설치비 ${formatNumber(installationCostPerKw, '원/kW')}와 연간 O&M ${formatNumber(annualOmRatePercent, '%')}를 적용합니다. ROI와 회수기간은 O&M 차감 후 연간 순수익 기준입니다. 실제 수익은 SMP, REC, 계약조건과 추가 비용에 따라 달라집니다.`}
            checks="계약 방식과 최신 SMP·REC 가격을 확인하고 유지보수비, 보험료, 임대료, 세금, 금융비용을 별도로 반영하세요."
            sources={[
              { label: '전력거래소 SMP·REC 시장정보', href: 'https://new.kpx.or.kr/?bbsNo=12&key=17' },
              { label: '신재생에너지센터 REC 가중치 계산', href: 'https://rps.energy.or.kr/' },
              { label: '국가법령정보센터 REC 가중치', href: 'https://www.law.go.kr/LSW/flDownload.do?bylClsCd=200201&flNm=%5B%EB%B3%84%ED%91%9C+2%5D+%EC%8B%A0%C2%B7%EC%9E%AC%EC%83%9D%EC%97%90%EB%84%88%EC%A7%80%EC%9B%90%EB%B3%84+%EA%B0%80%EC%A4%91%EC%B9%98&flSeq=157758139' },
            ]}
          />
        </dt>
        <dd>{formatNumber(report.economics.annualRevenue == null ? null : report.economics.annualRevenue / 100000000, ' 억')}</dd>
        <small>O&M 차감 예상 ROI {formatNumber(report.economics.roiPercent, '%')} · 단순 회수 {formatNumber(report.economics.paybackYears, '년')}</small>
      </div>
    </dl>

    <section className="decision-visuals" aria-label="발전량과 투자 회수 시각화">
      <article className="generation-chart-card">
        <div className="chart-heading">
          <div><span>{forecast?.source || '발전량 산정 대기'}</span><h3>월별 예상 발전량</h3></div>
          <strong>{formatNumber(report.economics.annualGenerationKwh, ' kWh / 년')}</strong>
        </div>
        {report.economics.annualGenerationKwh == null ? (
          <p className="decision-chart-empty">발전량 산정에 필요한 데이터가 없습니다.</p>
        ) : (
          <div className="generation-chart" role="img" aria-label="1월부터 12월까지 월별 예상 발전량 막대 그래프">
            {report.visuals.monthlyGeneration.map((item) => (
              <div className="generation-bar-column" key={item.month} aria-label={`${item.month}월 ${formatNumber(item.value, ' kWh')}`}>
                <span>{formatNumber(item.value / 1000, 'k')}</span>
                <i style={{ '--generation-height': `${item.heightPercent}%` }} />
                <b>{item.month}월</b>
              </div>
            ))}
          </div>
        )}
      </article>

      <article className="payback-chart-card">
        <div className="chart-heading">
          <div><span>투자 판단</span><h3>단순 예상 회수 시점</h3></div>
        </div>
        {report.economics.paybackYears == null ? (
          <p className="decision-chart-empty">투자비와 예상 수익이 산정된 뒤 회수 시점을 확인할 수 있습니다.</p>
        ) : (
          <>
            <div className="roi-value"><strong>{formatNumber(report.economics.roiPercent, '%')}</strong><span>O&M 차감 예상 ROI</span></div>
            <div className="payback-visual">
              <div className="payback-track"><i style={{ width: `${report.visuals.paybackMarkerPercent}%` }} /><b style={{ left: `${report.visuals.paybackMarkerPercent}%` }} /></div>
              <div className="payback-labels"><span>투자 시작</span><strong>{formatNumber(report.economics.paybackYears, '년')}</strong><span>{report.visuals.paybackScaleYears}년</span></div>
            </div>
            <p>유형별 초기 설치비와 연간 O&M 1.5%를 반영한 개략값입니다. 실제 투자 판단에는 토지비, 계통연계비, 세금과 금융조건 확인이 필요합니다.</p>
          </>
        )}
      </article>
    </section>

    <div className="decision-detail-grid">
      <article className="decision-panel">
        <div className="decision-panel-heading">
          <div><h3>사업 추진 조건</h3></div>
          <b>{report.scores.length}개 지표</b>
        </div>
        <div className="decision-score-list">
          {report.scores.map((item) => {
            const state = getScoreState(item.value);
            return (
              <div className="decision-score-item" key={item.key}>
                <div className="decision-score-item-heading">
                  <div>
                    <strong>{item.label}</strong>
                    <span className={`score-state ${state.className}`}>{state.label}</span>
                  </div>
                  <b>{formatNumber(item.value, '점')}</b>
                </div>
                <div
                  className="decision-score-track"
                  role="progressbar"
                  aria-label={`${item.label} 점수`}
                  aria-valuemin="0"
                  aria-valuemax="100"
                  aria-valuenow={item.value ?? 0}
                >
                  <i style={{ width: `${item.value ?? 0}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </article>

      <article className="decision-panel">
        <div className="decision-panel-heading">
          <div><h3>추진 전 확인사항</h3></div>
          <b>{report.risks.length}개 항목</b>
        </div>
        <div className="decision-risk-list">
          {report.risks.length === 0 && <p className="decision-list-empty">확인이 필요한 위험 분석 결과가 없습니다.</p>}
          {report.risks.map((risk) => (
            <div className={`decision-risk-item ${risk.level}`} key={risk.key}>
              <span className={`risk-signal ${risk.level}`} aria-hidden="true" />
              <div className="decision-risk-copy">
                <strong>{risk.label}</strong>
                <p>{risk.detail || risk.status}</p>
              </div>
              <span className={`risk-state ${risk.level}`}>
                {risk.level === 'good' ? '양호' : '확인 필요'}
              </span>
            </div>
          ))}
        </div>
      </article>
    </div>

    <article className="next-action-panel">
      <div className="decision-panel-heading">
        <div><h3>사업 검토를 이어가기 위해 필요한 작업</h3></div>
      </div>
      <ol>
        {report.actions.length === 0 && <li><div><strong>체크리스트 없음</strong><p>API에서 제공된 현장 점검 항목이 없습니다.</p></div></li>}
        {report.actions.map((action, index) => (
          <li key={action.key}>
            <span>{index + 1}</span>
            <div><strong>{action.title}</strong><p>{action.detail}</p></div>
          </li>
        ))}
      </ol>
    </article>

    <details className="technical-details">
      <summary>상세 기술 지표 보기</summary>
      <dl>
        <div><dt>{report.site.type === 'ROOF' ? '지붕 구조' : '부지 유형'}</dt><dd>{[report.roof.type, report.roof.structure].filter(Boolean).join(' · ') || '-'}</dd></div>
        <div><dt>{report.site.type === 'ROOF' ? '지붕 경사' : '부지 경사'}</dt><dd>{formatNumber(report.roof.slopeDegrees, '°')}</dd></div>
        <div><dt>{report.site.type === 'ROOF' ? '음영 비율' : '식생·장애물 비율'}</dt><dd>{formatNumber(report.roof.shadowRate, '%')}</dd></div>
        <div><dt>{report.site.type === 'ROOF' ? '음영 면적' : '장애물 면적'}</dt><dd>{formatNumber(report.roof.shadowAreaM2, ' m²')}</dd></div>
        <div><dt>모듈 방향</dt><dd>{report.roof.moduleDirection}</dd></div>
        <div><dt>설치 각도</dt><dd>{formatNumber(report.roof.installAngleDegrees, '°')}</dd></div>
      </dl>
    </details>
  </section>
  );
};

export default AnalysisReportDashboard;
