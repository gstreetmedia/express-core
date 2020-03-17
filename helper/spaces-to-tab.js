module.exports = function (str, spaceNo) {
	var spaces = '';
	for(let i = 0; i < spaceNo; i++) {
		spaces += ' ';
	}
	var reg = new RegExp(spaces, 'g')
	str = str.replace(reg, '\t');
	delete spaces;
	return str;
}