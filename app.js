// app.js (全文・4枚カードスタック対応)

document.addEventListener('DOMContentLoaded', () => {
    const loadingScreen = document.getElementById('loadingScreen');
    const loadingProgressBar = document.getElementById('loadingProgressBar');
    const loadingPercentageText = document.getElementById('loadingPercentage');
    const appContainer = document.querySelector('.app-container');

    const dataProvider = new DataProvider(config);
    const uiHandler = new UIHandler(config);
    const feverHandler = new FeverHandler(config, uiHandler, dataProvider);
    const cardManager = new CardManager(config, uiHandler, dataProvider, feverHandler);

    function preloadImages(imageUrls, onProgress) { /* 変更なし (前回の全文コード参照) */
        let loadedCount = 0; const totalCount = imageUrls.length; if (totalCount === 0) { onProgress(0, 0); return Promise.resolve(); }
        const promises = imageUrls.map(url => {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => { loadedCount++; onProgress(loadedCount, totalCount); resolve(url); };
                img.onerror = () => { console.warn(`画像読み込み失敗: ${url}`); loadedCount++; onProgress(loadedCount, totalCount); resolve(url); };
                img.src = url;
            });
        });
        return Promise.all(promises).then(() => { console.log("全画像プリロード完了（エラー含む）。"); });
    }
    function updateLoadingProgress(loadedCount, totalCount) { /* 変更なし (前回の全文コード参照) */
        if (!loadingProgressBar || !loadingPercentageText) return;
        if (totalCount === 0) { loadingProgressBar.style.width = '100%'; loadingPercentageText.textContent = '100% (画像なし)'; return; }
        const percentage = Math.round((loadedCount / totalCount) * 100);
        loadingProgressBar.style.width = `${percentage}%`; loadingPercentageText.textContent = `${percentage}%`;
    }

    async function initializeApp() {
        console.log("ONSP App Initializing with Preload & Card Stack...");

        const allImagePaths = dataProvider.getAllImagePathsToPreload();
        if (allImagePaths.length > 0) { await preloadImages(allImagePaths, updateLoadingProgress); }
        else { updateLoadingProgress(0, 0); console.log("プリロード対象の画像はありませんでした。"); }
        
        if (loadingScreen) loadingScreen.style.display = 'none';
        if (appContainer) appContainer.style.display = 'flex';

        await dataProvider.loadAllData();
        console.log("Data (members, serifs) loaded/prepared.");

        const userSettings = dataProvider.loadUserSettings();
        cardManager.applyUserSettings(userSettings);
        console.log("User settings (weights) applied.");

        // ★ 最初のカードスタックを初期化して表示
        await cardManager.initializeCardStack();
        if (cardManager.cardStackData.length > 0) {
            uiHandler.updateAppBackground(cardManager.cardStackData[0].member.color); // 一番手前のカードの背景色
            console.log("Initial card stack displayed.");
        } else {
            // uiHandler.updateCardStack が内部で showNoMoreCardsMessage を呼ぶはず
            console.log("No cards to display in initial stack.");
        }

        setupEventListeners();
        console.log("ONSP App Ready!");
    }

    function setupEventListeners() { /* 変更なし (前回の全文コード参照) */
        const settingsButton = document.getElementById('settingsButton'); const settingsModalOverlay = document.getElementById('settingsModalOverlay');
        const closeSettingsModalButton = document.getElementById('closeSettingsModalButton'); const saveSettingsButton = document.getElementById('saveSettingsButton');
        if (settingsButton) { settingsButton.addEventListener('click', () => { const membersForModal = dataProvider.getAllMembers().map(m => ({ id: m.id, name: m.name })); const currentWeights = {}; dataProvider.getAllMembers().forEach(m => { currentWeights[m.id] = m.weight; }); uiHandler.openSettingsModal(membersForModal, currentWeights); }); }
        if (closeSettingsModalButton) { closeSettingsModalButton.addEventListener('click', () => { uiHandler.closeSettingsModal(); }); }
        if (saveSettingsButton) { saveSettingsButton.addEventListener('click', () => { const newWeights = uiHandler.getMemberWeightsFromModal(); dataProvider.saveMemberWeights(newWeights); cardManager.updateMemberWeights(newWeights); uiHandler.closeSettingsModal(); console.log("設定が保存されました。"); }); }
        if (settingsModalOverlay) { settingsModalOverlay.addEventListener('click', (event) => { if (event.target === settingsModalOverlay) { uiHandler.closeSettingsModal(); } }); }

        document.addEventListener('cardSwiped', async (event) => {
            const { swipedCardData, swipeDirection } = event.detail;
            console.log(`App.js: Card swiped ${swipeDirection}: ${swipedCardData.member.name}`);
            if (feverHandler && swipeDirection === 'right') {
                feverHandler.handleRightSwipe(swipedCardData);
            }
            // ★ スワイプ後にカードスタックを更新
            await cardManager.updateStackAfterSwipe();
            if (cardManager.cardStackData.length > 0 && cardManager.cardStackData[0]) { // 新しい先頭カードがあれば背景更新
                uiHandler.updateAppBackground(cardManager.cardStackData[0].member.color);
            } else if (cardManager.cardStackData.length === 0) {
                // 表示するカードがなくなった場合の処理 (updateCardStack内でshowNoMoreCardsMessageが呼ばれるはず)
            }
        });

        document.addEventListener('feverModeStarted', async () => { /* async追加 */
            console.log("App.js: Fever Mode Started!");
            cardManager.setFeverMode(true);
            await cardManager.initializeCardStack(); // フィーバーモード用にスタックを再初期化
            if (cardManager.cardStackData.length > 0 && cardManager.cardStackData[0]) {
                uiHandler.updateAppBackground(cardManager.cardStackData[0].member.color);
            }
        });
        document.addEventListener('feverModeEnded', async () => { /* async追加 */
            console.log("App.js: Fever Mode Ended!");
            cardManager.setFeverMode(false);
            await cardManager.initializeCardStack(); // 通常モード用にスタックを再初期化
            if (cardManager.cardStackData.length > 0 && cardManager.cardStackData[0]) {
                uiHandler.updateAppBackground(cardManager.cardStackData[0].member.color);
            }
        });
    }

    // displayNextCard 関数は不要になる (cardManager.updateStackAfterSwipe がその役割を担う)

    initializeApp();
});
