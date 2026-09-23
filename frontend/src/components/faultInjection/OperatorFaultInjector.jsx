import React from 'react';
import { useDigitalTwinStore } from '../../store/useDigitalTwinStore';
import { 
  SlidersHorizontal, 
  Flame, 
  Droplet, 
  Disc, 
  Activity, 
  Radio, 
  RotateCcw,
  Zap
} from 'lucide-react';

export function OperatorFaultInjector() {
  const { faults, toggleFault, resetAllFaults, diagnostics, telemetry } = useDigitalTwinStore();

  const faultDefinitions = [
    {
      id: 'injectorAbnormality',
      name: 'FUEL INJECTOR CLOG / ASYMMETRY',
      desc: 'Simulates lean fuel-air ratio in Cylinder 1 (+95°C EGT spike, severe EGT residual)',
      icon: Droplet,
      isTriggered: faults.injectorAbnormality,
    },
    {
      id: 'ignitionMisfire',
      name: 'IGNITION SPARK MISFIRE (CYL 2)',
      desc: 'Simulates intermittent spark breakdown (unburnt fuel EGT drop -140°C, RPM oscillation)',
      icon: Zap,
      isTriggered: faults.ignitionMisfire,
    },
    {
      id: 'lubricationLeak',
      name: 'LUBRICATION LEAK / LOW OIL PSI',
      desc: 'Simulates oil pump bypass failure (Oil pressure drops to 18 PSI, oil temp rises)',
      icon: Disc,
      isTriggered: faults.lubricationLeak,
    },
    {
      id: 'coolingDegradation',
      name: 'CYLINDER COOLING FIN DEGRADATION',
      desc: 'Simulates cooling fin airflow blockage (CHT rises > 215°C thermal soak)',
      icon: Flame,
      isTriggered: faults.coolingDegradation,
    },
    {
      id: 'abnormalVibration',
      name: 'MECHANICAL BEARING VIBRATION',
      desc: 'Simulates gearbox bearing spalling (Elevated 3-axis vibration to 0.95g RMS)',
      icon: Activity,
      isTriggered: faults.abnormalVibration,
    },
    {
      id: 'sensorDrift',
      name: 'CAN-BUS SENSOR CALIBRATION DRIFT',
      desc: 'Simulates thermocouple signal drift (+28°C artificial offset on bus)',
      icon: Radio,
      isTriggered: faults.sensorDrift,
    },
  ];

  const anyActive = Object.values(faults).some(Boolean);

  return (
    <div className="gcs-panel p-4 flex flex-col gap-4 bg-white border border-[#E2EBE5]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-bold text-slate-900 tracking-wide uppercase">
            OPERATOR ANOMALY & FAULT INJECTION MATRIX
          </span>
        </div>
        {anyActive && (
          <button
            onClick={resetAllFaults}
            className="px-3 py-1.5 rounded-xl bg-[#E8F8EE] hover:bg-[#D4F2DE] text-xs font-bold text-emerald-800 flex items-center gap-1.5 transition-colors border border-[#C7E7D1] shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5 text-emerald-700" />
            RESET TO NOMINAL
          </button>
        )}
      </div>

      <p className="text-xs text-slate-600 font-medium">
        Inject controlled mechanical, thermal, or sensor anomalies to evaluate real-time FADEC reaction, physics residual delta, and XGBoost AI model inference.
      </p>

      {/* Fault Injection Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {faultDefinitions.map((f) => {
          const Icon = f.icon;
          return (
            <div
              key={f.id}
              onClick={() => toggleFault(f.id)}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-200 flex items-start justify-between gap-3 select-none shadow-sm ${
                f.isTriggered
                  ? 'bg-red-50 border-red-300 ring-2 ring-red-200'
                  : 'bg-[#F8FAF9] border-[#E5EDE8] hover:border-emerald-300 hover:bg-[#F0FDF4]'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-xl ${
                  f.isTriggered ? 'bg-red-100 text-red-600' : 'bg-white text-emerald-700 border border-[#D5E5DB]'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-900">
                    {f.name}
                  </span>
                  <p className="text-[11px] text-slate-600 leading-snug font-medium">
                    {f.desc}
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <div className={`w-10 h-6 rounded-full p-0.5 transition-colors mt-0.5 flex-shrink-0 ${
                f.isTriggered ? 'bg-red-500' : 'bg-slate-300'
              }`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                  f.isTriggered ? 'translate-x-4' : 'translate-x-0'
                }`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Live AI Response Feedback */}
      <div className={`p-3.5 rounded-xl border flex flex-col gap-1.5 shadow-sm ${
        anyActive ? 'bg-red-50 border-red-200' : 'bg-[#F8FAF9] border-[#E5EDE8]'
      }`}>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-700 font-bold">DIGITAL TWIN REAL-TIME AI RESPONSE:</span>
          <span className={`font-bold ${anyActive ? 'text-red-700' : 'text-emerald-800'}`}>
            {anyActive ? `FAULT DETECTED: [${diagnostics.predictedFault.toUpperCase()}]` : 'ALL SYSTEMS NOMINAL'}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs font-mono pt-1 text-slate-700">
          <div>Health: <span className="font-bold text-slate-900">{diagnostics.healthScore.toFixed(2)}</span></div>
          <div>Residual: <span className="font-bold text-orange-600">{telemetry.egtResidual.toFixed(1)}°C</span></div>
          <div>RUL: <span className="font-bold text-emerald-800">{diagnostics.estimatedRulHours} hrs</span></div>
        </div>
      </div>
    </div>
  );
}
