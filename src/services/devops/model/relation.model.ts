import { MongoModel, Inject } from '@Helpers/mongoose/model';
import { Relation, RelationSchema } from '../schema/relation.schema';

@Inject({
	name: 'Relation',
	schema: RelationSchema,
})
export class RelationModel extends MongoModel<Relation> {}
