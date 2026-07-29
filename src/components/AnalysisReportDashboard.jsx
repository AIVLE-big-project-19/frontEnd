const formatNumber = (value, suffix = '') => `${Number(value).toLocaleString('ko-KR', {
  maximumFractionDigits: 1,
})}${suffix}`;

const AnalysisReportDashboard = ({ report, onDownload }) => (
  <section className="decision-report" aria-labelledby="decision-report-title">
    <div className="decision-report-header">
      <div>
        <div className="report-context">
          <span>{report.source === 'sample' ? '샘플 보고서' : '분석 완료'}</span>
          <span>옥상형 태양광</span>
        </div>
        <h2 id="decision-report-title">{report.site.address}</h2>
      </div>
      <button type="button" onClick={() => onDownload('ROOF')}>PDF 내려받기</button>
    </div>

    <div className="decision-summary">
      <div className="decision-score">
        <strong>{report.decision.score}</strong>
        <span>종합점수</span>
      </div>
      <div className="decision-copy">
        <div><span className="decision-grade">{report.decision.grade}</span><h3>{report.decision.label}</h3></div>
        <p>{report.decision.summary}</p>
      </div>
      <div className="decision-primary-action">
        <span>다음 필수 단계</span>
        <strong>구조안전진단</strong>
      </div>
    </div>

    <dl className="decision-kpis">
      <div>
        <dt>가용 지붕 면적</dt>
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
        <dd>{formatNumber(report.economics.annualRevenue / 10000, ' 만원')}</dd>
        <small>ROI {formatNumber(report.economics.roiPercent, '%')} · 회수 {formatNumber(report.economics.paybackYears, '년')}</small>
      </div>
    </dl>

    <div className="decision-detail-grid">
      <article className="decision-panel">
        <div className="decision-panel-heading">
          <div><span>판단 근거</span><h3>사업 추진 조건</h3></div>
          <b>3개 지표</b>
        </div>
        <div className="decision-score-list">
          {report.scores.map((item) => (
            <div key={item.key}>
              <div><span>{item.label}</span><strong>{item.value}점</strong></div>
              <div className="decision-score-track"><i style={{ width: `${item.value}%` }} /></div>
            </div>
          ))}
        </div>
      </article>

      <article className="decision-panel">
        <div className="decision-panel-heading">
          <div><span>위험 확인</span><h3>추진 전 확인사항</h3></div>
        </div>
        <div className="decision-risk-list">
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
        <div><dt>지붕 구조</dt><dd>{report.roof.type} · {report.roof.structure}</dd></div>
        <div><dt>지붕 경사</dt><dd>{formatNumber(report.roof.slopeDegrees, '°')}</dd></div>
        <div><dt>음영 비율</dt><dd>{formatNumber(report.roof.shadowRate, '%')}</dd></div>
        <div><dt>음영 면적</dt><dd>{formatNumber(report.roof.shadowAreaM2, ' m²')}</dd></div>
        <div><dt>모듈 방향</dt><dd>{report.roof.moduleDirection}</dd></div>
        <div><dt>설치 각도</dt><dd>{formatNumber(report.roof.installAngleDegrees, '°')}</dd></div>
      </dl>
    </details>
  </section>
);

export default AnalysisReportDashboard;
