// src/models/user.js

import { model, Schema } from 'mongoose';

const userSchema = new Schema(
  {
    username: { type: String, required: false },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
  },
  { timestamps: true, versionKey: false },
);

userSchema.pre('save', function (next) {
  if (!this.username) {
    this.username = this.email;
  }
  next();
});

// Override toJSON method to hide password field
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

export const User = model('User', userSchema);

