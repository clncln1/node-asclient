'use strict';

function provision(v) {
	return `
		<Provision xmlns="Provision:" xmlns:settings="Settings:">
			<settings:DeviceInformation>
				<settings:Set>
					<settings:Model>${v.device.model}</settings:Model>
					<settings:IMEI>${v.device.imei}</settings:IMEI>
					<settings:FriendlyName>${v.device.name}</settings:FriendlyName>
					<settings:OS>${v.device.operatingSystem}</settings:OS>
					<settings:OSLanguage>${v.device.language}</settings:OSLanguage>
					<settings:UserAgent>${v.device.userAgent}</settings:UserAgent>
				</settings:Set>
			</settings:DeviceInformation>
			<Policies>
				<Policy>
					<PolicyType>MS-EAS-Provisioning-WBXML</PolicyType>
				</Policy>
			</Policies>
		</Provision>`;
}

function provisionConfirm(v) {
	return `
		<Provision xmlns="Provision:">
			<Policies>
				<Policy>
					<PolicyType>MS-EAS-Provisioning-WBXML</PolicyType>
					<PolicyKey>${v.policyKey}</PolicyKey>
					<Status>1</Status>
				</Policy>
			</Policies>
		</Provision>`;
}

function provisionConfirmRemoteWipe(v) {
	return `
		<Provision xmlns="Provision:">
			<RemoteWipe>
				<Status>1</Status>
			</RemoteWipe>
		</Provision>`;
}

function folderSync(v) {
	return `
		<FolderSync xmlns="FolderHierarchy:">
			<SyncKey>${v.folderSyncKey}</SyncKey>
		</FolderSync>`;
}

function sync(v) {
	return `
		<Sync xmlns="AirSync:">
			<Collections>
				${
					v.folders.map(function(ele){
						if (ele.SyncFlag) {
							return `
								<Collection>
									<SyncKey>${ele.SyncKey}</SyncKey>
									<CollectionId>${ele.ServerId}</CollectionId>
								</Collection>`;
						} else {
							return '';
						}
					}).join('')
				}
			</Collections>
		</Sync>`;
}

module.exports = {
	provision,
	provisionConfirm,
	provisionConfirmRemoteWipe,
	folderSync,
	sync
};