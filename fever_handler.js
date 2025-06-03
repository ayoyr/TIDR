// FeverHandler.js (全文・基本フロー実装)

class FeverHandler {
    constructor(config, uiHandler, dataProvider) {
        this.config = config.fever; // configオブジェクト内のfever設定を使用
        this.uiHandler = uiHandler;
        this.dataProvider = dataProvider; // DataProviderのインスタンスを保持

        this.currentGaugeValue = 0;
        this.isFeverActive = false;
        this.feverTimerId = null;
        this.feverEndTime = 0;

        // 初期ゲージ表示 (もし必要ならUIHandler経由で)
        // this.uiHandler.updateFeverGauge(this.calculateGaugePercentage(), null);
    }

    calculateGaugePercentage() {
        if (this.config.maxGauge <= 0) return 0;
        return Math.min((this.currentGaugeValue / this.config.maxGauge) * 100, 100);
    }

    // 右スワイプ時に呼び出される
    handleRightSwipe(swipedCardData) {
        if (this.isFeverActive) return; // フィーバー中はゲージ増加なし

        this.currentGaugeValue++;
        // DataProviderに高評価画像として通知
        this.dataProvider.addLikedImage(swipedCardData);

        const percentage = this.calculateGaugePercentage();
        // console.log(`Fever gauge: ${this.currentGaugeValue}/${this.config.maxGauge} (${percentage}%)`);

        // UIHandler経由でフィーバーゲージの見た目を更新
        // ★注意: ゲージの色はアクティブなカードのメンバーカラーに連動させる想定だったため、
        //   uiHandler.updateFeverGauge に渡す色情報が必要。
        //   ここでは一旦 null にしておくか、config から固定色を取得する。
        //   App.js などから現在のメンバーカラーを取得して渡すのがより正確。
        //   今回は、UIHandler側で最後に表示したメンバーカラーを保持しているか、
        //   あるいは、config.fever.gaugeColor を参照するようにする。
        const activeCardMemberColor = this.uiHandler.cardElements.length > 0 && this.uiHandler.cardElements[0].dataset.memberId ?
                                   this.dataProvider.getMemberById(this.uiHandler.cardElements[0].dataset.memberId)?.color : null;
        this.uiHandler.updateFeverGauge(percentage, this.config.gaugeColor || activeCardMemberColor);


        if (this.currentGaugeValue >= this.config.maxGauge) {
            this.startFeverMode();
        }
    }

    startFeverMode() {
        if (this.isFeverActive) return;

        // 高評価画像が1枚もなければフィーバーに入らない (または別の処理)
        if (this.dataProvider.getLikedImages().length === 0) {
            console.warn("高評価画像がないため、フィーバーモードを開始できません。ゲージをリセットします。");
            this.currentGaugeValue = 0; // ゲージをリセット
            this.uiHandler.updateFeverGauge(this.calculateGaugePercentage(), null);
            return;
        }

        this.isFeverActive = true;
        this.currentGaugeValue = this.config.maxGauge; // ゲージを最大値に固定 (または時間経過で減少させる)
        this.feverEndTime = Date.now() + this.config.duration;

        console.log("FEVER MODE STARTED!");
        document.dispatchEvent(new CustomEvent('feverModeStarted'));

        // フィーバーゲージが時間経過で減少するタイマーを開始
        this.feverTimerId = setInterval(() => {
            const timeLeft = this.feverEndTime - Date.now();
            if (timeLeft <= 0) {
                this.endFeverMode();
            } else {
                const percentageLeft = (timeLeft / this.config.duration) * 100;
                this.uiHandler.updateFeverGauge(percentageLeft, this.config.gaugeColor || '#FFD700'); // フィーバー中は専用の色など
            }
        }, 250); // 0.25秒ごとに更新

        // TODO: ステップ3でスタンプ演出を開始する
        // this.startStampAnimation();
    }

    endFeverMode() {
        if (!this.isFeverActive) return;

        this.isFeverActive = false;
        this.currentGaugeValue = 0; // フィーバー終了時にゲージをリセット
        if (this.feverTimerId) {
            clearInterval(this.feverTimerId);
            this.feverTimerId = null;
        }

        console.log("FEVER MODE ENDED!");
        document.dispatchEvent(new CustomEvent('feverModeEnded'));

        // ゲージを通常状態に戻す
        this.uiHandler.updateFeverGauge(this.calculateGaugePercentage(), null); // 色も通常に

        // TODO: ステップ3でスタンプ演出を停止する
        // this.stopStampAnimation();
    }

    getIsFeverActive() {
        return this.isFeverActive;
    }

    // --- スタンプ演出関連 (ステップ3で実装) ---
    // startStampAnimation() { console.log("Stamp animation started (not implemented yet)"); }
    // stopStampAnimation() { console.log("Stamp animation stopped (not implemented yet)"); }
}
