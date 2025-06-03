// ui_handler.js (全文・スタンプ演出調整版)

class UIHandler {
    constructor(config) {
        this.config = config;
        this.cardStackArea = document.querySelector('.card-stack-area');
        this.storyProgressBar = document.querySelector('.story-progress-bar');
        this.feverGauge = document.querySelector('.fever-gauge');
        this.settingsModalOverlay = document.getElementById('settingsModalOverlay');
        this.memberWeightsSettingsDiv = document.getElementById('memberWeightsSettings');

        this.cardElements = [];
        this.MAX_CARDS_IN_STACK = 4;
        this.currentFeverGaugeValue = 0;

        this.stickerContainer = document.createElement('div');
        this.stickerContainer.classList.add('sticker-container');
        document.body.appendChild(this.stickerContainer);

        if (!this.cardStackArea) {
            console.error("要素 .card-stack-area が見つかりません。");
        }
    }

    setFeverModeUI(isFever) {
        if (isFever) {
            document.body.classList.add('fever-mode-active');
        } else {
            document.body.classList.remove('fever-mode-active');
        }
    }

    addSticker(imagePath, stickerId, member) { // member オブジェクトを受け取る
        if (!this.stickerContainer) return;

        const img = document.createElement('img');
        img.src = imagePath;
        img.classList.add('fever-sticker');
        img.style.position = 'fixed'; // CSSで管理するが、念のため
        img.style.zIndex = '150';     // CSSで管理するが、念のため
        img.style.pointerEvents = 'none'; // CSSで管理するが、念のため

        // ランダムな初期位置 (画面内に収まるように少し調整)
        const startX = Math.random() * 70 + 15; // 左右15%〜85%の位置
        const startY = Math.random() * 60 + 20; // 上下20%〜80%の位置
        img.style.left = `${startX}vw`;
        img.style.top = `${startY}vh`;
        img.style.transform = `translate(-50%, -50%) scale(${0.7 + Math.random() * 0.5})`; // ランダムな初期スケール

        img.dataset.stickerId = stickerId;

        // メンバー情報を元にスタイルを設定
        if (member && member.id && member.color) {
            img.dataset.memberId = member.id; // デバッグや特定のJS処理用
            // CSSカスタムプロパティ '--member-color-hue' を設定 (色相計算が必要)
            // 簡単な例として、メンバーカラーのHEXをそのまま渡す (CSS側での処理は限定的)
            // img.style.setProperty('--member-color-raw', member.color);

            // メンバーカラーからHSLの色相(hue)を計算して設定する (より高度な方法)
            // この計算は複雑なので、ここでは固定の色相オフセットで代用するか、
            // config.jsに各メンバーの色相値を定義しておくのが現実的
            // 例: img.style.filter = `hue-rotate(${member.hueOffset || 0}deg)`;

            // アヤカの場合の特別処理用のクラス
            if (member.name === 'アヤカ') { // config.js の name と比較
                img.classList.add('ayaka-sticker');
            } else {
                // アヤカ以外の場合、メンバーカラーに応じた色相回転を試みる
                // ★注意: CSSの filter: hue-rotate(var(--member-color-hue)) のような使い方をするには、
                // JavaScript側でメンバーカラー(HEX)から色相(deg)を計算してCSSカスタムプロパティで渡すか、
                // 各メンバーごとにCSSクラスを作ってhue-rotate値を設定する必要があります。
                // ここではCSS側で :not(.ayaka-sticker) に対してデフォルトのフィルターを設定し、
                // もしCSSカスタムプロパティ `--member-color-raw` を使うなら、
                // CSS側で `filter: hue-rotate(angle-from-color(var(--member-color-raw)))` のようなことは直接できない。
                // JSで `--hue-offset` を設定するのが一つの方法。
                // 以下は仮のランダムな色相回転（デモ用）
                // img.style.filter = `hue-rotate(${Math.random() * 360}deg) saturate(1.2)`;
                 img.style.setProperty('--original-hue', '0deg'); //基準（JSでメンバーカラーから計算して設定するべき箇所）
                 img.style.setProperty('--member-color-filter-hue', member.hueOffsetForSticker || '0deg'); // configに定義想定
            }
        }


        this.stickerContainer.appendChild(img);

        // 1. すぐに表示 (opacity 1へ)
        img.style.opacity = '0'; // 初期状態
        requestAnimationFrame(() => { // 描画サイクル後でないとtransitionが効かない場合がある
            img.style.transition = 'opacity 0.3s ease-in';
            img.style.opacity = '1';
        });


        // 2. 約1秒後から点滅アニメーションを開始
        const flickerTimerId = setTimeout(() => {
            img.classList.add('flicker');
        }, 1000); // 1秒後に点滅開始

        // 3. 表示開始から約4秒後 (出現0.3s + 滞在0.7s + 点滅3s) に消し始める
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
        }, 1000 + 3000); // 出現アニメーション後、1秒滞在し、3秒点滅 = 合計4秒後に消し始め

        // animationendは使わず、setTimeoutで制御する
    }

    clearStickers() {
        if (this.stickerContainer) {
            this.stickerContainer.innerHTML = ''; // すべてのスタンプをDOMから削除
        }
        // FeverHandlerのアクティブなスタンプ数をリセット
        if (window.feverHandlerInstance && typeof window.feverHandlerInstance.resetStickerCount === 'function') {
            window.feverHandlerInstance.resetStickerCount();
        }
    }

    createCardElement(cardData) {
        const cardDiv = document.createElement('div'); cardDiv.classList.add('card');
        if (cardData && cardData.member) { cardDiv.dataset.memberId = cardData.member.id; cardDiv.style.setProperty('--member-color', cardData.member.color || '#888'); }
        const imageContainer = document.createElement('div'); imageContainer.classList.add('image-container');
        const img = document.createElement('img'); img.classList.add('main-image'); img.alt = cardData.member ? cardData.member.name : 'Card Image';
        img.onload = () => {
            const naturalWidth = img.naturalWidth; const naturalHeight = img.naturalHeight; const imageAspectRatio = naturalWidth / naturalHeight;
            const cardDisplayAreaAspectRatio = 340 / 520; /* 仮 */ imageContainer.className = 'image-container'; img.style.objectFit = 'contain'; img.style.width = 'auto'; img.style.height = 'auto';
            if (naturalHeight > naturalWidth) { imageContainer.classList.add('image-aspect-portrait-cover'); }
            else { if (imageAspectRatio < 1.1 && imageAspectRatio > 0.9) { imageContainer.classList.add('image-aspect-square-pillarbox', 'bg-white'); } else if (imageAspectRatio > cardDisplayAreaAspectRatio) { imageContainer.classList.add('image-aspect-landscape-letterbox', 'bg-black'); } else { imageContainer.classList.add('image-aspect-landscape-letterbox', 'bg-black'); } }
        };
        img.onerror = () => { img.src = 'images/placeholder.png'; }; img.src = cardData.imagePath;
        imageContainer.appendChild(img); cardDiv.appendChild(imageContainer);
        if (cardData.member && cardData.serif) { const infoDiv = document.createElement('div'); infoDiv.classList.add('card-info'); const memberDetailsDiv = document.createElement('div'); memberDetailsDiv.classList.add('member-details'); const quoteP = document.createElement('p'); quoteP.classList.add('member-quote'); quoteP.textContent = cardData.serif; memberDetailsDiv.appendChild(quoteP); if (memberDetailsDiv.hasChildNodes()) { infoDiv.appendChild(memberDetailsDiv); } if (infoDiv.hasChildNodes()) { cardDiv.appendChild(infoDiv); } }
        const likeOverlay = document.createElement('img'); likeOverlay.src = this.config.swipe?.likeOverlayPath || 'images/like_overlay.png'; likeOverlay.classList.add('swipe-overlay', 'like-overlay'); likeOverlay.style.display = 'none'; cardDiv.appendChild(likeOverlay);
        const nopeOverlay = document.createElement('img'); nopeOverlay.src = this.config.swipe?.nopeOverlayPath || 'images/nope_overlay.png'; nopeOverlay.classList.add('swipe-overlay', 'nope-overlay'); nopeOverlay.style.display = 'none'; cardDiv.appendChild(nopeOverlay);
        return cardDiv;
    }
    updateCardStack(cardDataArray) {
        if (!this.cardStackArea) return; this.cardStackArea.innerHTML = ''; this.cardElements = [];
        if (!cardDataArray || cardDataArray.length === 0) { this.showNoMoreCardsMessage(); return; }
        for (let i = 0; i < Math.min(cardDataArray.length, this.MAX_CARDS_IN_STACK); i++) {
            const cardData = cardDataArray[i]; if (!cardData) continue;
            const cardElement = this.createCardElement(cardData); this.cardElements.push(cardElement); this.cardStackArea.appendChild(cardElement);
            cardElement.className = 'card'; cardElement.classList.add(`card-${i}`);
            if (i === 0) { document.dispatchEvent(new CustomEvent('cardElementReady', { detail: { cardElement, cardData } })); if(cardData.member) { this.updateStoryProgressBar(cardData.member, cardData.currentImageIndex, cardData.totalImagesInMember); this.updateFeverGauge(this.currentFeverGaugeValue || 0, cardData.member.color); } }
        }
        if (this.cardElements.length === 0) { this.showNoMoreCardsMessage(); }
    }
    moveCardDuringSwipe(cardElement, deltaX, deltaY, rotation) { if (!cardElement) return; cardElement.classList.add('dragging-card'); cardElement.style.transform = `translate(${deltaX}px, ${deltaY}px) rotate(${rotation}deg)`; }
    toggleSwipeOverlay(cardElement, swipeDirection) { if (!cardElement) return; const likeOverlay = cardElement.querySelector('.like-overlay'); const nopeOverlay = cardElement.querySelector('.nope-overlay'); if (likeOverlay) { likeOverlay.style.display = swipeDirection === 'like' ? 'block' : 'none'; if (swipeDirection === 'like') likeOverlay.classList.add('visible'); else likeOverlay.classList.remove('visible'); } if (nopeOverlay) { nopeOverlay.style.display = swipeDirection === 'nope' ? 'block' : 'none'; if (swipeDirection === 'nope') nopeOverlay.classList.add('visible'); else nopeOverlay.classList.remove('visible'); } }
    animateCardOut(cardElement, direction, onComplete) { if (!cardElement) return; cardElement.classList.remove('dragging-card'); const moveX = direction === 'right' ? window.innerWidth * 1.2 : -window.innerWidth * 1.2; const rotation = direction === 'right' ? 45 : -45; cardElement.style.transition = `transform ${this.config.swipe.animationSpeed || 300}ms ease-in`; cardElement.style.transform = `translate(${moveX}px, ${Math.random() * 100 - 50}px) rotate(${rotation}deg)`; cardElement.style.opacity = '0'; setTimeout(() => { if (onComplete) onComplete(); }, this.config.swipe.animationSpeed || 300); }
    resetCardPosition(cardElement) { if (!cardElement) return; cardElement.classList.remove('dragging-card'); let originalClass = ''; for(let i=0; i < this.MAX_CARDS_IN_STACK; i++){ if(cardElement.classList.contains(`card-${i}`)){ originalClass = `card-${i}`; break; } } cardElement.style.transition = `transform ${this.config.swipe.animationSpeed / 2 || 150}ms ease-out`; if (originalClass === 'card-0') { cardElement.style.transform = 'translateY(0) scale(1) rotate(0deg)'; } else if (originalClass === 'card-1') { cardElement.style.transform = 'translateY(20px) scale(0.95) rotate(0deg)'; } else if (originalClass === 'card-2') { cardElement.style.transform = 'translateY(40px) scale(0.90) rotate(0deg)'; } else if (originalClass === 'card-3') { cardElement.style.transform = 'translateY(60px) scale(0.85) rotate(0deg)'; } else { cardElement.style.transform = 'translateY(0) scale(1) rotate(0deg)'; } this.toggleSwipeOverlay(cardElement, null); setTimeout(() => { if (cardElement) cardElement.style.transition = ''; }, this.config.swipe.animationSpeed / 2 || 150); }
    updateStoryProgressBar(member, currentImageIndex = 0, totalImages = 1) { if (!this.storyProgressBar || !member) return; this.storyProgressBar.innerHTML = ''; if (totalImages <= 0) totalImages = 1; for (let i = 0; i < totalImages; i++) { const segment = document.createElement('div'); segment.classList.add('segment'); if (i === currentImageIndex) { segment.classList.add('active'); } this.storyProgressBar.appendChild(segment); } }
    updateFeverGauge(percentage, color) { this.currentFeverGaugeValue = percentage; if (!this.feverGauge) return; this.feverGauge.style.width = `${percentage}%`; if (color) { const gaugeColor = this.config.fever?.gaugeColor || color; this.feverGauge.style.backgroundColor = gaugeColor; } }
    showNoMoreCardsMessage() { if (!this.cardStackArea) return; this.cardStackArea.innerHTML = '<p>表示できるカードがありません。<br>設定を確認するか、アプリをリロードしてください。</p>'; document.body.style.backgroundColor = '#333'; if (this.storyProgressBar) this.storyProgressBar.innerHTML = ''; if (this.feverGauge) this.feverGauge.style.width = '0%'; }
    updateAppBackground(color) { if (color) { document.body.style.backgroundColor = color; } }
    openSettingsModal(members, currentWeights) { if (!this.settingsModalOverlay || !this.memberWeightsSettingsDiv) return; this.memberWeightsSettingsDiv.innerHTML = ''; members.forEach(member => { const memberSettingDiv = document.createElement('div'); memberSettingDiv.classList.add('member-weight-setting'); const label = document.createElement('label'); label.setAttribute('for', `weight-${member.id}`); label.textContent = `${member.name}: `; memberSettingDiv.appendChild(label); const slider = document.createElement('input'); slider.type = 'range'; slider.id = `weight-${member.id}`; slider.name = `weight-${member.id}`; slider.min = '0'; slider.max = '5'; slider.step = '1'; slider.value = currentWeights[member.id] !== undefined ? currentWeights[member.id] : (this.config.defaultMemberWeight || 1); slider.dataset.memberId = member.id; const valueSpan = document.createElement('span'); valueSpan.id = `weight-value-${member.id}`; valueSpan.textContent = slider.value; slider.oninput = () => { valueSpan.textContent = slider.value; }; memberSettingDiv.appendChild(slider); memberSettingDiv.appendChild(valueSpan); this.memberWeightsSettingsDiv.appendChild(memberSettingDiv); }); this.settingsModalOverlay.classList.add('visible'); }
    closeSettingsModal() { if (this.settingsModalOverlay) { this.settingsModalOverlay.classList.remove('visible'); } }
    getMemberWeightsFromModal() { const weights = {}; if (!this.memberWeightsSettingsDiv) return weights; const sliders = this.memberWeightsSettingsDiv.querySelectorAll('input[type="range"]'); sliders.forEach(slider => { weights[slider.dataset.memberId] = parseInt(slider.value, 10); }); return weights; }
}
