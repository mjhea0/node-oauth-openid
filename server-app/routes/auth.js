const express = require('express');
const uuidv4 = require('uuid/v4');
const jwt = require('jsonwebtoken');
const moment = require('moment');

const router = express.Router();

/*
  Constants
*/

const SECRET_KEY = 'change-me-in-production';
const SERVER_URI = 'http://localhost:3001';


/*
  Data
  TODO: add to a database
*/

const inProgressAuth = [];
const authCodeList = [];
const accessTokenList = [];

const clientList = [
  {
    id: 1,
    name: 'Dummy Client',
    redirect_uri: 'http://localhost:3003/callback',
  },
];

const userList = [
  {
    id: 1,
    email: 'dummy@email.com',
    client: 1,
  },
];

/*
  Helper functions
*/

function getClient(clientID) {
  return clientList.filter(client => parseInt(client.id, 10) === parseInt(clientID, 10))[0];
}

function getUser(userID) {
  return userList.filter(user => parseInt(user.id, 10) === parseInt(userID, 10))[0];
}

function getAuthCode(code) {
  return authCodeList.filter(authCode => authCode.code === code)[0];
}

function verifyAuthorizeQueryParams(params) {
  if (!params.grant || params.grant !== 'code') {
    return 'Invalid Grant Type';
  }
  if (!params.client) {
    return 'Invalid Client';
  }
  if (!params.redirect) {
    return 'Invalid Redirect URI';
  }
  if (!params.scope || params.scope !== 'openid') {
    return 'Invalid Scope';
  }
  if (!params.state) {
    return 'Invalid State';
  }
  return false;
}

function generateAuthorizationCode(userId) {
  return {
    code: uuidv4(),
    createdAt: moment().utc().format(),
    consumed: false,
    user: userId,
  };
}

function validateAuthorizationCode(code) {
  if (!code) {
    return 'Invalid Authorization Code';
  }
  if (code.consumed) {
    return 'Authorization Code has already been used';
  }
  const createdAt = moment.utc(code.createdAt);
  const isValid = createdAt.isValid();
  const expiresAt = createdAt.add(2, 'minutes');
  const currentDateTime = moment.utc();
  const isBefore = currentDateTime.isBefore(expiresAt);
  if (!isValid || !isBefore) {
    return 'Authorization Code has expired';
  }
  return false;
}

/*
  Routes
*/

// eslint-disable-next-line no-unused-vars
router.get('/authorize', (req, res, next) => {
  /*
    (1) Ensure the grant_type, client ID, redirect URI, scope, and state are in the query params
    (2) Force the user to log in
    (3) Ensure the client exists
    (4) Redirect user to the dialog endpoint
  */

  const params = req.query;
  const error = verifyAuthorizeQueryParams(params);
  if (error) {
    return res.status(400).json({
      error: 1,
      msg: error,
    });
  }

  // TODO: force the user to log in

  const client = getClient(params.client);

  if (!client || client.redirect_uri !== params.redirect) {
    return res.status(400).json({
      error: 1,
      msg: 'Invalid Client',
    });
  }

  // TODO: add state to user session object
  inProgressAuth.push(params.state);

  return res.redirect('/oauth/authorize/dialog');
});

// eslint-disable-next-line no-unused-vars
router.get('/authorize/dialog', (req, res, next) => {
  res.render('dialog');
});

// eslint-disable-next-line no-unused-vars
router.post('/authorize/dialog', (req, res, next) => {
  /*
    (1) Ensure the user authorized
    (2) Obtain the redirect uri
    (3) Generate Authorization Code
    (4) Redirect user to redirect uri with the Authorization Code and State
  */

  const params = req.body;

  if (params.validate !== 'Yes') {
    return res.json(400, {
      error: 1,
      msg: 'Not authorized.',
    });
  }

  // TODO: user must be logged in at this point, so you'll
  // have access to their user id
  const userID = 1;

  // get client id
  const clientID = getUser(userID).client;

  // get redirect uri
  const redirectURI = clientList.filter(
    client => parseInt(client.id, 10) === parseInt(clientID, 10),
  )[0].redirect_uri;

  // generate an authorization code
  const authorizationCode = generateAuthorizationCode(userID);
  authCodeList.push(authorizationCode);

  // get state
  const state = inProgressAuth.pop();

  return res.redirect(`${redirectURI}?code=${authorizationCode.code}&state=${state}`);
});

// eslint-disable-next-line no-unused-vars
router.post('/token', (req, res, next) => {
  /*
  (1) Ensure the Authorization Code has not expired or been consumed
  (2) Mark Authorization Code as consumed
  (3) Generate an Access Token (and an optional Refresh Token)
  (4) Respond via JSON with the Access Token, optional Refresh Token,
      and how long the Access Token is good for
  */

  const payload = req.body;
  const authCodeObj = getAuthCode(payload.code);

  const error = validateAuthorizationCode(authCodeObj);

  if (error) {
    return res.status(400).json({
      error: 1,
      msg: error,
    });
  }

  authCodeObj.consumed = true;

  const user = getUser(authCodeObj.user);

  // generate Access Token
  const options = {
    issuer: SERVER_URI,
    subject: (user.id).toString(),
    audience: (user.client).toString(),
    expiresIn: '2 hours',
  };
  const accessToken = jwt.sign({}, SECRET_KEY, options);
  accessTokenList.push(accessToken);

  return res.json({
    token: accessToken,
    expires_in: options.expiresIn,
  });
});

// eslint-disable-next-line no-unused-vars
router.get('/userinfo', (req, res, next) => {
  /*
    (1) Ensure the Authorization Code is valid
    (2) Send back appropriate response
  */

  const token = req.headers.authorization.split(' ')[1];

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(400).json({
        error: 1,
        msg: err,
      });
    }
    const userInfo = getUser(decoded.sub);
    return res.json(userInfo);
  });
});

module.exports = router;
