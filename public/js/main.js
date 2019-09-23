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
	function () {

		$("#modelSearch").autocomplete(
			{
				autoSelectFirst: true,
				serviceUrl: app.apiRoot + "/admin/search/" + app.slug,
				groupBy: "field",
				transformResult: function (response) {
					var results = [];
					response = JSON.parse(response);

					response.results.data.forEach(
						function (item) {
							results.push(
								{
									value: item.value,
									data: {
										field: item.field
									}
								}
							)
						}
					)

					return {suggestions: results};
				},
				onSelect: function (suggestion) {
					console.log(suggestion);
					window.location = "/admin/" + app.slug + '/?where={"' + suggestion.data.field + '":{"contains":"' + suggestion.value + '"}}';

				},
				onSearchComplete: function () {

				}
			}
		)

		var initForm = function (target) {
			console.log("FORM!");
			if (!target) {
				target = $('form');
			}
			target.on("submit",
				function (e) {
					e.preventDefault();


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

					Object.keys(data).forEach(
						function(key) {
							if (data[key] === "null") {
								data[key] = null;
							}
						}
					);

					let field = target.find("[name]");
					field.each(
						function() {
							var element = $(this);
							//var e = document.getElementsByClassName('form-check-input')
							var inputType = this.tagName === "INPUT" ? this.type : this.tagName;
							var dataType = element.attr("data-type");
							var name = element.attr("name");
							var value = $(this).val();
							if (value === "null") {
								value = null;
							}
							console.log(dataType + " => " + name + " " + inputType);

							switch (dataType) {
								case "array" :
									if (inputType === "text") {
										if (value !== "") {
											data[name] = value.split(',');
										} else {
											data[name] = null;
										}

									} else if (inputType === "checkbox" && this.checked) {
										var parts = name.split("[");
										name = parts[0];
										var index = parts[1].split("]").join("");
										if (!_.isArray(data[name])) {
											console.log("WTF!!!");
											data[name] = [];
										}
										if (value !== "") {
											data[name].push(value);
										}
									}
									break;
								case "object" :
									try {
										let o = JSON.parse(data[name]);
										data[name] = o;
									} catch (e) {
										//Not JSON
									}
									break;
								case "boolean" :
									console.log("fix bool");
									data[name] === "true" || data[name] === true ? true : false
									break;

							}
						}
					);

					$.ajax(
						{
							url: url,
							method: method,
							data: JSON.stringify(data),
							contentType: "application/json",
							success: function (result) {
								console.log("success");
								target.find(".btn").removeAttr("disabled");
								if (target.attr("data-success")) {
									console.log("Success. Going to => " + target.attr("data-success"));
									window.location = target.attr("data-success");
								} else {
									swal("Success!", message, "success");
								}
							},
							error: function (error) {
								console.log(error);
								target.find(".btn").removeAttr("disabled");
								swal("Oops!", "Something went wrong", error);
							}
						}
					);
				}
			).addClass("ajaxed");
		}

		var view = function (slug, id, modelTitle) {
			var modal = $("#view-modal");
			var header = modal.find(".modal-header");
			var body = modal.find(".modal-body");
			var title = modal.find(".modal-title");
			var url = "/admin/" + slug + "/" + id + "/view";

			title.html("View " + (modelTitle || app.modelTitle));
			body.html(activityIndicator);

			var action = header.find("[data-bindid='edit']");
			action.off("click").on("click",
				function () {
					modal.modal('hide');
					edit(slug, id);
				}
			);

			modal.modal();

			$.ajax(
				{
					url: url,
					success: function (data) {
						body.html(data);
						onViewReady(body, modal);
					},
					error: function (xhr) {

					}
				}
			);
		}

		var onViewReady = function (body, id) {


			body.find(".gridded-relation").each(
				function () {
					var target = $(this);
					var w = 0;
					target.find('.header .col-1').each(
						function () {
							//var col = $(this);
							//col.width(col.width());
							w += 150;
						}
					)
					target.find(".inner").width(w);
					target.height(target.find(".inner").height() + 17);
					target.parent().height(target.height());
					target.addClass("gridded-relation-active")
				}
			)

			body.find("[data-json-view]").each(
				function () {
					var target = $(this);
					target.JSONView(window[target.attr('data-json-view')]);
				}
			);

			body.find("a").on("click",
				function (e) {
					//e.preventDefault();
				}
			);

			index();

		}

		var edit = function (slug, id, modelTitle) {
			var modal = $("#edit-modal");
			var body = modal.find(".modal-body");
			var title = modal.find(".modal-title");
			var url = "/admin/" + slug + "/" + id + "/edit";

			title.html("Edit " + (modelTitle || app.modelTitle));
			body.html(activityIndicator);
			modal.modal();

			$.ajax(
				{
					url: url,
					success: function (data) {
						body.html(data);
						onEditReady(body, modal);
					},
					error: function (xhr) {

					}
				}
			)
		};

		var onEditReady = function (body, modal) {

			Quill.prototype.getHtml = function() {
				return this.container.firstChild.innerHTML;
			};

			body.find(".json-editor").each(
				function () {
					var target = $(this);
					if (target.val() === "\"\"") {
						target.val("{}");
					}
					var editor = new CodeMirror.fromTextArea(target[0], {
						lineNumbers: true,
						fixedGutter: false,
						mode: 'application/json',
						theme: 'eclipse',
						extraKeys: {"Ctrl-Space": "autocomplete"},
						matchBrackets: true,
						styleSelectedText: true,
						autoRefresh: true,
						value: JSON.parse(target.val()),
						viewportMargin: Infinity,

					});

					var totalLines = editor.lineCount();
					editor.autoFormatRange({
						line: 0,
						ch: 0
					}, {line: totalLines});

					editor.on("change", function () {
						console.log("onCHange");
						try {
							target.val(JSON.stringify(JSON.parse(editor.getValue())));
						} catch (e) {
							//Not quite ready
						}
					})
					$(this).hide();
				}
			);

			body.find(".text-editor").each(
				function() {
					var target = $(this);
					var element = $("[name='"+target.attr("data-input")+"']");
					element.parent().addClass("pb-5");
					var editor = new Quill(target[0],
						{
							theme: 'snow'   // Specify theme in configuration
						}
					);  // First matching element will be used
					editor.on('text-change', function(delta, oldDelta, source) {
						var deltas = editor.getContents();
						//console.log(delta);
						//console.log(deltas);
						var converter = new QuillDeltaToHtmlConverter(deltas.ops, {});
						var text = converter.convert();
						//console.log(text);
						element.val(text);
						//element.val(editor.getHtml().split("<p></p>").join("").split("<p><br></p>").join(""));
					});
				}
			);

			var action = modal.find("[data-bindid='save']");
			var form = body.find("form");
			initForm(form);
			action.off("click").on("click", function () {
				form.submit()
			});
		};

		var create = function (slug, modelTitle) {
			var modal = $("#edit-modal");
			var header = modal.find(".modal-header");
			var body = modal.find(".modal-body");
			var title = modal.find(".modal-title");
			var action = modal.find(".modal-action");

			title.html("Create " + (modelTitle || app.modelTitle));
			body.html(activityIndicator);
			action.attr("href", "/admin/" + slug + "/create");
			modal.modal();

			$.ajax(
				{
					url: "/admin/" + app.slug + "/create",
					success: function (data) {
						body.html(data);
						onEditReady(body, modal);
					},
					error: function (xhr) {

					}
				}
			)
		};

		var destroy = function (slug, id) {

			var url = app.apiRoot + "/" + slug + "/" + id;

			swal({
				title: "Are you sure?",
				text: "Once deleted, you will not be able to recover this record.",
				icon: "warning",
				buttons: true,
				dangerMode: true,
			})
				.then((willDelete) => {
					if (willDelete) {
						$.ajax(
							{
								url: url,
								method: "delete",
								success: function (result) {
									window.location = window.location;
									target.remove();
								},
								error: function (error) {
									target.find(".btn").removeAttr("disabled");
								}
							}
						)
					} else {
						target.find(".btn").removeAttr("disabled");
					}
				});
		};

		let saveFieldInterval;

		let fields = function () {
			let containerSelector = '.property-group';
			let containers = document.querySelectorAll(containerSelector);
			const sortable = new Draggable.Sortable(containers, {
				draggable: '.property-item',
				mirror: {
					appendTo: containerSelector,
					constrainDimensions: true,
				},
			});

			$("#fieldForm input").on("change",
				function () {
					clearInterval(saveFieldInterval);
					var group = DataBind.getElement($(this), "group");
					var property = DataBind.getElement($(this), "property");
					if (!$(this).prop("checked")) {
						property.remove();
						group.append(property)
					}
					saveFieldInterval = setInterval(saveFields, 100);
				}
			);

			sortable.on("sortable:stop",
				function () {
					clearInterval(saveFieldInterval);
					saveFieldInterval = setInterval(saveFields, 100);
				}
			)
		}

		let saveFields = function () {
			clearInterval(saveFieldInterval);
			let data = {};
			$("#fieldForm .property-group input").each(
				function () {
					let input = $(this);
					let name = input.attr("name").split("[");
					let group = name[0];
					let property = name[1].split("]").join("");
					data[group] = data[group] || [];

					if (input.prop("checked")) {
						data[group].push(
							{
								property: property,
								visible: true
							}
						);
					} else {
						data[group].push(
							{
								property: property,
								visible: false
							}
						);
					}
				}
			);

			$.ajax(
				{
					url: $("#fieldForm").attr("action"),
					method: $("#fieldForm").attr("method"),
					data: JSON.stringify(data),
					contentType: "application/json",
					success: function (result) {
						console.log("success");
					},
					error: function (error) {
						console.log(error);
					}
				}
			);
		}

		var index = function () {
			$(".gridded .row-striped").off().on("click",
				function (e) {
					var target = $(e.target);
					var bindId = DataBind.getId(target);
					e.preventDefault();

					console.log("row click " + app.slug + ' => ' + id);

					switch (bindId) {
						case "view" :
							var element = DataBind.getElement(target, "view");
							var id = element.attr("data-row-id");
							return view(app.slug, id, app.modelTitle);
							break;
						case "edit" :
							var element = DataBind.getElement(target, "view");
							var id = element.attr("data-row-id");
							return edit(app.slug, id, app.modelTitle);
							break;
						case "delete" :
							var element = DataBind.getElement(target, "view");
							var id = element.attr("data-row-id");
							return destroy(app.slug, id, app.modelTitle);
						case "route" :
							var element = DataBind.getElement(target, bindId);
							window.location = element.attr("data-route");

					}
				}
			);

			$(function () {
				$('[data-toggle="tooltip"]').tooltip()
			})
		};

		$(".create-link").on("click",
			function (e) {
				var target = $(e.target);
				var bindId = DataBind.getId(target);
				e.preventDefault();
				return create(app.slug);
			}
		);

		if ($('.form-signin').length > 0) {
			initForm($('.form-signin'));
		}

		let target = $("#mainNav .active");
		target.css("background-color","#EAEAEA");
		$('.sidebar-sticky').scrollTop(target.offset().top - 50);

		switch (app.action) {
			case "fields" :
				fields();
				break;
			case "index" :
				index();
				break;
			case "view" :
				onViewReady($("main"));
				break;
		}

	}
)