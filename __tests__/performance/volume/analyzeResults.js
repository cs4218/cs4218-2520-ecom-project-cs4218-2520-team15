/*
  * Name: Lim Jin Yin
  * Student ID: A0256976H
*/

/**
 * AI-Driven Performance Analysis System
 * 
 * Analyzes k6 test results (NDJSON format) and provides intelligent insights.
 * Detects performance degradation patterns, identifies bottlenecks, and suggests optimizations.
 * 
 * Supports LLM analysis using Google Generative AI (Gemini) when GEMINI_API_KEY is available.
 * Falls back to local analysis if API key is not set or LLM fails.
 * 
 * Usage:
 *   node performance/analyzeResults.js [stage]
 *   stage: 'baseline', 'smoke', 'volume', or 'all' (default: 'all')
 * 
 * Environment:
 *   GEMINI_API_KEY - (optional) Google Generative AI API key for LLM-powered analysis
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { report } from "process";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.dirname(__dirname);

// Lazy-load Gemini SDK (only if API key is present)
let GoogleGenerativeAI;
let genAI = null;

async function initializeGemini() {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }

  try {
    if (!GoogleGenerativeAI) {
      const module = await import("@google/generative-ai");
      GoogleGenerativeAI = module.GoogleGenerativeAI;
    }
    return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  } catch (error) {
    console.warn("⚠️  Failed to load Gemini SDK. Using local analysis instead.");
    return null;
  }
}

// ============================================================================
// 1. K6 NDJSON RESULTS EXTRACTION
// ============================================================================

/**
 * Parse k6 NDJSON format and extract metrics
 * K6 outputs newline-delimited JSON with metric definitions and data points
 */
function parseK6NDJSON(jsonPath) {
  if (!fs.existsSync(jsonPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(jsonPath, "utf8");
    const lines = content.trim().split("\n").filter(l => l.trim());
    
    const dataPoints = {};
    const metricDefinitions = {};

    // Parse all NDJSON lines
    for (const line of lines) {
      try {
        const obj = JSON.parse(line);
        
        // Store metric definitions
        if (obj.type === "Metric" && obj.data) {
          const name = obj.data.name;
          if (name) {
            metricDefinitions[name] = {
              type: obj.data.type,
              contains: obj.data.contains
            };
          }
        }
        
        // Collect data points
        if (obj.type === "Point" && obj.metric && obj.data) {
          if (!dataPoints[obj.metric]) {
            dataPoints[obj.metric] = [];
          }
          dataPoints[obj.metric].push(obj.data);
        }
      } catch (e) {
        // Skip unparseable lines
      }
    }

    // Calculate statistics from raw data points
    return calculateStatisticsFromDataPoints(dataPoints, metricDefinitions);
  } catch (error) {
    console.error(`Error parsing ${jsonPath}:`, error.message);
    return null;
  }
}

/**
 * Calculate percentiles and statistics from raw k6 data points
 */
function calculateStatisticsFromDataPoints(dataPoints, metricDefinitions) {
  const results = {};
  const endpointMetrics = {};

  for (const [metricName, points] of Object.entries(dataPoints)) {
    // Group points by endpoint if available
    if (metricName === "http_req_duration") {
      // Extract endpoint-specific data from tags
      for (const point of points) {
        const endpoint = point.tags?.endpoint;
        if (endpoint) {
          if (!endpointMetrics[endpoint]) {
            endpointMetrics[endpoint] = [];
          }
          if (typeof point.value === "number") {
            endpointMetrics[endpoint].push(point.value);
          }
        }
      }
    }

    // Extract numeric values
    const values = points
      .map(p => p.value)
      .filter(v => typeof v === "number")
      .sort((a, b) => a - b);

    if (values.length === 0) continue;

    // Calculate percentiles
    const percentile = (p) => {
      const index = Math.ceil((p / 100) * values.length) - 1;
      return values[Math.max(0, index)] || 0;
    };

    results[metricName] = {
      p50: percentile(50),
      p90: percentile(90),
      p95: percentile(95),
      p99: percentile(99),
      min: values[0],
      max: values[values.length - 1],
      avg: values.reduce((a, b) => a + b) / values.length,
      count: values.length
    };
  }

  // Calculate endpoint-level metrics
  for (const [endpoint, values] of Object.entries(endpointMetrics)) {
    if (values.length === 0) continue;

    values.sort((a, b) => a - b);
    const percentile = (p) => {
      const index = Math.ceil((p / 100) * values.length) - 1;
      return values[Math.max(0, index)] || 0;
    };

    const key = `http_req_duration{endpoint:${endpoint}}`;
    results[key] = {
      p50: percentile(50),
      p90: percentile(90),
      p95: percentile(95),
      p99: percentile(99),
      min: values[0],
      max: values[values.length - 1],
      avg: values.reduce((a, b) => a + b) / values.length,
      count: values.length
    };
  }

  return {
    metrics: results,
    timestamp: new Date().toISOString()
  };
}

/**
 * Get k6 results file path based on stage
 */
function getK6ResultsPath(stage) {
  const resultsDir = path.join(PROJECT_ROOT, "volume", "results");
  const filePath = path.join(resultsDir, `${stage}-results.json`);
  return fs.existsSync(filePath) ? filePath : null;
}

// ============================================================================
// 2. STRUCTURED DATA EXTRACTION
// ============================================================================

/**
 * Extract endpoint-level metrics from raw k6 data
 */
function extractEndpointMetrics(results) {
  const endpoints = {};

  if (!results || !results.metrics) {
    return endpoints;
  }

  for (const [key, metric] of Object.entries(results.metrics)) {
    // Parse endpoint from metric key
    // Format: http_req_duration{endpoint:endpoint-name}
    const match = key.match(/endpoint:([^}]+)/);
    if (match) {
      const endpoint = match[1];
      endpoints[endpoint] = metric;
    }
  }

  return endpoints;
}

