// App.js (全文・window.feverHandlerInstance 設定)

document.addEventListener('DOMContentLoaded', () => {
    const loadingScreen = document.getElementById('loadingScreen');
    const loadingProgressBar = document.getElementById('loadingProgressBar');
    const loadingPercentageText = document.getElementById('loadingPercentage');
    const appContainer = document.querySelector('.app-container');

    // --- モジュールのインスタンス化 ---
    const dataProvider = new DataProvider(config);
    const uiHandler = new UIHandler(config);
    const feverHandler = new FeverHandler(config, uiHandler, dataProvider);
    // ★ UIHandlerからFeverHandlerのメソッドを呼び出せるようにグローバルに参照を保持
    if (typeof window !== 'undefined') { // ブラウザ環境でのみ実行
        window.feverHandlerInstance = feverHandler;
    }
    const cardManager = new CardManager(config, uiHandler, dataProvider, feverHandler);

    /**
     * 画像プリロード処理
     * @param {string[]} imageUrls 読み込む画像URLの配列
     * @param {function} onProgress 進捗コールバック (loadedCount, totalCount)
     * @returns {Promise<void>} 全画像のロード完了時に解決するPromise
     */
    function preloadImages(imageUrls, onProgress) {
        let loadedCount = 0;
        const totalCount = imageUrls.length;
        if (totalCount === 0) {
            onProgress(0, 0); // 画像がない場合も進捗を0/0として一度呼び出す
            return Promise.resolve();
        }
        const promises = imageUrls.map(url => {
            return new Promise((resolve) => { // reject を呼ばないことで Promise.all が途中で停止しないようにする
                const img = new Image();
                img.onload = () => {
                    loadedCount++;
                    onProgress(loadedCount, totalCount);
                    resolve(url);
                };
                img.onerror = () => {
                    console.warn(`画像の読み込みに失敗しました: ${url}`);
                    loadedCount++; // エラーでもカウントを進めてロードが終わるようにする
                    onProgress(loadedCount, totalCount);
                    resolve(url); // エラーでも resolve して Promise.all を止めない
                };
                img.src = url;
            });
        });
        return Promise.all(promises).then(() => {
            console.log("全画像のプリロードが完了しました（エラー含む）。");
        });
    }

    /**
     * ロード進捗をUIに反映する
     * @param {number} loadedCount 読み込み完了した画像の数
     * @param {number} totalCount 全画像数
     */
    function updateLoadingProgress(loadedCount, totalCount) {
        if (!loadingProgressBar || !loadingPercentageText) return; // 要素がなければ何もしない
        if (totalCount === 0) { // 画像がない場合
            loadingProgressBar.style.width = '100%';
            loadingPercentageText.textContent = '100% (画像なし)';
            return;
        }
        const percentage = Math.round((loadedCount / totalCount) * 100);
        loadingProgressBar.style.width = `${percentage}%`;
        loadingPercentageText.textContent = `${percentage}%`;
    }


    // --- アプリケーション初期化処理 ---
    async function initializeApp() {
        console.log("ONSP App Initializing with Preload, Card Stack & Fever演出...");

        // 0. 全画像パスを取得してプリロード
        const allImagePaths = dataProvider.getAllImagePathsToPreload();
        if (allImagePaths.length > 0) {
            await preloadImages(allImagePaths, updateLoadingProgress);
        } else {
            updateLoadingProgress(0, 0); // 画像がなくてもUIを更新
            console.log("プリロード対象の画像はありませんでした。");
        }
        
        // ロード完了後、画面切り替え
        if (loadingScreen) loadingScreen.style.display = 'none';
        if (appContainer) appContainer.style.display = 'flex';


        // 1. データ関連の初期化 (セリフ、高評価画像リストなど)
        await dataProvider.loadAllData();
        console.log("Data (members, serifs, likedImages) loaded/prepared.");

        // 2. ユーザー設定の読み込みと適用
        const userSettings = dataProvider.loadUserSettings();
        cardManager.applyUserSettings(userSettings);
        console.log("User settings (weights) applied to CardManager.");

        // 3. 最初のカードスタックを初期化して表示
        await cardManager.initializeCardStack();
        if (cardManager.cardStackData.length > 0 && cardManager.cardStackData[0] && cardManager.cardStackData[0].member) {
            const firstCardMember = cardManager.cardStackData[0].member;
            uiHandler.updateAppBackground(firstCardMember.color);
            // 初期フィーバーゲージ表示 (値はFeverHandlerから取得、色は最初のカードのメンバーカラー)
            uiHandler.updateFeverGauge(feverHandler.calculateGaugePercentage(), firstCardMember.color);
            console.log("Initial card stack displayed. Top card:", firstCardMember.name);
        } else {
            // cardManager.initializeCardStack -> uiHandler.updateCardStack -> uiHandler.showNoMoreCardsMessage の流れで処理されるはず
            console.log("No cards to display in initial stack.");
        }

        // 4. イベントリスナーの設定
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
                console.log("設定が保存されました。");
            });
        }
         if (settingsModalOverlay) {
            settingsModalOverlay.addEventListener('click', (event) => {
                if (event.target === settingsModalOverlay) { // モーダル背景クリック
                    uiHandler.closeSettingsModal();
                }
            });
        }


        // カードスワイプ完了時のイベントリスナー
        document.addEventListener('cardSwiped', async (event) => {
            const { swipedCardData, swipeDirection } = event.detail;
            // swipedCardData が null でないことを確認 (CardManager側でガードされているはずだが念のため)
            if (swipedCardData && swipedCardData.member) {
                console.log(`App.js: Card swiped ${swipeDirection}: ${swipedCardData.member.name}`);
            } else {
                console.log(`App.js: Card swiped ${swipeDirection}, but swipedCardData or member info is missing.`);
            }

            // FeverHandlerへの通知はCardManagerのhandleDragEnd内で行われるのでここでは不要

            // スワイプ後にカードスタックを更新
            await cardManager.updateStackAfterSwipe();
            if (cardManager.cardStackData.length > 0 && cardManager.cardStackData[0] && cardManager.cardStackData[0].member) {
                const nextActiveCardMember = cardManager.cardStackData[0].member;
                uiHandler.updateAppBackground(nextActiveCardMember.color);
                // 新しいカードのメンバーカラーでフィーバーゲージの色も更新 (フィーバー中でなければ)
                if (!feverHandler.getIsFeverActive()){
                     uiHandler.updateFeverGauge(feverHandler.calculateGaugePercentage(), nextActiveCardMember.color);
                }
            } else if (cardManager.cardStackData.length === 0) {
                // 表示するカードがなくなった (uiHandler.updateCardStack内でshowNoMoreCardsMessageが呼ばれるはず)
            }
        });

        // フィーバーモード開始時のイベントリスナー
        document.addEventListener('feverModeStarted', async () => {
            console.log("App.js: Fever Mode Started!");
            cardManager.setFeverMode(true); // CardManagerにフィーバーモードであることを通知
            uiHandler.setFeverModeUI(true); // UIにフィーバーモードであることを通知 (背景変更など)

            await cardManager.initializeCardStack(); // フィーバーモード用にスタックを再初期化
            if (cardManager.cardStackData.length > 0 && cardManager.cardStackData[0] && cardManager.cardStackData[0].member) {
                const feverTopCardMember = cardManager.cardStackData[0].member;
                // フィーバーモード中は背景色を固定にするか、カードのメンバーカラーにするか選択
                // uiHandler.updateAppBackground(feverTopCardMember.color); // 通常通りカードのメンバーカラー
                // または uiHandler.updateAppBackground(config.fever.backgroundColor || '#111'); // フィーバー専用背景色
                // 現在はCSSの body.fever-mode-active で背景色を固定にしているので、updateAppBackgroundは不要かも
                
                // フィーバー中のゲージの初期色を更新（FeverHandler内でも制御しているが、UI同期のため）
                uiHandler.updateFeverGauge(100, config.fever.gaugeColor || '#FFD700'); // フィーバー中は最大＆特別色
            } else if (cardManager.cardStackData.length === 0) {
                 console.warn("フィーバーモードで表示するカードがありません。");
                 feverHandler.endFeverMode(); // 強制終了
            }
        });

        // フィーバーモード終了時のイベントリスナー
        document.addEventListener('feverModeEnded', async () => {
            console.log("App.js: Fever Mode Ended!");
            cardManager.setFeverMode(false); // CardManagerに通常モードに戻ったことを通知
            uiHandler.setFeverModeUI(false); // UIのフィーバーモード専用スタイルを解除

            await cardManager.initializeCardStack(); // 通常モード用にスタックを再初期化
            if (cardManager.cardStackData.length > 0 && cardManager.cardStackData[0] && cardManager.cardStackData[0].member) {
                const normalTopCardMember = cardManager.cardStackData[0].member;
                uiHandler.updateAppBackground(normalTopCardMember.color);
                // フィーバーゲージを通常状態に戻す (値はFeverHandlerが0にしているはず)
                uiHandler.updateFeverGauge(feverHandler.calculateGaugePercentage(), normalTopCardMember.color);
            }
        });
    }

    // --- 初期化実行 ---
    initializeApp();
});
