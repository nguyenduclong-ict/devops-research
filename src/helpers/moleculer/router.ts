/* eslint-disable @typescript-eslint/restrict-plus-operands */
import { EVENTS } from '@Constants/events';
import _ from 'lodash';
import { Crud as MongooseCrud } from '../mongoose/crud';

interface Route {
	path?: string;
	authorization?: boolean;
	authentication?: boolean;
	[x: string]: any;
	aliases?: {
		[x: string]: any;
	};
}

type RestMethod = 'list' | 'find' | 'findOne' | 'create' | 'update' | 'updateOne' | 'delete';

const Aliases = (name: string, filter: RestMethod[]) => {
	const f = _.pick(
		{
			list: { 'GET /': `${name}.list` },
			find: { 'GET /find': `${name}.find` },
			findOne: { 'GET /findone': `${name}.findOne` },
			create: { 'POST /': `${name}.create` },
			update: { 'PUT /': `${name}.update` },
			updateOne: { 'PUT /updateone': `${name}.updateOne` },
			delete: { 'DELETE /:id': `${name}.delete` },
		},
		filter,
	);
	const result = {};
	Object.values(f).forEach((v) => Object.assign(result, v));
	return result;
};

interface RestConfig extends Route {
	enabled?: boolean;
	filter?: RestMethod[];
}

export function parseParams(req: any, res: any, next: any) {
	Object.entries(req.query).forEach(([key, value]) => {
		try {
			value = JSON.parse(value as any);
		} catch (error) {}
		req.query[key] = value;
	});
	next();
}

export function createRoutePath(name: string) {
	return _.kebabCase(name) + 's';
}

export function RouterMixin(routes: Route[] = [], rest: RestConfig = {} as any): any {
	rest = _.defaults(rest, {
		enabled: true,
		filter: ['list', 'find', 'findOne', 'create', 'update', 'updateOne', 'delete'],
		authorization: true,
		authentication: false,
	});

	const resConfig = _.omitBy(rest, (v, key) => ['type', 'enabled', 'filter'].includes(key));

	return {
		events: {
			[EVENTS.API_STARTED]() {
				routes.forEach((route) => {
					(this as any).broker.emit(EVENTS.API_ROUTE, route);
				});

				if (rest.enabled) {
					(this as any).broker.emit(EVENTS.API_ROUTE, {
						path: createRoutePath((this as any).name),
						aliases: Aliases((this as any).name, rest.filter),
						...resConfig,
					});
				}
			},
		},

		async started() {
			routes.forEach((route) => {
				this.broker.emit(EVENTS.API_ROUTE, route);
			});

			if (rest.enabled) {
				this.broker.emit(EVENTS.API_ROUTE, {
					path: createRoutePath(this.name),
					aliases: Aliases(this.name, rest.filter),
					...resConfig,
				});
			}
		},
	};
}
