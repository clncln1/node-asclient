'use strict';

const ntlmClient = require('ntlm-client'),
	httpClient = require("request-promise"),
	aswbxml = require('aswbxml'),
	xml2js = require('xml2js'),
	templates = require('./templates');


module.exports = function ASRequest(opts, method, cmd, template) {
	let requestOptions = {
		uri: opts.endpoint,
		method: method.toUpperCase(),
		username: opts.username,
		password: opts.password,
		request: {
			encoding: null,
			strictSSL: process.env.hasOwnProperty('NODE_ASCLIENT_NO_STRICT_SSL') ? false : true,
			qs: {
				'DeviceId': opts.device.id,
				'DeviceType': opts.device.type
			},
			headers: {
				'MS-ASProtocolVersion': opts.protocolVersion,
				'X-MS-PolicyKey': opts.policyKey
			}
		}
	};

	let requestOptionsBasic = {
		uri: opts.endpoint,
		method: method.toUpperCase(),
		encoding: null,
		auth: {
			user: opts.username,
			pass: opts.password,
		},
		qs: {
			'DeviceId': opts.device.id,
			'DeviceType': opts.device.type
		},
		headers: {
			'MS-ASProtocolVersion': opts.protocolVersion,
			'X-MS-PolicyKey': opts.policyKey,
			'Content-Type': 'application/vnd.ms-sync.wbxml',
			'Accept-Language': 'en-US'
		}
	};

	if (cmd && opts.ntlmAuth == true) {
		requestOptions.request.qs['Cmd'] = cmd;
	} else if (cmd && opts.ntlmAuth == false){
		requestOptionsBasic.qs['Cmd'] = cmd;
	}

	if (template) {
		if (template in templates) {
			let templateContent = templates[template](opts);

			return new Promise(function(resolve, reject) {
				xml2js.parseString(templateContent, function(err, parsed) {
					if (err) {
						reject(err);
					} else {
						requestOptions.request.body = aswbxml.encode(parsed, 'ActiveSync');
						requestOptionsBasic.body = aswbxml.encode(parsed, 'ActiveSync');
						requestOptions.request.headers['Content-Type'] = 'application/vnd.ms-sync.wbxml';
						if(opts.ntlmAuth == true) {
							sendRequest(requestOptions, resolve, reject);
						}
						else {
							sendRequestBasic(requestOptionsBasic, resolve, reject);
						}
					}
				});
			});
		} else {
			throw new Error('Template not found');
		}
	} else {
		return new Promise(sendRequest.bind(this, requestOptions));
	}
};

function sendRequest(requestOptions, resolve, reject) {
	ntlmClient.request(requestOptions).
	then(function(ntlmResponse) {
		if (ntlmResponse.body && ntlmResponse.body.length > 0) {
			try {
				let parsedResult = aswbxml.decode(ntlmResponse.body, 'ActiveSync');
				resolve({
					response: ntlmResponse.response,
					body: parsedResult
				});
			} catch(e) {
				console.error(e.stack);
				reject(e);
			}
		} else {
			resolve({
				response: ntlmResponse.response,
				body: null
			});
		}
	}).
	catch(function(err) {
		reject(err);
	});
}

function sendRequestBasic(requestOptionsBasic, resolve, reject){
	httpClient(requestOptionsBasic)
	.then(function (basicResponse) {
			let parsedResult = aswbxml.decode(basicResponse, 'ActiveSync');
			resolve({
				response: basicResponse,
				body: parsedResult
			})
	})
	.catch(function (err) {
			reject(err)
	});
}