/**
 * Build comprehensive performance summary
 */
function buildPerformanceSummary(allResults) {
  const summary = {
    overview: {},
    endpoints: {},
    degradation: {},
    systemLimitations: []
  };

  for (const [stage, results] of Object.entries(allResults)) {
    if (!results) continue;

    const endpoints = extractEndpointMetrics(results);

    // Calculate stage-level metrics
    summary.overview[stage] = {
      stage,
      timestamp: results.timestamp,
      slowestEndpoint: null,
      slowestEndpointP95: 0,
      fastestEndpoint: null,
      fastestEndpointP95: Infinity,
      endpointCount: Object.keys(endpoints).length
    };

    // Aggregate endpoint metrics
    const endpointStats = [];
    for (const [endpoint, metric] of Object.entries(endpoints)) {
      if (!summary.endpoints[endpoint]) {
        summary.endpoints[endpoint] = {};
      }

      summary.endpoints[endpoint][stage] = metric;
      endpointStats.push({ endpoint, ...metric });
    }

    // Find slowest and fastest endpoints
    if (endpointStats.length > 0) {
      endpointStats.sort((a, b) => (b.p95 || 0) - (a.p95 || 0));
      summary.overview[stage].slowestEndpoint = endpointStats[0].endpoint;
      summary.overview[stage].slowestEndpointP95 = endpointStats[0].p95 || 0;
      
      endpointStats.sort((a, b) => (a.p95 || 0) - (b.p95 || 0));
      summary.overview[stage].fastestEndpoint = endpointStats[0].endpoint;
      summary.overview[stage].fastestEndpointP95 = endpointStats[0].p95 || 0;
    }
  }

  // Detect degradation between baseline and volume
  if (allResults.baseline && allResults.volume) {
    const baselineEndpoints = extractEndpointMetrics(allResults.baseline);
    const volumeEndpoints = extractEndpointMetrics(allResults.volume);

    for (const [endpoint, volumeMetric] of Object.entries(volumeEndpoints)) {
      if (baselineEndpoints[endpoint]) {
        const baselineP95 = baselineEndpoints[endpoint].p95 || 0;
        const volumeP95 = volumeMetric.p95 || 0;

        if (baselineP95 > 0) {
          const degradation = ((volumeP95 - baselineP95) / baselineP95) * 100;

          if (degradation > 0) {
            summary.degradation[endpoint] = {
              baseline: baselineP95,
              volume: volumeP95,
              degradationPercent: degradation,
              severity: degradation > 50 ? "critical" : degradation > 25 ? "high" : "medium"
            };
          }
        }
      }
    }
  }

  // Detect system limitations
  summary.systemLimitations = detectSystemLimitations(allResults, summary);

  return summary;
}

