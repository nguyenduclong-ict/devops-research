import { createMongoUri } from '@Helpers/mongoose/utils';
import { createConnection } from 'mongoose';

export const Connections = {
	default: createConnection(
		createMongoUri({
			username: 'devops_research',
			password: 'password',
			db: 'devops_research',
		}),
		{
			useNewUrlParser: true,
			useUnifiedTopology: true,
			useCreateIndex: true,
			useFindAndModify: false,
		},
	),
};
