import { Context as ModelContext, MongoModel, transformContext } from '@Helpers/mongoose/model';
import { Context } from 'moleculer';

export const Crud = {
	actions: {
		async list(ctx: Context): Promise<any> {
			const modelContext: ModelContext = transformContext(ctx);
			const repository: MongoModel<any> = (this as any).repository;
			return repository.list(modelContext);
		},

		async find(ctx: Context): Promise<any> {
			const modelContext: ModelContext = transformContext(ctx);
			const repository: MongoModel<any> = (this as any).repository;
			return repository.find(modelContext);
		},

		async findOne(ctx: Context): Promise<any> {
			const modelContext: ModelContext = transformContext(ctx);
			const repository: MongoModel<any> = (this as any).repository;
			return repository.findOne(modelContext);
		},

		async create(ctx: Context): Promise<any> {
			const modelContext: ModelContext = transformContext(ctx);
			const repository: MongoModel<any> = (this as any).repository;
			return repository.create(modelContext);
		},

		async update(ctx: Context): Promise<any> {
			const modelContext: ModelContext = transformContext(ctx);
			const repository: MongoModel<any> = (this as any).repository;
			return repository.update(modelContext);
		},

		async updateOne(ctx: Context): Promise<any> {
			const modelContext: ModelContext = transformContext(ctx);
			const repository: MongoModel<any> = (this as any).repository;
			return repository.updateOne(modelContext);
		},

		async delete(ctx: Context): Promise<any> {
			const modelContext: ModelContext = transformContext(ctx);
			const repository: MongoModel<any> = (this as any).repository;
			return repository.delete(modelContext);
		},
	},
};
