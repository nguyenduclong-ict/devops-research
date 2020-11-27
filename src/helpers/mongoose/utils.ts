import _ from 'lodash';

interface UriOption {
	host?: string;
	port?: string | number;
	db?: string;
	username?: string;
	password?: string;
	authSource?: string;
}

export function createMongoUri(options: UriOption | string) {
	if (typeof options === 'string') {
		return options;
	}

	options = _.defaults(options, {
		port: 27017,
		host: 'localhost',
		db: 'admin',
	});

	const str = 'mongodb://{username}:{password}@{host}:{port}/{db}';
	let uri = str
		.replace('{username}', options.username)
		.replace('{password}', options.password)
		.replace('{host}', options.host)
		.replace('{port}', options.port as string)
		.replace('{db}', options.db);

	if (options.authSource) {
		uri += '?authSource=' + options.authSource;
	}

	return uri;
}
