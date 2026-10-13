const { query } = require('../config/database');

async function getSummary(filters = {}) {
  const { from, to, assessmentType } = filters;
  
  let whereClauses = [];
  let params = [];
  let paramCounter = 1;

  if (from) {
    whereClauses.push(`assessment_date >= $${paramCounter++}`);
    params.push(from);
  }
  if (to) {
    whereClauses.push(`assessment_date <= $${paramCounter++}`);
    params.push(to);
  }
  if (assessmentType) {
    whereClauses.push(`assessment_type = $${paramCounter++}`);
    params.push(assessmentType);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // 1. Summary
  const summaryQuery = `
    SELECT 
      COUNT(*) as total_assessments,
      COUNT(*) FILTER (WHERE result = 'PASS') as pass_count,
      COUNT(*) FILTER (WHERE result = 'FAIL') as fail_count,
      COUNT(*) FILTER (WHERE result = 'DISQUALIFIED') as disqualified_count,
      AVG(score) as average_score
    FROM assessments
    ${whereSql}
  `;

  // 2. Trend (group by YYYY-MM)
  const trendQuery = `
    SELECT 
      TO_CHAR(assessment_date, 'YYYY-MM') as month,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE result = 'PASS') as pass,
      COUNT(*) FILTER (WHERE result = 'FAIL') as fail,
      AVG(score) as average_score
    FROM assessments
    ${whereSql}
    GROUP BY month
    ORDER BY month ASC
  `;
  
  // 3. Assessment Type Distribution
  const typeQuery = `
    SELECT assessment_type as name, COUNT(*) as value
    FROM assessments
    ${whereSql}
    GROUP BY assessment_type
    ORDER BY value DESC
  `;

  // 4. Score Distribution
  const scoreDistQuery = `
    SELECT
      COUNT(*) FILTER (WHERE score < 60) as "<60",
      COUNT(*) FILTER (WHERE score >= 60 AND score < 70) as "60-69",
      COUNT(*) FILTER (WHERE score >= 70 AND score < 80) as "70-79",
      COUNT(*) FILTER (WHERE score >= 80 AND score < 90) as "80-89",
      COUNT(*) FILTER (WHERE score >= 90 AND score <= 100) as "90-100"
    FROM assessments
    ${whereSql}
  `;

  // 5. Participant performance
  const participantQuery = `
    SELECT 
      participant_name,
      COUNT(*) as total_assessments,
      COUNT(*) FILTER (WHERE result = 'PASS') as pass_count,
      COUNT(*) FILTER (WHERE result = 'FAIL') as fail_count,
      AVG(score) as average_score,
      MAX(assessment_date) as latest_assessment_date
    FROM assessments
    ${whereSql}
    GROUP BY participant_name
    ORDER BY total_assessments DESC, participant_name ASC
  `;

  // 6. Instructor performance
  const instructorQuery = `
    SELECT 
      instructor,
      COUNT(*) as total_assessments,
      COUNT(*) FILTER (WHERE result = 'PASS') as pass_count,
      COUNT(*) FILTER (WHERE result = 'FAIL') as fail_count,
      AVG(score) as average_score
    FROM assessments
    ${whereSql}
    GROUP BY instructor
    ORDER BY total_assessments DESC, instructor ASC
  `;

  // 7. Location performance
  const locationQuery = `
    SELECT 
      test_location as location,
      COUNT(*) as total_assessments,
      COUNT(*) FILTER (WHERE result = 'PASS') as pass_count,
      COUNT(*) FILTER (WHERE result = 'FAIL') as fail_count,
      AVG(score) as average_score
    FROM assessments
    ${whereSql}
    GROUP BY test_location
    ORDER BY total_assessments DESC, test_location ASC
  `;

  const [
    summaryRes, trendRes, typeRes, scoreDistRes,
    participantRes, instructorRes, locationRes
  ] = await Promise.all([
    query(summaryQuery, params),
    query(trendQuery, params),
    query(typeQuery, params),
    query(scoreDistQuery, params),
    query(participantQuery, params),
    query(instructorQuery, params),
    query(locationQuery, params)
  ]);

  const summaryData = summaryRes.rows[0] || {};
  const total = parseInt(summaryData.total_assessments || 0, 10);
  const pass = parseInt(summaryData.pass_count || 0, 10);
  const fail = parseInt(summaryData.fail_count || 0, 10);
  const disq = parseInt(summaryData.disqualified_count || 0, 10);
  const avg = parseFloat(summaryData.average_score || 0);

  const passRate = total > 0 ? Math.round((pass / total) * 100) : 0;
  const failRate = total > 0 ? Math.round((fail / total) * 100) : 0; 
  
  const trend = trendRes.rows.map(row => ({
    month: row.month,
    total: parseInt(row.total, 10),
    pass: parseInt(row.pass, 10),
    fail: parseInt(row.fail, 10),
    averageScore: Math.round(parseFloat(row.average_score || 0) * 10) / 10
  }));

  const resultDistribution = [
    { name: 'PASS', value: pass },
    { name: 'FAIL', value: fail }
  ];
  if (disq > 0) {
    resultDistribution.push({ name: 'DISQUALIFIED', value: disq });
  }

  const sd = scoreDistRes.rows[0] || {};
  const scoreDistribution = [
    { name: '<60', value: parseInt(sd['<60'] || 0, 10) },
    { name: '60-69', value: parseInt(sd['60-69'] || 0, 10) },
    { name: '70-79', value: parseInt(sd['70-79'] || 0, 10) },
    { name: '80-89', value: parseInt(sd['80-89'] || 0, 10) },
    { name: '90-100', value: parseInt(sd['90-100'] || 0, 10) }
  ];

  const mapPerf = (row) => {
    const t = parseInt(row.total_assessments, 10);
    const p = parseInt(row.pass_count, 10);
    const f = parseInt(row.fail_count, 10);
    return {
      totalAssessments: t,
      passCount: p,
      failCount: f,
      averageScore: Math.round(parseFloat(row.average_score || 0) * 10) / 10,
      passRate: t > 0 ? Math.round((p / t) * 100) : 0,
    };
  };

  const participantPerformance = participantRes.rows.map(row => {
    return {
      participantName: row.participant_name,
      ...mapPerf(row),
      latestAssessmentDate: row.latest_assessment_date
    };
  });

  const instructorPerformance = instructorRes.rows.map(row => {
    return {
      instructor: row.instructor,
      ...mapPerf(row)
    };
  });

  const locationPerformance = locationRes.rows.map(row => {
    return {
      location: row.location,
      ...mapPerf(row)
    };
  });

  return {
    summary: {
      totalAssessments: total,
      passCount: pass,
      failCount: fail,
      disqualifiedCount: disq,
      passRate,
      failRate,
      averageScore: Math.round(avg * 10) / 10
    },
    trend,
    resultDistribution,
    assessmentTypeDistribution: typeRes.rows.map(r => ({ name: r.name, value: parseInt(r.value, 10) })),
    scoreDistribution,
    participantPerformance,
    instructorPerformance,
    locationPerformance
  };
}

module.exports = {
  getSummary
};
