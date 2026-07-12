const cats = [
  {
    name: "メインクーン",
    en: "Maine Coon",
    wiki: "Maine_Coon",
    origin: "アメリカ北東部",
    region: "北米",
    coat: "長毛",
    tags: ["popular", "longhair"],
    summary: "大型で骨格がしっかりした長毛種。寒冷地に向いた厚い被毛とふさふさの尾が特徴です。",
    history: "19世紀のメイン州周辺で知られるようになり、北米の自然発生的な作業猫として発展しました。",
    pet: "穏やかで人と暮らしやすく、世界的に人気の高い家庭猫です。",
    trivia: "水を嫌がりにくい個体が多いと紹介されることがあります。"
  },
  {
    name: "ラグドール",
    en: "Ragdoll",
    wiki: "Ragdoll",
    origin: "アメリカ",
    region: "北米",
    coat: "セミロング",
    tags: ["popular", "longhair"],
    summary: "青い目、ポイントカラー、やわらかな長めの被毛が目立つ大型猫です。",
    history: "1960年代のカリフォルニアで作出され、抱かれると力を抜きやすい性質から名付けられました。",
    pet: "近年の登録団体ランキングで上位に入る代表的な人気猫です。",
    trivia: "成猫らしい体格や毛色になるまで数年かかることがあります。"
  },
  {
    name: "ペルシャ",
    en: "Persian",
    wiki: "Persian_cat",
    origin: "イラン周辺と英国での改良",
    region: "中東・欧州",
    coat: "長毛",
    tags: ["popular", "longhair"],
    summary: "丸い顔、短い鼻、長く豊かな被毛が象徴的な古典的猫種です。",
    history: "長毛猫として欧州に紹介され、キャットショー文化の初期から人気を得ました。",
    pet: "落ち着いた室内猫として知られますが、被毛の手入れが重要です。",
    trivia: "顔立ちのタイプにより涙や呼吸への配慮が必要な場合があります。"
  },
  {
    name: "シャム",
    en: "Siamese",
    wiki: "Siamese_cat",
    origin: "タイ",
    region: "アジア",
    coat: "短毛",
    tags: ["popular", "shortHair"],
    summary: "細身の体、青い目、耳・顔・足・尾に色が出るポイント模様が特徴です。",
    history: "旧シャム王国由来の猫として19世紀後半に欧米へ紹介されました。",
    pet: "よく鳴き、人との交流を強く求める個体が多い猫種です。",
    trivia: "ポイント模様は体温の低い部分で濃くなりやすい性質と関係します。"
  },
  {
    name: "ブリティッシュショートヘア",
    en: "British Shorthair",
    wiki: "British_Shorthair",
    origin: "英国",
    region: "欧州",
    coat: "短毛",
    tags: ["popular", "shortHair"],
    summary: "丸い顔、がっしりした体、密な短毛を持つ英国の代表的猫種です。",
    history: "英国在来の猫を基礎に、キャットショー時代に品種として整えられました。",
    pet: "静かで自立心があり、集合住宅でも飼いやすいとされます。",
    trivia: "ブルーの毛色が有名ですが、多くの毛色が認められています。"
  },
  {
    name: "スコティッシュフォールド",
    en: "Scottish Fold",
    wiki: "Scottish_Fold",
    origin: "スコットランド",
    region: "欧州",
    coat: "短毛・長毛",
    tags: ["popular", "shortHair"],
    summary: "前向きに折れた耳で知られる猫種。丸い顔つきも人気です。",
    history: "1960年代にスコットランドで見つかった折れ耳猫を起源とします。",
    pet: "性格は穏やかとされますが、骨や関節の健康管理が大切です。",
    trivia: "折れ耳の特徴は軟骨に関わる遺伝形質と関連します。"
  },
  {
    name: "ベンガル",
    en: "Bengal",
    wiki: "Bengal_cat",
    origin: "アメリカ",
    region: "北米",
    coat: "短毛",
    tags: ["popular", "shortHair"],
    summary: "ヒョウ柄のようなスポットやロゼット模様が印象的な活発な猫種です。",
    history: "イエネコとアジアのベンガルヤマネコ系統をもとに、家庭猫として改良されました。",
    pet: "運動量と知的刺激を多く必要とするため、遊びの環境づくりが重要です。",
    trivia: "毛にきらめきが見える「グリッター」と呼ばれる質感を持つ個体もいます。"
  },
  {
    name: "スフィンクス",
    en: "Sphynx",
    wiki: "Sphynx_cat",
    origin: "カナダ",
    region: "北米",
    coat: "無毛に近い",
    tags: ["popular", "shortHair"],
    summary: "ほとんど毛がない外見、しわのある皮膚、大きな耳が特徴です。",
    history: "1960年代以降のカナダの自然突然変異をもとに発展しました。",
    pet: "寒さや日差しに弱いため、室温管理と皮膚ケアが欠かせません。",
    trivia: "完全な無毛ではなく、短い産毛のような手触りを持つことがあります。"
  },
  {
    name: "アビシニアン",
    en: "Abyssinian",
    wiki: "Abyssinian_cat",
    origin: "英国で品種化",
    region: "アフリカ・欧州",
    coat: "短毛",
    tags: ["shortHair"],
    summary: "1本の毛に複数の色帯があるティックドタビーが美しい、しなやかな猫種です。",
    history: "古代エジプト風の外見で語られることがありますが、近代的な品種化は英国で進みました。",
    pet: "好奇心旺盛で高い場所や探索を好む個体が多いです。",
    trivia: "名前はエチオピア旧称のアビシニアに由来します。"
  },
  {
    name: "ロシアンブルー",
    en: "Russian Blue",
    wiki: "Russian_Blue",
    origin: "ロシア北部と英国での改良",
    region: "欧州",
    coat: "短毛",
    tags: ["popular", "shortHair"],
    summary: "青灰色のダブルコートと緑の目、上品な体つきで知られます。",
    history: "ロシア北部の港町アルハンゲリスク由来とされ、英国でショー猫として発展しました。",
    pet: "静かで慎重、信頼した家族にはよく甘えるタイプとされます。",
    trivia: "密な被毛は手でなでると跡が残るほど弾力があります。"
  },
  {
    name: "ノルウェージャンフォレストキャット",
    en: "Norwegian Forest Cat",
    wiki: "Norwegian_Forest_cat",
    origin: "ノルウェー",
    region: "欧州",
    coat: "長毛",
    tags: ["popular", "longhair"],
    summary: "寒冷地に適した防水性のある長毛と大きな体を持つ北欧の猫です。",
    history: "ノルウェーの森に暮らした在来猫を基礎に、20世紀に品種として保護されました。",
    pet: "落ち着きと遊び好きの両面があり、登れる環境を好みます。",
    trivia: "北欧神話と結びつけて紹介されることもあります。"
  },
  {
    name: "シベリアン",
    en: "Siberian",
    wiki: "Siberian_cat",
    origin: "ロシア",
    region: "欧州・アジア",
    coat: "長毛",
    tags: ["popular", "longhair"],
    summary: "がっしりした体と三層に近い豊かな被毛を持つロシア由来の猫です。",
    history: "ロシアの在来長毛猫をもとに、20世紀後半から国際的に登録が進みました。",
    pet: "活動的で人なつこい個体が多い一方、換毛期のケアが重要です。",
    trivia: "水を怖がらない個体がいると紹介されることがあります。"
  },
  {
    name: "ターキッシュアンゴラ",
    en: "Turkish Angora",
    wiki: "Turkish_Angora",
    origin: "トルコ",
    region: "中東",
    coat: "長毛",
    tags: ["longhair"],
    summary: "絹のような被毛と細身の体が特徴の古い長毛猫です。",
    history: "アンカラ周辺に由来し、欧州の長毛猫文化にも影響を与えました。",
    pet: "賢く活発で、家族の動きに参加したがる猫として知られます。",
    trivia: "白猫のイメージが強いですが、さまざまな毛色が存在します。"
  },
  {
    name: "エジプシャンマウ",
    en: "Egyptian Mau",
    wiki: "Egyptian_Mau",
    origin: "エジプト系統・欧米で改良",
    region: "アフリカ",
    coat: "短毛",
    tags: ["shortHair"],
    summary: "自然なスポット模様を持つ、筋肉質で俊敏な短毛種です。",
    history: "エジプト由来の猫として紹介され、20世紀に欧米で品種として確立しました。",
    pet: "運動能力が高く、走る・登る遊びを好みます。",
    trivia: "額の模様がスカラベやM字に見えると紹介されます。"
  },
  {
    name: "ジャパニーズボブテイル",
    en: "Japanese Bobtail",
    wiki: "Japanese_Bobtail",
    origin: "日本",
    region: "アジア",
    coat: "短毛・長毛",
    tags: ["shortHair"],
    summary: "短く曲がった尾が特徴。三毛の招き猫イメージとも結びつく日本由来の猫です。",
    history: "日本の絵画や民俗にも登場し、20世紀に海外の登録団体で品種化されました。",
    pet: "活発で社交的、声でよくコミュニケーションを取るとされます。",
    trivia: "尾の形は個体ごとに異なり、同じ形は少ないといわれます。"
  },
  {
    name: "アメリカンショートヘア",
    en: "American Shorthair",
    wiki: "American_Shorthair",
    origin: "アメリカ",
    region: "北米",
    coat: "短毛",
    tags: ["popular", "shortHair"],
    summary: "丸みのある顔、丈夫な体、クラシックタビー柄で有名な短毛種です。",
    history: "欧州から北米へ渡った作業猫を基礎に、米国で品種として整えられました。",
    pet: "適応力が高く、家庭猫として長く親しまれています。",
    trivia: "害獣を捕る船猫・農場猫の歴史がよく語られます。"
  },
  {
    name: "オリエンタルショートヘア",
    en: "Oriental Shorthair",
    wiki: "Oriental_Shorthair",
    origin: "英国・アメリカ",
    region: "欧州・北米",
    coat: "短毛",
    tags: ["shortHair"],
    summary: "シャムに近い細身の体型で、非常に多彩な毛色と模様が認められます。",
    history: "シャムの体型を保ちながら、ポイント以外の色柄を広げる目的で発展しました。",
    pet: "声で主張し、人との関わりを強く求める傾向があります。",
    trivia: "毛色・模様のバリエーションがとても多い猫種です。"
  },
  {
    name: "マンチカン",
    en: "Munchkin",
    wiki: "Munchkin_cat",
    origin: "アメリカ",
    region: "北米",
    coat: "短毛・長毛",
    tags: ["popular", "shortHair"],
    summary: "短い脚で知られる猫種。体長に対して脚が短く見えるのが特徴です。",
    history: "1980年代以降、自然突然変異の短足猫をもとに品種として広まりました。",
    pet: "遊び好きで人なつこい一方、体型に関わる健康面の議論があります。",
    trivia: "短足でない同腹の猫が生まれることもあります。"
  },
  {
    name: "バーマン",
    en: "Birman",
    wiki: "Birman",
    origin: "ミャンマー伝承・フランスで品種化",
    region: "アジア・欧州",
    coat: "長毛",
    tags: ["popular", "longhair"],
    summary: "青い目、ポイントカラー、白い手袋のような足先が特徴のセミロング猫です。",
    history: "寺院猫の伝承で知られ、近代的な登録猫種としてはフランスで発展しました。",
    pet: "穏やかで人との距離が近く、家庭猫として人気があります。",
    trivia: "足先の白い模様はグローブと呼ばれ、ショーでは重要な特徴です。"
  },
  {
    name: "バーミーズ",
    en: "Burmese",
    wiki: "Burmese_cat",
    origin: "ミャンマー系統・アメリカ/英国で改良",
    region: "アジア・北米・欧州",
    coat: "短毛",
    tags: ["popular", "shortHair"],
    summary: "つやのある短毛と筋肉質な体、人なつこい性格で知られる猫種です。",
    history: "東南アジア由来の猫を基礎に、20世紀のアメリカと英国で系統が発展しました。",
    pet: "人と遊ぶことを好み、留守番時間が長い家庭では退屈対策が大切です。",
    trivia: "見た目より抱くと重いと表現されることがあります。"
  },
  {
    name: "エキゾチックショートヘア",
    en: "Exotic Shorthair",
    wiki: "Exotic_Shorthair",
    origin: "アメリカ",
    region: "北米",
    coat: "短毛",
    tags: ["popular", "shortHair"],
    summary: "ペルシャに似た丸い顔立ちと、手入れしやすい短毛を持つ猫種です。",
    history: "ペルシャの体型を短毛で表す目的で、アメリカンショートヘアなどとの交配から発展しました。",
    pet: "落ち着いた性格で人気ですが、短頭系の健康管理は必要です。",
    trivia: "短毛のペルシャと紹介されることがあります。"
  },
  {
    name: "ヒマラヤン",
    en: "Himalayan",
    wiki: "Himalayan_cat",
    origin: "英国・アメリカ",
    region: "欧州・北米",
    coat: "長毛",
    tags: ["longhair"],
    summary: "ペルシャ型の体と長毛に、シャム由来のポイントカラーを持つ猫です。",
    history: "20世紀にペルシャとシャムの特徴を組み合わせる目的で作出されました。",
    pet: "穏やかな室内猫として知られ、被毛と顔まわりのケアが重要です。",
    trivia: "登録団体によって独立種またはペルシャの一部として扱われます。"
  },
  {
    name: "ターキッシュバン",
    en: "Turkish Van",
    wiki: "Turkish_Van",
    origin: "トルコ東部",
    region: "中東",
    coat: "セミロング",
    tags: ["longhair"],
    summary: "頭と尾に色が出やすいバンパターンと、しっかりした体が特徴です。",
    history: "トルコのヴァン湖周辺に由来すると紹介され、英国で品種として発展しました。",
    pet: "活発で高い場所を好み、水に興味を示す個体がいるとされます。",
    trivia: "白地に頭部と尾だけ色がある模様はバンパターンと呼ばれます。"
  },
  {
    name: "ソマリ",
    en: "Somali",
    wiki: "Somali_cat",
    origin: "アビシニアン系統・北米で発展",
    region: "北米・アフリカ",
    coat: "長毛",
    tags: ["longhair"],
    summary: "アビシニアンに似たティックドカラーを持つ、ふさふさの尾の長毛猫です。",
    history: "アビシニアンの長毛系統から発展し、20世紀後半に猫種として認められました。",
    pet: "活発で遊び好き、運動できる空間を好みます。",
    trivia: "尾の雰囲気からキツネのようと表現されることがあります。"
  },
  {
    name: "マンクス",
    en: "Manx",
    wiki: "Manx_cat",
    origin: "マン島",
    region: "欧州",
    coat: "短毛・長毛",
    tags: ["shortHair"],
    summary: "尾が非常に短い、またはほとんどないことで知られる島由来の猫です。",
    history: "英国とアイルランドの間にあるマン島で古くから知られ、初期のショーにも登場しました。",
    pet: "よく遊ぶ家庭猫ですが、尾の遺伝形質に関わる健康確認が重要です。",
    trivia: "尾の長さによってランピー、スタンピーなどと呼び分けられます。"
  },
  {
    name: "デボンレックス",
    en: "Devon Rex",
    wiki: "Devon_Rex",
    origin: "英国",
    region: "欧州",
    coat: "巻き毛短毛",
    tags: ["shortHair"],
    summary: "大きな耳、細い体、やわらかな巻き毛で知られる個性的な猫種です。",
    history: "1960年代の英国デボン州で見つかった巻き毛猫を起源とします。",
    pet: "人のそばにいることを好み、遊び好きな性格で知られます。",
    trivia: "同じ巻き毛でもコーニッシュレックスとは別の遺伝的背景です。"
  },
  {
    name: "コーニッシュレックス",
    en: "Cornish Rex",
    wiki: "Cornish_Rex",
    origin: "英国",
    region: "欧州",
    coat: "巻き毛短毛",
    tags: ["shortHair"],
    summary: "波打つような短い巻き毛と細身の体、長い脚が特徴です。",
    history: "1950年代の英国コーンウォールで生まれた突然変異の巻き毛猫から始まりました。",
    pet: "活動的で体温を保ちにくいことがあるため、寒さへの配慮が必要です。",
    trivia: "ガードヘアが少ない独特の被毛を持ちます。"
  },
  {
    name: "トンキニーズ",
    en: "Tonkinese",
    wiki: "Tonkinese_cat",
    origin: "カナダ・アメリカ",
    region: "北米・アジア",
    coat: "短毛",
    tags: ["shortHair"],
    summary: "シャムとバーミーズの特徴をあわせた、社交的で筋肉質な短毛猫です。",
    history: "20世紀に北米で計画的に発展し、ミンクカラーの瞳と毛色が知られます。",
    pet: "よく遊び、家族との交流を求める猫として人気があります。",
    trivia: "アクア色の目を持つミンクパターンが有名です。"
  },
  {
    name: "シャルトリュー",
    en: "Chartreux",
    wiki: "Chartreux",
    origin: "フランス",
    region: "欧州",
    coat: "短毛",
    tags: ["shortHair"],
    summary: "青灰色の被毛、丸みのある顔、微笑んでいるような口元で知られます。",
    history: "フランスの古い猫として語られ、20世紀に品種として整えられました。",
    pet: "静かで落ち着いた家庭猫として紹介されることが多いです。",
    trivia: "ロシアンブルーやブリティッシュブルーと混同されることがあります。"
  },
  {
    name: "オシキャット",
    en: "Ocicat",
    wiki: "Ocicat",
    origin: "アメリカ",
    region: "北米",
    coat: "短毛",
    tags: ["shortHair"],
    summary: "野生猫のような斑点模様を持ちますが、野生猫の血を使わずに作出された猫種です。",
    history: "シャム、アビシニアン、アメリカンショートヘアなどを基礎にアメリカで発展しました。",
    pet: "社交的で活動的、遊びとコミュニケーションを好みます。",
    trivia: "名前はオセロットに似た模様から来ています。"
  },
  {
    name: "ヨーロッパヤマネコ",
    en: "European Wildcat",
    wiki: "European_wildcat",
    origin: "欧州の森林・草地",
    region: "欧州",
    coat: "野生",
    tags: ["wild"],
    summary: "イエネコに似ますが、太い輪状の尾やがっしりした体つきが目印の野生種です。",
    history: "イエネコとは近縁で、欧州各地で保全対象になっています。",
    pet: "ペット向きではなく、野生動物として保護・管理されます。",
    trivia: "家猫との交雑が保全上の課題になる地域があります。"
  },
  {
    name: "リビアヤマネコ",
    en: "African wildcat",
    wiki: "African_wildcat",
    origin: "アフリカ・中東",
    region: "アフリカ・中東",
    coat: "野生",
    tags: ["wild"],
    summary: "イエネコの祖先に最も近い系統として知られる、砂色の小型野生猫です。",
    history: "近東の農耕社会で人と近づき、イエネコの家畜化につながったと考えられています。",
    pet: "野生種であり、家庭猫として飼う対象ではありません。",
    trivia: "穀物を食べるネズミを追って人の集落に近づいたという説があります。"
  },
  {
    name: "マヌルネコ",
    en: "Pallas's cat",
    wiki: "Pallas%27s_cat",
    origin: "中央アジアの草原・高地",
    region: "アジア",
    coat: "野生",
    tags: ["wild", "longhair"],
    summary: "丸い顔、低い耳、密な毛で寒冷な高地に適応した小型野生猫です。",
    history: "18世紀に博物学者ペーター・パラスにより記載されました。",
    pet: "野生動物で、保全と生息地保護が重要です。",
    trivia: "瞳孔が縦長ではなく丸く見えることで知られます。"
  },
  {
    name: "ベンガルヤマネコ",
    en: "Leopard cat",
    wiki: "Leopard_cat",
    origin: "南アジア・東南アジア・東アジア",
    region: "アジア",
    coat: "野生",
    tags: ["wild", "shortHair"],
    summary: "小型ながらヒョウのような斑点模様を持ち、アジアの広い地域に分布します。",
    history: "ベンガル猫の作出に関わった野生近縁種としても知られます。",
    pet: "地域によって保護対象であり、野生で暮らす種です。",
    trivia: "日本の対馬にいるツシマヤマネコはこの仲間です。"
  },
  {
    name: "サーバル",
    en: "Serval",
    wiki: "Serval",
    origin: "サハラ以南アフリカ",
    region: "アフリカ",
    coat: "野生",
    tags: ["wild", "shortHair"],
    summary: "長い脚と大きな耳を持ち、草原で小動物を狩る中型の野生猫です。",
    history: "古くからアフリカの湿地・草原環境に適応してきたネコ科動物です。",
    pet: "家庭猫ではなく、飼育には法規制や専門的な環境が関わります。",
    trivia: "高く跳び上がって獲物を捕らえる能力で知られます。"
  },
  {
    name: "スナネコ",
    en: "Sand cat",
    wiki: "Sand_cat",
    origin: "北アフリカ・中東・中央アジアの砂漠",
    region: "アフリカ・中東",
    coat: "野生",
    tags: ["wild", "shortHair"],
    summary: "砂漠に適応した小型の野生猫。足裏の毛が熱い砂から体を守ります。",
    history: "乾燥地帯に特化した生態を持ち、夜行性の狩りで生きています。",
    pet: "野生種で、かわいい外見でもペットには向きません。",
    trivia: "水分の多くを獲物から得られるとされます。"
  }
];

