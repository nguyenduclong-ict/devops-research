import _ from 'lodash';
import { Connection, Document, FilterQuery, Model, Schema } from 'mongoose';
import { waterFallPromises } from '../utils';

interface FindOptions<T> {
	query?: FilterQuery<T>;
	data?: T | T[];
	populate?: string | string[] | { path?: string; select?: string; model?: string }[];
	skip?: number;
	limit?: number;
	page?: number;
	pageSize?: number;
	sort?: string[];
	new?: boolean;
	projection?: any;
	session?: any;
}

export type DocumentOf<T extends Document> = Omit<T, keyof Document> & {
	id?: any;
	_id?: any;
};

/* HOOK DECORATOR */

type HookAction =
	| 'list'
	| 'find'
	| 'findOne'
	| 'create'
	| 'update'
	| 'updateOne'
	| 'delete'
	| 'count';

type HookTrigger = 'before' | 'after';

interface HookItem {
	trigger: HookTrigger;
	action: HookAction;
	handler: string;
}

export function Hook(trigger: HookTrigger, actions: HookAction | HookAction[], prority = 0) {
	return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
		actions = Array.isArray(actions) ? actions : [actions];
		target.hooks = target.hooks || [];

		actions.forEach((action) => {
			const newItem = { trigger, action, handler: propertyKey, prority };
			if (!target.hooks.find((item: any) => _.isEqual(item, newItem))) {
				target.hooks.push(newItem);
			}
		});

		target.hooks = target.hooks.sort((a: any, b: any) => a.prority - b.prority);
	};
}

export interface ListResponse<D extends Document = any> {
	data: D[];
	limit: number;
	skip: number;
	page: number;
	pageSize: number;
	total: number;
}

export interface Context<T = any, M = any> extends FindOptions<T> {
	meta?: M;
}

function defaultContext(context: any, df?: any) {
	context = _.defaultsDeep(context, df, {
		page: 1,
		pageSize: 10,
		limit: 10,
		skip: 0,
		new: true,
	});
	context.page = context.page || 1;
	context.pageSize = context.pageSize || 10;
	context.limit = context.limit || context.pageSize;
	context.skip = context.skip || context.limit * (context.page - 1);
}

export interface BaseDocument {
	_id?: any;
	id?: any;
}

export function Inject<T = ModelInject>(inject: T) {
	return function (constructor: any) {
		Object.assign(constructor.prototype, inject);
	};
}

export interface ModelInject {
	connection?: any;
	name?: string;
	model?: any;
	schema?: any;
}

export class MongoModel<T = any, D extends Document = T & Document> {
	connection!: Connection;
	name!: string;
	model!: Model<D>;
	schema!: Schema<T>;

	constructor(connection?: Connection) {
		Object.assign(this, _.omitBy({ connection }, _.isNil));
		// Remove exists model
		if (this.connection.modelNames().includes(this.name)) {
			this.connection.deleteModel(this.name);
		}
		this.model = this.connection.model(this.name, this.schema);
	}

	async list(context: Context<T> = {}): Promise<ListResponse<D>> {
		defaultContext(context);
		const tasks = [
			...this.getHooks('before', 'list').map((func) => () => func(context)),
			async () => {
				const [data, counts] = await Promise.all([
					populate(
						this.model.find(
							context.query as any,
							undefined,
							_.pick(context, [
								'skip',
								'limit',
								'page',
								'pageSize',
								'projection',
								'sort',
								'session',
							]) as any,
						),
						context.populate,
					),
					this.model.countDocuments(context.query as any),
				]);

				return {
					data,
					limit: context.limit,
					skip: context.skip,
					page: Math.ceil(counts / (context.limit || 10)),
					pageSize: context.pageSize,
					total: counts,
				};
			},
			...this.getHooks('after', 'list').map((func) => (response: any) =>
				func(context, response),
			),
		];

		return waterFallPromises(tasks);
	}

	async find(context: Context<T> = {}): Promise<D[]> {
		defaultContext(context, { limit: 100 });
		const tasks = [
			...this.getHooks('before', 'find').map((func) => () => func(context)),
			() =>
				this.model.find(
					context.query as any,
					undefined,
					_.omitBy(
						_.pick(context, [
							'populate',
							'skip',
							'limit',
							'page',
							'pageSize',
							'projection',
							'sort',
							'session',
						]),
						_.isNil,
					),
				),
			...this.getHooks('after', 'find').map((func) => (response: any) =>
				func(context, response),
			),
		];

		return waterFallPromises(tasks);
	}

	async count(context: Context<T> = {}): Promise<D[]> {
		defaultContext(context, { limit: 100 });
		const tasks = [
			...this.getHooks('before', 'count').map((func) => () => func(context)),
			() => this.model.countDocuments(context.query as any),
			...this.getHooks('after', 'find').map((func) => (response: any) =>
				func(context, response),
			),
		];

		return waterFallPromises(tasks);
	}

	findOne(context: Context<T>): Promise<D> {
		defaultContext(context);
		const tasks = [
			...this.getHooks('before', 'findOne').map((func) => () => func(context)),
			() =>
				populate(
					this.model.findOne(
						context.query as any,
						undefined,
						_.omitBy(_.pick(context, ['projection', 'session']), _.isNil),
					),
					context.populate,
				),
			...this.getHooks('after', 'findOne').map((func) => (response: any) =>
				func(context, response),
			),
		];

		return waterFallPromises(tasks);
	}

