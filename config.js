// ONSP アプリケーション設定
const config = {
    members: [
        // 例: マコさんのデータ
        {
            name: 'マコ',
            id: 'mako', // 内部処理やファイル名に使用するID (英数字推奨)
            imageFolders: {
                hutuu: { path: 'images/mako/hutuu/', imageCount: 0 }, // 枚数は適宜変更
                ero: { path: 'images/mako/ero/', imageCount: 0 }    // 枚数は適宜変更
            },
            profileIcon: 'images/count/マコ.jpg', // プロフィールアイコンのパス
            color: '#F97430' // メンバーカラー (オレンジ系)
        },
        // ... 他のメンバーのデータも同様に追加 ...
        // 例: リオさんのデータ
        {
            name: 'リオ',
            id: 'rio',
            imageFolders: {
                hutuu: { path: 'images/rio/hutuu/', imageCount: 0 },
                ero: { path: 'images/rio/ero/', imageCount: 0 }
            },
            profileIcon: 'images/count/リオ.jpg',
            color: '#4C89F5' // メンバーカラー (ブルー系)
        },
        // NiziUメンバー全員分のデータをここに追加してください
    ],
    fever: {
        maxGauge: 10, // フィーバーゲージが最大になる右スワイプ回数
        duration: 60000, // フィーバー持続時間 (ミリ秒, 1分)
        stickerPaths: [ // フィーバー用ステッカー画像のパスリスト
            'images/stickers/1.png',
            'images/stickers/2.png',
            // ... 'images/stickers/19.png' まで追加
        ],
        stickerInterval: 500, // ステッカーが新しく出現する間隔 (ミリ秒)
        maxStickersOnScreen: 5, // 画面上に同時に表示されるステッカーの最大数
    },
    swipe: {
        thresholdRatio: 0.25, // スワイプ判定する画面横幅に対する移動量の閾値 (25%)
        rotationFactor: 0.05, // ドラッグ量に応じたカードの傾き係数
        animationSpeed: 300, // カードが画面外に飛ぶアニメーションの時間 (ミリ秒)
    },
    ui: {
        maxCardsInStack: 3, // 画面に表示するカードの最大枚数 (表示中1枚 + 裏に準備2枚など)
        preloadNextCardCount: 2, // 次に表示する可能性のあるカードの画像プリロード数
    },
    data: {
        serifCsvPath: 'data/ONSP_セリフ.csv',
        csvTagSeparator: ',', // CSV内のタグ区切り文字 (タグが複数ある場合)
    },
    localStorageKeys: {
        feverLikedImages: 'onsp_feverLikedImages',
        memberWeights: 'onsp_memberWeights',
        // 他にlocalStorageに保存したいデータがあればキーを追加
    },
    // その他調整可能なパラメータ
    defaultMemberWeight: 1, // 各メンバーの初期出現率の重み
};

// 注意: 実際の画像枚数やパスは、ご自身の環境に合わせて正確に設定してください。
// 特に members 配列の imageCount は重要です。