const habits = [
  { icon: "Zz", title: "睡眠", text: "猫は薄明薄暮性で、活動時間の合間に長く休みます。子猫や高齢猫はさらに睡眠時間が長くなりがちです。" },
  { icon: "爪", title: "爪とぎ", text: "爪の外層を整え、においを残し、伸びをする行動です。家具対策には好みの素材と場所に爪とぎを置くのが有効です。" },
  { icon: "狩", title: "狩猟本能", text: "家で暮らしていても追う・待つ・飛びつく行動は残ります。短時間の遊びを複数回入れると満足しやすくなります。" },
  { icon: "毛", title: "グルーミング", text: "体温調整、被毛の清潔、気持ちを落ち着ける役割があります。過度な毛づくろいはストレスや皮膚トラブルのサインにもなります。" },
  { icon: "声", title: "鳴き声", text: "成猫同士より、人への要求や挨拶として鳴くことが多く、猫種や個体でかなり差があります。" },
  { icon: "尾", title: "しっぽ", text: "垂直に立てる、膨らませる、ゆっくり振るなど、尾は気分を読む重要な手がかりです。" },
  { icon: "髭", title: "ひげ", text: "ひげは周囲の距離や空気の動きを感じる感覚器です。切ると方向感覚や安心感に影響します。" },
  { icon: "社", title: "社会性", text: "単独行動の印象が強い一方、相性のよい相手や人とは社会的な関係を作ります。急な同居開始は慎重な導入が必要です。" }
];

