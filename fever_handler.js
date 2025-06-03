// FeverHandler.js (全文・スタンプメンバー情報連携・カウント管理修正)

class FeverHandler {
    constructor(config, uiHandler, dataProvider) {
        this.config = config.fever;
        this.uiHandler = uiHandler;
        this.dataProvider = dataProvider;

        this.currentGaugeValue = 0;
        this.isFeverActive = false;
        this.feverTimerId = null;
        this.feverEndTime = 0;
        this.stampIntervalId = null;
        this.activeStickersCount = 0;

        // UIHandlerからFeverHandlerのインスタンスを参照できるようにする
        if (typeof window !== 'undefined') { // ブラウザ環境でのみ実行
            window.feverHandlerInstance = this;
        }
    }

    calculateGaugePercentage() {
        if (this.config.maxGauge <= 0) return 0;
        return Math.min((this.currentGaugeValue / this.config.maxGauge) * 100, 100);
    }

    handleRightSwipe(swipedCardData) {
        if (this.isFeverActive) return;
        this.currentGaugeValue++;
        this.dataProvider.addLikedImage(swipedCardData);
        const percentage = this.calculateGaugePercentage();
        const activeCardMember = this.uiHandler.cardElements.length > 0 && this.uiHandler.cardElements[0] ?
                                 this.dataProvider.getMemberById(this.uiHandler.cardElements[0].dataset.memberId) : null;
        const memberColor = activeCardMember ? activeCardMember.color : null;
        this.uiHandler.updateFeverGauge(percentage, this.config.gaugeColor || memberColor);
        if (this.currentGaugeValue >= this.config.maxGauge) {
            this.startFeverMode();
        }
    }

    startFeverMode() {
        if (this.isFeverActive) return;
        if (this.dataProvider.getLikedImages().length === 0) {
            console.warn("高評価画像がないため、フィーバーモードを開始できません。ゲージをリセットします。");
            this.currentGaugeValue = 0; this.uiHandler.updateFeverGauge(this.calculateGaugePercentage(), null); return;
        }
        this.isFeverActive = true; this.currentGaugeValue = this.config.maxGauge; this.feverEndTime = Date.now() + this.config.duration;
        console.log("FEVER MODE STARTED!"); document.dispatchEvent(new CustomEvent('feverModeStarted'));
        this.feverTimerId = setInterval(() => {
            const timeLeft = this.feverEndTime - Date.now();
            if (timeLeft <= 0) { this.endFeverMode(); }
            else { const percentageLeft = (timeLeft / this.config.duration) * 100; this.uiHandler.updateFeverGauge(percentageLeft, this.config.gaugeColor || '#FFD700'); }
        }, 250);
        this.startStampAnimation();
    }

    endFeverMode() {
        if (!this.isFeverActive) return;
        this.isFeverActive = false; this.currentGaugeValue = 0;
        if (this.feverTimerId) { clearInterval(this.feverTimerId); this.feverTimerId = null; }
        console.log("FEVER MODE ENDED!"); document.dispatchEvent(new CustomEvent('feverModeEnded'));
        const activeCardMember = this.uiHandler.cardElements.length > 0 && this.uiHandler.cardElements[0] ?
                                 this.dataProvider.getMemberById(this.uiHandler.cardElements[0].dataset.memberId) : null;
        const memberColor = activeCardMember ? activeCardMember.color : null;
        this.uiHandler.updateFeverGauge(this.calculateGaugePercentage(), memberColor);
        this.stopStampAnimation();
        this.uiHandler.clearStickers(); // UIに残っているスタンプをクリア
    }

    getIsFeverActive() { return this.isFeverActive; }

    // スタンプが消えたときにUIHandlerから呼ばれる
    decrementStickerCount() {
        this.activeStickersCount = Math.max(0, this.activeStickersCount - 1);
    }

    // フィーバー終了時にUIHandlerから呼ばれる
    resetStickerCount() {
        this.activeStickersCount = 0;
    }

    startStampAnimation() {
        if (!this.config.stickerPaths || this.config.stickerPaths.length === 0) {
            console.warn("フィーバーステッカーのパスが設定されていません。"); return;
        }
        this.activeStickersCount = 0; // カウントリセット
        this.stampIntervalId = setInterval(() => {
            if (this.isFeverActive && this.activeStickersCount < (this.config.maxStickersOnScreen || 5)) {
                const randomIndex = Math.floor(Math.random() * this.config.stickerPaths.length);
                const stickerPath = this.config.stickerPaths[randomIndex];
                if (stickerPath) {
                    const stickerId = `sticker-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
                    
                    // 現在表示中のカードのメンバー情報を取得 (スタンプの色相調整用)
                    let currentMemberForSticker = null;
                    if (this.uiHandler.cardElements.length > 0 && this.uiHandler.cardElements[0] && this.uiHandler.cardElements[0].dataset.memberId) {
                        currentMemberForSticker = this.dataProvider.getMemberById(this.uiHandler.cardElements[0].dataset.memberId);
                    } else {
                        // フォールバックとしてランダムなメンバー (またはデフォルト色)
                        const allMembers = this.dataProvider.getAllMembers();
                        if (allMembers.length > 0) {
                            currentMemberForSticker = allMembers[Math.floor(Math.random() * allMembers.length)];
                        }
                    }
                    this.uiHandler.addSticker(stickerPath, stickerId, currentMemberForSticker);
                    this.activeStickersCount++;
                }
            }
        }, this.config.stickerInterval || 500);
    }

    stopStampAnimation() {
        if (this.stampIntervalId) {
            clearInterval(this.stampIntervalId);
            this.stampIntervalId = null;
        }
    }
}
