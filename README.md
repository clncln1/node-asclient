# asclient

Exchange ActiveSync Client for node.js with support for NTLM authentication.
In the current version, the client only supports device provisioning and folder synchronization.
Support for write operations will follow.

```
npm install asclient
```

## API

### asclient(opts)

Factory that creates a new client instance.

* Arguments
  * `opts`
    * `username` **Required**. Username for NTLM Authentication
    * `password` **Required**. Password for NTLM Authentication
    * `endpoint` **Required**. The URL to the ActiveSync server, e.g. `https://mymailprovider.com/Microsoft-Server-ActiveSync`
    * `policyKey` Active Sync Policy key (if the device is already provisioned). Default: `'0'`
    * `folderSyncKey` Last used sync key for the `FolderSync` command. Default: `'0'`
    * `folders` `Array` containing folder objects (if you want to continue synchronization from a previous state)
    * `device`
      * `id` **Required**. Device ID (ASCII, up to 32 characters. The first four characters should be alphabetical and represent the company that creates the client software)
      * `type` **Required**. Device Type, e.g. `iPhone`
      * `model`
      * `imei`
      * `name`
      * `operatingSystem`
      * `language`
      * `userAgent`
* Returns
  * `asclient` A new client instance with the provided properties

---------------------------------------

#### asclient.prototype.testConnectivity()

Tests the connectivity to the server by sending an OPTIONS request

* Returns
  * `Promise`

---------------------------------------

#### asclient.prototype.provision()

Provision the device and obtain a `policyKey` that is required for all further requests.

* Returns
  * `Promise`

---------------------------------------

#### asclient.prototype.folderSync()

Fetch the folder list from the server. The result will be added to `asclient.opts.folders`

* Returns
  * `Promise`

---------------------------------------

#### asclient.prototype.enableCalendarSync()

Flags all calendar folders in the list as to be synced. Run `folderSync` before!

* Returns
  * `Promise` that will always resolve

---------------------------------------

#### asclient.prototype.enableEmailSync()

Flags all email folders in the list as to be synced. Run `folderSync` before!

* Returns
  * `Promise` that will always resolve

---------------------------------------

#### asclient.prototype.sync()

Synchronizes all folders that have been flagged.
The content will be added to `asclient.contents`

* Returns
  * `Promise`


## Example

```javascript
const asclient = require('asclient');

const options = {
	username: 'user',
	password: 'password',
	endpoint: 'https://mymailprovider.com/Microsoft-Server-ActiveSync',
	device: {
		id: 'test0123456789',
		type: 'test-device'
	}
};

const myMailClient = asclient(options);

myMailClient.provision().
then(myMailClient.folderSync.bind(myMailClient)).
then(myMailClient.enableEmailSync.bind(myMailClient)).
then(myMailClient.sync.bind(myMailClient)).
then(function() {
	console.log('All went well');
	console.log(myMailClient.contents);
}, function(err) {
	//handle error
});
```