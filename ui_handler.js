// ui_handler.js (全文・4枚カードスタック対応)

class UIHandler {
    constructor(config) {
        this.config = config;
        this.cardStackArea = document.querySelector('.card-stack-area');
        this.storyProgressBar = document.querySelector('.story-progress-bar');
        this.feverGauge = document.querySelector('.fever-gauge');
        this.settingsModalOverlay = document.getElementById('settingsModalOverlay');
        this.memberWeightsSettingsDiv = document.getElementById('memberWeightsSettings');

        this.cardElements = []; // 現在画面に表示されているカードDOM要素の配列
        this.MAX_CARDS_IN_STACK = 4; // 常に表示するカードの枚数

        if (!this.cardStackArea) {
            console.error("要素 .card-stack-area が見つかりません。");
        }
    }

    // カード要素を生成する (基本的な構造は同じ)
    createCardElement(cardData) {
        const cardDiv = document.createElement('div');
        cardDiv.classList.add('card');
        // cardData や memberId を dataset に保持しておくとデバッグや操作に便利
        if (cardData && cardData.member) {
            cardDiv.dataset.memberId = cardData.member.id;
        }

        const img = document.createElement('img');
        img.classList.add('main-image');
        img.src = cardData.imagePath;
        img.alt = cardData.member ? cardData.member.name : 'Card Image';
        img.onerror = () => {
            console.warn(`画像の読み込みに失敗: ${cardData.imagePath}。プレースホルダーを表示します。`);
            img.src = 'images/placeholder.png';
        };
        cardDiv.appendChild(img);

        if (cardData.member) { // メンバー情報がある場合のみ詳細を表示
            const infoDiv = document.createElement('div');
            infoDiv.classList.add('card-info');

            const profileIcon = document.createElement('img');
            profileIcon.classList.add('profile-icon');
            profileIcon.src = cardData.member.profileIcon;
            profileIcon.alt = `${cardData.member.name} icon`;
            profileIcon.style.borderColor = cardData.member.color;
            profileIcon.onerror = () => {
                console.warn(`プロフィール画像の読み込みに失敗: ${cardData.member.profileIcon}。`);
                profileIcon.style.display = 'none';
            };
            infoDiv.appendChild(profileIcon);

            const memberDetailsDiv = document.createElement('div');
            memberDetailsDiv.classList.add('member-details');
            const nameH3 = document.createElement('h3');
            nameH3.classList.add('member-name');
            nameH3.textContent = cardData.member.name;
            memberDetailsDiv.appendChild(nameH3);
            const quoteP = document.createElement('p');
            quoteP.classList.add('member-quote');
            quoteP.textContent = cardData.serif;
            memberDetailsDiv.appendChild(quoteP);
            infoDiv.appendChild(memberDetailsDiv);
            cardDiv.appendChild(infoDiv);
        }

        const likeOverlay = document.createElement('img');
        likeOverlay.src = this.config.swipe?.likeOverlayPath || 'images/like_overlay.png';
        likeOverlay.classList.add('swipe-overlay', 'like-overlay');
        likeOverlay.style.display = 'none';
        cardDiv.appendChild(likeOverlay);

        const nopeOverlay = document.createElement('img');
        nopeOverlay.src = this.config.swipe?.nopeOverlayPath || 'images/nope_overlay.png';
        nopeOverlay.classList.add('swipe-overlay', 'nope-overlay');
        nopeOverlay.style.display = 'none';
        cardDiv.appendChild(nopeOverlay);

        return cardDiv;
    }

