import { Connections } from '@Constants/connections';
import { MongoModel, Inject } from '@Helpers/mongoose/model';
import { WorkItem, WorkItemSchema } from '../schema/work_item.schema';

@Inject({
	name: 'WorkItem',
	schema: WorkItemSchema,
	connection: Connections.default,
})
export class WorkItemModel extends MongoModel<WorkItem> {}
