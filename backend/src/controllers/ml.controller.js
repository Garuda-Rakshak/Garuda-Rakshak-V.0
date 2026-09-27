'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '../../../');
const BACKEND_DIR = path.resolve(__dirname, '../../');

function findFirstExistingFile(candidates) {
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

const NORMAL_CSV_PATH = findFirstExistingFile([
  path.join(ROOT_DIR, 'normal_engine_continuous_dataset.csv'),
  path.join(BACKEND_DIR, 'data', 'normal_engine_continuous_dataset.csv'),
  path.join(process.cwd(), 'normal_engine_continuous_dataset.csv'),
  path.join(process.cwd(), 'data', 'normal_engine_continuous_dataset.csv'),
  path.join(__dirname, '../data', 'normal_engine_continuous_dataset.csv')
]);

const FAULTY_CSV_PATH = findFirstExistingFile([
  path.join(ROOT_DIR, 'faulty_engine_continuous_dataset.csv'),
  path.join(BACKEND_DIR, 'data', 'faulty_engine_continuous_dataset.csv'),
  path.join(process.cwd(), 'faulty_engine_continuous_dataset.csv'),
  path.join(process.cwd(), 'data', 'faulty_engine_continuous_dataset.csv'),
  path.join(__dirname, '../data', 'faulty_engine_continuous_dataset.csv')
]);

const JSON_BACKUP_PATH = findFirstExistingFile([
  path.join(BACKEND_DIR, 'data', 'telemetryDatasets.json'),
  path.join(ROOT_DIR, 'frontend', 'src', 'data', 'telemetryDatasets.json'),
  path.join(process.cwd(), 'data', 'telemetryDatasets.json')
]);

const PYTHON_SCRIPT_PATH = findFirstExistingFile([
  path.join(ROOT_DIR, 'ml', 'ml_api.py'),
  path.join(BACKEND_DIR, 'ml', 'ml_api.py'),
  path.join(process.cwd(), 'ml', 'ml_api.py')
]);

/**
 * Fast helper to parse CSV string into array of structured objects
 */
function parseCsv(filePath, fallbackType = 'normal') {
  if (filePath && fs.existsSync(filePath)) {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const lines = raw.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length >= 2) {
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
      if (rows.length > 0) return rows;
    }
  }

  // Fallback to JSON backup if available
  if (JSON_BACKUP_PATH && fs.existsSync(JSON_BACKUP_PATH)) {
    try {
      const jsonContent = JSON.parse(fs.readFileSync(JSON_BACKUP_PATH, 'utf-8'));
      if (jsonContent[fallbackType] && Array.isArray(jsonContent[fallbackType])) {
        return jsonContent[fallbackType];
      }
    } catch (e) {
      // ignore
    }
  }
  return [];
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
    const normalRows = parseCsv(NORMAL_CSV_PATH, 'normal');
    const faultyRows = parseCsv(FAULTY_CSV_PATH, 'faulty');

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

    const rows = parseCsv(filePath, isFaulty ? 'faulty' : 'normal');
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'DATASET_NOT_FOUND', message: `Dataset ${type} not found` }
      });
    }

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
