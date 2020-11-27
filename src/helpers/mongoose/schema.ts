import 'reflect-metadata';
import { Schema, SchemaType, SchemaTypeOpts, Types } from 'mongoose';

export interface Timestamp {
	createdAt: string | Date;
	updatedAt: string | Date;
}

export interface Owner<T> {
	createdBy: string | T;
	updatedBy: string | T;
}

interface EntityConfig {
	timestamp?: boolean;
	owner?: boolean;
	ownerModel?: string;
}

export function Entity(config: EntityConfig = {} as EntityConfig) {
	return function (target: any) {
		if (config.timestamp) {
			Reflect.defineMetadata(
				'createdAt',
				{
					type: Date,
					default: Date.now,
				},
				target,
			);

			Reflect.defineMetadata(
				'updatedAt',
				{
					type: Date,
					default: Date.now,
				},
				target,
			);
		}

		if (config.owner) {
			Reflect.defineMetadata(
				'createdBy',
				{
					type: Types.ObjectId,
					ref: config.ownerModel || 'User',
					required: false,
				},
				target,
			);

			Reflect.defineMetadata(
				'updatedBy',
				{
					type: Types.ObjectId,
					ref: config.ownerModel || 'User',
					required: false,
				},
				target,
			);
		}
	};
}

type ColumnType = SchemaTypeOpts<any> | Schema | SchemaType;

export function Column(config: ColumnType | ColumnType[] = { type: String }) {
	return function (target: any, key: any) {
		Reflect.defineMetadata(key, config, target.constructor);
	};
}

export function getSchema(target: any) {
	const schema: any = {};
	Reflect.getMetadataKeys(target).forEach((key) => {
		schema[key] = Reflect.getMetadata(key, target);
	});
	return schema;
}
