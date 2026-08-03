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

const AnalysisReportDashboard = ({ report, onDownload }) => (
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
        <dt>{report.site.type === 'ROOF' ? '가용 지붕 면적' : '가용 부지 면적'}</dt>
        <dd>{formatNumber(report.site.usableAreaM2, ' m²')}</dd>
        <small>활용률 {formatNumber(report.site.utilizationRate, '%')}</small>
      </div>
      <div>
        <span className="kpi-mark capacity" aria-hidden="true">kW</span>
        <dt>추천 설치 용량</dt>
        <dd>{formatNumber(report.economics.capacityKw, ' kW')}</dd>
        <small>고정식 패널 기준</small>
      </div>
      <div>
        <span className="kpi-mark generation" aria-hidden="true">↗</span>
        <dt>연간 예상 발전량</dt>
        <dd>{formatNumber(report.economics.annualGenerationKwh, ' kWh')}</dd>
        <small>현재 입력 조건 기준</small>
      </div>
      <div className="primary">
        <span className="kpi-mark revenue" aria-hidden="true">₩</span>
        <dt>연간 예상 수익</dt>
        <dd>{formatNumber(report.economics.annualRevenue == null ? null : report.economics.annualRevenue / 100000000, ' 억')}</dd>
        <small>ROI {formatNumber(report.economics.roiPercent, '%')} · 회수 {formatNumber(report.economics.paybackYears, '년')}</small>
      </div>
    </dl>

    <section className="decision-visuals" aria-label="발전량과 투자 회수 시각화">
      <article className="generation-chart-card">
        <div className="chart-heading">
          <div><span>발전량 전망</span><h3>월별 예상 발전량</h3></div>
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
          <div><span>투자 판단</span><h3>예상 회수 시점</h3></div>
        </div>
        {report.economics.paybackYears == null ? (
          <p className="decision-chart-empty">투자비와 예상 수익이 산정된 뒤 회수 시점을 확인할 수 있습니다.</p>
        ) : (
          <>
            <div className="roi-value"><strong>{formatNumber(report.economics.roiPercent, '%')}</strong><span>연간 투자수익률</span></div>
            <div className="payback-visual">
              <div className="payback-track"><i style={{ width: `${report.visuals.paybackMarkerPercent}%` }} /><b style={{ left: `${report.visuals.paybackMarkerPercent}%` }} /></div>
              <div className="payback-labels"><span>투자 시작</span><strong>{formatNumber(report.economics.paybackYears, '년')}</strong><span>{report.visuals.paybackScaleYears}년</span></div>
            </div>
            <p>예상 운영기간 내 투자금 회수가 가능하며, 이후 수익 구간으로 전환됩니다.</p>
          </>
        )}
      </article>
    </section>

    <div className="decision-detail-grid">
      <article className="decision-panel">
        <div className="decision-panel-heading">
          <div><span>판단 근거</span><h3>사업 추진 조건</h3></div>
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
          <div><span>위험 확인</span><h3>추진 전 확인사항</h3></div>
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
        <div><span>다음 행동</span><h3>사업 검토를 이어가기 위해 필요한 작업</h3></div>
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

export default AnalysisReportDashboard;
