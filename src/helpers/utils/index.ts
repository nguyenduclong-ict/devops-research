import globby from 'globby';
import path from 'path';
import _ from 'lodash';

export function seqPromises(promises: any[]) {
	return promises.reduce(
		(prev: any, curr: any) =>
			prev.then((prevResult: any) => {
				return curr().then((currentResult: any) => [...prevResult, currentResult]);
			}),
		Promise.resolve([]),
	);
}

export function parseBool(v: any) {
	if (typeof v === 'boolean') {
		return v;
	}
	if (typeof v === 'number') {
		return !!v;
	}
	return !!_.get(
		{
			TRUE: true,
			true: true,
			FALSE: false,
			false: false,
		},
		v as string,
	);
}

export function waterFallPromises(promises: any[]) {
	return promises.reduce(
		(prev: any, curr: any) => prev.then((prevResult: any) => curr(prevResult)),
		Promise.resolve(),
	);
}

export interface RequireModule {
	fullPath: string;
	path: string;
	fileName: string;
	name: string;
	dirname: string;
	module: { default?: any };
}

export async function requireFolder(
	folder: string,
	{
		deep = 1,
		extensions = ['js', 'ts'],
		files = [],
	}: { deep?: number; extensions?: any[]; files?: string[] } = {} as any,
) {
	const paths = await globby(folder, {
		expandDirectories: { extensions, files },
		deep,
		onlyFiles: true,
	});

	// @ts-ignore
	const result: RequireModule[] & {
		toObject: (key?: 'path' | 'name') => object;
	} = [];

	paths.forEach((modulePath: any) => {
		result.push({
			fullPath: modulePath,
			path: path.relative(folder, modulePath),
			fileName: path.basename(modulePath),
			name: path.basename(modulePath).replace(/\..*$/, ''),
			module: require(modulePath),
			dirname: path.dirname(modulePath),
		});
	});

	result.toObject = (key = 'path') => {
		const object = {};
		result.forEach((item) => {
			_.set(object, item[key].replace(/\..*$/, ''), item.module);
		});
		return object;
	};

	return result;
}

function customDefaultsMerge(objValue: any, srcValue: any) {
	if (Array.isArray(objValue)) {
		return objValue.concat(srcValue);
	}
	return undefined;
}

export function defaultsDeepWith(source: any, ...args: any) {
	let customizer = customDefaultsMerge;
	if (_.isFunction(args[args.length - 1])) {
		customizer = args[args[length - 1]];
	}
	args.push(undefined, source, customizer);
	return _.mergeWith.apply(undefined, args);
}

export function parseJSON(data: any) {
	try {
		const parse = JSON.parse(data);
		if (typeof parse === 'object') {
			return parse;
		}
		return data;
	} catch (error) {}
	return data;
}

function buildPopulate(populate: any) {
	populate = parseJSON(populate);

	if (!Array.isArray(populate)) {
		populate = [populate];
	}

	populate = populate.map((item: any) => {
		if (typeof item === 'string') {
			const [path, select, model] = item.split(':');
			return _.omitBy({ path, select, model }, (v) => !v);
		} else {
			return item;
		}
	});

	return populate;
}

export function customGet(source: any, path: any, defaultData: any) {
	if (path) {
		return _.get(source, path, defaultData);
	}
	return source;
}

export function customPick(source: any, path: any) {
	if (path) {
		return _.pick(source, path);
	}
	return source;
}
