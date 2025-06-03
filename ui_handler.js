// ui_handler.js (全文・フィーバー演出対応版)

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
        this.currentFeverGaugeValue = 0;

        // ★ スタンプ表示用コンテナをbody直下に追加
        this.stickerContainer = document.createElement('div');
        this.stickerContainer.classList.add('sticker-container');
        document.body.appendChild(this.stickerContainer);


        if (!this.cardStackArea) {
            console.error("要素 .card-stack-area が見つかりません。");
        }
    }

    // ★ フィーバーモード時のUI変更用メソッド
    setFeverModeUI(isFever) {
        if (isFever) {
            document.body.classList.add('fever-mode-active');
        } else {
            document.body.classList.remove('fever-mode-active');
        }
    }

    // ★ スタンプ追加メソッド
    addSticker(imagePath, stickerId) {
        if (!this.stickerContainer) return;

        const img = document.createElement('img');
        img.src = imagePath;
        img.classList.add('fever-sticker');
        // img.style.position = 'fixed'; // CSSで指定済みのはず
        // img.style.zIndex = 150; // CSSで指定済みのはず
        // img.style.pointerEvents = 'none'; // CSSで指定済みのはず

        // ランダムな初期位置、サイズ、回転をCSS側のアニメーションに任せるか、JSで一部制御
        // CSSの @keyframes で多様な動きを定義し、それをランダムに適用するのも良い
        // ここでは基本的な出現位置をランダムにする例
        const side = Math.random() < 0.5 ? 'left' : 'right';
        const topPosition = Math.random() * 70 + 15; // 15% から 85% の高さ

        if (side === 'left') {
            img.style.left = `${Math.random() * 20 - 10}%`; // -10% から 10% (画面左端付近)
        } else {
            img.style.right = `${Math.random() * 20 - 10}%`; // -10% から 10% (画面右端付近)
        }
        img.style.top = `${topPosition}%`;

        // ランダムなアニメーション遅延や向きなどを設定することも可能
        img.style.animationDelay = `${Math.random() * 0.5}s`;
        // メンバーカラーに合わせて色相を回転 (CSSカスタムプロパティを使う)
        // 現在アクティブなカードのメンバーカラーを取得する必要がある
        if (this.cardElements.length > 0 && this.cardElements[0] && this.cardElements[0].style.getPropertyValue('--member-color')) {
            const memberColor = this.cardElements[0].style.getPropertyValue('--member-color');
            // メンバーカラーからhueを計算するのは複雑なので、
            // ここでは仮にフィルターをかける (より正確にはconfigの色から計算)
            // 例: img.style.filter = `hue-rotate(${Math.random() * 360}deg) saturate(1.5)`;
            // 今回はCSS側でアニメーションさせるので、JSでの直接的な色相変更は一旦保留
            // もしやるなら、data-member-color 属性をスタンプに付与し、CSSで参照する
        }


        img.dataset.stickerId = stickerId; // アニメーション後の削除管理用

        this.stickerContainer.appendChild(img);

        // アニメーション終了後に要素を削除 (CSSアニメーションの duration と一致させる)
        // CSSのanimation-durationが3sの場合
        img.addEventListener('animationend', () => {
            if (img.parentNode) {
                img.parentNode.removeChild(img);
            }
            // FeverHandlerのactiveStickersからもIDを削除する必要があるかもしれないが、
            // FeverHandler側でタイムアウトで管理しているので、ここではDOM削除のみ
        }, { once: true }); // イベントリスナーを一度だけ実行
    }

    // ★ 表示中のスタンプを全てクリアするメソッド
    clearStickers() {
        if (this.stickerContainer) {
            this.stickerContainer.innerHTML = '';
        }
    }


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
            const naturalWidth = img.naturalWidth; const naturalHeight = img.naturalHeight;
            const imageAspectRatio = naturalWidth / naturalHeight;
            const cardDisplayAreaAspectRatio = 340 / 520; 

            imageContainer.className = 'image-container'; 
            img.style.objectFit = 'contain'; img.style.width = 'auto'; img.style.height = 'auto';

            if (naturalHeight > naturalWidth) { imageContainer.classList.add('image-aspect-portrait-cover'); }
            else {
                if (imageAspectRatio < 1.1 && imageAspectRatio > 0.9) { imageContainer.classList.add('image-aspect-square-pillarbox', 'bg-white'); }
                else if (imageAspectRatio > cardDisplayAreaAspectRatio) { imageContainer.classList.add('image-aspect-landscape-letterbox', 'bg-black'); }
                else { imageContainer.classList.add('image-aspect-landscape-letterbox', 'bg-black'); }
            }
        };
        img.onerror = () => { img.src = 'images/placeholder.png'; };
        img.src = cardData.imagePath;

        imageContainer.appendChild(img);
        cardDiv.appendChild(imageContainer);

        if (cardData.member && cardData.serif) {
            const infoDiv = document.createElement('div'); infoDiv.classList.add('card-info');
            const memberDetailsDiv = document.createElement('div'); memberDetailsDiv.classList.add('member-details');
            const quoteP = document.createElement('p'); quoteP.classList.add('member-quote'); quoteP.textContent = cardData.serif;
            memberDetailsDiv.appendChild(quoteP);
            if (memberDetailsDiv.hasChildNodes()) { infoDiv.appendChild(memberDetailsDiv); }
            if (infoDiv.hasChildNodes()) { cardDiv.appendChild(infoDiv); }
        }

        const likeOverlay = document.createElement('img'); likeOverlay.src = this.config.swipe?.likeOverlayPath || 'images/like_overlay.png'; likeOverlay.classList.add('swipe-overlay', 'like-overlay'); likeOverlay.style.display = 'none'; cardDiv.appendChild(likeOverlay);
        const nopeOverlay = document.createElement('img'); nopeOverlay.src = this.config.swipe?.nopeOverlayPath || 'images/nope_overlay.png'; nopeOverlay.classList.add('swipe-overlay', 'nope-overlay'); nopeOverlay.style.display = 'none'; cardDiv.appendChild(nopeOverlay);
        return cardDiv;
    }

    updateCardStack(cardDataArray) {
        if (!this.cardStackArea) return;
        this.cardStackArea.innerHTML = ''; this.cardElements = [];
        if (!cardDataArray || cardDataArray.length === 0) { this.showNoMoreCardsMessage(); return; }
        for (let i = 0; i < Math.min(cardDataArray.length, this.MAX_CARDS_IN_STACK); i++) {
            const cardData = cardDataArray[i]; if (!cardData) continue;
            const cardElement = this.createCardElement(cardData);
            this.cardElements.push(cardElement); this.cardStackArea.appendChild(cardElement);
            cardElement.className = 'card'; 
            cardElement.classList.add(`card-${i}`);
            if (i === 0) {
                document.dispatchEvent(new CustomEvent('cardElementReady', { detail: { cardElement, cardData } }));
                if(cardData.member) {
                    this.updateStoryProgressBar(cardData.member, cardData.currentImageIndex, cardData.totalImagesInMember);
                    this.updateFeverGauge(this.currentFeverGaugeValue || 0, cardData.member.color);
                }
            }
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
