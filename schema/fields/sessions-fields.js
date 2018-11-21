exports.admin = {
	index : [
		'id',
		'userId',
		'token',
		'ipAddress',
		'userAgent',
		'expiresAt',
		'createdAt',
		'updatedAt'
	],
	form : [
		{
			title:'Fields',
			properties:[
				'id','userId','token','ipAddress','userAgent','expiresAt','createdAt','updatedAt'
			]
		}
	],
	read : [
		{
			title:'Fields',
			properties:[
				'id','userId','token','ipAddress','userAgent','expiresAt','createdAt','updatedAt'
			]
		}
	]
}

exports.public = {
	index : [
		'id',
		'userId',
		'token',
		'ipAddress',
		'userAgent',
		'expiresAt',
		'createdAt',
		'updatedAt'
	],
	form : [
		{
			title:'Fields',
			properties:[
				'id','userId','token','ipAddress','userAgent','expiresAt','createdAt','updatedAt'
			]
		}
	],
	read : [
		{
			title:'Fields',
			properties:[
				'id','userId','token','ipAddress','userAgent','expiresAt','createdAt','updatedAt'
			]
		}
	]
}