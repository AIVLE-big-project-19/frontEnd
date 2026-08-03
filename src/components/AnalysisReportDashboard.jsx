const formatNumber = (value, suffix = '') => {
  if (value === undefined || value === null || value === '' || !Number.isFinite(Number(value))) {
    return '-';
  }
  return `${Number(value).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}${suffix}`;
};

const AnalysisReportDashboard = ({ report, onDownload }) => (
  <section className="decision-report" aria-labelledby="decision-report-title">
    <div className="decision-report-header">
      <div>
        <div className="report-context">
          <span>{report.source === 'analysis' ? 'API 분석 완료' : '후보지 선택 대기'}</span>
          <span>{report.site.type === 'ROOF' ? '옥상형 태양광' : '토지형 태양광'}</span>
        </div>
        <h2 id="decision-report-title">{report.site.address}</h2>
      </div>
      <button type="button" disabled={report.source !== 'analysis'} onClick={() => onDownload(report.site.type)}>PDF 내려받기</button>
    </div>

    <div className="decision-summary">
      <div className="decision-score">
        <strong>{formatNumber(report.decision.score)}</strong>
        <span>종합점수</span>
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

    <dl className="decision-kpis">
      <div>
        <dt>{report.site.type === 'ROOF' ? '가용 지붕 면적' : '가용 부지 면적'}</dt>
        <dd>{formatNumber(report.site.usableAreaM2, ' m²')}</dd>
        <small>활용률 {formatNumber(report.site.utilizationRate, '%')}</small>
      </div>
      <div>
        <dt>추천 설치 용량</dt>
        <dd>{formatNumber(report.economics.capacityKw, ' kW')}</dd>
        <small>고정식 패널 기준</small>
      </div>
      <div>
        <dt>연간 예상 발전량</dt>
        <dd>{formatNumber(report.economics.annualGenerationKwh, ' kWh')}</dd>
        <small>현재 입력 조건 기준</small>
      </div>
      <div className="primary">
        <dt>연간 예상 수익</dt>
        <dd>{formatNumber(report.economics.annualRevenue == null ? null : report.economics.annualRevenue / 10000, ' 만원')}</dd>
        <small>ROI {formatNumber(report.economics.roiPercent, '%')} · 회수 {formatNumber(report.economics.paybackYears, '년')}</small>
      </div>
    </dl>

    <section className="decision-visuals" aria-label="발전량과 투자 회수 시각화">
      <article className="generation-chart-card">
        <div className="chart-heading">
          <div><span>발전량 전망</span><h3>월별 예상 발전량</h3></div>
          <strong>{formatNumber(report.economics.annualGenerationKwh, ' kWh / 년')}</strong>
        </div>
        <div className="generation-chart" role="img" aria-label="1월부터 12월까지 월별 예상 발전량 막대 그래프">
          {report.visuals.monthlyGeneration.map((item) => (
            <div className="generation-bar-column" key={item.month} aria-label={`${item.month}월 ${formatNumber(item.value, ' kWh')}`}>
              <span>{formatNumber(item.value / 1000, 'k')}</span>
              <i style={{ '--generation-height': `${item.heightPercent}%` }} />
              <b>{item.month}월</b>
            </div>
          ))}
        </div>
      </article>

      <article className="payback-chart-card">
        <div className="chart-heading">
          <div><span>투자 판단</span><h3>예상 회수 시점</h3></div>
        </div>
        <div className="roi-value"><strong>{formatNumber(report.economics.roiPercent, '%')}</strong><span>연간 투자수익률</span></div>
        <div className="payback-visual">
          <div className="payback-track"><i style={{ width: `${report.visuals.paybackMarkerPercent}%` }} /><b style={{ left: `${report.visuals.paybackMarkerPercent}%` }} /></div>
          <div className="payback-labels"><span>투자 시작</span><strong>{formatNumber(report.economics.paybackYears, '년')}</strong><span>{report.visuals.paybackScaleYears}년</span></div>
        </div>
        <p>예상 운영기간 내 투자금 회수가 가능하며, 이후 수익 구간으로 전환됩니다.</p>
      </article>
    </section>

    <div className="decision-detail-grid">
      <article className="decision-panel">
        <div className="decision-panel-heading">
          <div><span>판단 근거</span><h3>사업 추진 조건</h3></div>
          <b>3개 지표</b>
        </div>
        <div className="decision-score-list">
          {report.scores.map((item) => (
            <div key={item.key}>
              <div><span>{item.label}</span><strong>{formatNumber(item.value, '점')}</strong></div>
              <div className="decision-score-track"><i style={{ width: `${item.value ?? 0}%` }} /></div>
            </div>
          ))}
        </div>
      </article>

      <article className="decision-panel">
        <div className="decision-panel-heading">
          <div><span>위험 확인</span><h3>추진 전 확인사항</h3></div>
        </div>
        <div className="decision-risk-list">
          {report.risks.length === 0 && <p>API에서 제공된 리스크 분석 결과가 없습니다.</p>}
          {report.risks.map((risk) => (
            <div key={risk.key}>
              <span className={`risk-state ${risk.level}`}>{risk.status}</span>
              <div><strong>{risk.label}</strong><p>{risk.detail}</p></div>
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
