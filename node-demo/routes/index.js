const express = require('express');
const router = express.Router();
const uuid = require('uuid');
const passwordHash = require('password-hash');
const pg = require('pg');
const dateutils = require('date-utils');
const isDebug = false;

//----------------------ログイン兼topページ-------------------------

router.all('/',function module1(req, res, next) {
  let errorMessage = ""
  let client = null 
  const pool = new pg.Pool({
    database: 'ths_db',
    user: 'postgres', //ユーザー名はデフォルト以外を利用している人は適宜変更してください。
    password: 'Kasumin1', //PASSWORDにはPostgreSQLをインストールした際に設定したパスワードを記述。
    host: 'localhost',
    
  });

  async function func1(){
    try {
      if (!req.body.mail || !req.body.password) {
        var ths = new THS("hello");
        // ログインページを初めて表示するとき
        // またはqueryのmsgが入力されリダイレクトされたとき
        switch (req.query.msg) {
          case '1':
            throw new Error('ログインが必要です')
          case '2':
            throw new Error('ログアウトしました')
          case '3':
            throw new Error('登録に失敗しました>< 入力内容を確認してね！')
          case '4':
            throw new Error('そのアドレスはすでに登録されています')
          case '5':
            throw new Error('エラーが発生しました。')
          case '6':
            throw new Error('登録しました！ログインしてください(^^*)')
          case '7':
            throw new Error('アドレスを変更しました！ログインし直してくださいませ。')
          default:
            //-----------------------------------thsテスト箇所-------------------------------------------
            //------------------------------------------------------------------------------------------
            throw new Error(ths.lang)
            //------------------------------------------------------------------------------------------
            //------------------------------------------------------------------------------------------
        }
      }
      const mail = req.body.mail
      const password = req.body.password
      //ユーザーの検索
      if(!pool)return res.render('login',{errorMesssage})
      client = await pool.connect()
      let resultUser = await client.query('SELECT user_id,name,mail,hash FROM ths_user WHERE mail = $1;', [mail])
    
      if(resultUser.rows.length == 0){
        throw new Error('ユーザーが見つかりません')
      }else if(resultUser.rows.length > 2){
        throw new Error('内部エラー（ユーザの重複），管理者にお問い合わせください．')
      }

      let userInfo = resultUser.rows[0]
      let isAuthed = passwordHash.verify(password, userInfo.hash)
      if(!isAuthed){
        throw new Error('パスワードが違います')
      }

      //トークン作成
      let token = passwordHash.generate(uuid.v4())
      res.cookie('token', token, {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: false
      })
      res.cookie('name', userInfo.name, {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: false
      })
      res.cookie('id', userInfo.user_id, {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: false
      })
      //トークンとユーザー名、トークン発行日時をDBに挿入
      let resultToken = await client.query('INSERT INTO user_token(user_id,name,token,insert_time,mail) VALUES ($1,$2, $3,current_timestamp,$4);', [userInfo.user_id,userInfo.name, token, userInfo.mail])
      if(resultToken.rowCount == 0){
        throw new Error('内部エラー（トークン処理に問題が発生），管理者にお問い合わせください．')
      }
    } catch (err) {
      if(isDebug) console.log(err)
      errorMessage = err.message
      if(client){
        client.end()
      }
      return res.render('login', { errorMessage })
    }
    if(client){
      client.end()
    }
    return res.redirect("/authed/ths_home")
  }
  func1()
});

