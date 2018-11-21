exports.admin = {
	index : [
		'id',
		'name',
		'key',
		'secret',
		'createdAt',
		'updatedAt',
		'configId'
	],
	form : [
		{
			title:'Fields',
			properties:[
				'id','name','key','secret','createdAt','updatedAt','configId'
			]
		}
	],
	read : [
		{
			title:'Fields',
			properties:[
				'id','name','key','secret','createdAt','updatedAt','configId'
			]
		}
	]
}

exports.public = {
	index : [
		'id',
		'name',
		'key',
		'secret',
		'createdAt',
		'updatedAt',
		'configId'
	],
	form : [
		{
			title:'Fields',
			properties:[
				'id','name','key','secret','createdAt','updatedAt','configId'
			]
		}
	],
	read : [
		{
			title:'Fields',
			properties:[
				'id','name','key','secret','createdAt','updatedAt','configId'
			]
		}
	]
}