// ui_handler.js (スワイプ対応の変更箇所・追加箇所)

class UIHandler {
    constructor(config) {
        this.config = config;
        this.cardStackArea = document.querySelector('.card-stack-area');
        this.storyProgressBar = document.querySelector('.story-progress-bar');
        this.feverGauge = document.querySelector('.fever-gauge');
        this.settingsModalOverlay = document.getElementById('settingsModalOverlay');
        this.memberWeightsSettingsDiv = document.getElementById('memberWeightsSettings');

        if (!this.cardStackArea) {
            console.error("要素 .card-stack-area が見つかりません。");
        }
    }

    // カード要素を生成する (変更なし、ただしスワイプ関連の属性をCardManagerが後でセットする可能性あり)
    createCardElement(cardData) {
        const cardDiv = document.createElement('div');
        cardDiv.classList.add('card');
        // cardDiv.dataset.memberId = cardData.member.id; // CardManagerがイベント処理のためにIDを付与するかも

        const img = document.createElement('img');
        img.classList.add('main-image');
        img.src = cardData.imagePath;
        img.alt = cardData.member.name;
        img.onerror = () => {
            console.warn(`画像の読み込みに失敗: ${cardData.imagePath}。プレースホルダーを表示します。`);
            img.src = 'images/placeholder.png';
        };
        cardDiv.appendChild(img);

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

        // 評価オーバーレイ要素 (初期は非表示)
        const likeOverlay = document.createElement('img');
        likeOverlay.src = this.config.swipe?.likeOverlayPath || 'images/like_overlay.png';
        likeOverlay.classList.add('swipe-overlay', 'like-overlay');
        likeOverlay.style.display = 'none'; // 初期は非表示
        cardDiv.appendChild(likeOverlay);

        const nopeOverlay = document.createElement('img');
        nopeOverlay.src = this.config.swipe?.nopeOverlayPath || 'images/nope_overlay.png';
        nopeOverlay.classList.add('swipe-overlay', 'nope-overlay');
        nopeOverlay.style.display = 'none'; // 初期は非表示
        cardDiv.appendChild(nopeOverlay);

        return cardDiv;
    }

    // カードをDOMに追加する (変更なし)
    addCardToDOM(cardElement, addToTop = true) {
        if (!this.cardStackArea) return;
        if (addToTop) {
            this.cardStackArea.appendChild(cardElement);
        } else {
            this.cardStackArea.insertBefore(cardElement, this.cardStackArea.firstChild);
        }
    }

    // カードを表示する (変更なし)
    displayCard(cardData, nextCardHintData = null) {
        if (!cardData) {
            this.showNoMoreCardsMessage();
            return;
        }
        // 既存のカードを一旦クリア (スタック表示の場合は変更が必要)
        while (this.cardStackArea.firstChild) {
            this.cardStackArea.removeChild(this.cardStackArea.firstChild);
        }

        const cardElement = this.createCardElement(cardData);
        this.addCardToDOM(cardElement);

        // CardManagerに新しいカード要素の準備ができたことを通知し、イベントリスナーを設定させる
        document.dispatchEvent(new CustomEvent('cardElementReady', { detail: { cardElement, cardData } }));


        this.updateStoryProgressBar(cardData.member, cardData.currentImageIndex, cardData.totalImagesInMember);
        this.updateFeverGauge(0, cardData.member.color);
    }

    // --- スワイプ関連のUI操作 ---

    /**
     * ドラッグ中にカードを動かす
     * @param {HTMLElement} cardElement 動かすカード要素
     * @param {number} deltaX X軸の移動量
     * @param {number} deltaY Y軸の移動量 (今回は主にX軸だが、Yも少し回転に影響させても良い)
     * @param {number} rotation 傾きの角度
     */
    moveCardDuringSwipe(cardElement, deltaX, deltaY, rotation) {
        if (!cardElement) return;
        cardElement.style.transform = `translate(${deltaX}px, ${deltaY}px) rotate(${rotation}deg)`;
        cardElement.style.transition = 'none'; // ドラッグ中はトランジションを無効化
    }

    /**
     * スワイプ方向に応じて評価オーバーレイを表示/非表示
     * @param {HTMLElement} cardElement 対象のカード要素
     * @param {'like' | 'nope' | null} swipeDirection 表示するオーバーレイの種類、nullなら非表示
     */
    toggleSwipeOverlay(cardElement, swipeDirection) {
        if (!cardElement) return;
        const likeOverlay = cardElement.querySelector('.like-overlay');
        const nopeOverlay = cardElement.querySelector('.nope-overlay');

        if (likeOverlay) likeOverlay.style.display = swipeDirection === 'like' ? 'block' : 'none';
        if (nopeOverlay) nopeOverlay.style.display = swipeDirection === 'nope' ? 'block' : 'none';

        // 表示時にアニメーションをつけたい場合は、クラスを追加してCSSで制御
        if (swipeDirection) {
            if (swipeDirection === 'like' && likeOverlay) likeOverlay.classList.add('visible');
            if (swipeDirection === 'nope' && nopeOverlay) nopeOverlay.classList.add('visible');
        } else {
            if (likeOverlay) likeOverlay.classList.remove('visible');
            if (nopeOverlay) nopeOverlay.classList.remove('visible');
        }
    }