//------------------------ユーザー登録--------------------------
router.all('/add_user', function module2(req, res, next) {
  let msg = ""
  let client = null
  let user_id = 0;
  const pool = new pg.Pool({
    database: 'ths_db',
    user: 'postgres', //ユーザー名はデフォルト以外を利用している人は適宜変更してください。
    password: 'Kasumin1', //PASSWORDにはPostgreSQLをインストールした際に設定したパスワードを記述。
    host: 'localhost',
    
  });
  async function func2(){
    try{
      if(!req.body.n_name || !req.body.n_mail || !req.body.n_password){
        throw new Error(3)
      }

      const userinfo = {
        name: req.body.n_name,
        mail: req.body.n_mail,
        pass: req.body.n_password
      }
      const hash = passwordHash.generate(userinfo.pass)
      if(!hash)throw new Error(5)

      //すでに登録されていたらエラー文だしてリダイレクト
      if(!pool)return res.redirect('/?msg=5')
      client = await pool.connect()
      if(!client)throw new Error(5)
      let resultUser = await client.query('SELECT * FROM ths_user WHERE mail = $1;', [userinfo.mail])
      if(resultUser.rowCount >= 1)throw new Error(4)
      //user_idを決定
      let id_check = await client.query('SELECT *FROM ths_user ORDER BY user_id DESC');
      if(id_check.rowCount >= 1)user_id = id_check.rows[0].user_id + 1;
      //ユーザーをDBに登録
      try{
        await client.query('INSERT INTO ths_user(user_id,name,mail,hash) VALUES($1,$2,$3,$4);',[user_id,userinfo.name, userinfo.mail, hash])
        console.log("ths_user insert ok")
        msg="6"
      }catch(err){
        msg="5"
      }


    }catch(err){
      if(isDebug) console.log(err)
      msg = err.message
    }
    if(client){
      client.end()
    }
    return res.redirect('/?msg='+msg )
  }
  func2()
})

router.all('/logout', function module3(req, res, next) {
  const pool = new pg.Pool({
    database: 'ths_db',
    user: 'postgres', //ユーザー名はデフォルト以外を利用している人は適宜変更してください。
    password: 'Kasumin1', //PASSWORDにはPostgreSQLをインストールした際に設定したパスワードを記述。
    host: 'localhost',
    
  });
  let client = null
  async function logout(){
    //cookiesとDBのトークン情報を削除
    client = await pool.connect()
    await client.query('DELETE FROM user_token WHERE token=$1;',[req.cookies.token])
    res.clearCookie('token');
    console.log("logout")
    //ログイン画面にリダイレクト
    if(req.query.msg==7)return res.redirect("/login?msg=7")
    res.redirect("/?msg=2")
  }
  logout()
});


//------------ ここから先はログイン済みでないと見れない---------------
router.all('/authed/*',function module4(req, res, next) {
  console.log("/authed通過")
  let client = null
  let user = null
  let token = null
  let user_token = null
  let token_lim = null
  let today = Date.today().toFormat("YYYY-MM-DD");
  // トークンチェック
  //DBアクセスする
  const pool = new pg.Pool({
    database: 'ths_db',
    user: 'postgres', //ユーザー名はデフォルト以外を利用している人は適宜変更してください。
    password: 'Kasumin1', //PASSWORDにはPostgreSQLをインストールした際に設定したパスワードを記述。
    host: 'localhost',
    
  });
  async function func4(){
    try{
      token = req.cookies.token
      if(!token)throw new Error(1)
      if(!pool)return res.redirect('/?mag=5')
      
      //---------------------DBアクセス開始
      client = await pool.connect()
      //時間切れのユーザートークンを削除 
      //！！！！！！！あとで+7に直す！！！！！！！！
      token_lim = await client.query('SELECT FROM user_token;')
      if(isDebug) console.log("Date.compare="+Date.compare(token_lim.rows[0].insert_time+1, today))
      if(Date.compare(token_lim.rows[0].insert_time+1, today) <= 0){
        await client.query('DELETE FROM user_token WHERE name=$1;',[token_lim.rows[0].name])
      }
      user_token = await client.query('SELECT *FROM user_token WHERE token=$1;',[token])
      if(isDebug) console.log("Date.compare="+Date.compare(user_token.rows[0].insert_time+1, today))
      if(Date.compare(user_token.rows[0].insert_time+1, today) <= 0){
        await client.query('DELETE FROM user_token WHERE token=$1;',[token])
        throw new Error(1)
      }
      if(!client)throw new Error(5)
      //トークン情報呼び出し
      user = await client.query('SELECT *FROM user_token WHERE token=$1;',[token])
      //トークンが登録されているか
      if(!user.rows[0].name)throw new Error(1)
      if(isDebug)console.log(user.rows)
      req._local = {
        userInfo: {
          user_id : user.rows[0].user_id,
          name: user.rows[0].name,
          mail: user.rows[0].mail
        }
      }
      //----------------------DBアクセス終了
      if(client){
        client.end()
      }
    }catch(err){
      if(isDebug) console.log(err)
      msg = err.message
      if(client){
        client.end()
      }
      return res.redirect('/?msg='+msg)
    }
    return next()
  }
  func4()
})