    /**
     * カードスタックのUIを更新する
     * @param {Array<Object>} cardDataArray 表示するカードデータの配列 (最大4つ)
     */
    updateCardStack(cardDataArray) {
        if (!this.cardStackArea) return;

        // 現在のカード要素を一度すべてクリア（より洗練された方法では既存要素の再利用も検討）
        this.cardStackArea.innerHTML = '';
        this.cardElements = [];

        if (!cardDataArray || cardDataArray.length === 0) {
            this.showNoMoreCardsMessage();
            return;
        }

        // cardDataArray は手前から奥の順になっている想定
        for (let i = 0; i < Math.min(cardDataArray.length, this.MAX_CARDS_IN_STACK); i++) {
            const cardData = cardDataArray[i];
            if (!cardData) continue; // データがない場合はスキップ

            const cardElement = this.createCardElement(cardData);
            this.cardElements.push(cardElement); // DOM要素の参照を保持
            this.cardStackArea.appendChild(cardElement);

            // CSSクラスでスタック位置を制御
            cardElement.classList.remove('card-0', 'card-1', 'card-2', 'card-3', 'dragging-card');
            cardElement.classList.add(`card-${i}`);

            if (i === 0) { // 一番手前のカード
                // CardManagerに新しいカード要素の準備ができたことを通知し、イベントリスナーを設定させる
                document.dispatchEvent(new CustomEvent('cardElementReady', { detail: { cardElement, cardData } }));
                this.updateStoryProgressBar(cardData.member, cardData.currentImageIndex, cardData.totalImagesInMember);
                this.updateFeverGauge(this.currentFeverGaugeValue || 0, cardData.member.color); // feverHandlerから値を取得する想定
            }
        }
        // 表示するカードがない場合はメッセージ表示
        if (this.cardElements.length === 0) {
             this.showNoMoreCardsMessage();
        }
    }


    // ドラッグ中にカードを動かす (アクティブなカードに対して)
    moveCardDuringSwipe(cardElement, deltaX, deltaY, rotation) {
        if (!cardElement) return;
        cardElement.classList.add('dragging-card'); // ドラッグ中のスタイル適用
        cardElement.style.transform = `translate(${deltaX}px, ${deltaY}px) rotate(${rotation}deg)`;
    }

    // スワイプ方向に応じて評価オーバーレイを表示/非表示
    toggleSwipeOverlay(cardElement, swipeDirection) {
        if (!cardElement) return;
        const likeOverlay = cardElement.querySelector('.like-overlay');
        const nopeOverlay = cardElement.querySelector('.nope-overlay');

        if (likeOverlay) {
            likeOverlay.style.display = swipeDirection === 'like' ? 'block' : 'none';
            if (swipeDirection === 'like') likeOverlay.classList.add('visible');
            else likeOverlay.classList.remove('visible');
        }
        if (nopeOverlay) {
            nopeOverlay.style.display = swipeDirection === 'nope' ? 'block' : 'none';
            if (swipeDirection === 'nope') nopeOverlay.classList.add('visible');
            else nopeOverlay.classList.remove('visible');
        }
    }

    /**
     * スワイプ完了後、カードを画面外に飛ばすアニメーション (DOMからは直接消さない)
     * @param {HTMLElement} cardElement 対象のカード要素
     * @param {'left' | 'right'} direction スワイプ方向
     * @param {function} onComplete アニメーション完了後のコールバック
     */
    animateCardOut(cardElement, direction, onComplete) {
        if (!cardElement) return;
        cardElement.classList.remove('dragging-card');
        const moveX = direction === 'right' ? window.innerWidth * 1.2 : -window.innerWidth * 1.2;
        const rotation = direction === 'right' ? 45 : -45;

        cardElement.style.transition = `transform ${this.config.swipe.animationSpeed || 300}ms ease-in`; // ease-inで加速感を出す
        cardElement.style.transform = `translate(${moveX}px, ${Math.random() * 100 - 50}px) rotate(${rotation}deg)`;
        cardElement.style.opacity = '0'; // 消えながら飛んでいく

        setTimeout(() => {
            // DOMからの削除は CardManager または app.js がスタック更新時に行うので、ここでは何もしない
            if (onComplete) onComplete();
        }, this.config.swipe.animationSpeed || 300);
    }

    // カードを元の位置に戻すアニメーション
    resetCardPosition(cardElement) {
        if (!cardElement) return;
        cardElement.classList.remove('dragging-card');
        // 元のスタック位置に応じたスタイルに戻す必要がある
        // cardElementの現在のスタックインデックス (例: 'card-0') を見て判断
        let originalClass = '';
        for(let i=0; i < this.MAX_CARDS_IN_STACK; i++){
            if(cardElement.classList.contains(`card-${i}`)){
                originalClass = `card-${i}`;
                break;
            }
        }
        // 一旦 transform をリセットするためのスタイルを適用
        cardElement.style.transition = `transform ${this.config.swipe.animationSpeed / 2 || 150}ms ease-out`;
        // cardElement.style.transform = 'translate(0px, 0px) rotate(0deg)'; // これはcard-0の位置
        // 代わりに、元のクラスに応じた transform を再適用する (CSSで定義されたもの)
        // ただし、CSSの transform は translateY/scale なので、rotate(0deg) を明示的に加えるなど工夫が必要
        // もしくは、JSで各スタック位置のtransformを記憶しておき、それに戻す
        // 今回は単純に一番手前の位置に戻す仮実装
        if (originalClass === 'card-0') {
             cardElement.style.transform = 'translateY(0) scale(1) rotate(0deg)';
        } else if (originalClass === 'card-1') {
             cardElement.style.transform = 'translateY(20px) scale(0.95) rotate(0deg)';
        } // ... 以下同様 (ただし、CSSで定義された値に合わせる)
        else { // デフォルトとして card-0 の位置へ
            cardElement.style.transform = 'translateY(0) scale(1) rotate(0deg)';
        }


        this.toggleSwipeOverlay(cardElement, null);

        setTimeout(() => {
            if (cardElement) cardElement.style.transition = ''; // 元のCSSのtransitionに戻す
        }, this.config.swipe.animationSpeed / 2 || 150);
    }