const regions = [
  { name: "アジア", cats: ["シャム", "ジャパニーズボブテイル", "マヌルネコ", "ベンガルヤマネコ"], note: "タイ、日本、中央アジア、東南アジアなど、古い地域猫文化と野生小型猫が共存します。" },
  { name: "欧州", cats: ["ブリティッシュショートヘア", "ロシアンブルー", "ノルウェージャンフォレストキャット", "ヨーロッパヤマネコ"], note: "英国のキャットショー文化、北欧の寒冷地猫、欧州在来の野生猫が代表的です。" },
  { name: "北米", cats: ["メインクーン", "ラグドール", "ベンガル", "スフィンクス", "アメリカンショートヘア"], note: "自然発生の作業猫と、近代的なブリーディングで生まれた人気猫種が多くあります。" },
  { name: "アフリカ", cats: ["エジプシャンマウ", "リビアヤマネコ", "サーバル", "スナネコ"], note: "イエネコの家畜化に関わる野生系統と、乾燥地・草原に適応した野生猫が見られます。" },
  { name: "中東", cats: ["ペルシャ", "ターキッシュアンゴラ", "リビアヤマネコ", "スナネコ"], note: "長毛猫の歴史、古代からの人との関わり、砂漠環境に適応した猫が特徴です。" }
];

