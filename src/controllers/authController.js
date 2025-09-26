// src/controllers/authController.js

import bcrypt from "bcrypt";
import createHttpError from 'http-errors';

import { User } from '../models/user.js';

import { createSession,setSessionCookies } from '../services/auth.js';
import { Session } from "../models/session.js";


// Register a new user
export const registerUser = async (req, res, next) => {
  const { email, password } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(createHttpError(400, 'Email in use'));
  }

  // Hashed password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create new user
  const newUser = await User.create({
    email,
    password: hashedPassword,
  });

  // Create session for the new user
  const newSession = await createSession(newUser._id);

  // We call, transfer the response object and session to set cookies
  setSessionCookies(res, newSession);

  res.status(201).json(newUser);
};


// Login existing user
export const loginUser = async (req, res, next) => {
  const { email, password } = req.body;

	// We check whether a user with this email address exists.
  const user = await User.findOne({ email });
  if (!user) {
    return next(createHttpError(401, 'User not found'));
  }

	// We compare password hashes
  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    return next(createHttpError(401, 'Invalid credentials'));
  }

  //Delete old sessions user
  await Session.deleteOne({userId: user._id});

  // Create new session for the user;
  const newSession = await createSession(user._id);

  // We call, transfer the response object and session to set cookies
    setSessionCookies(res, newSession);

  res.status(200).json(user);
};


// Logout user
export const logoutUser = async (req, res) => {
  const { sessionId } = req.cookies;

  if (sessionId) {
    await Session.deleteOne({ _id: sessionId });
  }

  res.clearCookie('sessionId');
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');

  res.status(204).send();
};


// Refresh user session
export const refreshUserSession = async (req, res, next) => {
  // 1. Find the current session by session ID and refresh token
  const session = await Session.findOne({
    _id: req.cookies.sessionId,
    refreshToken: req.cookies.refreshToken,
  });

  // 2. If there is no such session, return an error.
  if (!session) {
    return next(createHttpError(401, 'Session not found'));
  }

  // 3. If the session exists, check the validity of the refresh token.
  const isSessionTokenExpired =
    new Date() > new Date(session.refreshTokenValidUntil);

  // If the refresh token has expired, return an error.
  if (isSessionTokenExpired) {
    return next(createHttpError(401, 'Session token expired'));
  }

  // 4. If all checks are successful, delete the current session.
  await Session.deleteOne({
    _id: req.cookies.sessionId,
    refreshToken: req.cookies.refreshToken,
  });

  // 5. Create a new session and add a cookie.
  const newSession = await createSession(session.userId);
  setSessionCookies(res, newSession);

  res.status(200).json({
    message: 'Session refreshed',
  });
};