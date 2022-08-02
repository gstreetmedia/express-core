
module.exports = {
	adminIndex : [
	
		{
			property:"key", 
			visible: true
		},

		{
			property:"object", 
			visible: true
		},

		{
			property:"value", 
			visible: true
		},

		{
			property:"createdAt", 
			visible: false
		},

		{
			property:"updatedAt", 
			visible: true
		},

		{
			property:"ttl", 
			visible: false
		},

		{
			property:"id", 
			visible: false
		}
	],
	publicIndex : [
	
		{
			property:"id", 
			visible: true
		},

		{
			property:"key", 
			visible: true
		},

		{
			property:"object", 
			visible: true
		},

		{
			property:"ttl", 
			visible: true
		},

		{
			property:"value", 
			visible: true
		},

		{
			property:"createdAt", 
			visible: true
		},

		{
			property:"updatedAt", 
			visible: true
		}
	],
	adminCreate : [
		
		{
			property:"key", 
			visible: true
		},

		{
			property:"object", 
			visible: true
		},

		{
			property:"ttl", 
			visible: true
		},

		{
			property:"value", 
			visible: true
		},

		{
			property:"id", 
			visible: false
		},

		{
			property:"updatedAt", 
			visible: false
		},

		{
			property:"createdAt", 
			visible: false
		}
	],
	publicCreate : [
		
		{
			property:"key", 
			visible: true
		},
		{
			property:"object", 
			visible: true
		},
		{
			property:"ttl", 
			visible: true
		},
		{
			property:"value", 
			visible: true
		},
		{
			property:"id", 
			visible: false
		},
		{
			property:"createdAt", 
			visible: false
		},
		{
			property:"updatedAt", 
			visible: false
		}
	],
	adminUpdate : [
		
		{
			property:"key", 
			visible: true
		},
		{
			property:"object", 
			visible: true
		},
		{
			property:"value", 
			visible: true
		},
		{
			property:"ttl", 
			visible: true
		},
		{
			property:"createdAt", 
			visible: false
		},
		{
			property:"updatedAt", 
			visible: false
		},
		{
			property:"id", 
			visible: false
		}
	],
	publicUpdate : [
		
		{
			property:"key", 
			visible: true
		},
		{
			property:"object", 
			visible: true
		},
		{
			property:"ttl", 
			visible: true
		},
		{
			property:"value", 
			visible: true
		},
		{
			property:"id", 
			visible: false
		},
		{
			property:"createdAt", 
			visible: false
		},
		{
			property:"updatedAt", 
			visible: false
		}
	],
	adminRead : [
	
		{
			property:"id", 
			visible: true
		},
		{
			property:"key", 
			visible: true
		},
		{
			property:"object", 
			visible: true
		},
		{
			property:"ttl", 
			visible: true
		},
		{
			property:"value", 
			visible: true
		},
		{
			property:"createdAt", 
			visible: true
		},
		{
			property:"updatedAt", 
			visible: true
		}
	],
	publicRead : [
		
		{
			property:"key", 
			visible: true
		},
		{
			property:"object", 
			visible: true
		},
		{
			property:"ttl", 
			visible: true
		},
		{
			property:"value", 
			visible: true
		},
		{
			property:"createdAt", 
			visible: true
		},
		{
			property:"updatedAt", 
			visible: true
		},
		{
			property:"id", 
			visible: true
		}
		],
	};
	