const quiz = [
  { q: "メインクーンの発祥地としてよく紹介される地域は？", options: ["アメリカ北東部", "タイ", "トルコ"], answer: 0, note: "メイン州周辺の自然発生的な大型猫として知られます。" },
  { q: "ポイントカラーと青い目で有名なタイ由来の猫は？", options: ["シャム", "スナネコ", "ロシアンブルー"], answer: 0, note: "シャムは旧シャム王国由来として欧米に紹介されました。" },
  { q: "イエネコの祖先に近いとされる野生猫は？", options: ["リビアヤマネコ", "サーバル", "マヌルネコ"], answer: 0, note: "近東の農耕社会との関係が家畜化の説明でよく扱われます。" },
  { q: "折れ耳の特徴で知られる猫種は？", options: ["スコティッシュフォールド", "アビシニアン", "オリエンタルショートヘア"], answer: 0, note: "折れ耳は軟骨に関わる遺伝形質と関連します。" },
  { q: "砂漠に適応し、足裏の毛が熱い砂から守る野生猫は？", options: ["スナネコ", "ペルシャ", "ブリティッシュショートヘア"], answer: 0, note: "スナネコは北アフリカ・中東・中央アジアの乾燥地帯に暮らします。" },
  { q: "猫の爪とぎの主な目的として正しいものは？", options: ["爪の外層を整え、においを残す", "耳を冷やす", "視力を高める"], answer: 0, note: "爪とぎはマーキング、ストレッチ、爪の手入れを兼ねます。" },
  { q: "青灰色の被毛と緑の目で知られる猫は？", options: ["ロシアンブルー", "ラグドール", "ベンガル"], answer: 0, note: "ロシアンブルーは密なダブルコートも特徴です。" },
  { q: "ベンガル猫の模様に影響した野生近縁種は？", options: ["ベンガルヤマネコ", "ヨーロッパヤマネコ", "サーバル"], answer: 0, note: "家庭猫として改良され、活発な猫種として知られます。" },
  { q: "日本の招き猫イメージと結びつく短い尾の猫は？", options: ["ジャパニーズボブテイル", "シベリアン", "スフィンクス"], answer: 0, note: "短く曲がった尾が特徴です。" },
  { q: "ラグドールが作出された時期と地域として近いものは？", options: ["1960年代のカリフォルニア", "古代エジプト", "18世紀のノルウェー"], answer: 0, note: "抱かれると力を抜きやすい性質から名付けられたとされます。" },
  { q: "マヌルネコがよく暮らす環境は？", options: ["中央アジアの草原・高地", "熱帯雨林の樹冠", "都市の地下鉄"], answer: 0, note: "寒冷な高地に適応した密な毛と低い耳が特徴です。" },
  { q: "猫のひげについて正しい説明は？", options: ["周囲の距離や空気の動きを感じる", "季節ごとに色が変わる", "抜くと早く伸びる"], answer: 0, note: "ひげは大切な感覚器なので切らないようにします。" }
];

