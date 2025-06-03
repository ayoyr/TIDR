// ui_handler.js (全文・画像比率調整・メンバーカラー縁取り対応)

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
            // ★ メンバーカラーをCSSカスタムプロパティとして設定
            cardDiv.style.setProperty('--member-color', cardData.member.color || '#888');
        }

        // ★ 画像表示用のコンテナを作成
        const imageContainer = document.createElement('div');
        imageContainer.classList.add('image-container');

        const img = document.createElement('img');
        img.classList.add('main-image');
        img.alt = cardData.member ? cardData.member.name : 'Card Image';
        // img.src は onload の中で設定するか、先に設定して onload で判定

        img.onload = () => {
            // 画像の元のサイズを取得
            const naturalWidth = img.naturalWidth;
            const naturalHeight = img.naturalHeight;

            // コンテナのサイズを取得 (CSSで定義されたサイズに依存)
            // 正確なコンテナサイズを取得するには、一度DOMに追加されて計算された値を見る必要がある場合もあるが、
            // ここではCSSで定義された最大サイズや、親要素のサイズを基準にする。
            // 簡単のため、カードの縦横比を基準にする (CSSの.cardのmax-width, max-heightなどから想定)
            // より正確には imageContainer.offsetWidth, imageContainer.offsetHeight を使うべきだが、
            // DOMに追加される前だと0になるので、ここではアスペクト比の比較に留める。

            const imageAspectRatio = naturalWidth / naturalHeight;

            // CSSクラスをリセット
            imageContainer.className = 'image-container'; // 基本クラスのみに
            img.style.objectFit = 'contain'; // デフォルト
            img.style.width = 'auto';
            img.style.height = 'auto';
            // object-position のリセットも必要に応じて

            // ご提示のパターンに基づいてスタイルを決定 (簡易的な判定ロジック)
            // カードの表示エリアはおおよそ縦長 (例: 340x520px -> 比率 約0.65)
            const cardDisplayAreaAspectRatio = 340 / 520; // 仮

            if (naturalHeight > naturalWidth) { // 縦長の画像
                // パターン1: 上下を切る (横幅100%)
                imageContainer.classList.add('image-aspect-portrait-cover');
                // img.style.width = '100%'; // CSSクラスで対応
                // img.style.height = 'auto';
                // img.style.objectFit = 'cover'; // CSSクラスで対応
            } else { // 横長または正方形の画像
                if (imageAspectRatio < 1.1 && imageAspectRatio > 0.9) { // ほぼ正方形に近い
                     // パターン3に似た処理: 左右カットで正方形、上下に白余白 (のイメージ)
                     // または、コンテナいっぱいに表示 (object-fit:cover)
                    imageContainer.classList.add('image-aspect-square-pillarbox', 'bg-white'); // 仮のクラス
                    // img.style.height = '100%'; // CSSクラスで対応
                    // img.style.width = 'auto';
                    // img.style.objectFit = 'cover'; // CSSクラスで対応
                } else if (imageAspectRatio > cardDisplayAreaAspectRatio) { // カード表示エリアより横長の画像
                    // パターン2 or 4: 横長、余白の色やカットの仕方を調整
                    // ここでは、ご提示の「下に余白(横幅100%) 下の余白は黒」を優先してみる
                    imageContainer.classList.add('image-aspect-landscape-letterbox', 'bg-black');
                    // img.style.width = '100%'; // CSSクラスで対応
                    // img.style.height = 'auto';
                    // imageContainer.style.alignItems = 'flex-start'; // CSSクラスで対応
                } else {
                    // それ以外の横長 (カード表示エリアよりは縦長だが、画像自体は横長)
                    // ここもパターン2に近いかもしれない
                    imageContainer.classList.add('image-aspect-landscape-letterbox', 'bg-black');
                }
            }
            // より詳細な分岐はユーザー提供の図の条件を正確に数値化する必要がある
        };
        img.onerror = () => {
            console.warn(`画像の読み込みに失敗: ${cardData.imagePath}。プレースホルダーを表示します。`);
            img.src = 'images/placeholder.png'; // エラー時もonloadが呼ばれるように、再度srcを設定するか検討
        };
        img.src = cardData.imagePath; // src設定をonload定義の後に移動

        imageContainer.appendChild(img);
        cardDiv.appendChild(imageContainer);


        if (cardData.member) {
            const infoDiv = document.createElement('div');
            infoDiv.classList.add('card-info');
            const profileIcon = document.createElement('img');
            profileIcon.classList.add('profile-icon');
            profileIcon.src = cardData.member.profileIcon;
            profileIcon.alt = `${cardData.member.name} icon`;
            profileIcon.style.borderColor = cardData.member.color;
            profileIcon.onerror = () => { profileIcon.style.display = 'none'; };
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

    updateCardStack(cardDataArray) { /* 変更なし (前回の全文コード参照) */
        if (!this.cardStackArea) return;
        this.cardStackArea.innerHTML = ''; this.cardElements = [];
        if (!cardDataArray || cardDataArray.length === 0) { this.showNoMoreCardsMessage(); return; }
        for (let i = 0; i < Math.min(cardDataArray.length, this.MAX_CARDS_IN_STACK); i++) {
            const cardData = cardDataArray[i]; if (!cardData) continue;
            const cardElement = this.createCardElement(cardData);
            this.cardElements.push(cardElement); this.cardStackArea.appendChild(cardElement);
            cardElement.className = 'card'; // クラスをリセットしてから付与
            cardElement.classList.add(`card-${i}`);
            if (i === 0) {
                document.dispatchEvent(new CustomEvent('cardElementReady', { detail: { cardElement, cardData } }));
                if(cardData.member) { // member が存在する場合のみ更新
                    this.updateStoryProgressBar(cardData.member, cardData.currentImageIndex, cardData.totalImagesInMember);
                    this.updateFeverGauge(this.currentFeverGaugeValue || 0, cardData.member.color);
                }
            }
        }
        if (this.cardElements.length === 0) { this.showNoMoreCardsMessage(); }
    }

    moveCardDuringSwipe(cardElement, deltaX, deltaY, rotation) { /* 変更なし (前回の全文コード参照) */
        if (!cardElement) return; cardElement.classList.add('dragging-card');
        cardElement.style.transform = `translate(${deltaX}px, ${deltaY}px) rotate(${rotation}deg)`;
    }
    toggleSwipeOverlay(cardElement, swipeDirection) { /* 変更なし (前回の全文コード参照) */
        if (!cardElement) return; const likeOverlay = cardElement.querySelector('.like-overlay'); const nopeOverlay = cardElement.querySelector('.nope-overlay');
        if (likeOverlay) { likeOverlay.style.display = swipeDirection === 'like' ? 'block' : 'none'; if (swipeDirection === 'like') likeOverlay.classList.add('visible'); else likeOverlay.classList.remove('visible'); }
        if (nopeOverlay) { nopeOverlay.style.display = swipeDirection === 'nope' ? 'block' : 'none'; if (swipeDirection === 'nope') nopeOverlay.classList.add('visible'); else nopeOverlay.classList.remove('visible'); }
    }
    animateCardOut(cardElement, direction, onComplete) { /* 変更なし (前回の全文コード参照) */
        if (!cardElement) return; cardElement.classList.remove('dragging-card');
        const moveX = direction === 'right' ? window.innerWidth * 1.2 : -window.innerWidth * 1.2; const rotation = direction === 'right' ? 45 : -45;
        cardElement.style.transition = `transform ${this.config.swipe.animationSpeed || 300}ms ease-in`;
        cardElement.style.transform = `translate(${moveX}px, ${Math.random() * 100 - 50}px) rotate(${rotation}deg)`; cardElement.style.opacity = '0';
        setTimeout(() => { if (onComplete) onComplete(); }, this.config.swipe.animationSpeed || 300);
    }
    resetCardPosition(cardElement) { /* 変更なし (前回の全文コード参照、ただし改善の余地あり) */
        if (!cardElement) return; cardElement.classList.remove('dragging-card'); let originalClass = '';
        for(let i=0; i < this.MAX_CARDS_IN_STACK; i++){ if(cardElement.classList.contains(`card-${i}`)){ originalClass = `card-${i}`; break; } }
        cardElement.style.transition = `transform ${this.config.swipe.animationSpeed / 2 || 150}ms ease-out`;
        if (originalClass === 'card-0') { cardElement.style.transform = 'translateY(0) scale(1) rotate(0deg)'; }
        else if (originalClass === 'card-1') { cardElement.style.transform = 'translateY(20px) scale(0.95) rotate(0deg)'; }
        else if (originalClass === 'card-2') { cardElement.style.transform = 'translateY(40px) scale(0.90) rotate(0deg)'; }
        else if (originalClass === 'card-3') { cardElement.style.transform = 'translateY(60px) scale(0.85) rotate(0deg)'; }
        else { cardElement.style.transform = 'translateY(0) scale(1) rotate(0deg)'; } // Fallback
        this.toggleSwipeOverlay(cardElement, null);
        setTimeout(() => { if (cardElement) cardElement.style.transition = ''; }, this.config.swipe.animationSpeed / 2 || 150);
    }

    updateStoryProgressBar(member, currentImageIndex = 0, totalImages = 1) { /* 変更なし (前回の全文コード参照) */
        if (!this.storyProgressBar || !member) return; this.storyProgressBar.innerHTML = ''; if (totalImages <= 0) totalImages = 1;
        for (let i = 0; i < totalImages; i++) { const segment = document.createElement('div'); segment.classList.add('segment'); if (i === currentImageIndex) { segment.classList.add('active'); } this.storyProgressBar.appendChild(segment); }
    }
    updateFeverGauge(percentage, color) { /* 変更なし (前回の全文コード参照) */
        this.currentFeverGaugeValue = percentage; if (!this.feverGauge) return;
        this.feverGauge.style.width = `${percentage}%`; if (color) { const gaugeColor = this.config.fever?.gaugeColor || color; this.feverGauge.style.backgroundColor = gaugeColor; }
    }
    showNoMoreCardsMessage() { /* 変更なし (前回の全文コード参照) */
        if (!this.cardStackArea) return; this.cardStackArea.innerHTML = '<p>表示できるカードがありません。<br>設定を確認するか、アプリをリロードしてください。</p>';
        document.body.style.backgroundColor = '#333'; if (this.storyProgressBar) this.storyProgressBar.innerHTML = ''; if (this.feverGauge) this.feverGauge.style.width = '0%';
    }
    updateAppBackground(color) { /* 変更なし (前回の全文コード参照) */ if (color) { document.body.style.backgroundColor = color; } }
    openSettingsModal(members, currentWeights) { /* 変更なし (前回の全文コード参照) */
        if (!this.settingsModalOverlay || !this.memberWeightsSettingsDiv) return; this.memberWeightsSettingsDiv.innerHTML = '';
        members.forEach(member => { const memberSettingDiv = document.createElement('div'); memberSettingDiv.classList.add('member-weight-setting'); const label = document.createElement('label'); label.setAttribute('for', `weight-${member.id}`); label.textContent = `${member.name}: `; memberSettingDiv.appendChild(label); const slider = document.createElement('input'); slider.type = 'range'; slider.id = `weight-${member.id}`; slider.name = `weight-${member.id}`; slider.min = '0'; slider.max = '5'; slider.step = '1'; slider.value = currentWeights[member.id] !== undefined ? currentWeights[member.id] : (this.config.defaultMemberWeight || 1); slider.dataset.memberId = member.id; const valueSpan = document.createElement('span'); valueSpan.id = `weight-value-${member.id}`; valueSpan.textContent = slider.value; slider.oninput = () => { valueSpan.textContent = slider.value; }; memberSettingDiv.appendChild(slider); memberSettingDiv.appendChild(valueSpan); this.memberWeightsSettingsDiv.appendChild(memberSettingDiv); });
        this.settingsModalOverlay.classList.add('visible');
    }
    closeSettingsModal() { /* 変更なし (前回の全文コード参照) */ if (this.settingsModalOverlay) { this.settingsModalOverlay.classList.remove('visible'); } }
    getMemberWeightsFromModal() { /* 変更なし (前回の全文コード参照) */
        const weights = {}; if (!this.memberWeightsSettingsDiv) return weights;
        const sliders = this.memberWeightsSettingsDiv.querySelectorAll('input[type="range"]');
        sliders.forEach(slider => { weights[slider.dataset.memberId] = parseInt(slider.value, 10); });
        return weights;
    }
}
