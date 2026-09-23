import React, { useState } from 'react';
import { useDigitalTwinStore } from '../../store/useDigitalTwinStore';
import { 
  FileText, 
  Download, 
  Printer 
} from 'lucide-react';

export function MissionHealthDossier() {
  const { telemetry, diagnostics, history } = useDigitalTwinStore();
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const handleExportJson = () => {
    const reportData = {
      platform: "GARUDA-RAKSHAK MALE-UAV TAPAS-BH-201",
      powerplant: "AERO-PISTON DUAL-OPPOSED TURBOCHARGED 1352cc",
      timestamp: new Date().toISOString(),
      flightSummary: {
        operatingHours: telemetry.engineOperatingHours,
        flightTimeSeconds: telemetry.flightTimeSeconds,
        finalRpm: telemetry.rpm,
        cht1: telemetry.cht1,
        cht2: telemetry.cht2,
        egt1: telemetry.egt1,
        egt2: telemetry.egt2,
        oilPressurePsi: telemetry.oilPressurePsi,
        fuelRemainingLiters: telemetry.fuelRemainingLiters,
        vibrationMean: telemetry.vibrationMean,
      },
      aiDiagnostics: {
        healthIndex: diagnostics.healthScore,
        healthStatus: diagnostics.healthStatus,
        predictedFault: diagnostics.predictedFault,
        estimatedRulHours: diagnostics.estimatedRulHours,
        maintenanceDirective: diagnostics.maintenanceDirective,
        topShapAttributions: diagnostics.topShapAttributions,
      },
      telemetryHistorySamples: history.timestamps.length,
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `garuda-rakshak-dossier-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  const componentsWear = [
    { name: 'Cylinder 1 & 2 Piston Rings', wearPercent: 18, status: 'EXCELLENT', mtbfHours: 900 },
    { name: 'Exhaust Valves & Seats', wearPercent: 24, status: 'GOOD', mtbfHours: 850 },
    { name: 'Turbocharger Impeller & Bearings', wearPercent: 32, status: 'GOOD', mtbfHours: 650 },
    { name: 'Oil Scavenge Pump & Relief Valve', wearPercent: 12, status: 'EXCELLENT', mtbfHours: 1200 },
    { name: 'Dual Spark Plugs & Ignition Leads', wearPercent: 41, status: 'MODERATE', mtbfHours: 400 },
    { name: 'Electronic Fuel Injector Nozzles', wearPercent: 19, status: 'EXCELLENT', mtbfHours: 750 },
  ];

  return (
    <div className="gcs-panel p-6 flex flex-col gap-6 bg-white border border-[#E2EBE5]">
      {/* Header & Export Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-[#E2EBE5]">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#E8F8EE] border border-[#C7E7D1] flex items-center justify-center text-emerald-800 shadow-sm">
            <FileText className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              MISSION PROPULSION HEALTH DOSSIER & RELIABILITY AUDIT
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Platform ID: TAPAS-BH-201 • Powerplant: Dual-Opposed Aero-Piston 1352cc
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportJson}
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-2 hover:bg-emerald-500 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            {downloadSuccess ? 'EXPORTED JSON' : 'EXPORT TELEMETRY (JSON)'}
          </button>
          <button
            onClick={handlePrint}
            className="gcs-button py-2 px-3.5 text-xs flex items-center gap-2"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            PRINT DOSSIER
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-[#F8FAF9] border border-[#E5EDE8] flex flex-col gap-1 shadow-sm">
          <span className="text-[11px] text-slate-500 font-medium">PROPULSION HEALTH SCORE</span>
          <span className="text-xl font-mono font-bold text-emerald-800">
            {diagnostics.healthScore.toFixed(2)} / 1.00 ({diagnostics.healthPercent}%)
          </span>
          <span className="text-xs text-slate-600 font-medium">Status: {diagnostics.healthStatus}</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#F8FAF9] border border-[#E5EDE8] flex flex-col gap-1 shadow-sm">
          <span className="text-[11px] text-slate-500 font-medium">PREDICTED RUL</span>
          <span className="text-xl font-mono font-bold text-slate-900">
            {diagnostics.estimatedRulHours} operating hours
          </span>
          <span className="text-xs text-slate-600 font-medium">Est. ~{Math.floor(diagnostics.estimatedRulHours / 4.5)} Sorties</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#F8FAF9] border border-[#E5EDE8] flex flex-col gap-1 shadow-sm">
          <span className="text-[11px] text-slate-500 font-medium">CUMULATIVE RUNTIME</span>
          <span className="text-xl font-mono font-bold text-slate-900">
            {telemetry.engineOperatingHours.toFixed(1)} hrs
          </span>
          <span className="text-xs text-slate-600 font-medium">Sortie: {Math.floor(telemetry.flightTimeSeconds / 60)} mins</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#F8FAF9] border border-[#E5EDE8] flex flex-col gap-1 shadow-sm">
          <span className="text-[11px] text-slate-500 font-medium">ACTIVE FAULT STATUS</span>
          <span className={`text-xl font-mono font-bold uppercase ${
            (diagnostics.predictedFault === 'nominal' || diagnostics.predictedFault === 'normal') ? 'text-emerald-700' : 'text-red-600'
          }`}>
            {(diagnostics.predictedFault === 'nominal' || diagnostics.predictedFault === 'normal') ? 'NOMINAL' : diagnostics.predictedFault.replace(/_/g, ' ')}
          </span>
          <span className="text-xs text-slate-600 font-medium">Confidence: {(diagnostics.faultConfidence * 100).toFixed(0)}%</span>
        </div>
      </div>

      {/* Component Wear Table */}
      <div className="flex flex-col gap-2.5">
        <span className="text-xs font-bold text-slate-900 tracking-wide uppercase">
          SUB-ASSEMBLY MECHANICAL WEAR & RELIABILITY METRICS
        </span>
        <div className="border border-[#E5EDE8] rounded-xl overflow-hidden bg-white shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F0F6F2] text-slate-600 border-b border-[#E2EBE5] text-[11px] uppercase tracking-wider font-bold">
              <tr>
                <th className="p-3">Component</th>
                <th className="p-3">Wear Accumulation</th>
                <th className="p-3">MTBF Limit</th>
                <th className="p-3">Reliability Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EDE8]">
              {componentsWear.map((c, i) => (
                <tr key={`comp-${i}`} className="hover:bg-emerald-50/50 transition-colors">
                  <td className="p-3 text-slate-800 font-semibold">{c.name}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-28 bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full ${
                            c.wearPercent > 50 ? 'bg-orange-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${c.wearPercent}%` }}
                        />
                      </div>
                      <span className="text-slate-700 font-mono text-xs font-bold">{c.wearPercent}%</span>
                    </div>
                  </td>
                  <td className="p-3 text-slate-600 font-mono">{c.mtbfHours} hrs</td>
                  <td className="p-3">
                    <span className="text-[10px] font-bold text-emerald-800 px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-300">
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ground-Crew Protocol */}
      <div className="p-4 rounded-xl bg-[#F8FAF9] border border-[#E5EDE8] flex flex-col gap-2 shadow-sm">
        <span className="text-xs font-bold text-emerald-900 tracking-wide uppercase">
          GROUND-CREW PRE-SORTIE DIRECTIVE
        </span>
        <p className="text-xs text-slate-700 leading-relaxed font-medium">
          {diagnostics.maintenanceDirective.action}
        </p>
      </div>
    </div>
  );
}
