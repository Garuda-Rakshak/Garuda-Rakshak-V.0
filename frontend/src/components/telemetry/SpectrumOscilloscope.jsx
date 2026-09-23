import React, { useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { useDigitalTwinStore } from '../../store/useDigitalTwinStore';
import { Activity } from 'lucide-react';

export function SpectrumOscilloscope() {
  const { history, telemetry } = useDigitalTwinStore();
  const [chartTab, setChartTab] = useState('temp-spectrum'); // 'temp-spectrum' | 'vib-fft' | 'pressure-flow'

  // Temperature Spectrum Chart Option (Dark Theme)
  const tempSpectrumOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#0D1420',
      borderColor: '#1E293B',
      textStyle: { color: '#F8FAFC', fontFamily: 'Inter', fontSize: 12 },
    },
    legend: {
      data: ['CHT 1', 'CHT 2', 'EGT 1', 'EGT 2', 'Expected EGT'],
      textStyle: { color: '#94A3B8', fontFamily: 'Inter', fontSize: 11 },
      top: 0,
      right: 10,
    },
    grid: { left: '3%', right: '3%', bottom: '5%', top: '18%', containLabel: true },
    xAxis: {
      type: 'category',
      data: history.timestamps.length > 0 ? history.timestamps : ['00:00:00'],
      axisLine: { lineStyle: { color: '#1E293B' } },
      axisLabel: { color: '#64748B', fontSize: 10 },
    },
    yAxis: [
      {
        type: 'value',
        name: 'CHT (°C)',
        nameTextStyle: { color: '#10B981', fontSize: 11, fontWeight: 'bold' },
        min: 100,
        max: 250,
        splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } },
        axisLabel: { color: '#64748B', fontSize: 10 },
      },
      {
        type: 'value',
        name: 'EGT (°C)',
        nameTextStyle: { color: '#F97316', fontSize: 11, fontWeight: 'bold' },
        min: 400,
        max: 900,
        splitLine: { show: false },
        axisLabel: { color: '#64748B', fontSize: 10 },
      }
    ],
    series: [
      {
        name: 'CHT 1',
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: history.cht1,
        lineStyle: { color: '#10B981', width: 2.5 },
      },
      {
        name: 'CHT 2',
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: history.cht2,
        lineStyle: { color: '#34D399', width: 2, type: 'dashed' },
      },
      {
        name: 'EGT 1',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        showSymbol: false,
        data: history.egt1,
        lineStyle: { color: '#F97316', width: 2.5 },
      },
      {
        name: 'EGT 2',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        showSymbol: false,
        data: history.egt2,
        lineStyle: { color: '#FB923C', width: 2, type: 'dashed' },
      },
      {
        name: 'Expected EGT',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        showSymbol: false,
        data: history.expectedEgt,
        lineStyle: { color: '#64748B', width: 1.5, type: 'dotted' },
      }
    ]
  };

  const vibX = telemetry?.vibrationX || 0.28;
  const vibY = telemetry?.vibrationY || 0.32;
  const vibZ = telemetry?.vibrationZ || 0.41;

  const vibFftOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#0D1420',
      borderColor: '#1E293B',
      textStyle: { color: '#F8FAFC', fontFamily: 'Inter' },
    },
    grid: { left: '3%', right: '3%', bottom: '5%', top: '15%', containLabel: true },
    xAxis: {
      type: 'category',
      data: ['0.5X Sub', '1X Crank', '1.5X Gear', '2X Cyl Fire', '3X Piston', '4X Valve', 'Bearing High'],
      axisLine: { lineStyle: { color: '#1E293B' } },
      axisLabel: { color: '#94A3B8', fontSize: 10 },
    },
    yAxis: {
      type: 'value',
      name: 'Amplitude (g-RMS)',
      nameTextStyle: { color: '#10B981', fontWeight: 'bold' },
      max: 1.2,
      splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } },
      axisLabel: { color: '#64748B', fontSize: 10 },
    },
    series: [
      {
        name: 'Vibration Amplitude',
        type: 'bar',
        barWidth: '35%',
        data: [
          vibX * 0.3,
          vibZ * 1.1,
          vibY * 0.6,
          vibZ * 0.9,
          vibX * 0.4,
          vibY * 0.35,
          vibZ * 0.25
        ],
        itemStyle: {
          color: (params) => {
            const val = params.value;
            if (val > 0.8) return '#EF4444';
            if (val > 0.5) return '#F97316';
            return '#10B981';
          },
          borderRadius: [4, 4, 0, 0]
        }
      }
    ]
  };

  const pressureFlowOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#0D1420',
      borderColor: '#1E293B',
      textStyle: { color: '#F8FAFC', fontFamily: 'Inter' },
    },
    legend: {
      data: ['Oil Pressure (PSI)', 'Fuel Flow (L/h)'],
      textStyle: { color: '#94A3B8', fontFamily: 'Inter' },
      top: 0,
      right: 10,
    },
    grid: { left: '3%', right: '3%', bottom: '5%', top: '18%', containLabel: true },
    xAxis: {
      type: 'category',
      data: history.timestamps.length > 0 ? history.timestamps : ['00:00:00'],
      axisLine: { lineStyle: { color: '#1E293B' } },
      axisLabel: { color: '#64748B', fontSize: 10 },
    },
    yAxis: [
      {
        type: 'value',
        name: 'Oil PSI',
        nameTextStyle: { color: '#10B981', fontWeight: 'bold' },
        min: 0,
        max: 80,
        splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } },
        axisLabel: { color: '#64748B', fontSize: 10 },
      },
      {
        type: 'value',
        name: 'Fuel L/h',
        nameTextStyle: { color: '#38BDF8', fontWeight: 'bold' },
        min: 0,
        max: 35,
        splitLine: { show: false },
        axisLabel: { color: '#64748B', fontSize: 10 },
      }
    ],
    series: [
      {
        name: 'Oil Pressure (PSI)',
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: history.oilPressure,
        lineStyle: { color: '#10B981', width: 2.5 },
      },
      {
        name: 'Fuel Flow (L/h)',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        showSymbol: false,
        data: history.fuelFlow,
        lineStyle: { color: '#38BDF8', width: 2.5 },
      }
    ]
  };

  return (
    <div className="gcs-panel p-4 flex flex-col gap-3.5 bg-[#0D1420] border border-slate-800">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-slate-100 tracking-wide uppercase">
            PROPULSION OSCILLOSCOPE & SPECTRUM
          </span>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 bg-[#070B12] p-1 rounded-xl border border-slate-800 text-xs shadow-inner">
          <button
            onClick={() => setChartTab('temp-spectrum')}
            className={`px-3 py-1 rounded-lg font-bold transition-all ${
              chartTab === 'temp-spectrum'
                ? 'bg-emerald-600 text-white shadow-sm border border-emerald-500'
                : 'text-slate-400 hover:text-emerald-300 hover:bg-slate-800/60'
            }`}
          >
            THERMAL SPECTRUM
          </button>
          <button
            onClick={() => setChartTab('vib-fft')}
            className={`px-3 py-1 rounded-lg font-bold transition-all ${
              chartTab === 'vib-fft'
                ? 'bg-emerald-600 text-white shadow-sm border border-emerald-500'
                : 'text-slate-400 hover:text-emerald-300 hover:bg-slate-800/60'
            }`}
          >
            VIBRATION FFT
          </button>
          <button
            onClick={() => setChartTab('pressure-flow')}
            className={`px-3 py-1 rounded-lg font-bold transition-all ${
              chartTab === 'pressure-flow'
                ? 'bg-emerald-600 text-white shadow-sm border border-emerald-500'
                : 'text-slate-400 hover:text-emerald-300 hover:bg-slate-800/60'
            }`}
          >
            OIL & FUEL DYNAMICS
          </button>
        </div>
      </div>

      {/* Chart Viewport */}
      <div className="w-full h-56">
        <ReactECharts
          option={
            chartTab === 'temp-spectrum'
              ? tempSpectrumOption
              : chartTab === 'vib-fft'
              ? vibFftOption
              : pressureFlowOption
          }
          style={{ height: '100%', width: '100%' }}
          notMerge={true}
          lazyUpdate={true}
        />
      </div>
    </div>
  );
}
