// ui_handler.js (全文・アイコンと名前を非表示に修正)

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

        if (!this.cardStackArea) {
            console.error("要素 .card-stack-area が見つかりません。");
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
            const naturalWidth = img.naturalWidth;
            const naturalHeight = img.naturalHeight;
            const imageAspectRatio = naturalWidth / naturalHeight;
            const cardDisplayAreaAspectRatio = 340 / 520; // 仮

            imageContainer.className = 'image-container';
            img.style.objectFit = 'contain';
            img.style.width = 'auto';
            img.style.height = 'auto';

            if (naturalHeight > naturalWidth) {
                imageContainer.classList.add('image-aspect-portrait-cover');
            } else {
                if (imageAspectRatio < 1.1 && imageAspectRatio > 0.9) {
                    imageContainer.classList.add('image-aspect-square-pillarbox', 'bg-white');
                } else if (imageAspectRatio > cardDisplayAreaAspectRatio) {
                    imageContainer.classList.add('image-aspect-landscape-letterbox', 'bg-black');
                } else {
                    imageContainer.classList.add('image-aspect-landscape-letterbox', 'bg-black');
                }
            }
        };
        img.onerror = () => {
            console.warn(`画像の読み込みに失敗: ${cardData.imagePath}。プレースホルダーを表示します。`);
            img.src = 'images/placeholder.png';
        };
        img.src = cardData.imagePath;

        imageContainer.appendChild(img);
        cardDiv.appendChild(imageContainer);


        if (cardData.member && cardData.serif) { // メンバー情報とセリフがある場合のみ .card-info を表示
            const infoDiv = document.createElement('div');
            infoDiv.classList.add('card-info');

            // ★ プロフィールアイコンの生成をコメントアウトまたは削除
            /*
            const profileIcon = document.createElement('img');
            profileIcon.classList.add('profile-icon');
            profileIcon.src = cardData.member.profileIcon;
            profileIcon.alt = `${cardData.member.name} icon`;
            profileIcon.style.borderColor = cardData.member.color;
            profileIcon.onerror = () => { profileIcon.style.display = 'none'; };
            infoDiv.appendChild(profileIcon);
            */

            const memberDetailsDiv = document.createElement('div');
            memberDetailsDiv.classList.add('member-details');
            // アイコンがなくなったので、member-details のマージンや幅を調整する必要があるかCSSで確認
            // 例: アイコン分の左マージンが不要になるなど
            // memberDetailsDiv.style.marginLeft = '0'; // もしアイコンのマージンをJSで制御していた場合

            // ★ メンバー名の生成をコメントアウトまたは削除
            /*
            const nameH3 = document.createElement('h3');
            nameH3.classList.add('member-name');
            nameH3.textContent = cardData.member.name;
            memberDetailsDiv.appendChild(nameH3);
            */

            const quoteP = document.createElement('p');
            quoteP.classList.add('member-quote');
            quoteP.textContent = cardData.serif;
            memberDetailsDiv.appendChild(quoteP); // セリフは表示

            // memberDetailsDiv に quoteP があれば infoDiv に追加
            if (memberDetailsDiv.hasChildNodes()) {
                infoDiv.appendChild(memberDetailsDiv);
            }

            // infoDiv に何かしら要素が追加された場合のみ cardDiv に infoDiv を追加
            if (infoDiv.hasChildNodes()) {
                cardDiv.appendChild(infoDiv);
            }
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

    moveCardDuringSwipe(cardElement, deltaX, deltaY, rotation) {
        if (!cardElement) return; cardElement.classList.add('dragging-card');
        cardElement.style.transform = `translate(${deltaX}px, ${deltaY}px) rotate(${rotation}deg)`;
    }
    toggleSwipeOverlay(cardElement, swipeDirection) {
        if (!cardElement) return; const likeOverlay = cardElement.querySelector('.like-overlay'); const nopeOverlay = cardElement.querySelector('.nope-overlay');
        if (likeOverlay) { likeOverlay.style.display = swipeDirection === 'like' ? 'block' : 'none'; if (swipeDirection === 'like') likeOverlay.classList.add('visible'); else likeOverlay.classList.remove('visible'); }
        if (nopeOverlay) { nopeOverlay.style.display = swipeDirection === 'nope' ? 'block' : 'none'; if (swipeDirection === 'nope') nopeOverlay.classList.add('visible'); else nopeOverlay.classList.remove('visible'); }
    }
    animateCardOut(cardElement, direction, onComplete) {
        if (!cardElement) return; cardElement.classList.remove('dragging-card');
        const moveX = direction === 'right' ? window.innerWidth * 1.2 : -window.innerWidth * 1.2; const rotation = direction === 'right' ? 45 : -45;
        cardElement.style.transition = `transform ${this.config.swipe.animationSpeed || 300}ms ease-in`;
        cardElement.style.transform = `translate(${moveX}px, ${Math.random() * 100 - 50}px) rotate(${rotation}deg)`; cardElement.style.opacity = '0';
        setTimeout(() => { if (onComplete) onComplete(); }, this.config.swipe.animationSpeed || 300);
    }
    resetCardPosition(cardElement) {
        if (!cardElement) return; cardElement.classList.remove('dragging-card'); let originalClass = '';
        for(let i=0; i < this.MAX_CARDS_IN_STACK; i++){ if(cardElement.classList.contains(`card-${i}`)){ originalClass = `card-${i}`; break; } }
        cardElement.style.transition = `transform ${this.config.swipe.animationSpeed / 2 || 150}ms ease-out`;
        if (originalClass === 'card-0') { cardElement.style.transform = 'translateY(0) scale(1) rotate(0deg)'; }
        else if (originalClass === 'card-1') { cardElement.style.transform = 'translateY(20px) scale(0.95) rotate(0deg)'; }
        else if (originalClass === 'card-2') { cardElement.style.transform = 'translateY(40px) scale(0.90) rotate(0deg)'; }
        else if (originalClass === 'card-3') { cardElement.style.transform = 'translateY(60px) scale(0.85) rotate(0deg)'; }
        else { cardElement.style.transform = 'translateY(0) scale(1) rotate(0deg)'; }
        this.toggleSwipeOverlay(cardElement, null);
        setTimeout(() => { if (cardElement) cardElement.style.transition = ''; }, this.config.swipe.animationSpeed / 2 || 150);
    }

    updateStoryProgressBar(member, currentImageIndex = 0, totalImages = 1) {
        if (!this.storyProgressBar || !member) return; this.storyProgressBar.innerHTML = ''; if (totalImages <= 0) totalImages = 1;
        for (let i = 0; i < totalImages; i++) { const segment = document.createElement('div'); segment.classList.add('segment'); if (i === currentImageIndex) { segment.classList.add('active'); } this.storyProgressBar.appendChild(segment); }
    }
    updateFeverGauge(percentage, color) {
        this.currentFeverGaugeValue = percentage; if (!this.feverGauge) return;
        this.feverGauge.style.width = `${percentage}%`; if (color) { const gaugeColor = this.config.fever?.gaugeColor || color; this.feverGauge.style.backgroundColor = gaugeColor; }
    }
    showNoMoreCardsMessage() {
        if (!this.cardStackArea) return; this.cardStackArea.innerHTML = '<p>表示できるカードがありません。<br>設定を確認するか、アプリをリロードしてください。</p>';
        document.body.style.backgroundColor = '#333'; if (this.storyProgressBar) this.storyProgressBar.innerHTML = ''; if (this.feverGauge) this.feverGauge.style.width = '0%';
    }
    updateAppBackground(color) { if (color) { document.body.style.backgroundColor = color; } }
    openSettingsModal(members, currentWeights) {
        if (!this.settingsModalOverlay || !this.memberWeightsSettingsDiv) return; this.memberWeightsSettingsDiv.innerHTML = '';
        members.forEach(member => { const memberSettingDiv = document.createElement('div'); memberSettingDiv.classList.add('member-weight-setting'); const label = document.createElement('label'); label.setAttribute('for', `weight-${member.id}`); label.textContent = `${member.name}: `; memberSettingDiv.appendChild(label); const slider = document.createElement('input'); slider.type = 'range'; slider.id = `weight-${member.id}`; slider.name = `weight-${member.id}`; slider.min = '0'; slider.max = '5'; slider.step = '1'; slider.value = currentWeights[member.id] !== undefined ? currentWeights[member.id] : (this.config.defaultMemberWeight || 1); slider.dataset.memberId = member.id; const valueSpan = document.createElement('span'); valueSpan.id = `weight-value-${member.id}`; valueSpan.textContent = slider.value; slider.oninput = () => { valueSpan.textContent = slider.value; }; memberSettingDiv.appendChild(slider); memberSettingDiv.appendChild(valueSpan); this.memberWeightsSettingsDiv.appendChild(memberSettingDiv); });
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