	create(context: Context<T> = {}): Promise<D & D[]> {
		defaultContext(context);
		const tasks = [
			...this.getHooks('before', 'create').map((func) => () => func(context)),
			() => {
				let options: any = _.omitBy({ session: context.session }, _.isNil);
				options = _.isEmpty(options) ? undefined : options;
				return this.model.create(context.data as any, options);
			},
			...this.getHooks('after', 'create').map((func) => (response: any) =>
				func(context, response),
			),
		];

		return waterFallPromises(tasks);
	}

	update(context: Context<T> = {}): Promise<D[]> {
		defaultContext(context);
		const tasks = [
			...this.getHooks('before', 'update').map((func) => () => func(context)),
			() => {
				if (context.new) {
					return this.model
						.find(context.query as any, undefined, { projection: 'id' })
						.then((docs) =>
							this.model
								.updateMany(context.query as any, context.data as any)
								.then(() =>
									populate(
										this.model.find(
											{
												_id: docs.map((doc) => doc.id),
											} as any,
											undefined,
											_.omitBy(
												_.pick(context, ['projection', 'session']),
												_.isNil,
											) as any,
										),
										context.populate,
									),
								),
						);
				} else {
					return this.model.updateMany(
						context.query as any,
						context.data as any,
						_.omitBy({ session: context.session }, _.isNil),
					);
				}
			},
			...this.getHooks('after', 'update').map((func) => (response: any) =>
				func(context, response),
			),
		];

		return waterFallPromises(tasks);
	}

	updateOne(context: Context<T> = {}): Promise<D> {
		defaultContext(context);
		const tasks = [
			...this.getHooks('before', 'updateOne').map((func) => () => func(context)),
			() =>
				populate(
					this.model.findOneAndUpdate(
						context.query as any,
						context.data as any,
						_.omitBy(_.pick(context, ['projecton', 'session']), _.isNil),
					),
					context.populate,
				),
			...this.getHooks('after', 'updateOne').map((func) => (response: any) =>
				func(context, response),
			),
		];

		return waterFallPromises(tasks);
	}

	delete(context: Context<T> = {}) {
		defaultContext(context);
		const tasks = [
			...this.getHooks('before', 'delete').map((func) => () => func(context)),
			() =>
				this.model.deleteMany(
					context.query as any,
					_.omitBy({ session: context.session }, _.isNil),
				),
			...this.getHooks('after', 'delete').map((func) => (response: any) =>
				func(context, response),
			),
		];

		return waterFallPromises(tasks);
	}

	getHooks(trigger: HookTrigger, action: HookAction) {
		const result: any[] = [];
		const hooks: HookItem[] = _.get(this, 'hooks', []);
		hooks.forEach((item) => {
			if (item.trigger === trigger && item.action === action) {
				const h = _.get(this, item.handler);
				if (h) {
					result.push(h.bind(this));
				}
			}
		});
		return result;
	}

	@Hook('before', 'create', -1)
	protected coreBeforeCreate(context: Context<T>) {
		if (this.model.schema.path('createdBy') && _.has(context, 'meta.user')) {
			_.set(context, 'data.createdBy', context.meta.user.id);
			_.set(context, 'data.updatedBy', context.meta.user.id);
		}
	}

	@Hook('before', ['update', 'updateOne'], -1)
	protected coreBeforeUpdate(context: Context<T>) {
		if (this.model.schema.path('updatedBy') && _.has(context, 'meta.user')) {
			_.set(context, 'data.createdBy', context.meta.user.id);
		}

		if (this.model.schema.path('updatedAt')) {
			_.set(context, 'data.updatedAt', Date.now());
		}
	}
}

interface PopulateItem {
	path?: string;
	select?: string;
	model?: string;
}

export function populate(query: any, populate: any) {
	if (populate) {
		const populateData: PopulateItem[] = buildPopulate(populate);
		populateData.forEach((item) => {
			query.populate(item);
		});
	}
	return query;
}

function buildPopulate(populate: any): PopulateItem[] {
	if (!Array.isArray(populate)) {
		populate = populate.split(',');
	}

	populate = populate.map((item: any) => {
		if (typeof item === 'string') {
			let [path, select, model] = item.split(':');
			path = path || undefined;
			select = select || undefined;
			model = model || undefined;
			if (path.includes('.')) {
				const subs = path.split('.');
				item = {};
				subs.reduce((e: any, key, index) => {
					e.path = key;
					if (index < subs.length - 1) {
						e.populate = {};
						return e.populate;
					} else {
						if (select) {
							e.select = select;
						}
						if (model) {
							e.model = model;
						}
						return e;
					}
				}, item);
				return item;
			} else {
				return _.omitBy({ path, select, model }, _.isNil);
			}
		} else {
			return item;
		}
	});

	return populate;
}

export function transformContext<T = any, M = any>(context: any): Context<T, M> {
	return {
		...context.params,
		meta: context.meta,
	};
}

function buildQuery(model: MongoModel, query: any) {
	const schema = model.schema;

	// Delete date column
	const q = {};
	const schemaDefind = schema.obj;
	// Object.
}