    /**
     * スワイプ完了後、カードを画面外に飛ばして削除するアニメーション
     * @param {HTMLElement} cardElement 対象のカード要素
     * @param {'left' | 'right'} direction スワイプ方向
     * @param {function} onComplete アニメーション完了後のコールバック
     */
    animateCardOut(cardElement, direction, onComplete) {
        if (!cardElement) return;
        const moveX = direction === 'right' ? window.innerWidth : -window.innerWidth;
        const rotation = direction === 'right' ? 30 : -30; // 適当な回転

        cardElement.style.transition = `transform ${this.config.swipe.animationSpeed || 300}ms ease-out`;
        cardElement.style.transform = `translate(${moveX}px, ${Math.random() * 100 - 50}px) rotate(${rotation}deg)`; // Yも少しランダムに

        // アニメーション完了後にDOMから削除
        setTimeout(() => {
            if (cardElement.parentNode) {
                cardElement.parentNode.removeChild(cardElement);
            }
            if (onComplete) onComplete();
        }, this.config.swipe.animationSpeed || 300);
    }

    /**
     * カードを元の位置に戻すアニメーション (スワイプが閾値に満たなかった場合など)
     * @param {HTMLElement} cardElement 対象のカード要素
     */
    resetCardPosition(cardElement) {
        if (!cardElement) return;
        cardElement.style.transition = `transform ${this.config.swipe.animationSpeed / 2 || 150}ms ease-out`;
        cardElement.style.transform = 'translate(0px, 0px) rotate(0deg)';
        this.toggleSwipeOverlay(cardElement, null); // オーバーレイも消す

        // トランジションが終わったら消す (次のドラッグ操作に影響しないように)
        setTimeout(() => {
            if (cardElement) cardElement.style.transition = 'none';
        }, this.config.swipe.animationSpeed / 2 || 150);
    }


    // --- 既存のメソッド (updateStoryProgressBar, updateFeverGauge, showNoMoreCardsMessage, etc.) は変更なし ---
    // (前回のコードを参照してください)
    updateStoryProgressBar(member, currentImageIndex = 0, totalImages = 1) {
        if (!this.storyProgressBar) return;
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
        if (!this.feverGauge) return;
        this.feverGauge.style.width = `${percentage}%`;
        if (color) {
            const gaugeColor = this.config.fever?.gaugeColor || color;
            this.feverGauge.style.backgroundColor = gaugeColor;
        }
    }

    showNoMoreCardsMessage() {
        if (!this.cardStackArea) return;
        this.cardStackArea.innerHTML = '<p style="color: white; text-align: center;">表示できるカードがありません。<br>設定を確認するか、アプリをリロードしてください。</p>';
        document.body.style.backgroundColor = '#333';
        this.updateStoryProgressBar(null,0,0);
        this.updateFeverGauge(0, '#ccc');
    }
    updateAppBackground(color) {
        if (color) {
            document.body.style.backgroundColor = color;
        }
    }
    openSettingsModal(members, currentWeights) {
        if (!this.settingsModalOverlay || !this.memberWeightsSettingsDiv) return;
        this.memberWeightsSettingsDiv.innerHTML = '';
        members.forEach(member => {
            const memberSettingDiv = document.createElement('div');
            memberSettingDiv.classList.add('member-weight-setting');
            const label = document.createElement('label');
            label.setAttribute('for', `weight-${member.id}`);
            label.textContent = `${member.name}: `;
            memberSettingDiv.appendChild(label);
            const slider = document.createElement('input');
            slider.type = 'range';
            slider.id = `weight-${member.id}`;
            slider.name = `weight-${member.id}`;
            slider.min = '0';
            slider.max = '5';
            slider.step = '1';
            slider.value = currentWeights[member.id] !== undefined ? currentWeights[member.id] : (this.config.defaultMemberWeight || 1);
            slider.dataset.memberId = member.id;
            const valueSpan = document.createElement('span');
            valueSpan.id = `weight-value-${member.id}`;
            valueSpan.textContent = slider.value;
            slider.oninput = () => { valueSpan.textContent = slider.value; };
            memberSettingDiv.appendChild(slider);
            memberSettingDiv.appendChild(valueSpan);
            this.memberWeightsSettingsDiv.appendChild(memberSettingDiv);
        });
        this.settingsModalOverlay.style.display = 'flex';
    }
    closeSettingsModal() {
        if (this.settingsModalOverlay) {
            this.settingsModalOverlay.style.display = 'none';
        }
    }
    getMemberWeightsFromModal() {
        const weights = {};
        if (!this.memberWeightsSettingsDiv) return weights;
        const sliders = this.memberWeightsSettingsDiv.querySelectorAll('input[type="range"]');
        sliders.forEach(slider => {
            weights[slider.dataset.memberId] = parseInt(slider.value, 10);
        });
        return weights;
    }
}
