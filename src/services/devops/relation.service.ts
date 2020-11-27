import { ActionMixin } from '@Helpers/moleculer/action.mixin';
import { Action, After, Method, Service } from '@Helpers/moleculer/decorator';
import { MoleculerService } from '@Helpers/moleculer/MoleculerService';
import { RouterMixin } from '@Helpers/moleculer/router';
import { Context } from 'moleculer';
import { relationModel } from './model';
import { Relation } from './schema/relation.schema';
import _ from 'lodash';

@Service({
	name: 'relation',
	mixins: [
		ActionMixin(),
		RouterMixin([
			{
				path: '/relations',
				aliases: {
					'POST /add': 'relation.createRelation',
				},
			},
		]),
	],
})
class RelationService extends MoleculerService {
	repository = relationModel;

	@Action()
	async deleteRelation(ctx: Context<any>) {
		const { to } = ctx.params;
		// XÓA QUAN HỆ CŨ

		// Lấy tất cả node con hiện tại
		const childrenRelations = (
			await this.repository.find({
				query: {
					from: to,
					hierarchy: { $gt: 0 },
				},
			})
		).map((e) => e.toJSON());

		console.log(to, childrenRelations);

		// Xóa tất cả các liên kết từ cha khác đến node to
		await this.repository.delete({ query: { to, hierarchy: { $gt: 0 } } });

		// Xóa tất cả quan hệ của các node cha của to đến các node con cua to
		await Promise.all(
			childrenRelations.map((cr) => {
				this.repository.delete({
					query: {
						to: cr.to,
						hierarchy: {
							$gt: cr.hierarchy,
						},
					},
				});
			}),
		);
	}

	@Action()
	async createRelation(ctx: Context<Relation>) {
		const { from, to } = ctx.params;
		if (from === to) {
			return false;
		}

		await this.actions.deleteRelation({ to });

		if (!from) {
			//  Nếu liên kết không có cha => chỉ xóa các liên kết hiện tại
			return true;
		}

		const parentRelations = await this.repository.find({
			query: {
				to: from,
			},
		});

		const childrenRelations = await this.repository.find({ query: { from: to } });

		await Promise.all(
			parentRelations.map((parent) =>
				this.repository.create({
					data: childrenRelations.map((child) => ({
						from: parent.from,
						to: child.to,
						hierarchy: parent.hierarchy + child.hierarchy + 1,
					})),
				}),
			),
		);

		return true;
	}
}

export default RelationService;
