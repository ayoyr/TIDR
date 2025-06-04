// ui_handler.js (全文・フィーバー演出調整・エッジエフェクト対応・スタンプ調整版)

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
        this.currentFeverGaugeValue = 0; // フィーバーゲージの値をUIHandler内で一時的に保持 (描画目的)

        // スタンプ表示用コンテナをbody直下に追加
        this.stickerContainer = document.createElement('div');
        this.stickerContainer.classList.add('sticker-container');
        document.body.appendChild(this.stickerContainer);

        // フィーバーエッジエフェクト用要素の参照を取得
        this.feverEdgeLeft = document.getElementById('feverEdgeLeft');
        this.feverEdgeRight = document.getElementById('feverEdgeRight');

        if (!this.cardStackArea) {
            console.error("要素 .card-stack-area が見つかりません。");
        }
        if (!this.feverEdgeLeft || !this.feverEdgeRight) {
            console.warn("フィーバーエッジエフェクト要素 (#feverEdgeLeft, #feverEdgeRight) がHTMLに見つかりません。");
        }
    }

    // フィーバーモード時のUI変更用メソッド (背景クラス、エッジエフェクト表示)
    setFeverModeUI(isFever) {
        if (isFever) {
            document.body.classList.add('fever-mode-active');
            if (this.feverEdgeLeft) this.feverEdgeLeft.classList.add('active');
            if (this.feverEdgeRight) this.feverEdgeRight.classList.add('active');
        } else {
            document.body.classList.remove('fever-mode-active');
            if (this.feverEdgeLeft) this.feverEdgeLeft.classList.remove('active');
            if (this.feverEdgeRight) this.feverEdgeRight.classList.remove('active');
        }
    }

    // スタンプ追加メソッド (アニメーション調整・メンバーカラー対応)
    addSticker(imagePath, stickerId, member) {
        if (!this.stickerContainer) return;

        const img = document.createElement('img');
        img.src = imagePath;
        img.classList.add('fever-sticker');
        // position, z-index, pointer-events はCSSで指定

        // ランダムな初期位置 (画面内に収まるように少し調整)
        const startX = Math.random() * 70 + 15; // 左右15%〜85%の位置 (ビューポート幅に対する割合)
        const startY = Math.random() * 60 + 20; // 上下20%〜80%の位置 (ビューポート高さに対する割合)
        img.style.left = `${startX}vw`;
        img.style.top = `${startY}vh`;
        // 初期スケールもランダムに
        const initialScale = 0.7 + Math.random() * 0.5;
        img.style.transform = `translate(-50%, -50%) scale(${initialScale})`;
        img.style.setProperty('--current-scale', initialScale.toString()); // 点滅アニメーションで元のスケールを参照するため

        img.dataset.stickerId = stickerId;

        // メンバー情報を元にスタイルを設定
        if (member && member.id && member.color) {
            img.dataset.memberId = member.id;
            // CSSカスタムプロパティ '--member-color-filter-hue' を設定
            img.style.setProperty('--member-color-filter-hue', member.hueOffsetForSticker || '0deg');

            if (member.name === 'アヤカ') { // config.js の name と比較
                img.classList.add('ayaka-sticker');
            }
        }

        this.stickerContainer.appendChild(img);

        // 1. すぐに表示 (opacity 1へ)
        img.style.opacity = '0'; // 初期状態
        requestAnimationFrame(() => { // DOMに追加された次のフレームでトランジション開始
            img.style.transition = 'opacity 0.3s ease-in';
            img.style.opacity = '1';
        });

        // 2. 約1秒後から点滅アニメーションを開始 (CSSクラスを付与)
        const flickerTimerId = setTimeout(() => {
            img.classList.add('flicker');
        }, 1000); // 表示開始から1秒後に点滅開始

        // 3. 表示開始から合計約4秒後 (出現0.3s + 待機0.7s + 点滅時間(CSSで2s想定)) に消し始める
        const totalDisplayTimeBeforeFadeOut = 1000 + (this.config.fever?.stickerFlickerDuration || 2000); // 例: 点滅を2秒続ける

        const fadeOutTimerId = setTimeout(() => {
            img.classList.remove('flicker'); // 点滅を止める
            img.style.transition = 'opacity 0.5s ease-out'; // ゆっくり消える
            img.style.opacity = '0';

            // 4. 完全に消えた後にDOMから削除
            setTimeout(() => {
                if (img.parentNode) {
                    img.parentNode.removeChild(img);
                }
                // FeverHandlerのactiveStickersCountを減らす
                if (window.feverHandlerInstance && typeof window.feverHandlerInstance.decrementStickerCount === 'function') {
                    window.feverHandlerInstance.decrementStickerCount();
                }
            }, 500); // opacityのtransition時間
        }, totalDisplayTimeBeforeFadeOut);
    }

    // 表示中のスタンプを全てクリアするメソッド
    clearStickers() {
        if (this.stickerContainer) {
            this.stickerContainer.innerHTML = ''; // すべてのスタンプをDOMから削除
        }
        // FeverHandlerのアクティブなスタンプ数をリセット
        if (window.feverHandlerInstance && typeof window.feverHandlerInstance.resetStickerCount === 'function') {
            window.feverHandlerInstance.resetStickerCount();
        }
    }

    // カード要素を生成する (アイコンと名前は非表示)
    createCardElement(cardData) {
        const cardDiv = document.createElement('div');
        cardDiv.classList.add('card');
        if (cardData && cardData.member) {
            cardDiv.dataset.memberId = cardData.member.id;
            cardDiv.style.setProperty('--member-color', cardData.member.color || '#888');
        }

        const imageContainer = document.createElement('div');
        imageContainer.classList.add('image-container');
        const img = document.createElement('img');
        img.classList.add('main-image');
        img.alt = cardData.member ? cardData.member.name : 'Card Image';

        img.onload = () => {
            const naturalWidth = img.naturalWidth;
            const naturalHeight = img.naturalHeight;
            const imageAspectRatio = naturalWidth / naturalHeight;
            // カード表示エリアの縦横比 (CSSのmax値などからおおよそ)
            // 正確な値は imageContainer.offsetWidth / imageContainer.offsetHeight で取得できるが、
            // DOMに追加されてレイアウト計算後でないと正しい値が取れないので注意。
            // ここでは簡易的な判定に留める。
            const cardDisplayAreaAspectRatio = (this.cardStackArea.clientWidth - 40) / (this.cardStackArea.clientHeight - 80) || (340 / 520);


            imageContainer.className = 'image-container'; // スタイルクラスをリセット
            img.style.objectFit = 'contain'; // デフォルトは全体表示
            img.style.width = 'auto';
            img.style.height = 'auto';

            // 画像の縦横比に応じたクラスを imageContainer に付与
            if (naturalHeight > naturalWidth * 1.2) { // 縦長の場合 (比率はお好みで調整)
                imageContainer.classList.add('image-aspect-portrait-cover');
            } else if (naturalWidth > naturalHeight * 1.2) { // 横長の場合
                // ご提示の図のパターン分けをここに入れる
                // 例: パターン2 (横長で下に黒余白)
                // if (imageAspectRatio > 1 && imageAspectRatio < 1.5) { // 仮の条件
                //    imageContainer.classList.add('image-aspect-landscape-letterbox', 'bg-black');
                // } else { // それ以外の横長
                //    imageContainer.classList.add('image-aspect-default-fill'); // または別の専用クラス
                // }
                 imageContainer.classList.add('image-aspect-landscape-letterbox', 'bg-black'); // 一旦横長はこれで統一
            } else { // 正方形に近い、またはカードエリアの比率に近い場合
                imageContainer.classList.add('image-aspect-default-fill');
            }
        };
        img.onerror = () => {
            console.warn(`画像の読み込みに失敗: ${cardData.imagePath}。プレースホルダーを表示します。`);
            img.src = 'images/placeholder.png';
        };
        img.src = cardData.imagePath;

        imageContainer.appendChild(img);
        cardDiv.appendChild(imageContainer);

        // セリフ表示
        if (cardData.member && cardData.serif) {
            const infoDiv = document.createElement('div');
            infoDiv.classList.add('card-info');
            const memberDetailsDiv = document.createElement('div');
            memberDetailsDiv.classList.add('member-details');
            const quoteP = document.createElement('p');
            quoteP.classList.add('member-quote');
            quoteP.textContent = cardData.serif;
            memberDetailsDiv.appendChild(quoteP);
            if (memberDetailsDiv.hasChildNodes()) { infoDiv.appendChild(memberDetailsDiv); }
            if (infoDiv.hasChildNodes()) { cardDiv.appendChild(infoDiv); }
        }

        // スワイプオーバーレイ
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

    // カードスタックのUIを更新する
    updateCardStack(cardDataArray) {
        if (!this.cardStackArea) return;
        this.cardStackArea.innerHTML = ''; // 既存のカードをクリア
        this.cardElements = [];

        if (!cardDataArray || cardDataArray.length === 0) {
            this.showNoMoreCardsMessage();
            return;
        }

        for (let i = 0; i < Math.min(cardDataArray.length, this.MAX_CARDS_IN_STACK); i++) {
            const cardData = cardDataArray[i];
            if (!cardData) continue;

            const cardElement = this.createCardElement(cardData);
            this.cardElements.push(cardElement);
            this.cardStackArea.appendChild(cardElement); // DOMに追加

            cardElement.className = 'card'; // 基本クラスを再設定
            cardElement.classList.add(`card-${i}`); // スタック位置に応じたクラスを付与

            if (i === 0) { // 一番手前のカード
                document.dispatchEvent(new CustomEvent('cardElementReady', { detail: { cardElement, cardData } }));
                if(cardData.member) { // メンバー情報がある場合のみUI更新
                    this.updateStoryProgressBar(cardData.member, cardData.currentImageIndex, cardData.totalImagesInMember);
                    // フィーバーゲージの色は、フィーバー中でなければ現在のメンバーカラー、フィーバー中なら固定色
                    const gaugeColor = (window.feverHandlerInstance && window.feverHandlerInstance.getIsFeverActive()) ?
                                       (this.config.fever?.gaugeColor || '#FFD700') :
                                       cardData.member.color;
                    this.updateFeverGauge(this.currentFeverGaugeValue || 0, gaugeColor);
                }
            }
        }
        if (this.cardElements.length === 0 && cardDataArray.length > 0) {
            console.warn("カードデータは存在しますが、カード要素が生成されませんでした。");
            this.showNoMoreCardsMessage();
        } else if (this.cardElements.length === 0) {
             this.showNoMoreCardsMessage();
        }
    }

    // ドラッグ中にカードを動かす
    moveCardDuringSwipe(cardElement, deltaX, deltaY, rotation) {
        if (!cardElement) return;
        cardElement.classList.add('dragging-card');
        cardElement.style.transform = `translate(${deltaX}px, ${deltaY}px) rotate(${rotation}deg)`;
    }

    // スワイプ方向に応じて評価オーバーレイを表示/非表示
    toggleSwipeOverlay(cardElement, swipeDirection) {
        if (!cardElement) return;
        const likeOverlay = cardElement.querySelector('.like-overlay');
        const nopeOverlay = cardElement.querySelector('.nope-overlay');
        if (likeOverlay) {
            likeOverlay.style.display = swipeDirection === 'like' ? 'block' : 'none';
            if (swipeDirection === 'like') likeOverlay.classList.add('visible'); else likeOverlay.classList.remove('visible');
        }
        if (nopeOverlay) {
            nopeOverlay.style.display = swipeDirection === 'nope' ? 'block' : 'none';
            if (swipeDirection === 'nope') nopeOverlay.classList.add('visible'); else nopeOverlay.classList.remove('visible');
        }
    }

    // スワイプ完了後、カードを画面外に飛ばすアニメーション
    animateCardOut(cardElement, direction, onComplete) {
        if (!cardElement) return;
        cardElement.classList.remove('dragging-card');
        const moveX = direction === 'right' ? window.innerWidth * 1.2 : -window.innerWidth * 1.2;
        const rotation = direction === 'right' ? 45 : -45;
        cardElement.style.transition = `transform ${this.config.swipe.animationSpeed || 300}ms ease-in, opacity ${this.config.swipe.animationSpeed || 300}ms ease-in`;
        cardElement.style.transform = `translate(${moveX}px, ${Math.random() * 100 - 50}px) rotate(${rotation}deg)`;
        cardElement.style.opacity = '0';
        setTimeout(() => {
            if (onComplete) onComplete();
        }, this.config.swipe.animationSpeed || 300);
    }

    // カードを元の位置に戻すアニメーション
    resetCardPosition(cardElement) {
        if (!cardElement) return;
        cardElement.classList.remove('dragging-card');
        let originalStackClass = '';
        for(let i=0; i < this.MAX_CARDS_IN_STACK; i++){
            if(cardElement.classList.contains(`card-${i}`)){
                originalStackClass = `card-${i}`;
                break;
            }
        }
        cardElement.style.transition = `transform ${this.config.swipe.animationSpeed / 2 || 150}ms ease-out`;
        if (originalStackClass === 'card-0') { cardElement.style.transform = 'translateY(0) scale(1) rotate(0deg)'; }
        else if (originalStackClass === 'card-1') { cardElement.style.transform = 'translateY(20px) scale(0.95) rotate(0deg)'; }
        else if (originalStackClass === 'card-2') { cardElement.style.transform = 'translateY(40px) scale(0.90) rotate(0deg)'; }
        else if (originalStackClass === 'card-3') { cardElement.style.transform = 'translateY(60px) scale(0.85) rotate(0deg)'; }
        else { cardElement.style.transform = 'translateY(0) scale(1) rotate(0deg)'; } // デフォルト

        this.toggleSwipeOverlay(cardElement, null);
        setTimeout(() => {
            if (cardElement) cardElement.style.transition = '';
        }, this.config.swipe.animationSpeed / 2 || 150);
    }

    updateStoryProgressBar(member, currentImageIndex = 0, totalImages = 1) {
        if (!this.storyProgressBar || !member) return;
        this.storyProgressBar.innerHTML = '';
        if (totalImages <= 0) totalImages = 1;
        for (let i = 0; i < totalImages; i++) {
            const segment = document.createElement('div'); segment.classList.add('segment');
            if (i === currentImageIndex) { segment.classList.add('active'); }
            this.storyProgressBar.appendChild(segment);
        }
    }

    updateFeverGauge(percentage, color) {
        this.currentFeverGaugeValue = percentage;
        if (!this.feverGauge) return;
        this.feverGauge.style.width = `${percentage}%`;
        if (color) {
            const gaugeColor = (window.feverHandlerInstance && window.feverHandlerInstance.getIsFeverActive()) ?
                               (this.config.fever?.gaugeColor || '#FFD700') : // フィーバー中は専用色
                               color; // 通常時はメンバーカラー
            this.feverGauge.style.backgroundColor = gaugeColor;
        }
    }

    showNoMoreCardsMessage() {
        if (!this.cardStackArea) return;
        this.cardStackArea.innerHTML = '<p>表示できるカードがありません。<br>設定を確認するか、アプリをリロードしてください。</p>';
        document.body.style.backgroundColor = '#333';
        if (this.storyProgressBar) this.storyProgressBar.innerHTML = '';
        if (this.feverGauge) this.feverGauge.style.width = '0%';
    }

    updateAppBackground(color) { if (color) { document.body.style.backgroundColor = color; } }

    openSettingsModal(members, currentWeights) {
        if (!this.settingsModalOverlay || !this.memberWeightsSettingsDiv) return;
        this.memberWeightsSettingsDiv.innerHTML = '';
        members.forEach(member => {
            const memberSettingDiv = document.createElement('div'); memberSettingDiv.classList.add('member-weight-setting');
            const label = document.createElement('label'); label.setAttribute('for', `weight-${member.id}`); label.textContent = `${member.name}: `; memberSettingDiv.appendChild(label);
            const slider = document.createElement('input'); slider.type = 'range'; slider.id = `weight-${member.id}`; slider.name = `weight-${member.id}`; slider.min = '0'; slider.max = '5'; slider.step = '1';
            slider.value = currentWeights[member.id] !== undefined ? currentWeights[member.id] : (this.config.defaultMemberWeight || 1);
            slider.dataset.memberId = member.id;
            const valueSpan = document.createElement('span'); valueSpan.id = `weight-value-${member.id}`; valueSpan.textContent = slider.value;
            slider.oninput = () => { valueSpan.textContent = slider.value; };
            memberSettingDiv.appendChild(slider); memberSettingDiv.appendChild(valueSpan); this.memberWeightsSettingsDiv.appendChild(memberSettingDiv);
        });
        this.settingsModalOverlay.classList.add('visible');
    }

    closeSettingsModal() { if (this.settingsModalOverlay) { this.settingsModalOverlay.classList.remove('visible'); } }

    getMemberWeightsFromModal() {
        const weights = {}; if (!this.memberWeightsSettingsDiv) return weights;
        const sliders = this.memberWeightsSettingsDiv.querySelectorAll('input[type="range"]');
        sliders.forEach(slider => { weights[slider.dataset.memberId] = parseInt(slider.value, 10); });
        return weights;
    }
}
