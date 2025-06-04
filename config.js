// config.js (全文・serifCsvPath修正・メンバー情報にid, profileIcon, hueOffsetForSticker追加)

const config = {
    // メンバー情報
    members: [
        {
            id: 'mako', // ★追加
            name: 'マコ',
            imageFolders: {
                hutuu: { path: 'images/mako/hutuu/', imageCount: 3 },
                ero: { path: 'images/mako/ero/', imageCount: 8 }
            },
            profileIcon: 'images/count/マコ.jpg', // ★追加 (実際のパスに注意)
            color: '#F97430',
            hueOffsetForSticker: '0deg' // ★仮の値
        },
        {
            id: 'rio', // ★追加
            name: 'リオ',
            imageFolders: {
                hutuu: { path: 'images/rio/hutuu/', imageCount: 6 },
                ero: { path: 'images/rio/ero/', imageCount: 8 }
            },
            profileIcon: 'images/count/リオ.jpg', // ★追加
            color: '#68C2E3',
            hueOffsetForSticker: '200deg' // ★仮の値
        },
        {
            id: 'maya', // ★追加
            name: 'マヤ',
            imageFolders: {
                hutuu: { path: 'images/maya/hutuu/', imageCount: 3 },
                ero: { path: 'images/maya/ero/', imageCount: 8 }
            },
            profileIcon: 'images/count/マヤ.jpg', // ★追加
            color: '#7F3F97',
            hueOffsetForSticker: '280deg' // ★仮の値
        },
        {
            id: 'riku', // ★追加
            name: 'リク',
            imageFolders: {
                hutuu: { path: 'images/riku/hutuu/', imageCount: 3 },
                ero: { path: 'images/riku/ero/', imageCount: 2 }
            },
            profileIcon: 'images/count/リク.jpg', // ★追加
            color: '#FDE152',
            hueOffsetForSticker: '50deg' // ★仮の値
        },
        {
            id: 'ayaka', // ★追加
            name: 'アヤカ',
            imageFolders: {
                hutuu: { path: 'images/ayaka/hutuu/', imageCount: 0 },
                ero: { path: 'images/ayaka/ero/', imageCount: 1 }
            },
            profileIcon: 'images/count/アヤカ.jpg', // ★追加
            color: '#FFFFFF',
            hueOffsetForSticker: '0deg', // アヤカはCSSで特別処理のため影響少ない想定
        },
        {
            id: 'mayuka', // ★追加
            name: 'マユカ',
            imageFolders: {
                hutuu: { path: 'images/mayuka/hutuu/', imageCount: 11 },
                ero: { path: 'images/mayuka/ero/', imageCount: 32 }
            },
            profileIcon: 'images/count/マユカ.jpg', // ★追加
            color: '#00ABA9',
            hueOffsetForSticker: '178deg' // ★仮の値
        },
        {
            id: 'rima', // ★追加
            name: 'リマ',
            imageFolders: {
                hutuu: { path: 'images/rima/hutuu/', imageCount: 15 },
                ero: { path: 'images/rima/ero/', imageCount: 35 }
            },
            profileIcon: 'images/count/リマ.jpg', // ★追加
            color: '#B02537',
            hueOffsetForSticker: '-10deg' // ★仮の値
        },
        {
            id: 'miihi', // ★追加
            name: 'ミイヒ',
            imageFolders: {
                hutuu: { path: 'images/miihi/hutuu/', imageCount: 27 },
                ero: { path: 'images/miihi/ero/', imageCount: 54 }
            },
            profileIcon: 'images/count/ミイヒ.jpg', // ★追加
            color: '#F8B9C9',
            hueOffsetForSticker: '340deg' // ★仮の値
        },
        {
            id: 'nina', // ★追加
            name: 'ニナ',
            imageFolders: {
                hutuu: { path: 'images/nina/hutuu/', imageCount: 4 },
                ero: { path: 'images/nina/ero/', imageCount: 1 }
            },
            profileIcon: 'images/count/ニナ.jpg', // ★追加
            color: '#005BAC',
            hueOffsetForSticker: '210deg' // ★仮の値
        },
    ],

    // フィーバーモード設定
    fever: {
        maxGauge: 10, // フィーバーゲージが最大になる右スワイプ回数
        duration: 60000, // フィーバー持続時間 (ミリ秒, 1分)
        stickerPaths: [
            'images/stickers/1.png', 'images/stickers/2.png', 'images/stickers/3.png',
            'images/stickers/4.png', 'images/stickers/5.png', 'images/stickers/6.png',
            'images/stickers/7.png', 'images/stickers/8.png', 'images/stickers/9.png',
            'images/stickers/10.png', 'images/stickers/11.png', 'images/stickers/12.png',
            'images/stickers/13.png', 'images/stickers/14.png', 'images/stickers/15.png',
            'images/stickers/16.png', 'images/stickers/17.png', 'images/stickers/18.png',
            'images/stickers/19.png'
        ],
        stickerInterval: 500, // スタンプが新しく出現する間隔 (ミリ秒)
        maxStickersOnScreen: 7, // 画面上に同時に表示されるステッカーの最大数
        gaugeColor: null, // フィーバー中のゲージの色を固定したい場合 (例: '#FFD700')。nullならメンバーカラーかアクセントカラー。
    },

    // スワイプ操作とカードUI設定
    swipe: {
        thresholdRatio: 0.25, // スワイプ判定する画面横幅に対する移動量の閾値
        rotationFactor: 0.05, // ドラッグ量に応じたカードの傾き係数
        animationSpeed: 300, // カードが画面外に飛ぶアニメーションの時間 (ミリ秒)
        likeOverlayPath: 'images/like_overlay.png', // ご自身のファイル名に合わせてください
        nopeOverlayPath: 'images/nope_overlay.png',   // ご自身のファイル名に合わせてください
    },
    ui: {
        maxCardsInStack: 4, // 画面に表示するカードの最大枚数 (スタック表示対応)
        preloadNextCardCount: 3, // 次に表示する可能性のあるカードの画像プリロード数 (スタック枚数-1程度)
    },

    // データ関連設定
    data: {
        serifCsvPath: 'data/ONSP_セリフ.csv', // ★スクリーンショットに合わせて修正
        csvTagSeparator: '|', // セリフCSV内のタグ区切り文字
        csvFieldSeparator: ',', // CSVのフィールド区切り文字 (デフォルトはカンマ)
    },

    // localStorage キー
    localStorageKeys: {
        memberWeights: 'onspTinderAppMemberWeights_v2', // 必要に応じてバージョン変更
        feverLikedImages: 'onspTinderAppLikedImages_v2',// 必要に応じてバージョン変更
    },

    // その他設定
    defaultMemberWeight: 1, // 各メンバーの初期出現率の重み
    DEBUG_MODE: true,
};