/**
 * Detect system limitations and bottlenecks
 */
function detectSystemLimitations(allResults, summary) {
  const limitations = [];

  for (const [endpoint, stages] of Object.entries(summary.endpoints)) {
    if (stages.baseline && stages.baseline.p95 > 1000) {
      limitations.push({
        type: "consistently_slow",
        endpoint,
        p95Baseline: stages.baseline.p95
      });
    }
  }

  return limitations;
}

// ============================================================================
// 3. LLM ANALYSIS (OPTIONAL)
// ============================================================================

/**
 * Generate analysis using Gemini LLM
 * Falls back to local analysis if API key is not available or LLM fails
 */
async function generateLLMAnalysis(summary) {
  const ai = await initializeGemini();
  
  if (!ai) {
    return null;
  }

  try {
    const prompt = buildGeminiPrompt(summary);
    
    const model = ai.getGenerativeModel({
      model: "gemini-flash-latest",
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 4096
      }
    });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    if (!text) {
      console.warn("⚠️  Gemini returned empty response");
      return null;
    }

    return text;
  } catch (error) {
    console.warn(`⚠️  Gemini API error: ${error.message}`);
    return null;
  }
}

/**
 * Build structured prompt for Gemini analysis
 */
function buildGeminiPrompt(summary) {
  const summaryJson = JSON.stringify(summary, null, 2);

  return `You are a senior performance engineer with expertise in system optimization and scalability.

Analyze the following k6 performance testing data and generate a comprehensive performance analysis report.

## Instructions
- Provide clear, actionable insights
- Identify bottlenecks and root causes, but avoid speculation
- Assess scalability and system limitations
- Recommend specific optimizations with estimated impact
- Use markdown formatting for readability

## Performance Data
${summaryJson}

## Required Sections
Provide analysis with these sections in markdown format:

1. **Performance Overview** - Summary of system performance across test stages
2. **Slow Endpoints** - List endpoints with high latency and why they're slow
3. **Degradation Analysis** - How performance changes from baseline to volume testing
4. **Scalability Assessment** - Can the system handle increased load?
5. **System Limitations** - Architecture or infrastructure constraints
6. **Root Cause Analysis** - Why are slow endpoints slow?
7. **Optimization Recommendations** - Specific, prioritized improvements
8. **Risk Assessment** - Critical issues needing immediate attention

Write a professional, data-driven analysis that would be useful for developers, DevOps engineers, and product managers to decide what to do next.`;
}

// ============================================================================
// 3. LOCAL ANALYSIS (FALLBACK)
// ============================================================================

/**
 * Generate analysis without LLM (fallback/free version)
 */
