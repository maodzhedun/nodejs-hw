// src/controllers/authController.js

import bcrypt from 'bcrypt';
import createHttpError from 'http-errors';

import { User } from '../models/user.js';

import { createSession, setSessionCookies } from '../services/auth.js';
import { Session } from '../models/session.js';

// import JWT
import jwt from 'jsonwebtoken';
import { sendMail } from '../utils/sendMail.js';

// Handlebars for email templates
import handlebars from 'handlebars';
import path from 'node:path';
import fs from 'node:fs/promises';

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
  await Session.deleteOne({ userId: user._id });

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

// Request password reset email
export const requestResetEmail = async (req, res, next) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  // If the user does not exist, we return the same neutral response
  // if (!user) {
  //   return res.status(200).json({
  //     message: 'If this email exists, a reset link has been sent',
  //   });
  // }
  // If user not found - less secure but more user friendly
  if (!user) {
    return next(createHttpError(404, 'User not found'));
  }

  // User exists, create a JWT token for password reset
  const resetToken = jwt.sign(
    { sub: user._id, email },
    process.env.JWT_SECRET,
    { expiresIn: '15m' },
  );

  // 1. Create the path to the email template
  const templatePath = path.resolve('src/templates/reset-password-email.html');
  // 2. Read the template file
  const templateSource = await fs.readFile(templatePath, 'utf-8');
  // 3. Compile the template
  const template = handlebars.compile(templateSource);
  // 4. Generate the HTML by passing variables to the template
  const html = template({
    name: user.username,
    link: `${process.env.FRONTEND_DOMAIN}/reset-password?token=${resetToken}`,
  });

  try {
    // Debugging information
    console.log('SMTP_FROM:', process.env.SMTP_FROM);
    console.log('FRONTEND_DOMAIN:', process.env.FRONTEND_DOMAIN);
    console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
    await sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Reset your password',
      // 5. Send the email with the generated
      html,
    });
  } catch (error) {
    console.error('Error sending email:', error);
    next(
      createHttpError(500, 'Failed to send the email, please try again later.'),
    );
    return;
  }

  // We return the same neutral response
  res.status(200).json({
    message: 'Password reset email sent successfully',
  });
};

// Reset user password
export const resetPassword = async (req, res, next) => {
  const { token, password } = req.body;

  // 1. Decode the token
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    // If the token is invalid or expired
    next(createHttpError(401, 'Invalid or expired token'));
    return;
  }

  // 2. Find the user by ID and email from the token payload
  const user = await User.findOne({ _id: payload.sub, email: payload.email });
  if (!user) {
    next(createHttpError(404, 'User not found'));
    return;
  }

  // 3. Update the user's password
  const hashedPassword = await bcrypt.hash(password, 10);
  await User.updateOne({ _id: user._id }, { password: hashedPassword });

  // 4. Delete all existing sessions for this user
  await Session.deleteMany({ userId: user._id });

  // 5. Return a success response
  res.status(200).json({
    message: 'Password reset successfully.',
  });
};
