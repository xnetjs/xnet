"use strict";

const path = require("path");
const assert = require("assert");
const debug = require("debug")("xnet:application");
const Koa = require("koa");
const delegates = require('delegates');
const Loader = require("xnet-loader");
const { Logger, ConsoleTransport } = require("xnet-logger");
const Router = require("./router");
const USEMIDDLEWARE = Symbol("Application#UseMiddleware");
const DELEGATES = Symbol("Application#Delegates");

class Application extends Koa {
	constructor(opts) {
		super(opts);

		this.opts = opts;
		this.baseDir = opts.baseDir;

		this.logger = new Logger();
		this.logger.add(new ConsoleTransport());

		this.loader = new Loader({ baseDir: opts.baseDir, app: this });
		this.instance = this;
		this.router = new Router({}, this);
		this.middlewares = {};
	}

	init() {
		const opts = this.opts;
		const baseDir = opts.baseDir;

		const configDir = path.join(baseDir, "app/config");
		const controllerDir = path.join(baseDir, "app/controllers");
		const routerDir = path.join(baseDir, "app/routes");
		const scheduleDir = path.join(baseDir, "app/schedules");
		const middlewareDir = path.join(baseDir, "app/middlewares");

		this.loader.loadConfig(configDir);
		this.loader.loadController(controllerDir);

		this.loader.loadMiddleware(middlewareDir);
		this.loader.loadSchedule(scheduleDir);

		const pluginOpts = this.config.plugin;
		this.loader.loadPlugin(pluginOpts);

		this.loader.loadRouter(routerDir);
	}

	run() {
		this.init();

    this[USEMIDDLEWARE]();
    
    this[DELEGATES]();

		this.handleError();

		this.listen(process.env.PORT || 3007);
	}

	handleError() {}

	pushMiddleware(name, fn) {
		this.middlewares[name] = fn;
		// Object.defineProperty(this.middleware, name, {
		// 	get() {
		// 		return fn;
		// 	}
		// });
		return this;
	}

	inject(property, value, isContent) {
		const injectObj = isContent ? this.context : this;
		Object.defineProperty(injectObj, property, {
			value: value
		});
	}

	injectContent(property, value) {
		this.inject(property, value, true);
	}

	[USEMIDDLEWARE]() {
		const appMiddlewares = this.config.app.middlewares || [];

		for (let name of appMiddlewares) {
      if (typeof name === 'object') {
        try {
          const fn = require(path.join(this.baseDir, "node_modules",name.package));
          this.pushMiddleware(name.name, fn());
          name = name.name
        } catch (err) {
          assert(false, `middleware '${name.name}' not found`);
        }
      }
			const middleware = this.middlewares[name];
			assert(middleware, `middleware '${name}' not found`);
			this.use(middleware);
			debug("Use middleware: %s", name);
		}

		const routerMiddlewares = this.routers;

		for (const i in routerMiddlewares) {
			this.use(routerMiddlewares[i].routes()).use(
				routerMiddlewares[i].allowedMethods()
			);
		}
	}

	getDelegator() {
		return delegates;
	}

	[DELEGATES]() {
		delegates(this.context, "app")
			.getter("config")
			.getter("controller")
			.getter("middlewares")
			.getter("routers")
			.getter("schedule");
	}
}

module.exports = Application;
