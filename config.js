// config.js (更新案)

const config = {
    // メンバー情報: 以前のデータをベースに、id と profileIcon を追加
    members: [
        // 各メンバーに id (ユニークな英数字) と profileIcon (プロフィールアイコン画像のパス) を追加してください
        {
            id: 'mako', // 例: mako (URLや内部処理で安全に使えるID)
            name: 'マコ',
            imageFolders: {
                hutuu: { path: 'images/mako/hutuu/', imageCount: 3 },
                ero: { path: 'images/mako/ero/', imageCount: 8 }
            },
            profileIcon: 'images/count/マコ.jpg', // 例: プロフィールアイコンのパス
            color: '#F97430'
        },
        {
            id: 'rio',
            name: 'リオ',
            imageFolders: {
                hutuu: { path: 'images/rio/hutuu/', imageCount: 6 },
                ero: { path: 'images/rio/ero/', imageCount: 8 }
            },
            profileIcon: 'images/count/リオ.jpg',
            color: '#68C2E3'
        },
        {
            id: 'maya',
            name: 'マヤ',
            imageFolders: {
                hutuu: { path: 'images/maya/hutuu/', imageCount: 3 },
                ero: { path: 'images/maya/ero/', imageCount: 8 }
            },
            profileIcon: 'images/count/マヤ.jpg',
            color: '#7F3F97'
        },
        {
            id: 'riku',
            name: 'リク',
            imageFolders: {
                hutuu: { path: 'images/riku/hutuu/', imageCount: 3 },
                ero: { path: 'images/riku/ero/', imageCount: 2 }
            },
            profileIcon: 'images/count/リク.jpg',
            color: '#FDE152'
        },
        {
            id: 'ayaka',
            name: 'アヤカ',
            imageFolders: {
                hutuu: { path: 'images/ayaka/hutuu/', imageCount: 0 },
                ero: { path: 'images/ayaka/ero/', imageCount: 1 }
            },
            profileIcon: 'images/count/アヤカ.jpg',
            color: '#FFFFFF'
        },
        {
            id: 'mayuka',
            name: 'マユカ',
            imageFolders: {
                hutuu: { path: 'images/mayuka/hutuu/', imageCount: 11 },
                ero: { path: 'images/mayuka/ero/', imageCount: 32 }
            },
            profileIcon: 'images/count/マユカ.jpg',
            color: '#00ABA9'
        },
        {
            id: 'rima',
            name: 'リマ',
            imageFolders: {
                hutuu: { path: 'images/rima/hutuu/', imageCount: 15 },
                ero: { path: 'images/rima/ero/', imageCount: 35 }
            },
            profileIcon: 'images/count/リマ.jpg',
            color: '#B02537'
        },
        {
            id: 'miihi',
            name: 'ミイヒ',
            imageFolders: {
                hutuu: { path: 'images/miihi/hutuu/', imageCount: 27 },
                ero: { path: 'images/miihi/ero/', imageCount: 54 }
            },
            profileIcon: 'images/count/ミイヒ.jpg',
            color: '#F8B9C9'
        },
        {
            id: 'nina',
            name: 'ニナ',
            imageFolders: {
                hutuu: { path: 'images/nina/hutuu/', imageCount: 4 },
                ero: { path: 'images/nina/ero/', imageCount: 1 }
            },
            profileIcon: 'images/count/ニナ.jpg',
            color: '#005BAC'
        },
    ],

    // フィーバーモード設定
    fever: {
        maxGauge: 10, // フィーバーゲージが最大になる右スワイプ回数 (以前の feverThreshold)
        duration: 60000, // フィーバー持続時間 (ミリ秒, 1分) (以前の feverDuration)
        stickerPaths: [ // フィーバー用ステッカー画像のパスリスト
            'images/stickers/1.png', 'images/stickers/2.png', 'images/stickers/3.png',
            'images/stickers/4.png', 'images/stickers/5.png', 'images/stickers/6.png',
            'images/stickers/7.png', 'images/stickers/8.png', 'images/stickers/9.png',
            'images/stickers/10.png', 'images/stickers/11.png', 'images/stickers/12.png',
            'images/stickers/13.png', 'images/stickers/14.png', 'images/stickers/15.png',
            'images/stickers/16.png', 'images/stickers/17.png', 'images/stickers/18.png',
            'images/stickers/19.png'
        ],
        stickerInterval: 500, // ステッカーが新しく出現する間隔 (ミリ秒) (新規追加)
        maxStickersOnScreen: 5, // 画面上に同時に表示されるステッカーの最大数 (新規追加)
        gaugeColor: null, // フィーバーゲージの色を固定したい場合 (例: '#FFD700')。nullならメンバーカラーかアクセントカラー。
    },

    // スワイプ操作とカードUI設定
    swipe: {
        thresholdRatio: 0.25, // スワイプ判定する画面横幅に対する移動量の閾値 (新規追加)
        rotationFactor: 0.05, // ドラッグ量に応じたカードの傾き係数 (新規追加)
        animationSpeed: 300, // カードが画面外に飛ぶアニメーションの時間 (ミリ秒) (新規追加)
        likeOverlayPath: 'images/like_overlay.png', // 右スワイプ時評価画像 (以前の likeImageSrc, ファイル名変更推奨)
        nopeOverlayPath: 'images/nope_overlay.png',   // 左スワイプ時評価画像 (以前の nopeImageSrc, ファイル名変更推奨)
    },
    ui: {
        maxCardsInStack: 3, // 画面に表示するカードの最大枚数 (表示中1枚 + 裏に準備2枚など) (新規追加)
        preloadNextCardCount: 2, // 次のカードを何枚事前に画像URLだけ読み込んでおくか (以前の nextCardPreloadCount)
    },

    // データ関連設定
    data: {
        serifCsvPath: 'data/ONSP_セリフ.csv', // (以前の DATA_FILES.serifCsvPath)
        csvTagSeparator: '|', // セリフCSV内のタグ区切り文字 (以前の DATA_FILES.quoteTagDelimiter)
    },

    // localStorage キー
    localStorageKeys: {
        memberWeights: 'onspTinderAppMemberWeights_v1', // メンバー出現率 (新規または以前の settings)
        feverLikedImages: 'onspTinderAppLikedImages_v1', // 右スワイプした画像の履歴 (以前の likedImages)
        // 必要に応じて以前の STORAGE_KEYS から他のキーも移行・追加
        // settings: 'onspTinderAppSettings_v1',
        // weakPoints: 'onspTinderAppWeakPoints_v1',
    },

    // その他設定
    defaultMemberWeight: 1, // 各メンバーの初期出現率の重み (新規追加)
    DEBUG_MODE: true, // (以前の DEBUG_MODE)
};
