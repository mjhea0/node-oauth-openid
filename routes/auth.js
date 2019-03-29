const express = require('express');
const uuidv4 = require('uuid/v4');
const jwt = require('jsonwebtoken');

const SECRET_KEY = 'change-me-in-production';

const router = express.Router();

// TODO: move to a db
const clientList = [
  {
    id: 1,
    name: 'Dummy Client',
    redirect_uri: 'http://localhost:3003/callback',
  },
];

// TODO: move to a db
const userList = [
  {
    id: 1,
    email: 'dummy@email.com',
    client: 1,
  },
];

// TODO: move to a db
const authorizationCodeList = [];

// TODO: move to a db
const accessTokenList = [];

const moment = require('moment');

function generateAccessToken(clientID, userID) {
  const dateTime = moment();
  return {
    token: uuidv4(),
    type: 'bearer',
    createdAt: dateTime.format(),
    expiresIn: dateTime.add(2, 'hours').format(),
    consumed: false,
    client: clientID,
    user: userID,
  };
}

function generateAuthorizationCode(userId) {
  return {
    code: uuidv4(),
    createdAt: new Date(),
    consumed: false,
    user: userId,
  };
}

// eslint-disable-next-line no-unused-vars
router.get('/authorize', (req, res, next) => {
  /*
    (1) Verify that the grant type, client ID, redirect URI, user ID are in the query params
    (2) Force the user to log in
    (3) Verify the client
    (4) Verify the user
    (5) Redirect user to the dialog endpoint
    http://localhost:3001/auth/authorize/?grant=code&client=1&redirect=http://localhost:3003/callback&user=1&scope=openid
  */
  const params = req.query;
  // TODO: verify correct query params were sent
  // TODO: force the user to log in
  // TODO: verify client + redirect uri
  if (!params.scope && params.scope !== 'openid') {
    return res.json(400, {
      error: 1,
      msg: 'Invalid Scope.',
    });
  }
  return res.redirect(`/auth/authorize/dialog/?user=${params.user}`);
});

// eslint-disable-next-line no-unused-vars
router.get('/authorize/dialog', (req, res, next) => {
  const params = req.query;
  res.render('dialog', { user: params.user });
});

// eslint-disable-next-line no-unused-vars
router.post('/authorize/dialog', (req, res, next) => {
  const params = req.body;

  if (params.validate !== 'Yay') {
    return res.json(400, {
      error: 1,
      msg: 'Not authorized.',
    });
  }

  // (1) get redirect uri from the client info in db
  const userObj = userList.filter((user) => {
    return parseInt(user.id, 10) === parseInt(params.user, 10);
  })[0];

  const redirectURI = clientList.filter((client) => {
    return parseInt(client.id, 10) === parseInt(userObj.client, 10);
  })[0].redirect_uri;

  if (!redirectURI) {
    return res.json(400, {
      error: 1,
      msg: 'Invalid',
    });
  }

  // (2) generate an authorization code
  // TODO: if grant type is implicit, send back access token
  const authorizationCode = generateAuthorizationCode(userObj.id);
  authorizationCodeList.push(authorizationCode);

  return res.redirect(`${redirectURI}?code=${authorizationCode.code}`);
});

router.post('/token', (req, res, next) => {
  /*
  (1) get grant type, authorization code, client id
  (2) verify authorization code (exists, has not expired, has not been consumed)
  (3) verify the client application
  (4) respond via JSON with the access token, the refresh token (optional), and how long the token is good for

  curl -X POST http://localhost:3001/auth/token \
    -H "Content-Type: application/json" \
    -d '{ "code": "101ea311-7e9a-404a-8988-891aec3d22e8" }'
  */
  const payload = req.body;

  const authorizationCodeObj = authorizationCodeList.filter((authCodes) => {
    return authCodes.code === payload.code;
  })[0];

  if (!authorizationCodeObj) {
    return res.json(400, {
      error: 1,
      msg: 'Not authorized.',
    });
  }
  if (authorizationCodeObj.consumed) {
    return res.json(400, {
      error: 1,
      msg: 'Not authorized.',
    });
  }

  // TODO: update code in authorizationCodeList,
  //  changing consumed to true, possibly add to a black list

  const userObj = userList.filter((user) => {
    return parseInt(user.id, 10) === parseInt(authorizationCodeObj.user, 10);
  })[0];

  if (!userObj) {
    return res.json(400, {
      error: 1,
      msg: 'Invalid user.',
    });
  }

  // TODO: don't hard-code the subject or audience
  const options = {
    issuer: 'http://localhost:3001',
    subject: '1',
    audience: '1',
    expiresIn: '2 hours',
  };
  const accessToken = jwt.sign({ foo: 'bar' }, SECRET_KEY, options);

  // const accessToken = generateAccessToken(userObj.client, userObj.id);

  // TODO: add to db instead
  accessTokenList.push(accessToken);

  return res.json({ token: accessToken });
});

router.get('/userinfo', (req, res, next) => {

  /*
    (1) grab token from the header
    (2) validate token
    (3) send back appropriate response
  */

  console.log('gjgjgjjgjgjg')

  console.log(req.headers)

  const token = req.headers.authorization.split(' ')[1];

  jwt.verify(token, SECRET_KEY, (err, decoded) => {

    if (err) {
      return res.json(400, {
        error: 1,
        msg: 'Invalid token.',
      });
    }
    console.log(decoded)
    return res.json({
      user: decoded.id,
    });
  });

});

module.exports = router;
