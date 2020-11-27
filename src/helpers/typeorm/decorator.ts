import { createConnection, Repository } from 'typeorm';
import { ObjectId } from 'mongodb';

export function lazyRepository(Entity: any) {
	return function (target?: any, key?: any) {
		const started = async function started() {
			// @ts-ignore
			const ctx = this;
			try {
				const conn = await createConnection({
					name: new ObjectId().toHexString(),
					...ctx.connection,
					entities: [],
				});
				const res = conn.getRepository(Entity);
				ctx.repository = res;
			} catch (error) {
				console.log('====', error);
			}
		};

		const cross = target.started;
		target.started = async function () {
			if (cross) {
				await cross();
			}
			return started.bind(this)();
		};
	};
}