const catGrid = document.querySelector("#cat-grid");
const regionGrid = document.querySelector("#region-grid");
const habitGrid = document.querySelector("#habit-grid");
const filters = document.querySelectorAll(".filter");
const breedCount = document.querySelector("#breed-count");
const imageCache = new Map();

breedCount.textContent = cats.length;

function tagLabel(tag) {
  return {
    popular: "人気",
    longhair: "長毛",
    shortHair: "短毛",
    wild: "野生"
  }[tag] || tag;
}

function renderCats(filter = "all") {
  const list = filter === "all" ? cats : cats.filter((cat) => cat.tags.includes(filter));
  catGrid.innerHTML = list.map((cat, index) => `
    <article class="cat-card">
      <div class="cat-media">
        <span class="loading">写真を読み込み中</span>
        <img alt="${cat.name}の写真" data-wiki="${cat.wiki}" loading="${index < 3 ? "eager" : "lazy"}" hidden>
      </div>
      <div class="cat-body">
        <div class="cat-title">
          <div>
            <h3>${cat.name}</h3>
            <small>${cat.en} / ${cat.origin}</small>
          </div>
        </div>
        <div class="badge-row">
          <span class="badge">${cat.region}</span>
          <span class="badge">${cat.coat}</span>
          ${cat.tags.map((tag) => `<span class="badge">${tagLabel(tag)}</span>`).join("")}
        </div>
        <p>${cat.summary}</p>
        <ul class="fact-list">
          <li><strong>歴史:</strong> ${cat.history}</li>
          <li><strong>ペット適性:</strong> ${cat.pet}</li>
          <li><strong>雑学:</strong> ${cat.trivia}</li>
        </ul>
        <a class="source-link" href="https://en.wikipedia.org/wiki/${cat.wiki}" target="_blank" rel="noreferrer">写真・基本情報の確認</a>
      </div>
    </article>
  `).join("");
  hydrateImages();
}

