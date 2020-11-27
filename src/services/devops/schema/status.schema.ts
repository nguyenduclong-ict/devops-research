import { Entity, getSchema, Timestamp } from '@Helpers/mongoose/schema';
import { Schema } from 'mongoose';

@Entity()
export class Status implements Timestamp {
	// Timestamp
	createdAt!: string | Date;
	updatedAt!: string | Date;
}

export const StatusSchema = new Schema<Status>(getSchema(Status));
