const { RequestHeaderFieldsTooLarge } = require("http-errors");
const pg = require('pg');

/**
 * クラス定義
 */
THS_Trans.prototype = {
	language : null,
	set_id : 0
};

async function ths_db_access(set_id , language){
	let idCheck = null;
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

			idCheck = await client.query('SELECT *FROM ths_data_table WHERE set_id=$1',[set_id]);
			if(!idCheck)throw new Error("このIDは翻訳が登録されていません。")
			row = await client.query('SELECT *FROM ths_data_table WHERE set_id=$1 AND language=$2',[set_id,language]);
			if(!row)row = await client.query("SELECT *FROM ths_data_table WHERE set_id=$1 AND language='en-US'",[set_id]);
			trans = row.rows[0].sentence;
			return trans;		
		}catch(err){
			console.log(err.message);
			trans = err.message;
			return trans;
		}
}

//Trans.prototypeで定義したものがそのまま使える…？っぽい！
async function THS_Trans(set_id,language){
	let trans = "";
		try{
			console.log("set_id="+set_id);
			console.log("language="+language);

			trans = await ths_db_access(set_id,language);
			if(!trans)throw new Error("翻訳が見つかりませんでした。")
		}catch(err){
			console.log(err.message);
		}
		return trans;
}

module.exports = THS_Trans;