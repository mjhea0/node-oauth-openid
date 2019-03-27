const express = require('express');

const router = express.Router();

// eslint-disable-next-line no-unused-vars
router.get('/authorize', (req, res, next) => {
  /*
    (1) Verify that the grant type, client ID, redirect URI, user ID are in the query params
    (2) Force the user to log in
    (3) Verify the client
    (4) Verify the user
    (5) Redirect user to the dialog endpoint
  */
  const params = req.query;
  // TODO: verify correct query params were sent
  // TODO: force the user to log in
  // TODO: verify client + redirect uri
  res.redirect('/auth/dialog');
});

// eslint-disable-next-line no-unused-vars
router.get('/dialog', (req, res, next) => {
  const params = res.query;
  res.render('dialog');
});

module.exports = router;