//----------------------メインページ------------------------
router.get('/authed/ths_home',async function (req, res, next) {
  let posts = null
  let postnumber = 0
  let button = 0
  let msg = ""
  let page_count = 0
  let pageCount=null
  let client = null
  let search_word = null;
  let id = 0;
  let username = null;
  const pool = new pg.Pool({
    database: 'ths_db',
    user: 'postgres', //ユーザー名はデフォルト以外を利用している人は適宜変更してください。
    password: 'Kasumin1', //PASSWORDにはPostgreSQLをインストールした際に設定したパスワードを記述。
    host: 'localhost',
  });
  
    try{
      //cookie check
      if (!req._local.userInfo.name)return res.redirect('/?msg=1')
      //DBaccess
      if(!pool)throw new Error("DBアクセスに失敗しました。")
      client = await pool.connect()
      if(!client)throw new Error("DBアクセスに失敗しました。")

      //次へ・戻るボタンが押されたらページを変える
      if (req.query.page_count)page_count = +req.query.page_count;

      //投稿ボタンが押された時のメッセージ
      if(req.query.msg == 'ok'){
        msg = "登録が完了しました！"
      }else if(req.query.msg == 'yet'){
        msg = "このIDにはすでに文章が登録されています。新しく作成してください。"
      }else if(req.query.msg == 'ng'){
        msg = "登録に失敗しました><"
      }
      
      //word検索
      if(req.query.search_word){
        search_word = req.query.search_word;
        pageCount = await client.query("SELECT * FROM ths_data_table WHERE sentence LIKE '%"+search_word+"%' ORDER BY table_id DESC OFFSET 10*$1;",[page_count])
        if(!pageCount.rowCount)throw new Error("まだ投稿がありません。")
        if (pageCount.rowCount <= 10) {
          button = 0
        } else {
          button = 1
        }
        //投稿一覧表示
        posts = await client.query("SELECT * FROM ths_data_table WHERE sentence LIKE '%"+search_word+"%' ORDER BY table_id DESC LIMIT 10 OFFSET 10*$1;",[page_count])
        if(!posts.rows)throw new Error("何もありません。")
        postnumber = await client.query("SELECT table_id FROM ths_data_table WHERE sentence LIKE '%"+search_word+"%' ORDER BY table_id DESC;")

        //idがあったら
      }else if(req.query.id){
        id = req.query.id;
        pageCount = await client.query("SELECT * FROM ths_data_table WHERE set_id=$1 ORDER BY table_id DESC OFFSET 10*$2;",[id,page_count])
        if(!pageCount.rowCount)throw new Error("まだ投稿がありません。")
        if (pageCount.rowCount <= 10) {
          button = 0
        } else {
          button = 1
        }
        //投稿一覧表示
        posts = await client.query("SELECT * FROM ths_data_table WHERE set_id=$1 ORDER BY table_id DESC LIMIT 10 OFFSET 10*$2;",[id,page_count])
        if(!posts.rows)throw new Error("何もありません。")
        postnumber = await client.query("SELECT table_id FROM ths_data_table WHERE set_id=$1 ORDER BY table_id DESC;",[id])
      
      //word検索もidもなかったら
      }else{
        pageCount = await client.query("SELECT * FROM ths_data_table ORDER BY table_id DESC OFFSET 10*$1;",[page_count])
        if(!pageCount.rowCount)throw new Error("まだ投稿がありません。")
        if (pageCount.rowCount <= 10) {
          button = 0
        } else {
          button = 1
        }
        //投稿一覧表示
        posts = await client.query("SELECT * FROM ths_data_table ORDER BY table_id DESC LIMIT 10 OFFSET 10*$1;",[page_count])
        if(!posts.rows)throw new Error("何もありません。")
        postnumber = await client.query('SELECT table_id FROM ths_data_table ORDER BY table_id DESC;')  
      }

    }catch(err){
      console.log("catchしました")
      msg = 'ng'
      if(client){
        client.end()
      }
      return res.redirect('/?msg='+msg)
    }
    if(client){
      client.end()
    }
    return res.render('ths_home', {
      user_id: req.cookies.id,
      username: req.cookies.name,
      posts: posts.rows,
      button: button,
      page_count: page_count,
      msg: msg,
      postnumber: postnumber.rows[0].number,
      postCount : postnumber.rows.length,
      search_word:search_word
    });
});