async function hydrateImages() {
  const images = document.querySelectorAll("img[data-wiki]");
  images.forEach(async (img) => {
    const wiki = img.dataset.wiki;
    const media = img.closest(".cat-media");
    const loading = media.querySelector(".loading");
    try {
      if (!imageCache.has(wiki)) {
        const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${wiki}`);
        if (!response.ok) throw new Error("image fetch failed");
        const data = await response.json();
        imageCache.set(wiki, {
          src: data.thumbnail?.source || data.originalimage?.source,
          description: data.description || ""
        });
      }
      const image = imageCache.get(wiki);
      if (!image.src) throw new Error("no image");
      img.src = image.src;
      img.alt = `${img.alt} ${image.description}`.trim();
      img.hidden = false;
      loading.hidden = true;
    } catch (error) {
      loading.textContent = "写真はリンク先で確認できます";
    }
  });
}

function renderRegions() {
  regionGrid.innerHTML = regions.map((region) => `
    <article class="region-card">
      <h3>${region.name}</h3>
      <p>${region.note}</p>
      <ul>${region.cats.map((cat) => `<li>${cat}</li>`).join("")}</ul>
    </article>
  `).join("");
}

function renderHabits() {
  habitGrid.innerHTML = habits.map((habit) => `
    <article class="habit-card">
      <div class="habit-icon" aria-hidden="true">${habit.icon}</div>
      <h3>${habit.title}</h3>
      <p>${habit.text}</p>
    </article>
  `).join("");
}

let currentQuestion = 0;
let score = 0;
let answered = false;

const progressText = document.querySelector("#quiz-progress");
const scoreText = document.querySelector("#quiz-score");
const progressBar = document.querySelector("#progress-bar");
const questionEl = document.querySelector("#quiz-question");
const optionsEl = document.querySelector("#quiz-options");
const feedbackEl = document.querySelector("#quiz-feedback");
const nextButton = document.querySelector("#next-question");
const resetButton = document.querySelector("#reset-quiz");

function renderQuiz() {
  const item = quiz[currentQuestion];
  answered = false;
  progressText.textContent = `${currentQuestion + 1} / ${quiz.length}`;
  scoreText.textContent = `正解 ${score}`;
  progressBar.style.width = `${(currentQuestion / quiz.length) * 100}%`;
  questionEl.textContent = item.q;
  feedbackEl.textContent = "";
  nextButton.disabled = true;
  nextButton.textContent = currentQuestion === quiz.length - 1 ? "結果を見る" : "次の問題";
  optionsEl.innerHTML = item.options.map((option, index) => `
    <button class="quiz-option" type="button" data-index="${index}">${option}</button>
  `).join("");
}

function chooseOption(button) {
  if (answered) return;
  answered = true;
  const item = quiz[currentQuestion];
  const selected = Number(button.dataset.index);
  const isCorrect = selected === item.answer;
  if (isCorrect) score += 1;
  document.querySelectorAll(".quiz-option").forEach((option) => {
    const optionIndex = Number(option.dataset.index);
    if (optionIndex === item.answer) option.classList.add("correct");
    if (optionIndex === selected && !isCorrect) option.classList.add("wrong");
    option.disabled = true;
  });
  scoreText.textContent = `正解 ${score}`;
  feedbackEl.textContent = `${isCorrect ? "正解。" : "不正解。"} ${item.note}`;
  nextButton.disabled = false;
}

function nextQuestion() {
  if (currentQuestion === quiz.length - 1) {
    progressBar.style.width = "100%";
    questionEl.textContent = `結果: ${quiz.length}問中 ${score}問正解`;
    optionsEl.innerHTML = "";
    feedbackEl.textContent = score >= 10
      ? "かなり詳しい猫博士レベルです。図鑑の地域・歴史もよく押さえられています。"
      : "図鑑カードを読み返すと、発祥地や野生種の分布が覚えやすくなります。";
    nextButton.disabled = true;
    return;
  }
  currentQuestion += 1;
  renderQuiz();
}

filters.forEach((button) => {
  button.addEventListener("click", () => {
    filters.forEach((filter) => filter.classList.remove("active"));
    button.classList.add("active");
    renderCats(button.dataset.filter);
  });
});

optionsEl.addEventListener("click", (event) => {
  const button = event.target.closest(".quiz-option");
  if (button) chooseOption(button);
});

nextButton.addEventListener("click", nextQuestion);
resetButton.addEventListener("click", () => {
  currentQuestion = 0;
  score = 0;
  renderQuiz();
});

renderCats();
renderRegions();
renderHabits();
renderQuiz();
