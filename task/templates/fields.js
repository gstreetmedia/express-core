module.exports = (fieldSchema) => {
	return `
module.exports = {
	adminIndex : [
	${fieldSchema.adminIndex.map(
		(item) => {
			return `
		{
			property:"${item.property}", 
			visible: ${item.visible}
		}`
	}
	).join(',\n')}
	],
	publicIndex : [
	${fieldSchema.publicIndex.map(
		(item) => {
		return `
		{
			property:"${item.property}", 
			visible: ${item.visible}
		}`
	}
		).join(',\n')}
	],
	adminCreate : [
		${fieldSchema.adminCreate.map(
		(item) => {
			return `
		{
			property:"${item.property}", 
			visible: ${item.visible}
		}`
		}
		).join(',\n')}
	],
	publicCreate : [
		${fieldSchema.publicCreate.map(
		(item) => {
			return `
		{
			property:"${item.property}", 
			visible: ${item.visible}
		}`
		}
		).join(',')}
	],
	adminUpdate : [
		${fieldSchema.adminUpdate.map(
		(item) => {
			return `
		{
			property:"${item.property}", 
			visible: ${item.visible}
		}`
		}
		).join(',')}
	],
	publicUpdate : [
		${fieldSchema.publicUpdate.map(
		(item) => {
			return `
		{
			property:"${item.property}", 
			visible: ${item.visible}
		}`
		}
		).join(',')}
	],
	adminRead : [
	${fieldSchema.adminRead.map(
		(item) => {
			return `
		{
			property:"${item.property}", 
			visible: ${item.visible}
		}`
		}
		).join(',')}
	],
	publicRead : [
		${fieldSchema.publicRead.map(
		(item) => {
			return `
		{
			property:"${item.property}", 
			visible: ${item.visible}
		}`
		}
		).join(',')}
		],
	};
	`
};