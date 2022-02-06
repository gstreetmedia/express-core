/**
 *
 * @param value
 * @returns {{password: string, protocol: (*|string), port: string, host: string, database: string, username: string}}
 */
module.exports = function (value) {
	try {
		let parts = value.split("://");
		let protocol = parts[0];

		if (parts[1].lastIndexOf("@") === -1) {
			if (parts[1].indexOf(":") !== -1) {
				parts = parts[1].split(":");
				return {
					protocol : protocol,
					host : parts[0],
					port : parts[1]
				}
			}
			return {
				protocol : protocol,
				host : parts[1]
			}
		}

		let credentials = parts[1].substr(0, parts[1].lastIndexOf("@"));
		let username = credentials.split(":")[0];
		let password = credentials.split(":")[1];

		parts = parts[1].split("@");
		parts = parts[parts.length - 1];

		let dbPath = parts.split("/")[0];
		let hostParts = dbPath.split(":");

		let host = hostParts[0];
		let port = hostParts.length > 1 ? hostParts[1] : "";
		if (port) {
			port = parseInt(port);
		}
		let tail = parts.split("/")[1].split("?");

		let dbName = tail[0];

		let obj = {
			username: username,
			password: password,
			protocol: protocol,
			host: host,
			port: port,
			database: dbName,
		};

		if (tail.length > 1) {
			let values = tail[1].split("&");
			let fields = [];
			values.forEach(
				function (item) {
					let key = item.split("=")[0];
					let value = item.split("=")[1];
					fields[key] = value;
				}
			);
			obj.fields = fields;
		}

		return obj;
	} catch (e) {
		console.error("Connection String Could not parse " + value);
		return null;
	}
};
