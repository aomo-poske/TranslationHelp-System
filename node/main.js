const { RequestHeaderFieldsTooLarge } = require("http-errors");

/**
 * クラス定義
 */
Trans.prototype = {
	language : null,
	set_id : 0
};

function ths_db_access(set_id , language){
	let row = null;
	let trans = null;
	const pool = new pg.Pool({
		database: 'ths_db',
		user: 'postgres', //ユーザー名はデフォルト以外を利用している人は適宜変更してください。
		password: 'Kasumin1', //PASSWORDにはPostgreSQLをインストールした際に設定したパスワードを記述。
		host: 'localhost',
	  });
	try{
		if(!pool)throw new Error("DBアクセスに失敗しました。")
		client = await pool.connect()
		if(!client)throw new Error("DBアクセスに失敗しました。")
		
		row = await('SELECT *FROM ths_data_table WHERE set_id=$1 AND language=$2',[set_id,language]);
		if(!row)throw new Error("IDに対応する翻訳がありません。")
		trans = row.rows[0].sentence;
		console.log("functiontrans="+trans)
		return trans;
	}catch(err){
		console.log(err.message);
	}
}

//Trans.prototypeで定義したものがそのまま使える…？っぽい！
function THS_Trans(set_id,language){
	let trans = "";
	try{
		console.log("set_id="+set_id);
		console.log("language="+language);

		trnas = ths_db_access(set_id,language);
		if(!trans)throw new Error("翻訳が見つかりませんでした。")
		console.log("maintrans="+trans)
	}catch(err){
		console.log(err.message);
	}
	return trans;
}

module.exports = THS_Trans;