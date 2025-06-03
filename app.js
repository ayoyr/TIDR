// app.js - アプリケーション全体の初期化と管理

document.addEventListener('DOMContentLoaded', () => {
    // --- グローバル状態管理 (例) ---
    let currentAppMode = 'normal'; // 'normal' or 'fever'
    // let currentMember = null; // CardManagerが主に管理
    // let nextMemberColor = null;

    // --- モジュールのインスタンス化 ---
    const dataProvider = new DataProvider(config);
    const uiHandler = new UIHandler(config);
    // FeverHandlerのインスタンス化 (スワイプ機能では本格的に使用開始)
    const feverHandler = new FeverHandler(config, uiHandler, dataProvider);
    const cardManager = new CardManager(config, uiHandler, dataProvider, feverHandler);

    // --- アプリケーション初期化処理 ---
    async function initializeApp() {
        console.log("ONSP App Initializing...");

        // 1. データの読み込み (メンバー情報、セリフCSVなど)
        await dataProvider.loadAllData();
        console.log("Data (members, serifs) loaded/prepared.");

        // 2. ユーザー設定の読み込みと適用 (メンバー出現率など)
        const userSettings = dataProvider.loadUserSettings();
        cardManager.applyUserSettings(userSettings);
        console.log("User settings (weights) applied to CardManager.");

        // 3. 最初のカードの準備と表示
        // await cardManager.prepareInitialCards(); // cardManager内で最初のカード選択は getNextCard に集約
        const firstCardData = cardManager.getNextCard(); // 最初のカードを取得

        if (firstCardData) {
            uiHandler.updateAppBackground(firstCardData.member.color); // 最初の背景色を設定
            const hintCardData = cardManager.getNextCard(1); // 裏に見せる次のカード
            uiHandler.displayCard(firstCardData, hintCardData); // 最初のカードと次のカードのヒントを表示
            console.log("First card displayed:", firstCardData.member.name);
        } else {
            uiHandler.showNoMoreCardsMessage(); // カードがない場合の処理
            return;
        }

        // 4. イベントリスナーの設定など
        setupEventListeners();

        console.log("ONSP App Ready!");
    }

    // --- イベントリスナー設定 ---
    function setupEventListeners() {
        const settingsButton = document.getElementById('settingsButton');
        const settingsModalOverlay = document.getElementById('settingsModalOverlay');
        const closeSettingsModalButton = document.getElementById('closeSettingsModalButton');
        const saveSettingsButton = document.getElementById('saveSettingsButton');

        if (settingsButton) {
            settingsButton.addEventListener('click', () => {
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
                dataProvider.saveMemberWeights(newWeights);
                cardManager.updateMemberWeights(newWeights);
                uiHandler.closeSettingsModal();
                console.log("設定が保存されました。次のカードから反映されます。");
                // 設定変更後に表示中のカードに影響を与えるか、次のカードからにするかは仕様次第
                // displayNextCard(); // 必要なら現在のカードを破棄して次のカードを表示
            });
        }
         if (settingsModalOverlay) {
            settingsModalOverlay.addEventListener('click', (event) => {
                if (event.target === settingsModalOverlay) {
                    uiHandler.closeSettingsModal();
                }
            });
        }


        // --- カードスワイプ完了時のイベントリスナー (CardManagerから発行される) ---
        document.addEventListener('cardSwiped', async (event) => {
            const { swipedCardData, swipeDirection } = event.detail;
            console.log(`App.js: Card swiped ${swipeDirection}: ${swipedCardData.member.name}`);

            if (feverHandler && swipeDirection === 'right') {
                feverHandler.handleRightSwipe(swipedCardData); // フィーバーゲージ増加など
            }

            displayNextCard(); // 次のカードを表示
        });

        // --- フィーバーモード開始/終了時のイベントリスナー (FeverHandlerから発行される想定) ---
        document.addEventListener('feverModeStarted', () => {
            currentAppMode = 'fever';
            console.log("App.js: Fever Mode Started!");
            cardManager.setFeverMode(true); // CardManagerに通知
            // フィーバーモード用の特別なUI変更があればここで行う
            displayNextCard(); // フィーバーモード用のカードを表示
        });

        document.addEventListener('feverModeEnded', () => {
            currentAppMode = 'normal';
            console.log("App.js: Fever Mode Ended!");
            cardManager.setFeverMode(false); // CardManagerに通知
            // UIを通常モードに戻す
            displayNextCard(); // 通常モードのカードを表示
        });
    }

    // 次のカードを表示する補助関数
    function displayNextCard() {
        const nextCardData = cardManager.getNextCard(); // 次に表示すべきカード
        if (nextCardData) {
            uiHandler.updateAppBackground(nextCardData.member.color);
            const hintCardData = cardManager.getNextCard(1); // そのさらに次のカード（裏に見せる用）
            uiHandler.displayCard(nextCardData, hintCardData);
            // console.log("App.js: Displaying next card:", nextCardData.member.name);
        } else {
            uiHandler.showNoMoreCardsMessage();
            // console.log("App.js: No more cards to display.");
        }
    }

    // --- 初期化実行 ---
    initializeApp();
});
