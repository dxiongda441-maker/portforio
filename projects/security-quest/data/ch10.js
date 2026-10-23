SQ.chapters.push({
  id: "c10",
  no: 10,
  act: 3,
  icon: "🍪",
  title: "Webの仕組みと防御",
  subtitle: "HTTP・Cookie・同一オリジン・CSP",
  story: "ハコニワ社の新しい会員サイトの公開まであと1週間。アオイ「Web の脆弱性を理解するには、まずブラウザが何を守ってくれていて、何を守ってくれないのかを知ること」。",
  boss: { name: "クッキー・グレムリン", line: "その Cookie、Secure も HttpOnly も付いてないじゃないか。いただきだ。" },
  lessons: [
    {
      title: "HTTP はステートレス",
      body: [
        "HTTP はリクエストとレスポンスの繰り返しで、プロトコル自体は前のやり取りを覚えていない（**ステートレス**）。そこで **Cookie** にセッションIDを入れ、ブラウザが毎回送ることで「ログイン状態」を維持する。",
        "リクエストのメソッド：**GET**（取得。副作用を持たせない）、**POST**（送信・変更）など。GET のパラメータは URL に入るため、履歴・ログ・Referer に残る。**パスワードやトークンを URL に入れない**。",
        "**クライアントから届くものはすべて改ざんできる**。フォームの hidden 項目、Cookie、ヘッダー、JavaScript での入力チェック結果も、攻撃者は自由に書き換えて送れる。"
      ],
      example: "POST /cart/checkout HTTP/1.1\nHost: shop.hakoniwa.example\nCookie: session=8f2c...\nContent-Type: application/x-www-form-urlencoded\n\nitem=42&qty=1&price=1980   ← price は攻撃者が 1 に書き換えられる",
      points: [
        "価格・権限・ユーザーIDなどの判断は**必ずサーバー側**で行う",
        "ブラウザ側の入力チェックは使いやすさのため。セキュリティにはならない"
      ]
    },
    {
      title: "Cookie の属性",
      body: [
        "Cookie には安全のための属性を付ける。",
        "`Secure`：HTTPS 通信でのみ送る。`HttpOnly`：JavaScript（`document.cookie`）から読めなくする → XSS で盗まれにくくなる。`SameSite`：他のサイトから発生したリクエストに Cookie を付けるかを制御する（`Strict` / `Lax` / `None`）→ CSRF 対策になる。Chrome などは指定がなければ `Lax` 相当で扱うが、ブラウザによって既定値が違うので必ず明示する。",
        "`Domain` を広く指定するとサブドメインにも送られる。`__Host-` 接頭辞付きの名前にすると、Secure 必須・Domain 指定不可・Path=/ が強制され、より安全になる。"
      ],
      example: "Set-Cookie: __Host-session=8f2c...; Secure; HttpOnly; SameSite=Lax; Path=/",
      points: [
        "セッション Cookie には基本的に `Secure; HttpOnly; SameSite=Lax`（以上）",
        "HttpOnly でも XSS そのものは防げない。攻撃者は被害者のブラウザ上で直接操作できる"
      ]
    },
    {
      title: "同一オリジンポリシー（SOP）",
      body: [
        "**オリジン**＝**スキーム＋ホスト＋ポート**の組。`https://a.example:443` と `http://a.example` はスキームが違うので別オリジン。",
        "ブラウザは、あるオリジンのスクリプトが**別オリジンのデータを読む**ことを原則として禁止する。これが**同一オリジンポリシー**で、Web セキュリティの土台だ。悪いサイトを開いても、そのサイトのスクリプトがあなたの銀行サイトの画面を読めないのはこのおかげ。",
        "注意：SOP は「**読み取り**」を制限するが、別オリジンへ**リクエストを送ること自体**（フォーム送信、画像読み込み）は基本的に止めない。これが CSRF が成立する理由だ。"
      ],
      points: [
        "サイト（Site）はオリジンより広い概念（登録可能ドメイン単位）。SameSite はこちらで判定する",
        "iframe で他サイトを埋め込んでも、中身はスクリプトで読めない"
      ]
    },
    {
      title: "CORS：SOP を「緩める」仕組み",
      body: [
        "**CORS（オリジン間リソース共有）**は、サーバーが `Access-Control-Allow-Origin` などのヘッダーで「このオリジンからなら読んでよい」と**許可を与える**仕組み。",
        "よくある誤解：CORS は防御機能ではない。**SOP の制限を緩めるための例外**であり、設定を誤ると穴になる。特に、リクエストの Origin ヘッダーをそのまま許可として返し、さらに認証情報（Cookie）付きを許可すると、どの悪性サイトからでもログイン中のユーザーのデータを読めてしまう。",
        "また CORS はブラウザが守るルールなので、curl など**ブラウザ以外からのアクセスは一切制限しない**。API の認証・認可は別途必須。"
      ],
      example: "危険：Access-Control-Allow-Origin: （リクエストの Origin をそのまま反射）\n      Access-Control-Allow-Credentials: true\n安全：許可するオリジンを固定のリストで照合する",
      points: [
        "`Access-Control-Allow-Origin: *` は Cookie 付きリクエストには使えない（ブラウザが拒否）",
        "「CORS エラーが出たから * にした」は危険信号"
      ]
    },
    {
      title: "セキュリティヘッダーと CSP",
      body: [
        "**Content-Security-Policy（CSP）**：ページが読み込めるスクリプト・画像・通信先などを許可リストで制限する。XSS が起きても、インラインスクリプトや外部の不正スクリプトの実行を止められる**多層防御**。`nonce` や `hash` を使う厳格な CSP が推奨される。",
        "**Strict-Transport-Security**：HTTPS を強制（第4章）。**X-Content-Type-Options: nosniff**：ブラウザに Content-Type を推測させない。**CSP の frame-ancestors** または **X-Frame-Options**：他サイトの iframe に埋め込ませない → **クリックジャッキング**（透明な iframe で重ねてボタンを押させる攻撃）を防ぐ。**Referrer-Policy**：遷移先に送る URL 情報を制限。",
        "このゲーム自体も CSP で外部スクリプトと外部通信を禁止している。"
      ],
      example: "Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-r4nd0m';\n  object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
      points: [
        "`script-src 'unsafe-inline'` を許可すると XSS 対策としての CSP の効果はほぼ失われる",
        "CSP は根本対策（出力時のエスケープ）の代わりではなく、最後の防衛線"
      ]
    },
    {
      title: "安全なWebの基本動作",
      body: [
        "エラー画面にスタックトレースや SQL 文を出さない（攻撃者への情報提供になる）。管理画面を公開しない、もしくは IP 制限と MFA をかける。",
        "ディレクトリの一覧表示を無効にする。`.git` ディレクトリやバックアップファイル（`.bak`、`.zip`）を公開領域に置かない。",
        "ログイン・パスワードリセット・問い合わせフォームには**レート制限**を。ユーザーの存在有無を推測させるメッセージ（「このメールアドレスは登録されていません」）も情報漏えいになりうる。"
      ],
      points: [
        "`robots.txt` はクローラ向けのお願いで、アクセス制御ではない。隠したい URL を書くと逆に教えることになる",
        "フレームワークの安全機能（自動エスケープ、CSRF トークン）を無効化しない"
      ]
    }
  ],
  terms: [
    ["ステートレス", "プロトコル自体が過去のやり取りを保持しない性質。HTTP の特徴。"],
    ["Cookie", "サーバーがブラウザに保存させ、以後のリクエストで送られる小さなデータ。"],
    ["Secure属性", "Cookie を HTTPS 通信でのみ送信させる属性。"],
    ["HttpOnly属性", "Cookie を JavaScript から読み取れなくする属性。"],
    ["SameSite属性", "クロスサイトのリクエストに Cookie を付けるかを制御する属性。"],
    ["オリジン", "スキーム・ホスト・ポートの組。ブラウザのセキュリティ境界の単位。"],
    ["同一オリジンポリシー", "別オリジンのデータの読み取りを原則禁止するブラウザの制限。"],
    ["CORS", "サーバーの許可に基づき、別オリジンからの読み取りを例外的に認める仕組み。"],
    ["CSP", "Content-Security-Policy。読み込めるリソースを制限し、XSS 等の被害を軽減するヘッダー。"],
    ["クリックジャッキング", "透明な iframe を重ね、意図しない操作をクリックさせる攻撃。"],
    ["X-Content-Type-Options", "nosniff を指定し、ブラウザの Content-Type 推測を無効にするヘッダー。"],
    ["Referrer-Policy", "遷移先に送る参照元 URL の情報量を制御するヘッダー。"]
  ],
  quiz: [
    {
      type: "choice",
      q: "ECサイトで、商品価格がフォームの hidden 項目として送信され、サーバーはその値で決済していた。何が問題？",
      choices: [
        "攻撃者がリクエストを書き換えて任意の価格で購入できる",
        "hidden 項目は暗号化されないので遅くなる",
        "ブラウザの戻るボタンが効かなくなる",
        "問題はない。hidden 項目は利用者に見えない"
      ],
      answer: 0,
      exp: "hidden は画面に表示されないだけで、開発者ツールやプロキシで自由に改ざんできる。価格はサーバー側で商品IDから引く。"
    },
    {
      type: "match",
      q: "Cookie の属性と効果を組み合わせよ。",
      pairs: [
        ["Secure", "HTTPS のときだけ送信される"],
        ["HttpOnly", "JavaScript から読み取れない"],
        ["SameSite=Lax", "他サイトからの POST などには Cookie が付かない"],
        ["__Host- 接頭辞", "Secure 必須・Domain 指定不可・Path=/ を強制"]
      ],
      exp: "セッション Cookie には Secure・HttpOnly・SameSite を基本セットで付ける。__Host- はサブドメインからの上書きも防げる。"
    },
    {
      type: "multi",
      q: "`https://shop.example.com` と**同一オリジン**のものをすべて選べ。",
      choices: [
        "https://shop.example.com/cart",
        "http://shop.example.com",
        "https://api.example.com",
        "https://shop.example.com:443/login",
        "https://shop.example.com:8443"
      ],
      answer: [0, 3],
      exp: "オリジン＝スキーム＋ホスト＋ポート。パスは関係ない。https の既定ポートは 443 なので明示しても同じ。http（スキーム違い）、api.（ホスト違い）、8443（ポート違い）は別オリジン。"
    },
    {
      type: "choice",
      q: "同一オリジンポリシーが**防がない**ことは？",
      choices: [
        "悪性サイトから別サイトへフォームを送信すること自体",
        "悪性サイトのスクリプトが銀行サイトのページ内容を読み取ること",
        "悪性サイトのスクリプトが別オリジンの API レスポンスを読むこと",
        "iframe で埋め込んだ別オリジンの中身をスクリプトで読むこと"
      ],
      answer: 0,
      exp: "SOP は「読み取り」を制限するが、リクエストの送信は止めない。この隙を突くのが CSRF（第11章）。"
    },
    {
      type: "spot",
      q: "API サーバーのCORS処理（擬似コード）。**任意の悪性サイトにログイン中ユーザーのデータを読ませてしまう**原因の行をすべて選べ。",
      lines: [
        "function handle(req, res) {",
        "  const origin = req.headers.origin;",
        "  res.setHeader('Access-Control-Allow-Origin', origin);",
        "  res.setHeader('Access-Control-Allow-Credentials', 'true');",
        "  const user = getUserFromSession(req.cookies.session);",
        "  res.json(getPrivateData(user));",
        "}"
      ],
      answer: [2, 3],
      exp: "リクエストの Origin をそのまま許可として返し、さらに Cookie 付きを許可しているため、どのサイトからでもログイン中ユーザーの個人データを読める。許可するオリジンは固定リストで照合する。"
    },
    {
      type: "choice",
      q: "CORS についての説明で正しいのは？",
      choices: [
        "同一オリジンポリシーの制限を、サーバーの許可に基づいて緩める仕組みである",
        "API を不正アクセスから守る認証の仕組みである",
        "curl などのツールからのアクセスも制限できる",
        "設定すればするほど安全になる"
      ],
      answer: 0,
      exp: "CORS は「緩める」ための例外ルール。ブラウザ以外からのアクセスは制限しないので、API の認証・認可は別途必須。"
    },
    {
      type: "choice",
      q: "XSS の脆弱性が残っていても、被害を軽減できる多層防御のヘッダーは？",
      choices: ["Content-Security-Policy", "Strict-Transport-Security", "Referrer-Policy", "Cache-Control"],
      answer: 0,
      exp: "CSP で許可していないスクリプトの実行や外部への送信を止められる。ただし根本対策は出力時のエスケープ。"
    },
    {
      type: "choice",
      q: "自社サイトを透明な iframe で重ね、ユーザーに「退会」ボタンを押させる攻撃への対策は？",
      choices: [
        "CSP の frame-ancestors（または X-Frame-Options）で埋め込みを禁止する",
        "Cookie に HttpOnly を付ける",
        "パスワードを長くする",
        "DNSSEC を導入する"
      ],
      answer: 0,
      exp: "クリックジャッキング。他サイトの iframe に表示されないようにすれば、重ねる土台がなくなる。"
    },
    {
      type: "multi",
      q: "公開 Web サーバーで**避けるべき**状態をすべて選べ。",
      choices: [
        "エラー時に SQL 文とスタックトレースを画面に表示する",
        "https://example.com/.git/ にアクセスできる",
        "robots.txt に「Disallow: /secret-admin/」と書いて管理画面を隠している",
        "ログインフォームにレート制限をかけている",
        "パスワードリセット用トークンを GET パラメータで送り、アクセスログに残る"
      ],
      answer: [0, 1, 2, 4],
      exp: "エラー情報は攻撃のヒント。.git の公開はソースコードや秘密情報の漏えいに直結。robots.txt は誰でも読めるため隠し場所を宣伝することになる。URL 内のトークンはログや Referer から漏れる。"
    },
    {
      type: "choice",
      q: "CSP で `script-src 'self' 'unsafe-inline'` と設定した。XSS 対策としての評価は？",
      choices: [
        "インラインスクリプトを許すため、典型的な XSS をほとんど止められない",
        "最も厳格で理想的な設定",
        "外部スクリプトも含めすべてを禁止する",
        "CSP は XSS とは無関係"
      ],
      answer: 0,
      exp: "XSS で注入されるのは多くがインラインのスクリプトやイベントハンドラ。'unsafe-inline' はその実行を許してしまう。nonce や hash ベースの CSP を使う。"
    }
  ]
});
