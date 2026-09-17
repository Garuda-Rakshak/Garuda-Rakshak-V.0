'use strict';

const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role:         {
    type:    String,
    enum:    ['engineer', 'reviewer', 'admin'],
    default: 'engineer',
  },
  isActive:     { type: Boolean, default: true },
  lastLogin:    { type: Date },
}, {
  timestamps: true,
  toJSON: {
    transform(_, ret) {
      delete ret.passwordHash; // never expose hash in JSON output
      return ret;
    },
  },
});

UserSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model('User', UserSchema);
