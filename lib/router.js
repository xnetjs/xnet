"use strict";

const KoaRouter = require("koa-router");
const Util = require("xnet-util");

class Router extends KoaRouter {
	constructor(opts, app) {
		super(opts);
		this.app = app;


    // console.log('AAAA')
		this.patchRouterMethod();
	}

	patchRouterMethod() {
		["all", "head", "options", "get", "put", "patch", "post", "delete"].forEach(
			method => {
				this[method] = (...args) => {
          // console.log(args);
					const splited = spliteAndResolveRouterParams({ args });
          args = splited.prefix.concat(splited.middlewares);
					return super[method](...args);
				};
			}
		);
	}

	resolveController(controller) {
		if (Util.isString(controller)) {
			let [c, a] = controller.split("@");
			controller = this.app.controller[c];
			let action = controller[a];

			return [controller, action];
		}
		return [null, controller];
	}

	register(path, methods, middleware, opts) {
		middleware = Array.isArray(middleware) ? middleware : [middleware];
		const controller = this.resolveController(middleware.pop());
		const wrappedMiddleware = (ctx, next) => {
			return controller[1].apply(controller[0] || null, [ctx, next]);
		};

		return super.register(
			path,
			methods,
			middleware.concat(wrappedMiddleware),
			opts
		);
	}
}

module.exports = Router;

function spliteAndResolveRouterParams({ args }) {
	let prefix;
	let middlewares;
	if (args.length >= 3 && (Util.isString(args[1]) || Util.isRegExp(args[1]))) {
		// app.get(name, url, [...middleware], controller)
		prefix = args.slice(0, 2);
		middlewares = args.slice(2);
	} else if (
		args.length === 2 &&
		Util.isString(args[0]) &&
		Util.isString(args[1])
	) {
		prefix = [args[0], args[0]];
		middlewares = args.slice(1);
	} else {
		// app.get(url, [...middleware], controller)
		prefix = args.slice(0, 1);
		middlewares = args.slice(1);
	}

	return { prefix, middlewares };
}
