import {
	ServiceSchema,
	ActionSchema,
	ActionHandler,
	ServiceBroker,
	ServiceEventHandler,
	EventSchema,
} from 'moleculer';
import * as _ from 'lodash';

const blacklist = [
	'created',
	'started',
	'stopped',
	'actions',
	'methods',
	'events',
	'broker',
	'logger',
];
const blacklist2 = ['metadata', 'settings', 'mixins', 'name', 'version'].concat(blacklist);
const defaultServiceOptions: Options = {
	constructOverride: true,
	skipHandler: false, // not needed, just for clarity
};

export interface Options extends Partial<ServiceSchema> {
	name?: string;
	constructOverride?: boolean;
}

function addHook(target: any, path: any, value: any) {
	if (!_.has(target, path)) {
		if (_.isArray(_.get(target, path))) {
			_.get(target, path).push(value);
		} else {
			_.set(target, path, [_.get(target, path), value]);
		}
	} else {
		_.set(target, path, value);
	}
}

export interface ActionOptions extends Partial<ActionSchema> {
	name?: string;
	handler?: ActionHandler<any>; // Not really used
	skipHandler?: boolean;
}

export interface EventOptions extends Partial<EventSchema> {
	name?: string;
	group?: string;
	handler?: ServiceEventHandler; // not really used
}

export function Method(target: any, key: string, descriptor: PropertyDescriptor) {
	(target.methods || (target.methods = {}))[key] = descriptor.value;
}

export function After(...actions: ('create' | 'update')[]) {
	return function (target: any, key: string, descriptor: PropertyDescriptor) {
		actions.forEach((action) => addHook(target, ['hooks', 'after', action], key));
	};
}

export function Before(...actions: ('create' | 'update')[]) {
	return function (target: any, key: string, descriptor: PropertyDescriptor) {
		actions.forEach((action) => addHook(target, ['hooks', 'before', action], key));
	};
}

export function Event(options?: EventOptions) {
	return function (target: any, key: string, descriptor: PropertyDescriptor) {
		(target.events || (target.events = {}))[key] = options
			? {
					...options,
					handler: descriptor.value,
			  }
			: descriptor.value;
	};
}

export function Action(options: ActionOptions = {} as any) {
	return function (target: any, key: string, descriptor: PropertyDescriptor) {
		if (!options.skipHandler) {
			options.handler = descriptor.value;
		} else {
			delete options.skipHandler;
		}

		(target.actions || (target.actions = {}))[key] = options.skipHandler
			? ''
			: descriptor.value;
	};
}

// Instead of using moleculer's ServiceBroker, we will fake the broker class to pass it to service constructor
const mockServiceBroker = new Object({ Promise });

export function Service<T extends Options>(opts: T = {} as T): Function {
	const options = opts || ({} as Options);
	return function (constructor: Function) {
		const base: ServiceSchema = {
			name: '', // will be overridden
		};
		// eslint-disable-next-line no-underscore-dangle
		const _options = Object.assign({}, defaultServiceOptions, options);

		Object.defineProperty(base, 'name', {
			value: options.name || constructor.name,
			writable: false,
			enumerable: true,
		});

		if (options.name) {
			delete options.name; // not needed
		}

		Object.assign(base, _.omit(options, Object.keys(defaultServiceOptions))); // Apply

		const parentService = constructor.prototype;
		const vars: any[] = [];
		Object.getOwnPropertyNames(parentService).forEach(function (key) {
			if (key === 'constructor') {
				if (_options.constructOverride) {
					// Override properties defined in @Service
					const ServiceClass = new parentService.constructor(mockServiceBroker);

					Object.getOwnPropertyNames(ServiceClass).forEach(function (property: any) {
						if (
							blacklist.indexOf(property) === -1 &&
							!_.isFunction(ServiceClass[property])
						) {
							base[property] = Object.getOwnPropertyDescriptor(
								ServiceClass,
								property,
							)!.value;
							if (blacklist2.indexOf(property) === -1) {
								// Needed, otherwize if the service is used as a mixin, these variables will overwrite the toplevel's
								vars[property] = Object.getOwnPropertyDescriptor(
									ServiceClass,
									property,
								)!.value;
							}
						}
					});

					const bypass: any = Object.defineProperty; // typescript fix
					const obj: any = {}; // placeholder

					// Defining our 'own' created function
					bypass(obj, 'created', {
						value: function created(broker: ServiceBroker) {
							for (const property in vars) {
								this[property] = vars[property];
							}

							// Check if user defined a created function, if so, we need to call it after ours.
							if (Object.getOwnPropertyDescriptor(parentService, 'created') != null) {
								// @ts-ignore
								Object.getOwnPropertyDescriptor(
									parentService,
									'created',
								).value.call(this, broker);
							}
						},
						writable: true,
						enumerable: true,
						configurable: true,
					});

					base.created = obj.created;
				}
				return;
			}

			const descriptor = Object.getOwnPropertyDescriptor(parentService, key)!;

			if (key === 'created' && !_options.constructOverride) {
				base[key] = descriptor.value;
			}

			if (key === 'started' || key === 'stopped') {
				base[key] = descriptor.value;
				return;
			}

			if (key === 'events' || key === 'methods' || key === 'actions') {
				// eslint-disable-next-line no-unused-expressions
				base[key]
					? Object.assign(base[key], descriptor.value)
					: (base[key] = descriptor.value);
				return;
			}

			if (key === 'hooks') {
				return base[key]
					? _.merge(base[key], descriptor.value)
					: (base[key] = descriptor.value);
			}

			// moleculer-db lifecycle methods (https://github.com/ColonelBundy/@Common/decorator/moleculer-decorator/issues/2)
			if (
				key === 'afterConnected' ||
				key === 'entityCreated' ||
				key === 'entityUpdated' ||
				key === 'entityRemoved'
			) {
				base[key] = descriptor.value;
				return;
			}
		});

		return class extends parentService.constructor {
			constructor(broker: any, schema: any) {
				super(broker, schema);
				this.parseServiceSchema(base);
			}
		};
	};
}
