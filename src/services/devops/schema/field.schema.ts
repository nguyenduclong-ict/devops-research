import { Entity, getSchema, Timestamp } from '@Helpers/mongoose/schema';
import { Schema } from 'mongoose';

@Entity()
export class Field implements Timestamp {
	// Timestamp
	createdAt!: string | Date;
	updatedAt!: string | Date;
}

export const FieldSchema = new Schema<Field>(getSchema(Field));
