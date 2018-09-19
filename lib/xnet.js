'use strict';

const Application = require('./application')
const Controller = require("./controller");
const Router = require("./router");

class Xnet extends Application {
	constructor(opts) {
		super(opts);
	}
}

Xnet.Controller = Xnet.prototype.Controller = Controller
Xnet.Router = Xnet.prototype.Router = Router

module.exports = Xnet;