    // フィーバーゲージの値を保持するプロパティ（外部から設定されることを想定）
    currentFeverGaugeValue = 0;

    updateStoryProgressBar(member, currentImageIndex = 0, totalImages = 1) {
        if (!this.storyProgressBar || !member) return; // member が null の場合は何もしない
        this.storyProgressBar.innerHTML = '';
        if (totalImages <= 0) totalImages = 1;
        for (let i = 0; i < totalImages; i++) {
            const segment = document.createElement('div');
            segment.classList.add('segment');
            if (i === currentImageIndex) {
                segment.classList.add('active');
            }
            this.storyProgressBar.appendChild(segment);
        }
    }

    updateFeverGauge(percentage, color) {
        this.currentFeverGaugeValue = percentage; // 値を保持
        if (!this.feverGauge) return;
        this.feverGauge.style.width = `${percentage}%`;
        if (color) {
            const gaugeColor = this.config.fever?.gaugeColor || color;
            this.feverGauge.style.backgroundColor = gaugeColor;
        }
    }

    showNoMoreCardsMessage() {
        if (!this.cardStackArea) return;
        this.cardStackArea.innerHTML = '<p>表示できるカードがありません。<br>設定を確認するか、アプリをリロードしてください。</p>';
        document.body.style.backgroundColor = '#333'; // デフォルト背景色
        if (this.storyProgressBar) this.storyProgressBar.innerHTML = ''; // プログレスバーもクリア
        if (this.feverGauge) this.feverGauge.style.width = '0%'; // フィーバーゲージもリセット
    }
    updateAppBackground(color) { if (color) { document.body.style.backgroundColor = color; } }
    openSettingsModal(members, currentWeights) {
        if (!this.settingsModalOverlay || !this.memberWeightsSettingsDiv) return;
        this.memberWeightsSettingsDiv.innerHTML = '';
        members.forEach(member => {
            const memberSettingDiv = document.createElement('div');
            memberSettingDiv.classList.add('member-weight-setting');
            const label = document.createElement('label'); label.setAttribute('for', `weight-${member.id}`); label.textContent = `${member.name}: `; memberSettingDiv.appendChild(label);
            const slider = document.createElement('input'); slider.type = 'range'; slider.id = `weight-${member.id}`; slider.name = `weight-${member.id}`; slider.min = '0'; slider.max = '5'; slider.step = '1';
            slider.value = currentWeights[member.id] !== undefined ? currentWeights[member.id] : (this.config.defaultMemberWeight || 1);
            slider.dataset.memberId = member.id;
            const valueSpan = document.createElement('span'); valueSpan.id = `weight-value-${member.id}`; valueSpan.textContent = slider.value;
            slider.oninput = () => { valueSpan.textContent = slider.value; };
            memberSettingDiv.appendChild(slider); memberSettingDiv.appendChild(valueSpan); this.memberWeightsSettingsDiv.appendChild(memberSettingDiv);
        });
        this.settingsModalOverlay.classList.add('visible'); // .visible クラスで表示
    }
    closeSettingsModal() { if (this.settingsModalOverlay) { this.settingsModalOverlay.classList.remove('visible'); } } // .visible クラスで非表示
    getMemberWeightsFromModal() {
        const weights = {}; if (!this.memberWeightsSettingsDiv) return weights;
        const sliders = this.memberWeightsSettingsDiv.querySelectorAll('input[type="range"]');
        sliders.forEach(slider => { weights[slider.dataset.memberId] = parseInt(slider.value, 10); });
        return weights;
    }
}
