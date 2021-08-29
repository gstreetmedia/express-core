const _ = require("lodash");

let getIsSelected = (itemValue, attributeValue, type) => {
	if (_.isArray(attributeValue)) {
		if (attributeValue.indexOf(itemValue) === -1) {
			return '';
		}
	} else if ("" + itemValue !==  "" + attributeValue) {
		return '';
	}
	switch (type) {
		case "radio" :
			return "checked";
		case "checkbox" :
			return "checked";
		case "select" :
			return "selected"
	}
};

exports.checkBoxOrRadio = (attr) => {

	let count = -1;
	let css = "";
	if (attr.options.length > 5) {
		//css = "form-check-inline";
	}

	console.log("required = " + (attr.required ? "true" : "false"));

	let options = attr.type === "radio" && attr.required === false ? [{value:'',name:'none'}] : [];

	if (typeof attr.options[0] === "string") {
		attr.options.forEach(
			(item) => {
				options.push(
					{
						value: item,
						name: item
					}
				);
			}
		);
	} else {
		options = options.concat(attr.options);
		//console.log(options);
		options.forEach(
			function(item) {
				if (item.id) {
					item.value = item.id;
				}
			}
		)
	}

	let items = options.map(
		(item) => {
		count++;
		return `
		
			<div class="form-check ${css}">
				<label class="form-check-label" for="${attr.name + (attr.type === "checkbox" ? `[${count}]` : '')}">
				<input  class="form-check-input"
						type="${attr.type}"
						name="${attr.name + (attr.type === "checkbox" ? `[${count}]` : '')}"
						id="${item.name}[${count}]"
						value="${item.value ? item.value : ''}" ${getIsSelected(item.value ,attr.value, attr.type)}
						data-type="${attr.dataType}"
				>
				<span class="form-check-sign">
					<span class="check"></span>
				</span>
				${item.name}
				</label>
			</div>
		`;
	});

	let value = "";
	let start = 0;
	let end = Math.floor(items.length / 3);
	value += "<div class='col-lg-4'>" + items.slice(start, end).join("") + "</div>";
	start = end;
	end = start + end;
	value += "<div class='col-lg-4'>" + items.slice(start, end).join("") + "</div>";
	start = end;
	end = start + end;
	value += "<div class='col-lg-4'>" + items.slice(start, end).join("") + "</div>";

	return `<div class="form-row">${value}</div>`;
};

exports.switch = (attr) => {
	return `
	<div class="switch-group pt-1 pr-2 pb-1">
		<label class="switch" for="${attr.name}">
		<input type="checkbox" 
			id="${attr.name}"
			name="${attr.name}" 
			data-type="${attr.dataType}"
			value="true" 
			${attr.value ? 'checked' : '' }
			 >
			<span class="switch-slide round"></span>
		</label>
	</div>`
};

exports.input = (attr, property) => {
	let placeholder = property.description;
	switch (property.type) {
		case "number" :
			placeholder = "Some Number";
			break;
		case "object" :
			placeholder = "Some Object";
			break;
		case "string" :
			placeholder = "Some Value";
			break;
		case "array" :
			placeholder = "Comma separated values";
			break;
	}

	return `
	<input class="form-control" id="${attr.id}"
	   name="${attr.name}"
	   value="${attr.value === null ? '' : attr.value}"
	   type="${attr.type}"
		${attr.required ? 'required' : ''}
	   maxlength="${attr.maxlength || ""}"
	   minlength="${attr.minlength || ""}"
	   max="${attr.max || ""}"
	   min="${attr.min || ""}"
		${attr.disabled ? "disabled" : ""}
	   placeholder="${placeholder}"
	   data-type="${attr.dataType}"
	/>`
};

exports.select = (attr) => {
	let options = [];
	if (typeof attr.options[0] === "string") {
		attr.options.forEach(
			(item) => {
				options.push(
					{
						value: item,
						name: item
					}
				);
			}
		);
	} else {
		options = attr.options;
	}

	return `
	<select class="select" 
			id="${attr.id}" 
			name="${attr.name}" 
			${attr.required ? 'required' : ''}
			${attr.multiple ? "multiple" : ""} 
	>
		<option value="" ${!attr.value || attr.value === "" ? "selected" : ""}>Select ${attr.name} (or leave null)</option>
	${options.map(item =>
		`<option value="${item.value}" ${getIsSelected(item.value, attr.value, "select")}>
			${item.name}
		</option>`
	).join('')}
	</select>`
};

exports.jsonEditor = (attr) => {
	return `
	<textarea class="form-control json-editor"
		  name="${attr.name}"
		  ${attr.required ? 'required' : ''}
		  maxlength="${attr.maxlength || ""}"
		  minlength="${attr.minlength || ""}"
		  data-type="object"
>${attr.value}</textarea>`
};

exports.textEditor = (attr, property) => {
	let richContentTypes = ['content','body','html','description','postContent','notes','info']

	if (richContentTypes.indexOf(attr.name) === -1) {
		return exports.input(attr, property);
	}

	return `
<div id="${attr.name}" class="text-editor" data-input="${attr.name}">
	${attr.value}
</div>
<textarea class="d-none" 
			name="${attr.name}" 
			${attr.required ? 'required' : ''} 
			data-type="text">${attr.value}</textarea>
`
};

exports.textArea = (attr) => {
	return `
<textarea class="form-control json-editor"
          name="${attr.name}"
		  ${attr.required ? 'required' : ''}
		  maxlength="${attr.maxlength || ""}"
          minlength="${attr.minlength || ""}"
          data-type="object"
>${attr.value}</textarea>
`
};

exports.htmlEditor = (attr) => {
	return `
<div id="editor-${attr.name}">
  ${attr.value}
</div>

<!-- Include the Quill library -->
<script src="https://cdn.quilljs.com/1.3.6/quill.js"></script>

<!-- Initialize Quill editor -->
<script>
  var quill = new Quill('#editor-${attr.name}', {
    theme: 'snow'
  });
</script>
`
}
