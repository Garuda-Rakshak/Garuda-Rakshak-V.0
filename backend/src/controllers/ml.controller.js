'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '../../../');
const NORMAL_CSV_PATH = path.join(ROOT_DIR, 'normal_engine_continuous_dataset.csv');
const FAULTY_CSV_PATH = path.join(ROOT_DIR, 'faulty_engine_continuous_dataset.csv');
const PYTHON_SCRIPT_PATH = path.join(ROOT_DIR, 'ml', 'ml_api.py');

/**
 * Fast helper to parse CSV string into array of structured objects
 */
function parseCsv(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  const lines = raw.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.length !== headers.length) continue;

    const rowObj = { rowIndex: i - 1 };
    headers.forEach((h, idx) => {
      const val = values[idx];
      const num = Number(val);
      rowObj[h] = !isNaN(num) && val !== '' ? num : val;
    });
    rows.push(rowObj);
  }
  return rows;
}

/**
 * Execute Python ML inference on sensor payload
 */
function runPythonInference(sensorData) {
  return new Promise((resolve, reject) => {
    const proc = spawn('python', [PYTHON_SCRIPT_PATH], {
      cwd: path.join(ROOT_DIR, 'ml')
    });

    let stdoutData = '';
    let stderrData = '';

    proc.stdout.on('data', chunk => { stdoutData += chunk.toString(); });
    proc.stderr.on('data', chunk => { stderrData += chunk.toString(); });

    proc.on('close', code => {
      if (code === 0) {
        try {
          const parsed = JSON.parse(stdoutData.trim());
          if (parsed.success) {
            return resolve(parsed.result || parsed.results);
          }
          return reject(new Error(parsed.error || 'ML prediction failed'));
        } catch (err) {
          return reject(new Error('Invalid JSON from ML runner: ' + stdoutData));
        }
      } else {
        return reject(new Error(`Python process exited with code ${code}: ${stderrData}`));
      }
    });

    proc.stdin.write(JSON.stringify(sensorData));
    proc.stdin.end();
  });
}

/**
 * GET /api/v1/ml/datasets
 */
exports.getDatasetsInfo = async (req, res, next) => {
  try {
    const normalRows = parseCsv(NORMAL_CSV_PATH);
    const faultyRows = parseCsv(FAULTY_CSV_PATH);

    res.json({
      success: true,
      datasets: {
        normal: {
          id: 'normal',
          title: 'Normal Engine Continuous Telemetry',
          filename: 'normal_engine_continuous_dataset.csv',
          totalRows: normalRows.length,
          status: '100% Nominal Baseline Cruise',
          scenarios: ['Normal continuous telemetry'],
          durationSeconds: normalRows.length
        },
        faulty: {
          id: 'faulty',
          title: 'Faulty Engine Continuous Telemetry (Anomaly Injected)',
          filename: 'faulty_engine_continuous_dataset.csv',
          totalRows: faultyRows.length,
          status: 'Nominal -> Overheating + Injector -> Compound Multi-Fault',
          phases: [
            { rows: '0-50', label: 'Nominal Baseline Flight' },
            { rows: '51-70', label: 'Overheating + Injector Abnormality' },
            { rows: '71-121', label: 'Compound Failure: Lubrication + Severe Vibration' }
          ],
          durationSeconds: faultyRows.length
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/ml/dataset/:type
 */
exports.getDatasetRows = async (req, res, next) => {
  try {
    const { type } = req.params;
    const isFaulty = type === 'faulty';
    const filePath = isFaulty ? FAULTY_CSV_PATH : NORMAL_CSV_PATH;

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: { code: 'DATASET_NOT_FOUND', message: `Dataset ${type} not found at ${filePath}` }
      });
    }

    const rows = parseCsv(filePath);
    res.json({
      success: true,
      datasetType: type,
      totalCount: rows.length,
      rows
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/ml/predict
 */
exports.predictTelemetry = async (req, res, next) => {
  try {
    const sensorData = req.body;
    if (!sensorData || typeof sensorData !== 'object') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_PAYLOAD', message: 'Missing sensor data payload' }
      });
    }

    try {
      const prediction = await runPythonInference(sensorData);
      return res.json({
        success: true,
        source: 'python-ml-engine',
        prediction
      });
    } catch (pyErr) {
      console.warn('Python ML inference fallback:', pyErr.message);
      // Fallback response with calculated metrics
      const detectedFaults = [];
      if (sensorData.cht > 240) detectedFaults.push('overheating');
      if (sensorData.vibration > 3.5) detectedFaults.push('abnormal_vibration');
      if (sensorData.oil_pressure < 45) detectedFaults.push('lubrication_issue');
      
      const isFaulty = detectedFaults.length > 0;
      const predictedHealth = isFaulty ? 0.35 : 0.88;
      const healthStatus = predictedHealth >= 0.8 ? 'Healthy' : predictedHealth >= 0.6 ? 'Moderate' : predictedHealth >= 0.4 ? 'Degraded' : 'Critical';
      
      return res.json({
        success: true,
        source: 'fallback-evaluator',
        warning: pyErr.message,
        prediction: {
          predicted_fault: isFaulty ? detectedFaults[0] : 'normal',
          detected_faults: detectedFaults,
          fault_description: detectedFaults.length > 0 
            ? `Detected: ${detectedFaults.join(', ')}`
            : 'Engine operating normally.',
          predicted_health: predictedHealth,
          health_status: healthStatus,
          predicted_rul_seconds: isFaulty ? 14400 : 126000,
          actual_egt: sensorData.egt || 530,
          expected_egt: 300 + 0.025 * (sensorData.rpm || 5000) + 1.2 * (sensorData.throttle || 60),
          egt_residual: (sensorData.egt || 530) - (300 + 0.025 * (sensorData.rpm || 5000) + 1.2 * (sensorData.throttle || 60)),
          maintenance_action: isFaulty ? 'Schedule maintenance inspection before next mission.' : 'No immediate fault detected. Continue routine monitoring.'
        }
      });
    }
  } catch (err) {
    next(err);
  }
};
