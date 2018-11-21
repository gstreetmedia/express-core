exports.admin = {
	index : [
		'id',
		'name',
		'settings',
		'createdAt',
		'updatedAt'
	],
	form : [
		{
			title:'Fields',
			properties:[
				'id','name','settings','createdAt','updatedAt'
			]
		}
	],
	read : [
		{
			title:'Fields',
			properties:[
				'id','name','settings','createdAt','updatedAt'
			]
		}
	]
}

exports.public = {
	index : [
		'id',
		'name',
		'settings',
		'createdAt',
		'updatedAt'
	],
	form : [
		{
			title:'Fields',
			properties:[
				'id','name','settings','createdAt','updatedAt'
			]
		}
	],
	read : [
		{
			title:'Fields',
			properties:[
				'id','name','settings','createdAt','updatedAt'
			]
		}
	]
}