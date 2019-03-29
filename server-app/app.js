const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const nunjucks = require('nunjucks');
const path = require('path');

const port = 3001;

const indexRouter = require('./routes/index');
const authRouter = require('./routes/auth.js');

const app = express();

nunjucks.configure('views', {
  autoescape: true,
  express: app,
});
app.set('view engine', 'html');

app.use(morgan('combined'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'static')));

app.use('/', indexRouter);
app.use('/oauth', authRouter);

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`App listening on port ${port}!`);
});
