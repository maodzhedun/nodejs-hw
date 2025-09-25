// src/middleware/authenticate.js

import createHttpError from 'http-errors';
import { Session } from '../models/session.js';
import { User } from '../models/user.js';

export const authenticate = async (req, res, next) => {
  // 1. Checking for the presence of accessToken
  if (!req.cookies.accessToken) {
    next(createHttpError(401, 'Missing access token'));
    return;
  }

  // 2.  If the access token exists, search for the session
  const session = await Session.findOne({
    accessToken: req.cookies.accessToken,
  });

  // 3. If there is no such session, return an error.
  if (!session) {
    next(createHttpError(401, 'Session not found'));
    return;
  }

  // 4. Check the validity period of the access token.
  const isAccessTokenExpired =
    new Date() > new Date(session.accessTokenValidUntil);

  if (isAccessTokenExpired) {
    return next(createHttpError(401, 'Access token expired'));
  }

  // 5. If everything is fine with the token and the session exists, search for the user.
  const user = await User.findById(session.userId);

  // 6. If the user is not found,
  if (!user) {
    next(createHttpError(401));
    return;
  }

  // 7. If the user exists, add them to the request.
  req.user = user;

  // 8. Pass control on.
  next();
};
