// config.js (全文・hueOffsetForSticker追加版)

const config = {
    // メンバー情報
    members: [
        {
            id: 'mako',
            name: 'マコ',
            imageFolders: {
                hutuu: { path: 'images/mako/hutuu/', imageCount: 3 },
                ero: { path: 'images/mako/ero/', imageCount: 8 }
            },
            profileIcon: 'images/count/マコ.jpg',
            color: '#F97430', // オレンジ系
            hueOffsetForSticker: '0deg' // 仮の値: スタンプの元色に合わせて調整してください
        },
        {
            id: 'rio',
            name: 'リオ',
            imageFolders: {
                hutuu: { path: 'images/rio/hutuu/', imageCount: 6 },
                ero: { path: 'images/rio/ero/', imageCount: 8 }
            },
            profileIcon: 'images/count/リオ.jpg',
            color: '#68C2E3', // ブルー系
            hueOffsetForSticker: '200deg' // 仮の値
        },
        {
            id: 'maya',
            name: 'マヤ',
            imageFolders: {
                hutuu: { path: 'images/maya/hutuu/', imageCount: 3 },
                ero: { path: 'images/maya/ero/', imageCount: 8 }
            },
            profileIcon: 'images/count/マヤ.jpg',
            color: '#7F3F97', // 紫系
            hueOffsetForSticker: '280deg' // 仮の値
        },
        {
            id: 'riku',
            name: 'リク',
            imageFolders: {
                hutuu: { path: 'images/riku/hutuu/', imageCount: 3 },
                ero: { path: 'images/riku/ero/', imageCount: 2 }
            },
            profileIcon: 'images/count/リク.jpg',
            color: '#FDE152', // 黄色系
            hueOffsetForSticker: '50deg' // 仮の値
        },
        {
            id: 'ayaka',
            name: 'アヤカ',
            imageFolders: {
                hutuu: { path: 'images/ayaka/hutuu/', imageCount: 0 },
                ero: { path: 'images/ayaka/ero/', imageCount: 1 }
            },
            profileIcon: 'images/count/アヤカ.jpg',
            color: '#FFFFFF', // 白
            hueOffsetForSticker: '0deg', // アヤカはCSSで特別処理されるため、この値は影響しない可能性あり
        },
        {
            id: 'mayuka',
            name: 'マユカ',
            imageFolders: {
                hutuu: { path: 'images/mayuka/hutuu/', imageCount: 11 },
                ero: { path: 'images/mayuka/ero/', imageCount: 32 }
            },
            profileIcon: 'images/count/マユカ.jpg',
            color: '#00ABA9', // 青緑系
            hueOffsetForSticker: '178deg' // 仮の値
        },
        {
            id: 'rima',
            name: 'リマ',
            imageFolders: {
                hutuu: { path: 'images/rima/hutuu/', imageCount: 15 },
                ero: { path: 'images/rima/ero/', imageCount: 35 }
            },
            profileIcon: 'images/count/リマ.jpg',
            color: '#B02537', // 赤系
            hueOffsetForSticker: '-10deg' // 仮の値
        },
        {
            id: 'miihi',
            name: 'ミイヒ',
            imageFolders: {
                hutuu: { path: 'images/miihi/hutuu/', imageCount: 27 },
                ero: { path: 'images/miihi/ero/', imageCount: 54 }
            },
            profileIcon: 'images/count/ミイヒ.jpg',
            color: '#F8B9C9', // ピンク系
            hueOffsetForSticker: '340deg' // 仮の値
        },
        {
            id: 'nina',
            name: 'ニナ',
            imageFolders: {
                hutuu: { path: 'images/nina/hutuu/', imageCount: 4 },
                ero: { path: 'images/nina/ero/', imageCount: 1 }
            },
            profileIcon: 'images/count/ニナ.jpg',
            color: '#005BAC', // 濃い青系
            hueOffsetForSticker: '210deg' // 仮の値
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
        maxStickersOnScreen: 5, // 画面上に同時に表示されるステッカーの最大数
        gaugeColor: null, // フィーバー中のゲージの色を固定したい場合 (例: '#FFD700')。nullならメンバーカラーかアクセントカラー。
    },

    // スワイプ操作とカードUI設定
    swipe: {
        thresholdRatio: 0.25, // スワイプ判定する画面横幅に対する移動量の閾値
        rotationFactor: 0.05, // ドラッグ量に応じたカードの傾き係数
        animationSpeed: 300, // カードが画面外に飛ぶアニメーションの時間 (ミリ秒)
        likeOverlayPath: 'images/like_overlay.png',
        nopeOverlayPath: 'images/nope_overlay.png',
    },
    ui: {
        maxCardsInStack: 4, // 画面に表示するカードの最大枚数 (スタック表示対応)
        preloadNextCardCount: 3, // 次に表示する可能性のあるカードの画像プリロード数 (スタック枚数-1程度)
    },

    // データ関連設定
    data: {
        serifCsvPath: 'data/serifs.csv', // ★ファイル名を serif_onsp.csv や ONSP_セリフ.csv に戻すか確認
        csvTagSeparator: '|', // セリフCSV内のタグ区切り文字
        csvFieldSeparator: ',', // CSVのフィールド区切り文字 (デフォルトはカンマ)
    },

    // localStorage キー
    localStorageKeys: {
        memberWeights: 'onspTinderAppMemberWeights_v1',
        feverLikedImages: 'onspTinderAppLikedImages_v1',
    },

    // その他設定
    defaultMemberWeight: 1, // 各メンバーの初期出現率の重み
    DEBUG_MODE: true,
};
