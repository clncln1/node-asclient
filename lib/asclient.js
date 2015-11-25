'use strict';

const mixin = require('merge-descriptors'),
	asRequest = require('./asrequest'),
	templates = require('./templates');

const CALENDAR_TYPES = [
	'8',
	'13'
];

const EMAIL_TYPES = [
	'2',
	'3',
	'4',
	'5',
	'6',
	'12'
];

const defaultOpts = {
	username: '',
	password: '',
	endpoint: '',
	protocolVersion: '14.1',
	policyKey: '0',
	folderSyncKey: '0',
	device: {
		id: '',
		type: '',
		model: '',
		imei: '',
		name: '',
		operatingSystem: '',
		language: '',
		userAgent: ''
	},
	folders: []
};


function asClient(opts) {
	let client = Object.create(clientProto);

	// check for required options
	if (!opts.hasOwnProperty('username')) {
		throw new TypeError('Option username is required');
	}

	if (!opts.hasOwnProperty('password')) {
		throw new TypeError('Option password is required');
	}

	if (!opts.hasOwnProperty('endpoint')) {
		throw new TypeError('Option endpoint is required');
	}

	// define client options
	client.opts = {};
	client.contents = {};
	mixin(client.opts, opts);
	mixin(client.opts, defaultOpts, false);

	return client;
};

const clientProto = {};

clientProto.testConnectivity = function() {
	return asRequest(this.opts, 'OPTIONS', null, null);
};

clientProto.provision = function() {
	const self = this;

	return new Promise(function(resolve, reject) {
		asRequest(self.opts, 'POST', 'Provision', 'provision').
		then(function(res) {
			if (!res.body || !res.body.Provision || res.body.Provision.Status[0] !== '1') {
				return reject(new Error('Provisioning failed'));
			}

			self.opts.policyKey = res.body.Provision.Policies[0].Policy[0].PolicyKey[0];
			asRequest(self.opts, 'POST', 'Provision', 'provisionConfirm').
			then(function(res) {
				if (!res.body || !res.body.Provision || res.body.Provision.Status[0] !== '1') {
					return reject(new Error('Provisioning failed'));
				}

				self.opts.policyKey = res.body.Provision.Policies[0].Policy[0].PolicyKey[0];
				resolve(res);
			}).
			catch(reject);
		}).
		catch(reject);
	});
};

clientProto.folderSync = function() {
	const self = this;

	if (self.opts.policyKey === '0') {
		return Promise.reject(new Error('Client needs to be provisioned to perform this task'));
	}

	return new Promise(function(resolve, reject) {
		asRequest(self.opts, 'POST', 'FolderSync', 'folderSync').
		then(function(res) {
			if (!res.body || !res.body.FolderSync || res.body.FolderSync.Status[0] !== '1') {
				return reject(new Error('Folder Synchronization failed'));
			}

			self.opts.folderSyncKey = res.body.FolderSync.SyncKey[0];

			['Update', 'Add', 'Delete'].forEach(function(type) {
				let arr = res.body.FolderSync.Changes[0][type];

				if (!arr) {
					return;
				}

				arr.forEach(function(ele) {
					if (type === 'Add') {
						self.opts.folders.push(ele);
					} else {
						let i = 0;

						for ( ; i < self.opts.folders.length; i++) {
							if (ele.ServerId[0] === self.opts.folders[i].ServerId[0]) {
								break;
							}
						}

						if (i === self.opts.folders.length) {
							return;
						}

						if (type === 'Update') {
							ele.SyncFlag = self.opts.folders[i].SyncFlag;
							ele.SyncKey = self.opts.folders[i].SyncKey;

							self.opts.folders[i] = ele;
						} else if (type === 'Delete') {
							self.opts.folders.splice(i, 1);
						}
					}
				});
			});
			
			resolve(res);
		}).
		catch(reject);
	});
};

clientProto.enableCalendarSync = function() {
	this.opts.folders.forEach(ele => {
		if (CALENDAR_TYPES.indexOf(ele.Type[0]) !== -1 && !ele.SyncFlag) {
			ele.SyncFlag = true;
			ele.SyncKey = '0';
		}
	});

	return Promise.resolve();
};

clientProto.enableEmailSync = function() {
	this.opts.folders.forEach(ele => {
		if (EMAIL_TYPES.indexOf(ele.Type[0]) !== -1 && !ele.SyncFlag) {
			ele.SyncFlag = true;
			ele.SyncKey = '0';
		}
	});

	return Promise.resolve();
};

clientProto.sync = function() {
	const self = this;

	if (self.opts.policyKey === '0') {
		return Promise.reject(new Error('Client needs to be provisioned to perform this task'));
	}

	return new Promise(function(resolve, reject) {
		asRequest(self.opts, 'POST', 'Sync', 'sync').
		then(function(res) {
			let requireSecondSyncRun = false;

			if (!res.body || !res.body.Sync || !res.body.Sync.Collections) {
				return resolve(self.contents);
			}

			res.body.Sync.Collections[0].Collection.forEach(function(collection) {
				if (collection.Status[0] !== '1') {
					return;
				}

				for (let i = 0; i < self.opts.folders.length; i++) {
					if (self.opts.folders[i].ServerId[0] === collection.CollectionId[0]) {
						self.opts.folders[i].SyncKey = collection.SyncKey[0];
					}
				}

				if (!self.contents.hasOwnProperty(collection.CollectionId[0])) {
					self.contents[collection.CollectionId[0]] = [];
				}

				if (collection.Commands) {
					let collectionContents = self.contents[collection.CollectionId[0]];

					['Delete', 'SoftDelete', 'Change', 'Add'].forEach(function(type) {
						let arr = collection.Commands[0][type];

						if (!arr) {
							return;
						}

						arr.forEach(function(ele) {
							if (type === 'Add') {
								collectionContents.push(ele);
							} else {
								let i = 0;

								for ( ; i < collectionContents.length; i++) {
									if (ele.ServerId[0] === collectionContents[i].ServerId[0]) {
										break;
									}
								}

								if (i === collectionContents.length) {
									return;
								}

								if (type === 'Change') {
									collectionContents[i] = ele;
								} else if (type === 'Delete' || type === 'SoftDelete') {
									collectionContents.splice(i, 1);
								}
							}
						});
					});
				} else {
					requireSecondSyncRun = true;
				}

				//TODO: if collection.Responses -> process Change, Add, Delete, Fetch
				//      and fire events to notify the user that requests have been processed

				requireSecondSyncRun = requireSecondSyncRun || 'MoreAvailable' in collection;
			});

			if (requireSecondSyncRun) {
				self.sync().then(resolve, reject);
			} else {
				resolve(self.contents);
			}
		}).
		catch(reject);
	});
};

module.exports = asClient;