import { Connections } from '@Constants/connections';
import { RelationModel } from './relation.model';
import { WorkItemModel } from './work_item.model';

export const workItemModel = new WorkItemModel(Connections.default);
export const relationModel = new RelationModel(Connections.default);
