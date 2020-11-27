import { ActionMixin } from '@Helpers/moleculer/action.mixin';
import { Action, After, Method, Service } from '@Helpers/moleculer/decorator';
import { MoleculerService } from '@Helpers/moleculer/MoleculerService';
import { createRoutePath, RouterMixin } from '@Helpers/moleculer/router';
import { Context } from 'moleculer';
import { relationModel, workItemModel } from './model';
import { WorkItem } from './schema/work_item.schema';
import faker from 'faker';
import { ObjectId } from 'mongodb';
import { Relation } from './schema/relation.schema';
import _ from 'lodash';

@Service({
	name: 'work_item',
	mixins: [
		ActionMixin(),
		RouterMixin([
			{
				path: createRoutePath('work_item'),
				aliases: {
					'GET /tree': 'work_item.getWorkItem',
				},
			},
		]),
	],
})
class WorkItemService extends MoleculerService {
	repository = workItemModel;
	relationRepository = relationModel;

	@Method
	@After('create')
	async afterCreateWorkItem(ctx: any, response: WorkItem) {
		await relationModel.create({ data: { from: response.id, to: response.id } });
		return response;
	}

	@Action()
	generateWorkItem(ctx: Context<WorkItem>) {
		ctx.params.company = ctx.params.company || new ObjectId().toHexString();

		const workItems: WorkItem[] = [];
		for (let index = 0; index < 1000; index++) {
			workItems.push({
				company: ctx.params.company,
				category: faker.vehicle.type(),
				description: faker.lorem.text(),
				point: faker.random.number(100),
			});
		}

		return Promise.all(workItems.map((workItem) => this.actions.create({ data: workItem })));
		// return Promise.all(workItems.map((item) => );
	}

	@Action()
	async getWorkItem(ctx: Context<any>) {
		const start = Date.now();
		console.log(ctx.params.query);
		const base = await this.repository.find({
			query: ctx.params.query,
			limit: Number.MAX_SAFE_INTEGER,
		});

		const relations: Relation[] = (
			await this.relationRepository.find({
				query: {
					$or: [{ to: base.map((b) => b._id) }],
				},
				populate: [
					{ path: 'from', model: 'WorkItem' },
					{ path: 'to', model: 'WorkItem' },
				],
				limit: Number.MAX_SAFE_INTEGER,
			})
		).map((e) => e.toJSON());

		const tree: any[] = [];

		const findNodeInTree = (list: any[], func: any) => {
			let result: any;
			for (let index = 0; index < list.length; index++) {
				const item = list[index];
				if (item.children) result = findNodeInTree(item.children, func);
				if (result) {
					break;
				}
				if (func(item)) {
					result = item;
					break;
				}
			}
			return result;
		};

		const compareId = (a: any, b: any) => String(a) === String(b);

		const addChild = (f: any, t: any) => {
			const findFrom = findNodeInTree(tree, (item: any) => compareId(item._id, f._id));

			if (findFrom) {
				findFrom.children = findFrom.children || [];
				findFrom.children.push(t);
				return;
			}

			const toIndex = tree.findIndex((item: any) => compareId(item._id, t._id));

			if (toIndex >= 0) {
				f.children = [tree[toIndex]];
				tree.splice(toIndex, 1, f);
			} else {
				f.children = [t];
				tree.push(f);
			}
		};

		relations.forEach((relation) => {
			if (relation.hierarchy === 1) {
				addChild(relation.from, relation.to);
				return;
			}

			if (relation.hierarchy > 1) {
				const relation2 = relations.find(
					(item) =>
						item.to._id === relation.to._id &&
						item.hierarchy === relation.hierarchy - 1,
				);

				if (relation2) {
					addChild(relation.from, relation2.from);
					return;
				}
			}
		});

		relations
			.filter((item) => item.hierarchy === 0)
			.forEach((item) => {
				if (!findNodeInTree(tree, (e: any) => compareId(e._id, item.from._id))) {
					tree.push(item.from);
				}
			});

		console.log('Time', (Date.now() - start) / 1000);

		return tree;
	}
}

export default WorkItemService;
