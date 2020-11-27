import { Schema, SchemaType, SchemaTypeOpts, SchemaTypes } from 'mongoose';
import _ from 'lodash';

type ColumnType = SchemaTypeOpts<any> | Schema | SchemaType;

export function Column(config: ColumnType | ColumnType[] = { type: String }) {
	return function (target: any, key: any) {
		Reflect.defineMetadata(key, config, target.constructor);
	};
}

export function DeleteDateColumn(config: ColumnType) {
	config = _.defaultsDeep({
		type: SchemaTypes.Date,
		columnType: 'deleteDate',
	});

	return Column(config);
}
