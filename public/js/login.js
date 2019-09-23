var activityIndicator = '<div class="activity-indicator">\n' +
	'\t<svg class="spinner" width="46px" height="46px"xmlns="http://www.w3.org/2000/svg">\n' +
	'\t\t<circle class="path" fill="none" stroke-width="4" stroke-linecap="round" cx="23" cy="23" r="15"></circle>\n' +
	'\t</svg>\n' +
	'</div>';


var DataBind = {
	/**
	 * get the data-bindid of the element
	 * @param target
	 * @param count
	 * @returns {*}
	 */
	_getBindId: (target, count) => {
		count = count || 0;
		if (count > 10) {
			return null;
		}
		count++;

		if (!"attr" in target) {
			target = $(target);
		}

		if (target.attr("data-bindid")) {
			return target.attr("data-bindid");
		} else if (target.parent()) {
			return DataBind._getBindId(target.parent(), count);
		} else {
			return null;
		}
	},
	getId: (target, count) => {
		return DataBind._getBindId(target, count);
	},
	/**
	 * Given any element, find the first parent element with a bindid
	 * @param target
	 * @param bindId
	 * @param count
	 * @returns {*}
	 */
	_getBoundElement: (target, bindId, count) => {
		if (!"attr" in target) {
			target = $(target);
		}

		count = count || 0;
		if (count > 10) {
			return null;
		}
		count++;

		if (target.attr("data-bindid") && target.attr('data-bindid') === bindId) {
			//console.log("Found bound element " + target.html());
			return target;
		} else if (target.parent()) {
			//console.log("Looking for bound parent");
			return DataBind._getBoundElement(target.parent(), bindId, count);
		} else {
			//console.error("Could not found bound element " + bindId);
			return null;
		}
	},
	getElement: (target, bindId, count) => {
		return DataBind._getBoundElement(target, bindId, count);
	}
};

$(document).ready(
	function() {
		var initForm = function(target) {
			console.log("FORM!");
			if (!target) {
				target = $('form');
			}
			target.on("submit",
				function(e) {
					e.preventDefault();

					var target = $(this);
					var url = target.attr("data-endpoint");
					if (!url) {
						url = target.attr("action");
					}
					var method = target.attr("method");
					target.find(".btn").prop("disabled", true)

					var message = "The record has been ";

					switch (method) {
						case "post" :
							message += " created";
							break;
						case "patch" :
							message += " updated";
							break;

					}

					let data = $(this).serializeJSON();

					$.ajax(
						{
							url : url,
							method : method,
							data : JSON.stringify(data),
							contentType: "application/json",
							success : function(result) {
								console.log("success");
								target.find(".btn").removeAttr("disabled");
								if (target.attr("data-success")) {
									console.log("Success. Going to => " + target.attr("data-success"));
									window.location = target.attr("data-success");
								} else {
									swal("Success!", message, "success");
								}
							},
							error : function(error) {
								console.log("error");
								target.find(".btn").removeAttr("disabled");
							}
						}
					);
				}
			).addClass("ajaxed");
		}

		if ($('.form-signin').length > 0) {
			initForm($('.form-signin'));
		}

	}
)