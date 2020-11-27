import fs, { Stats } from 'fs';
import path from 'path';
import request from 'request';

export const download = (url: string, savePath: string) => {
	return new Promise((resolve) => {
		request.head(url, (err: any, res: any) => {
			request(url)
				.pipe(fs.createWriteStream(savePath))
				.on('close', () => {
					const ext = path.extname(savePath);
					const name = path.basename(savePath);
					resolve({
						name,
						ext,
						filePath: savePath,
					});
				});
		});
	});
};

export const bytesToKbytes = (bytes: number) => Math.round((bytes / 1000) * 100) / 100;

export const fileStat = (filePath: string): Promise<Stats> => {
	return new Promise((resolve) => {
		fs.stat(filePath, (error, stat) => {
			resolve(stat);
		});
	});
};
