#!/usr/bin/env node
/**
 * Phase 5J — Run issue aggregation and write reports.
 */

const path = require('path');
const { aggregateIssues, writeReports } = require('../services/alphaIssueAggregator');

const result = aggregateIssues();
const paths = writeReports(result);
console.log('Issues:', result.issues.length);
console.log('Reports:', paths);
process.exit(0);