function generateLocalAnalysis(summary) {
  let analysis = "# K6 Performance Analysis Report\n\n";
  analysis += `Generated: ${new Date().toISOString()}\n\n`;

  // Performance Summary
  analysis += "## Performance Summary\n";
  const overview = summary.overview;
  const stages = Object.keys(overview);
  if (stages.length > 0) {
    const latestStage = overview[stages[stages.length - 1]];
    analysis += `System tested across ${stages.length} stage(s): ${stages.join(", ")}. `;
    analysis += `${latestStage.endpointCount} endpoints tested. `;
    if (Object.keys(summary.degradation).length > 0) {
      analysis += "Performance degradation detected between baseline and volume tests.\n\n";
    } else {
      analysis += "Performance stable across test stages.\n\n";
    }
  }

  // Slow Endpoints
  analysis += "## Slow Endpoints Identified\n";
  const slowEndpoints = Object.entries(summary.endpoints)
    .map(([name, stages]) => {
      const baseline = stages.baseline?.p95 || 0;
      const volume = stages.volume?.p95 || 0;
      const p95 = Math.max(baseline, volume);
      return { name, p95, baseline, volume };
    })
    .filter(e => e.p95 > 500)
    .sort((a, b) => b.p95 - a.p95);

  if (slowEndpoints.length > 0) {
    slowEndpoints.forEach(ep => {
      analysis += `- **${ep.name}**: p95=${Math.round(ep.p95)}ms`;
      if (ep.baseline > 0 && ep.volume > 0) {
        const degradation = ((ep.volume - ep.baseline) / ep.baseline * 100).toFixed(1);
        analysis += ` (baseline: ${Math.round(ep.baseline)}ms, volume: ${Math.round(ep.volume)}ms, +${degradation}%)`;
      }
      analysis += "\n";
    });
    analysis += "\n";
  } else {
    analysis += "No endpoints exceed 500ms p95 latency - good performance across the board.\n\n";
  }

  // Degradation Analysis
  analysis += "## Degradation Analysis\n";
  if (Object.keys(summary.degradation).length > 0) {
    const degradations = Object.entries(summary.degradation)
      .map(([endpoint, data]) => ({ endpoint, ...data }))
      .sort((a, b) => b.degradationPercent - a.degradationPercent);

    degradations.forEach(d => {
      analysis += `- **${d.endpoint}**: ${d.degradationPercent.toFixed(1)}% degradation `;
      analysis += `(baseline: ${Math.round(d.baseline)}ms → volume: ${Math.round(d.volume)}ms) `;
      analysis += `[${d.severity.toUpperCase()}]\n`;
    });
    analysis += "\n";
  } else {
    analysis += "No significant degradation detected between baseline and volume tests.\n\n";
  }

  // Scalability Assessment
  analysis += "## Scalability Assessment\n";
  if (stages.includes("baseline") && stages.includes("volume")) {
    const criticalDegradations = Object.values(summary.degradation)
      .filter(d => d.severity === "critical").length;

    if (criticalDegradations === 0) {
      analysis += "System scales well from baseline to volume load. No critical performance issues detected.\n\n";
    } else if (criticalDegradations <= 2) {
      analysis += `System has limited scalability. ${criticalDegradations} endpoint(s) show critical degradation under volume load.\n\n`;
    } else {
      analysis += `System has poor scalability. ${criticalDegradations} endpoints show critical degradation under volume load. Immediate optimization needed.\n\n`;
    }
  } else {
    analysis += "Insufficient data to assess scalability (requires baseline and volume tests).\n\n";
  }

  // System Limitations
  analysis += "## System Limitations\n";
  if (summary.systemLimitations.length > 0) {
    summary.systemLimitations.forEach(limit => {
      if (limit.type === "consistently_slow") {
        analysis += `- **${limit.endpoint}** is slow even at baseline (p95=${Math.round(limit.p95Baseline)}ms). Consider caching, indexing, or query optimization.\n`;
      }
    });
    analysis += "\n";
  } else {
    analysis += "No major system limitations detected.\n\n";
  }

  // Optimization Recommendations
  analysis += "## Optimization Recommendations\n";
  analysis += generateRecommendations(summary);

  return analysis;
}

/**
 * Generate optimization recommendations
 */