//-----------------------howtoページ---------------------------
router.get('/how_to', function (req,res,next){
  res.render('how_to');
});

//-------------------userページ----------------------
router.all('/authed/user', function module5(req, res, next) {
  let username = "" 
  let usermail = "";
  username = req._local.userInfo.name
  usermail = req._local.userInfo.mail
  if (req.body.count == 1) {
    return res.redirect("/authed/ths_home")
  } else {
    return res.render('user', {
      username: username,
      usermail: usermail
    })
  }
}) 

//-----------------------アドレスの変更--------------------------
router.post('/authed/userinfo_change', function module8(req,res,next){
  let usermail="";
  let new_usermail = "";
  let client = null
  const pool = new pg.Pool({
    database: 'ths_db',
    user: 'postgres', //ユーザー名はデフォルト以外を利用している人は適宜変更してください。
    password: 'Kasumin1', //PASSWORDにはPostgreSQLをインストールした際に設定したパスワードを記述。
    host: 'localhost',
    
  });
  usermail = req._local.userInfo.mail
  new_usermail = req.body.mail

  async function main(){
    client = await pool.connect()
    await client.query('UPDATE ths_user SET mail=$1 WHERE mail=$2',[new_usermail,usermail])
    if(client){
      client.end()
      res.redirect('/logout?msg=7')
    }
  }
  main()
})

//-------------------------単語登録-------------------------
router.post('/newpost',function module7(req, res, next) {
  console.log("newpost")
  let client = null
  let username=""
  let msg = ""
  let table_id=null;
  let set_id = 0
  let search = null;
  const pool = new pg.Pool({
    database: 'ths_db',
    user: 'postgres', //ユーザー名はデフォルト以外を利用している人は適宜変更してください。
    password: 'Kasumin1', //PASSWORDにはPostgreSQLをインストールした際に設定したパスワードを記述。
    host: 'localhost',
    
  });
  async function func7(){
    try{
      if(!req.cookies.name)throw new Error("usernameなかった")

      if(!pool)throw new Error("ng")
      client = await pool.connect()
      if(!client)throw new Error()
      await client.query("BEGIN");

      //flag=1の時新規登録
      if(req.body.flag == 1){
        let id_check = await client.query('SELECT *FROM ths_data_set ORDER BY set_id DESC');
        set_id = id_check.rows[0].set_id + 1;
        let private = req.body.private;
        if(private == undefined)private=false;
        await client.query('INSERT INTO ths_data_set(set_id,private,ownerUserId,Explanation) VALUES($1,$2,$3,$4)',[set_id,private,req.cookies.id,req.body.explanation]);
      }else {
        set_id = req.body.set_id;
      }

      //登録作業
      //重複登録をできないようにする
      search = await client.query("SELECT *FROM ths_data_table WHERE set_id = $1 AND language = $2",[set_id,req.body.language]);
      if(search.rowCount != 0)throw new Error("yet");
      table_id = await client.query('SELECT table_id FROM ths_data_table ORDER BY table_id DESC')
      await client.query("INSERT INTO ths_data_table(table_id,set_id,language,sentence) VALUES($1,$2,$3,$4)",[table_id.rows[0].table_id+1,set_id,req.body.language,req.body.text]);
      await client.query("COMMIT");
      msg = "ok"
    }catch(err){
      console.log("catchしました")
      if(isDebug) console.log(err)
      msg = err.message
      if(client){
        client.end()
      }
    }
    if(client){
      client.end()
    }
    return res.redirect('/authed/ths_home?msg='+msg)
  }
  func7()
});

//次へボタンや戻るボタンが押されたら
router.post('/next', function (req, res, next) {
  let page_count = 0
    try{
      page_count = Number(req.query.page_count)
    }catch(err){
      console.log("catchしました")
      return res.redirect('/authed/ths_home?page_count='+page_count)
    }
    return res.redirect('/authed/ths_home?page_count=' + page_count)
})


module.exports = router;


// /authed/dahsboard?p=0
// 1ページあたりの表示件数 50件 (plen)

// OFFSET= p * plen LIMIST plen ORDER DESC
// 次へ /authed/dahsboard?p=(p+1)
// 前へ /authed/dahsboard?p=(p-1)
// (p+1) ページ目