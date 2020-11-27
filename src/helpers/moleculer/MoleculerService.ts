import { Service } from 'moleculer';

export abstract class MoleculerService extends Service {
	protected connection!: any;
	protected repository!: any;

	actions: {
		[name: string]: any;
	};
}
