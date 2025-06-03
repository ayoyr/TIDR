// app.js (画像プリロード対応・全文)

document.addEventListener('DOMContentLoaded', () => {
    const loadingScreen = document.getElementById('loadingScreen');
    const loadingProgressBar = document.getElementById('loadingProgressBar');
    const loadingPercentageText = document.getElementById('loadingPercentage');
    const appContainer = document.querySelector('.app-container');

    const dataProvider = new DataProvider(config);
    const uiHandler = new UIHandler(config);
    const feverHandler = new FeverHandler(config, uiHandler, dataProvider);
    const cardManager = new CardManager(config, uiHandler, dataProvider, feverHandler);

    function preloadImages(imageUrls, onProgress) {
        let loadedCount = 0;
        const totalCount = imageUrls.length;
        if (totalCount === 0) {
            onProgress(0, 0);
            return Promise.resolve();
        }
        const promises = imageUrls.map(url => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    loadedCount++;
                    onProgress(loadedCount, totalCount);
                    resolve(url);
                };
                img.onerror = () => {
                    console.warn(`画像の読み込みに失敗しました: ${url}`);
                    loadedCount++;
                    onProgress(loadedCount, totalCount);
                    resolve(url); 
                };
                img.src = url;
            });
        });
        return Promise.all(promises).then(() => {
            console.log("全画像のプリロードが完了しました（エラー含む）。");
        });
    }

    function updateLoadingProgress(loadedCount, totalCount) {
        if (!loadingProgressBar || !loadingPercentageText) return; // 要素がない場合は何もしない
        if (totalCount === 0) {
            loadingProgressBar.style.width = '100%';
            loadingPercentageText.textContent = '100% (画像なし)';
            return;
        }
        const percentage = Math.round((loadedCount / totalCount) * 100);
        loadingProgressBar.style.width = `${percentage}%`;
        loadingPercentageText.textContent = `${percentage}%`;
    }

    async function initializeApp() {
        console.log("ONSP App Initializing with Preload...");

        const allImagePaths = dataProvider.getAllImagePathsToPreload();
        if (allImagePaths.length > 0) {
            await preloadImages(allImagePaths, updateLoadingProgress);
        } else {
            updateLoadingProgress(0, 0);
            console.log("プリロード対象の画像はありませんでした。");
        }
        
        if (loadingScreen) loadingScreen.style.display = 'none';
        if (appContainer) appContainer.style.display = 'flex';

        await dataProvider.loadAllData();
        console.log("Data (members, serifs) loaded/prepared.");

        const userSettings = dataProvider.loadUserSettings();
        cardManager.applyUserSettings(userSettings);
        console.log("User settings (weights) applied to CardManager.");

        const firstCardData = cardManager.getNextCard();
        if (firstCardData) {
            uiHandler.updateAppBackground(firstCardData.member.color);
            const hintCardData = cardManager.getNextCard(1);
            uiHandler.displayCard(firstCardData, hintCardData);
            console.log("First card displayed:", firstCardData.member.name);
        } else {
            uiHandler.showNoMoreCardsMessage();
            return;
        }
        setupEventListeners();
        console.log("ONSP App Ready!");
    }

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
                if (event.target === settingsModalOverlay) {
                    uiHandler.closeSettingsModal();
                }
            });
        }

        document.addEventListener('cardSwiped', async (event) => {
            const { swipedCardData, swipeDirection } = event.detail;
            console.log(`App.js: Card swiped ${swipeDirection}: ${swipedCardData.member.name}`);
            if (feverHandler && swipeDirection === 'right') {
                feverHandler.handleRightSwipe(swipedCardData);
            }
            displayNextCard();
        });

        document.addEventListener('feverModeStarted', () => {
            console.log("App.js: Fever Mode Started!");
            cardManager.setFeverMode(true);
            displayNextCard();
        });

        document.addEventListener('feverModeEnded', () => {
            console.log("App.js: Fever Mode Ended!");
            cardManager.setFeverMode(false);
            displayNextCard();
        });
    }

    function displayNextCard() {
        const nextCardData = cardManager.getNextCard();
        if (nextCardData) {
            uiHandler.updateAppBackground(nextCardData.member.color);
            const hintCardData = cardManager.getNextCard(1);
            uiHandler.displayCard(nextCardData, hintCardData);
        } else {
            uiHandler.showNoMoreCardsMessage();
        }
    }

    initializeApp();
});
