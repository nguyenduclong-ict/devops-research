import { Column } from '@Helpers/mongoose/decorator';
import { Entity, getSchema } from '@Helpers/mongoose/schema';
import { Schema, SchemaTypes } from 'mongoose';

@Entity()
export class Relation {
	@Column({ type: SchemaTypes.ObjectId })
	from?: any;

	@Column({ type: SchemaTypes.ObjectId })
	to?: any;

	relates?: number;

	@Column({ type: SchemaTypes.Number, default: 0 })
	hierarchy?: number;
}

export const RelationSchema = new Schema<Relation>(getSchema(Relation));
