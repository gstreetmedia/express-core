module.exports = (modelName, endPoint) => {
	return`let router = require("../core/router/${endPoint}-router");
module.exports = router;
	`
}
