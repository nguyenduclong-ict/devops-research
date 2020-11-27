import { Column } from '@Helpers/mongoose/decorator';
import { Entity, getSchema } from '@Helpers/mongoose/schema';
import { Schema, SchemaTypes } from 'mongoose';

@Entity()
export class WorkItem {
	_id?: any;
	id?: any;

	@Column({ type: SchemaTypes.ObjectId })
	company?: any;

	@Column({ type: String })
	description?: string;

	@Column({ type: String })
	category?: string;

	@Column({ type: Number })
	point?: number;
}

export const WorkItemSchema = new Schema<WorkItem>(getSchema(WorkItem));
