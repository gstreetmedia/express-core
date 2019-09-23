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


	let value = options.map(
		(item) => {
		count++;
		return `
		<div class="col-md-4">
			<div class="form-check ${css}">
				<label class="form-check-label" for="${attr.name + (attr.type === "checkbox" ? `[${count}]` : '')}">
				<input  class="form-check-input"
						type="${attr.type}"
						name="${attr.name + (attr.type === "checkbox" ? `[${count}]` : '')}"
						id="${item.name}[${count}]"
						value="${item.value ? item.value : ''}" ${item.value === attr.value ? "checked" : ""}
						data-type="${attr.dataType}"
				>
				<span class="form-check-sign">
					<span class="check"></span>
				</span>
				${item.name}
				</label>
			</div>
		</div>`;
	}).join("");

	return `<div class="form-row">${value}</div>`;
};

exports.input = (attr) => {
	return `
	<input class="form-control" id="${attr.id}"
	   name="${attr.name}"
	   value="${attr.value}"
	   type="${attr.type}"
		${attr.required ? 'required' : ''}
	   maxlength="${attr.maxlength || ""}"
	   minlength="${attr.minlength || ""}"
	   max="${attr.max || ""}"
	   min="${attr.min || ""}"
		${attr.disabled ? "disabled" : ""}
	   placeholder="${attr.dataType === "array" ? "Comma separated values" : ""}"
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
		options.forEach(
			function(item) {
				if (item.id) {
					item.value = item.id;
				}
			}
		)
	}

	return `
	<select class="form-control" 
			id="${attr.id}" 
			name="${attr.name}" 
			${attr.required ? 'required' : ''}
			${attr.multiple ? "multiple" : ""} 
	>
		<option value="" ${attr.value === "" ? "selected" : ""}>Select ${attr.name} (or leave null)</option>
	${options.map(item =>
		`<option value="${item.value}" ${attr.value === item.value ? "selected" : ""}>
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

exports.textEditor = (attr) => {
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