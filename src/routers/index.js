const statusRoute = require('./status');

module.exports = (app) => {
  statusRoute(app);
}
