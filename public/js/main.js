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
				serviceUrl: "/admin/search/" + app.tableName,
				groupBy: "field",
				minChars : 4,
				noCache : true,
				deferRequestBy : 3,
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
					);

					return {suggestions: results};
				},
				onSelect: function (suggestion) {
					console.log(suggestion);
					window.location = "/admin/" + app.tableName + '?query={"where":{"' + suggestion.data.field + '":{"=":"' + suggestion.value + '"}}}';
				},
				onSearchComplete: function () {

				}
			}
		);

		var initForm = function (target) {
			console.log("FORM!");
			if (!target) {
				target = $('form');
			}
			if (target.attr("id") === "fieldForm") {
				makeFieldsSortable(false);
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
						case "put" :
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
									console.log("fix bool " + name + " => " + value);
									if (inputType === "checkbox" && this.checked) {
										data[name] = true;
									} else if (inputType === "checkbox") {
										data[name] = false;
									}

									break;
								default :
									if (inputType === "text") {
										if (value === "") {
											data[name] = null;
										}
									}

							}
						}
					);

					if (target.attr("id") === "fieldForm") {
						data = saveFields(data, false);
					}

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
									swal("Success!", message, "success").then((willDelete) => {
										window.location = window.location;
									});
									$("#edit-modal").modal("hide");
								}
							},
							error: function (error) {
								console.log(error);
								target.find(".btn").removeAttr("disabled");
								let message = "Hmmm..."
								if (error.responseJSON && error.responseJSON.error) {
									swal("Oops!", error.responseJSON.error.detail);
								} else {
									swal("Oops!", "Something went wrong");
								}

							}
						}
					);
				}
			).addClass("ajaxed");

			$('.select').prettyDropdown(
				{
					width: "100%"
				}
			);

		};

		var view = function (tableName, id, modelTitle) {

			var modal = new bootstrap.Modal(document.getElementById('view-modal'), {});
			var viewModal = document.getElementById("view-modal");
			var header = viewModal.getElementsByClassName('modal-header')[0];//modal.find(".modal-header");
			var body = viewModal.getElementsByClassName('modal-body')[0]; //modal.find(".modal-body");
			var title = viewModal.getElementsByClassName('modal-title')[0]; //modal.find(".modal-title");
			var url = "/admin/" + tableName + "/" + id + "/view";

			title.innerHTML = "View " + (modelTitle || app.modelTitle);
			body.innerHTML = activityIndicator;

			var action = header.querySelectorAll("[data-bindid='edit']")[0];
			action.addEventListener("click",
				function () {
					modal.hide();
					edit(tableName, id);
				}
			)

			modal.show();

			$.ajax(
				{
					url: url,
					dataType : "json",
					success: function (response) {
						$(body).html(response.results.html + "<script> var viewData = " + JSON.stringify(response.results.data) + "</script>");
						body.scrollTop = 0;
						setTimeout(
							function() {
								onViewReady($(body)),
									1000
							}
						)
						onViewReady($(body));
					},
					error: function (xhr) {

					}
				}
			);
		};

		var onViewReady = function () {
			var body = $("#view-modal .modal-body");
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
					);
					target.find(".inner").width(w);
					target.height(target.find(".inner").height() + 17);
					target.parent().height(target.height());
					target.addClass("gridded-relation-active")
				}
			);
			console.log(body.find("[data-json-view]"));
			body.find("[data-json-view]").each(
				function () {
					console.log("huh?")
					var target = $(this);
					var obj = window[target.attr('data-json-view')];
					console.log(target.attr('data-json-view'));
					if (obj) {

						try {
							let sorted = {};
							let keys = Object.keys(obj);
							keys = keys.sort();
							keys.forEach(
								function(key) {
									sorted[key] = obj[key];
								}
							)
							target.JSONView(sorted);
						} catch (e) {
							console.log(e);
						}

					}
				}
			);

			body.find("[data-bindid]").on("click",
				function (e) {
					var target = $(e.target);
					var bindId = DataBind.getId(target);

					e.preventDefault();
					if (bindId) {

						switch (bindId) {
							case "view" :
								var element = DataBind.getElement(target, "view");
								var id = element.attr("data-id");
								var tableName = element.attr("data-table-name");
								var title = element.attr("data-title");

								return view(tableName, id, title);
								break;
							case "tab" :
								var tab = DataBind.getElement(target, "tab");
								tab.parent().parent().find("button").removeClass("active")
								tab.addClass("active");
								let tabContent = $(tab.attr("data-target"));
								tabContent.parent().find(".tab-pane").removeClass("active").removeClass("show");
								tabContent.addClass("active show");
								tabContent.find(".gridded-relation").each(
									function () {
										var target = $(this);
										var w = 0;
										target.find('.header .col-1').each(
											function () {
												//var col = $(this);
												//col.width(col.width());
												w += 150;
											}
										);
										target.height("auto");
										target.find(".inner").width(w);
										target.height(target.find(".inner").height() + 17);
										target.parent().height(target.height());
										target.addClass("gridded-relation-active")
									}
								);
						}
					}
				}
			);

			index();

		};

		var edit = function (tableName, id, modelTitle) {

			var modal = new bootstrap.Modal(document.getElementById('edit-modal'), {});
			var viewModal = document.getElementById("edit-modal");
			var header = viewModal.getElementsByClassName('modal-header')[0];//modal.find(".modal-header");
			var body = viewModal.getElementsByClassName('modal-body')[0]; //modal.find(".modal-body");
			var title = viewModal.getElementsByClassName('modal-title')[0]; //modal.find(".modal-title");
			title.innerHTML = "Edit " + (modelTitle || app.modelTitle);
			body.innerHTML = activityIndicator;
			var url = "/admin/" + tableName + "/" + id + "/edit";

			modal.show();

			$.ajax(
				{
					url: url,
					dataType : "json",
					success: function (response) {
						$(body).html(response.results.html + "<script> var viewData = " + JSON.stringify(response.results.data) + "</script>");
						body.scrollTop = 0
						onEditReady($(body), modal);
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
						theme: 'dracula',
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
						console.log("onChange");
						//console.log(editor.getValue());
						//console.log(target);
						try {
							let value = editor.getValue();
							try {
								console.log(JSON.parse(value));
								target.val(value);
							} catch (e) {
								console.log("Not Valid JSON");
							}

						} catch (e) {
							//Not quite ready
						}
					});
					$(this).hide();
				}
			);

			body.find(".text-editor").each(
				function() {
					var target = $(this);

					let richContentTypes = ['content','body','html','description','postContent','notes','info']
					if (richContentTypes.indexOf(target.attr("name")) === -1) {
						return;
					}

					$("[name='"+target.attr("data-input")+"']").addClass("d-none");

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
						element.val(text.replace(/<[^>]*>?/gm, ''));
						//element.val(editor.getHtml().split("<p></p>").join("").split("<p><br></p>").join(""));
					});
				}
			);
			var viewModal = $("#edit-modal");
			var action = viewModal.find("[data-bindid='save']");
			var form = body.find("form");
			initForm(form);
			action.off("click").on("click", function () {
				modal.hide();
				form.submit()
			});
		};

		var create = function (tableName, modelTitle) {
			var modal = new bootstrap.Modal(document.getElementById('edit-modal'), {});
			var viewModal = document.getElementById("edit-modal");
			var header = viewModal.getElementsByClassName('modal-header')[0];//modal.find(".modal-header");
			var body = viewModal.getElementsByClassName('modal-body')[0]; //modal.find(".modal-body");
			var title = viewModal.getElementsByClassName('modal-title')[0]; //modal.find(".modal-title");
			var action = viewModal.getElementsByClassName("modal-action")[0];

			title.innerHTML = "Create " + (modelTitle);
			body.innerHTML = activityIndicator;
			modal.show();

			$.ajax(
				{
					url: "/admin/" + app.tableName + "/create",
					dataType : "json",
					success: function (response) {
						body.innerHTML = response.results.html;
						body.scrollTop = 0;
						onEditReady($(body), modal);
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
			makeFieldsSortable();

		};

		var makeFieldsSortable = function(saveResult) {
			let containerSelector = '.property-group';
			let containers = document.querySelectorAll(containerSelector);
			const sortable = new Draggable.Sortable(containers, {
				draggable: '.property-item',
				mirror: {
					appendTo: containerSelector,
					constrainDimensions: true,
				},
			});

			if (saveResult !== false) {
				sortable.on("sortable:stop",
					function () {
						clearInterval(saveFieldInterval);
						saveFieldInterval = setInterval(saveFields, 100);
					}
				)
			}
		}

		var saveFields = function (data, saveResult) {
			clearInterval(saveFieldInterval);
			console.log(data);
			data = data || {};
			$("#fieldForm .property-group input").each(
				function () {
					let input = $(this);
					let name = input.attr("name").split("[");
					let group = name[0];
					let property = name[1].split("]").join("");
					//console.log(group);
					//console.log(data[group]);
					if (!_.isArray(data[group])) {
						data[group] = [];
					}
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

			if (saveResult === false) {
				return data;
			}

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
			$(".gridded .row-striped").off().on("dblclick",
				function (e) {
					var target = $(e.target);
					var bindId = DataBind.getId(target);
					var element,id,table;

					switch (bindId) {
						case "view" :
							element = DataBind.getElement(target, "view");
							table = element.attr("data-table");
							id = element.attr("data-id");
							e.preventDefault();
							return view(table, id, table);
							break;
						case "route" :
							element = DataBind.getElement(target, bindId);
							e.preventDefault();
							window.location = element.attr("data-route");

					}
				}
			);

			$(".gridded .actions button").on("click",
				function(e) {
					var target = $(e.target);
					var bindId = DataBind.getId(target);
					var element,id,table;
					switch (bindId) {
						case "edit" :
							element = DataBind.getElement(target, "view");
							id = element.attr("data-id");
							table = element.attr("data-table");
							e.preventDefault();
							return edit(table, id, table);
							break;
						case "delete" :
							element = DataBind.getElement(target, "view");
							id = element.attr("data-id");
							table = element.attr("data-table");
							e.preventDefault();
							return destroy(table, id, table);
					}
				}
			)

			$(function () {
				$('[data-toggle="tooltip"]').tooltip()
			})
		};

		$(".create-link").on("click",
			function (e) {
				var target = $(e.target);
				e.preventDefault();
				return create(target.attr("data-table-name"), target.attr("data-name"));
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
