const { RequestHeaderFieldsTooLarge } = require("http-errors");

/**
 * クラス定義
 */
Trans.prototype = {
	language : null,
	eng : "hello",
	ja : "こんにちは"
};

//Trans.prototypeで定義したものがそのまま使える…？っぽい！
function Trans(language){
	this.language = language;
	console.log(this.eng);
}

module.exports = Trans;