
module.exports = {
	adminIndex : [
	
		{
			property:"id", 
			visible: true
		},

		{
			property:"name", 
			visible: true
		},

		{
			property:"settings", 
			visible: true
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
	publicIndex : [
	
		{
			property:"id", 
			visible: true
		},

		{
			property:"name", 
			visible: true
		},

		{
			property:"settings", 
			visible: true
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
	adminCreate : [
		
		{
			property:"id", 
			visible: false
		},

		{
			property:"name", 
			visible: true
		},

		{
			property:"settings", 
			visible: true
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
	publicCreate : [
		
		{
			property:"id", 
			visible: false
		},
		{
			property:"name", 
			visible: true
		},
		{
			property:"settings", 
			visible: true
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
			property:"id", 
			visible: false
		},
		{
			property:"name", 
			visible: true
		},
		{
			property:"settings", 
			visible: true
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
	publicUpdate : [
		
		{
			property:"id", 
			visible: false
		},
		{
			property:"name", 
			visible: true
		},
		{
			property:"settings", 
			visible: true
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
			property:"name", 
			visible: true
		},
		{
			property:"settings", 
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
			property:"id", 
			visible: true
		},
		{
			property:"name", 
			visible: true
		},
		{
			property:"settings", 
			visible: true
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
	};
	