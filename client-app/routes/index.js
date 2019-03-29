const express = require('express');
const request = require('request');
const uuidv4 = require('uuid/v4');

const router = express.Router();

/*
  Constants
*/

const AUTH_SERVER_URI = 'http://localhost:3001/oauth';

/*
  Data
  TODO: add to a database
*/

const inProgressAuth = [];

const userList = [
  {
    id: 1,
    email: 'dummy@email.com',
    client: 1,
    accessToken: null,
  },
];

/*
  Routes
*/

// eslint-disable-next-line no-unused-vars
router.get('/', (req, res, next) => {
  res.render('index');
});

// eslint-disable-next-line no-unused-vars
router.post('/', (req, res, next) => {
  const state = uuidv4();
  inProgressAuth.push(state);
  res.redirect(`${AUTH_SERVER_URI}/authorize/?grant=code&client=1&redirect=http://localhost:3003/callback&scope=openid&state=${state}`);
});

// eslint-disable-next-line no-unused-vars
router.get('/callback', (req, res, next) => {
  /*
    (1) Validate the state
    (2) Exchange the Authorization Code for an Access Token
  */

  const params = req.query;
  const state = inProgressAuth.pop();

  if (params.state !== state) {
    return res.status(400).json({
      error: 1,
      msg: 'Not authorized.',
    });
  }

  const authCode = params.code;

  return request({
    uri: `${AUTH_SERVER_URI}/token`,
    method: 'POST',
    json: { code: authCode },
  }, (error, response, body) => {
    if (body.error) {
      return res.status(400).json({
        error: 1,
        msg: 'Not authorized.',
      });
    }

    // eslint-disable-next-line no-console
    console.log('\n/// ACCESS TOKEN ///');
    // eslint-disable-next-line no-console
    console.log(body.token);
    // eslint-disable-next-line no-console
    console.log('/// ACCESS TOKEN ///\n');

    // TODO: user must be logged in at this point, so you'll
    // have access to their user id
    const userID = 1;

    // store token
    // eslint-disable-next-line no-restricted-syntax
    for (const user of userList) {
      if (parseInt(user.id, 10) === userID) {
        user.accessToken = body.token;
      }
    }

    // send response back to the user
    return res.redirect('/user');
  });
});

// eslint-disable-next-line no-unused-vars
router.get('/user', (req, res, next) => {
  // TODO: this endpoint should be restricted to only those who have authorized and authenticated
  res.render('user');
});

// eslint-disable-next-line no-unused-vars
router.post('/user', (req, res, next) => {
  // TODO: this endpoint should be restricted to only those who have authorized and authenticated

  // TODO: user must be logged in at this point, so you'll
  // have access to their user id
  const userID = 1;

  const { accessToken } = userList.filter(user => parseInt(user.id, 10) === userID)[0];


  request({
    uri: `${AUTH_SERVER_URI}/userinfo`,
    method: 'GET',
    headers: { Authorization: `Bearer: ${accessToken}` },
    json: {},
  }, (error, response, body) => {
    if (body.error) {
      // eslint-disable-next-line no-console
      console.log(body);
      return res.status(400).json({
        error: 1,
        msg: 'Not authorized.',
      });
    }
    return res.json(body);
  });
});

// eslint-disable-next-line no-unused-vars
router.get('/ping', (req, res, next) => {
  res.json('pong client!');
});

module.exports = router;
