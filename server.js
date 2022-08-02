const startTime = new Date().getTime();
require('dotenv').config();
global.appRoot = __dirname;
global.apiRoot = "";
global.appTitle = "Express Core API";

const fs = require("fs");
const path = require('path');

const bodyparser = require("body-parser");
const cookieParser = require('cookie-parser');
let express = require('express');
const cors = require('cors');

const rateLimiter = require('./middleware/rate-limiter-global');

const helmet = require("helmet");
let responses = require("./middleware/responses");

let coreRoleManger = require("./middleware/role-manager");
let roleManager = require("./middleware/role-manager");
let roleFailure = require("./middleware/role-failure");

let appRouter = require("./router/_app-router");
let viewRouter = require("./router/view-router");
let adminRouter = require("./router/admin-router");
let cache = require("./helper/cache-manager");

let start = async () => {
	await cache.reset();

	let app = express();

	app.set('views', path.join(__dirname, 'src/views'));
	app.set('view engine', 'ejs');
	app.use(express.static('public'));
	app.use(express.static(path.join(__dirname, 'src/core/public')));
	//app.use(rateLimiter);
	app.use(cors());
	app.use(helmet());
	app.use(responses);
	app.use(coreRoleManger);
	app.use(roleManager);
	app.use(express.json({limit: '5mb'}));
	app.use(cookieParser())
	app.use(bodyparser.urlencoded({extended: true}));

	app.use(viewRouter);
	app.use(global.apiRoot, appRouter);
	app.use(roleFailure);

	app.get("/cache-reset",
		async (req, res) => {
			await cache.reset();
			res.send("Okay");
		}
	);

	require("./helper/swagger-generator")(
		app,
		{
			name: "Membio MLS",
			version: "1.3",
			servers: [
				'http://localhost:3010',
				'https://mls.memb.io/'
			],
			parameters: [
				{
					name: 'application-key',
					schema: {type: "string", format: "{{MLS_APPLICATION_KEY}}"},
					required: true,
					in: 'header'
				},
				{
					name: 'application-secret',
					schema: {type: "string", format: "{{MLS_APPLICATION_SECRET}}"},
					in: 'header'
				},
				{
					name: 'authorization',
					schema: {type: "string", format: 'Bearer {{CURRENT_USER_TOKEN}}'},
					in: 'header'
				},
			]
		}
	);

	if (fs.existsSync(global.appRoot + "/swagger.json")) {
		const swaggerDocument = require('./swagger.json');
		const swaggerUi = require("swagger-ui-express");
		console.log("serving api docs");
		app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
	}

	app.get('*', function (req, res, next) {
		console.log("All routes");
		res.status(404).send();
	});

	let port = process.env.PORT || 3010;

	app.listen(port, () => {
		console.log(global.appTitle + ' listening on port ' + port);
		console.log('Startup took -> ' + (new Date().getTime() - startTime) / 1000)
	});

	process.on('unhandledRejection', r => console.log(r));

	if (process.env.ELASTIC_ENABLED === "false") {
		console.log("Elastic Disabled");
	}

	if (process.env.SNS_ENABLED === "false") {
		console.log("SNS Disabled");
	}

};


const throng = require('throng');
const WORKERS = process.env.WEB_CONCURRENCY || require('os').cpus().length;
throng({
	workers: WORKERS,
	lifetime: Infinity,
	start: start
});