function generateRecommendations(summary) {
  const recommendations = [];

  const slowEndpoints = Object.entries(summary.endpoints)
    .filter(([_, stages]) => stages.baseline?.p95 > 500 || stages.volume?.p95 > 500)
    .map(([name, stages]) => ({
      name,
      p95: Math.max(stages.baseline?.p95 || 0, stages.volume?.p95 || 0)
    }));

  if (slowEndpoints.length > 0) {
    slowEndpoints.forEach((ep, i) => {
      recommendations.push(`${i + 1}. **Optimize ${ep.name}**: Currently ${Math.round(ep.p95)}ms p95. Consider:\n   - Add database indexes\n   - Implement response caching\n   - Profile queries for N+1 problems`);
    });
  }

  recommendations.push(`${recommendations.length + 1}. **Implement pagination**: Limit default page size for list endpoints to reduce payload.`);
  recommendations.push(`${recommendations.length + 1}. **Add HTTP caching**: Implement ETag and Cache-Control headers for read endpoints.`);

  return recommendations.join("\n\n") + "\n\n";
}

// ============================================================================
// 4. REPORT GENERATION
// ============================================================================

/**
 * Write analysis to file
 */
function writeReport(analysis, stage = "all") {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportDir = path.join(PROJECT_ROOT, "volume", "report");  
  const reportPath = path.join(
    reportDir,
    `performance-analysis-${stage}-${timestamp}.md`
  );

  fs.writeFileSync(reportPath, analysis);
  console.log(`\n📄 Report saved: ${reportPath}`);

  return reportPath;
}

// ============================================================================
// 5. MAIN EXECUTION
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  let stage = args[0] || "all";

  if (!["baseline", "smoke", "volume", "all"].includes(stage)) {
    console.error(`Invalid stage: ${stage}. Use: baseline, smoke, volume, or all`);
    process.exit(1);
  }

  console.log("\n🔍 K6 Performance Analysis System");
  console.log("==================================\n");

  const allResults = {};
  const stagesToAnalyze = stage === "all" ? ["baseline", "smoke", "volume"] : [stage];

  // Extract test results
  for (const s of stagesToAnalyze) {
    console.log(`📥 Loading results for: ${s}`);

    const resultsPath = getK6ResultsPath(s);

    if (resultsPath) {
      const results = parseK6NDJSON(resultsPath);
      if (results) {
        allResults[s] = results;
        console.log(`   ✓ Loaded: ${Object.keys(results.metrics).length} metrics`);
      } else {
        console.log(`   ⚠️  Could not parse results`);
      }
    } else {
      console.log(`   ⚠️  Results file not found`);
    }
  }

  if (Object.keys(allResults).length === 0) {
    console.error("❌ No test results found or could not parse them");
    process.exit(1);
  }

  // Build performance summary
  console.log("\n📊 Analyzing performance data...");
  const summary = buildPerformanceSummary(allResults);

  // Generate analysis with LLM or fallback to local
  let analysis;

  if (process.env.GEMINI_API_KEY) {
    console.log("\n🤖 Using Gemini LLM for analysis...");
    try {
      const llmAnalysis = await generateLLMAnalysis(summary);
      if (llmAnalysis) {
        analysis = llmAnalysis;
        console.log("   ✓ LLM analysis generated successfully");
      } else {
        console.log("   ⚠️  Gemini analysis failed, using local fallback...");
        analysis = generateLocalAnalysis(summary);
      }
    } catch (error) {
      console.log("   ⚠️  Gemini analysis error, using local fallback...");
      analysis = generateLocalAnalysis(summary);
    }
  } else {
    console.log("\n⚠️  No GEMINI_API_KEY found, using local analysis...");
    analysis = generateLocalAnalysis(summary);
  }

  // Save report
  const reportPath = writeReport(analysis, stage);

  // Print summary
  console.log("\n✅ Analysis Complete!");
  console.log(`\n📋 Summary:`);
  for (const [s, overview] of Object.entries(summary.overview)) {
    console.log(`   ${s}: ${overview.endpointCount} endpoints, slowest: ${overview.slowestEndpoint} (${Math.round(overview.slowestEndpointP95)}ms p95)`);
  }

  console.log(`\n🔗 Full report: ${reportPath}`);
}

main().catch(error => {
  console.error("❌ Error:", error.message);
  process.exit(1);
});
