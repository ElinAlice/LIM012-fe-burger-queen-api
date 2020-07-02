const express = require('express');
const config = require('./config');
const authMiddleware = require('./middleware/auth');
const errorHandler = require('./middleware/error');
const routes = require('./routes');
const pkg = require('./package.json');
const MongoLib = require('./lib/mongoLib');

const { port, dbUrl, secret, dbName } = config;
const app = express();

// TODO: Conección a la BD en mogodb
const mongoClient = new MongoLib(dbName, dbUrl);

console.log(mongoClient.conection());
console.log(dbUrl);
console.log(dbName);

app.set('config', config);
app.set('pkg', pkg);
app.set('mongoClient', mongoClient);

// parse application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(authMiddleware(secret));

// Registrar rutas
routes(app, (err) => {
  if (err) {
    throw err;
  }

  app.use(errorHandler);

  app.listen(port, () => {
    console.info(`App listening on port ${port}`);
  });
});
