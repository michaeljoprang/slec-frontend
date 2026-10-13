# Monitoring API Documentation

## Endpoint
`GET /api/monitoring/summary`

Retrieves aggregated metrics, trends, and distributions based on assessment data. Designed to populate the SLEC monitoring dashboard.

### Query Parameters (Optional)

- `from` (string, format: `YYYY-MM-DD`): Filter assessments from this date (inclusive).
- `to` (string, format: `YYYY-MM-DD`): Filter assessments up to this date (inclusive).
- `assessmentType` (string): Filter by assessment type (e.g., `DDT`).

### Response Structure

```json
{
  "success": true,
  "filters": {
    "from": "2026-01-01",
    "to": "2026-12-31",
    "assessmentType": "DDT"
  },
  "summary": {
    "totalAssessments": 100,
    "passCount": 80,
    "failCount": 20,
    "disqualifiedCount": 0,
    "passRate": 80,
    "failRate": 20,
    "averageScore": 85.5
  },
  "trend": [
    {
      "month": "2026-01",
      "total": 12,
      "pass": 10,
      "fail": 2,
      "averageScore": 84.5
    }
  ],
  "resultDistribution": [
    { "name": "PASS", "value": 80 },
    { "name": "FAIL", "value": 20 }
  ],
  "assessmentTypeDistribution": [
    { "name": "DDT", "value": 100 }
  ],
  "scoreDistribution": [
    { "name": "<60", "value": 5 },
    { "name": "60-69", "value": 15 },
    { "name": "70-79", "value": 30 },
    { "name": "80-89", "value": 40 },
    { "name": "90-100", "value": 10 }
  ],
  "participantPerformance": [
    {
      "participantName": "John Doe",
      "totalAssessments": 2,
      "passCount": 2,
      "failCount": 0,
      "averageScore": 90,
      "passRate": 100,
      "latestAssessmentDate": "2026-02-10T00:00:00.000Z"
    }
  ],
  "instructorPerformance": [
    {
      "instructor": "Jane Smith",
      "totalAssessments": 50,
      "passCount": 40,
      "failCount": 10,
      "averageScore": 85,
      "passRate": 80
    }
  ],
  "locationPerformance": [
    {
      "location": "Jakarta Test Center",
      "totalAssessments": 100,
      "passCount": 80,
      "failCount": 20,
      "averageScore": 85.5,
      "passRate": 80
    }
  ]
}
```

### Aggregation Definitions
- **Summary**: Total counts across all filtered records. Rates are presented as percentages (0-100).
- **Trend**: Grouped by month (`YYYY-MM`) based on the assessment date.
- **Score Distribution**: Fixed bands `<60`, `60-69`, `70-79`, `80-89`, `90-100`.
- **Performance Lists (Participant, Instructor, Location)**: Sorted by `totalAssessments` descending, then alphabetical.

### Error Handling
If invalid dates are provided (e.g. incorrect format, non-existent dates, or `from` > `to`), the API will return a 400 Bad Request status code with a descriptive JSON error payload.
