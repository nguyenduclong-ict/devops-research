import { EVENTS } from '@Constants/events';
import { SERVICE_NAMES } from '@Constants/services.name';
import { Service } from '@Helpers/moleculer/decorator';
import { MoleculerService } from '@Helpers/moleculer/MoleculerService';
import { parseParams } from '@Helpers/moleculer/router';
import ApiGateway from 'moleculer-web';

@Service({
	name: SERVICE_NAMES.API,
	mixins: [ApiGateway],
	settings: {
		port: process.env.PORT || 3001,
		use: [parseParams],
		cors: {
			origin: '*',
			allowedHeaders: '*',
		},
	},
	events: {
		[EVENTS.API_ROUTE](ctx: any) {
			(this as any).actions.addRoute({ route: ctx.params });
		},
	},
})
class ApiService extends MoleculerService {
	async started() {
		this.waitForServices(this.name).then(() => {
			this.broker.broadcast(EVENTS.API_STARTED);
		});
	}
}

export default ApiService;
