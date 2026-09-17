'use strict';

const mongoose = require('mongoose');

// Hourly climatology record for a given month and hour
const ClimatologyRecordSchema = new mongoose.Schema({
  month:         { type: Number, min: 1, max: 12 },  // 1=Jan … 12=Dec
  hour:          { type: Number, min: 0, max: 23 },  // 0–23 UTC hour
  meanAmbientC:  { type: Number },                   // °C
  meanDNI_Wm2:   { type: Number },                   // W/m² Direct Normal Irradiance
  meanWindMs:    { type: Number, default: 3.0 },      // m/s
}, { _id: false });

const WeatherStationSchema = new mongoose.Schema({
  stationName:        { type: String, required: true, unique: true },
  lat:                { type: Number, required: true },
  lon:                { type: Number, required: true },
  altitude_m:         { type: Number, required: true },
  hourlyClimatology:  { type: [ClimatologyRecordSchema], default: [] },
}, {
  timestamps: true,
});

WeatherStationSchema.index({ stationName: 1 });
WeatherStationSchema.index({ lat: 1, lon: 1 });

module.exports = mongoose.model('WeatherStation', WeatherStationSchema);
