/// app.js - アプリケーション全体の初期化と管理

document.addEventListener('DOMContentLoaded', () => {
    // --- グローバル状態管理 (例) ---
    let currentAppMode = 'normal'; // 'normal' or 'fever'
    // let currentMember = null; // CardManagerが主に管理
    // let nextMemberColor = null;

    // --- モジュールのインスタンス化 ---
    const dataProvider = new DataProvider(config);
    const uiHandler = new UIHandler(config);
    // FeverHandlerのインスタンス化は一旦コメントアウト (今回は使わないため)
    // const feverHandler = new FeverHandler(config, uiHandler, dataProvider);
    const feverHandler = null; // ダミー
    const cardManager = new CardManager(config, uiHandler, dataProvider, feverHandler);

    // --- アプリケーション初期化処理 ---
    async function initializeApp() {
        console.log("ONSP App Initializing...");

        // 1. データの読み込み (今回は主にconfigの解析とメンバー準備)
        await dataProvider.loadAllData(); // セリフCSVはまだ読み込まない
        console.log("Data prepared (members parsed).");

        // 2. ユーザー設定の読み込みと適用 (メンバー出現率など)
        const userSettings = dataProvider.loadUserSettings();
        cardManager.applyUserSettings(userSettings); // CardManagerに重みを設定
        console.log("User settings (weights) applied to CardManager.");

        // 3. 最初のカードの準備と表示
        await cardManager.prepareInitialCards(); // 内部で最初のカードデータがセットされる
        const firstCardData = cardManager.getNextCard(); // 準備された最初のカードを取得

        if (firstCardData) {
            uiHandler.updateAppBackground(firstCardData.member.color); // 最初の背景色を設定
            uiHandler.displayCard(firstCardData, cardManager.getNextCard(1)); // 最初のカードと次のカードのヒントを表示
            console.log("First card displayed:", firstCardData.member.name);
        } else {
            uiHandler.showNoMoreCardsMessage(); // カードがない場合の処理
            return;
        }

        // 4. イベントリスナーの設定など (スワイプ関連は後で本格実装)
        setupEventListeners();

        console.log("ONSP App Ready for basic card display!");
    }

    // --- イベントリスナー設定 ---
    function setupEventListeners() {
        const settingsButton = document.getElementById('settingsButton');
        const settingsModalOverlay = document.getElementById('settingsModalOverlay');
        const closeSettingsModalButton = document.getElementById('closeSettingsModalButton');
        const saveSettingsButton = document.getElementById('saveSettingsButton');

        if (settingsButton) {
            settingsButton.addEventListener('click', () => {
                // dataProvider.getAllMembers() には最新のweightが含まれていることを確認
                const membersForModal = dataProvider.getAllMembers().map(m => ({ id: m.id, name: m.name }));
                const currentWeights = {};
                dataProvider.getAllMembers().forEach(m => { currentWeights[m.id] = m.weight; });
                uiHandler.openSettingsModal(membersForModal, currentWeights);
            });
        }
        if (closeSettingsModalButton) {
            closeSettingsModalButton.addEventListener('click', () => {
                uiHandler.closeSettingsModal();
            });
        }
        if (saveSettingsButton) {
            saveSettingsButton.addEventListener('click', () => {
                const newWeights = uiHandler.getMemberWeightsFromModal();
                dataProvider.saveMemberWeights(newWeights); // DataProviderに保存し、localStorageも更新
                cardManager.updateMemberWeights(newWeights); // CardManagerにも通知
                uiHandler.closeSettingsModal();
                // 設定変更後、すぐに次のカードに反映させたい場合、カードを再描画
                // (例: 次のカードを強制的に再選択して表示)
                console.log("設定が保存されました。次のカードから反映されます。");
                // displayNextCard(); // 必要なら次のカードを表示する関数を呼ぶ
            });
        }
         if (settingsModalOverlay) { // モーダル背景クリックで閉じる
            settingsModalOverlay.addEventListener('click', (event) => {
                if (event.target === settingsModalOverlay) {
                    uiHandler.closeSettingsModal();
                }
            });
        }


        // --- カードスワイプ完了時のイベントリスナー (CardManagerから発行される) ---
        // 今回はまだ cardManager.handleSwipe() の中身が未実装なので、これはまだ動作しない
        document.addEventListener('cardSwiped', async (event) => {
            const { swipedCardData, swipeDirection } = event.detail;
            console.log(`App.js: Card swiped ${swipeDirection}:`, swipedCardData.member.name);

            // if (feverHandler && swipeDirection === 'right') {
            //     feverHandler.handleRightSwipe(swipedCardData);
            // }

            displayNextCard();
        });

        // --- フィーバーモード関連のイベントリスナー (今回はコメントアウト) ---
        /*
        document.addEventListener('feverModeStarted', () => {
            currentAppMode = 'fever';
            console.log("Fever Mode Started!");
            cardManager.setFeverMode(true);
            displayNextCard(); // フィーバーモード用のカードを表示
        });

        document.addEventListener('feverModeEnded', () => {
            currentAppMode = 'normal';
            console.log("Fever Mode Ended!");
            cardManager.setFeverMode(false);
            displayNextCard(); // 通常モードのカードを表示
        });
        */
    }

    // 次のカードを表示する補助関数
    function displayNextCard() {
        const nextCardData = cardManager.getNextCard();
        if (nextCardData) {
            uiHandler.updateAppBackground(nextCardData.member.color);
            // 次のカードのヒントも取得
            const hintCardData = cardManager.getNextCard(1);
            uiHandler.displayCard(nextCardData, hintCardData);
            console.log("Next card displayed:", nextCardData.member.name);
        } else {
            uiHandler.showNoMoreCardsMessage();
        }
    }

    // --- 初期化実行 ---
    initializeApp();
});
