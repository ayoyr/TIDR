// card_manager.js (全文・4枚カードスタック対応)

class CardManager {
    constructor(config, uiHandler, dataProvider, feverHandler) {
        this.config = config;
        this.uiHandler = uiHandler;
        this.dataProvider = dataProvider;
        this.feverHandler = feverHandler;

        this.allMembers = this.dataProvider.getAllMembers();
        this.currentCardElement = null;
        // this.currentCardData は不要に。代わりに cardStackData を使う
        this.cardStackData = []; // 現在表示中のカードデータの配列 (最大4つ、手前から奥の順)

        this.isFeverMode = false;
        this.shownImageHistory = new Set();

        this.isDragging = false;
        this.startX = 0; this.startY = 0;
        this.currentX = 0; this.currentY = 0;
        this.swipeInProgress = false;

        document.addEventListener('cardElementReady', (event) => {
            const { cardElement, cardData } = event.detail;
            if (this.cardStackData.length > 0 && cardData.member.id === this.cardStackData[0].member.id) {
                 this.currentCardElement = cardElement; // 一番手前のカードを操作対象に
                 this.addSwipeListeners(cardElement);
            }
            this.swipeInProgress = false;
            // console.log("CardManager: cardElementReady, swipeInProgress set to false.");
        });
    }

    applyUserSettings(settings) { /* 変更なし (前回の全文コード参照) */
        if (settings && settings.memberWeights) { this.updateMemberWeights(settings.memberWeights); }
    }
    updateMemberWeights(newWeights) { /* 変更なし (前回の全文コード参照) */
        this.allMembers.forEach(member => {
            if (newWeights[member.id] !== undefined) { member.weight = newWeights[member.id]; }
            else { member.weight = this.config.defaultMemberWeight !== undefined ? this.config.defaultMemberWeight : 1; }
        });
    }

    // カードスタックを初期化または更新する
    async initializeCardStack() {
        this.cardStackData = [];
        for (let i = 0; i < this.uiHandler.MAX_CARDS_IN_STACK; i++) {
            const cardData = this.selectNextCardLogic(i > 0); // 奥のカードはヒント扱い（履歴に影響しないなど）
            if (cardData) {
                this.cardStackData.push(cardData);
            } else {
                break; // もう取得できるカードがない
            }
        }
        this.uiHandler.updateCardStack(this.cardStackData);
    }


    // スワイプ後にカードスタックを更新する
    async updateStackAfterSwipe() {
        if (this.cardStackData.length > 0) {
            this.cardStackData.shift(); // スワイプされた一番手前のカードをデータからも削除
        }

        // 足りない分を補充
        while (this.cardStackData.length < this.uiHandler.MAX_CARDS_IN_STACK) {
            const nextCardData = this.selectNextCardLogic(this.cardStackData.length > 0); // 補充するカードは奥にある想定
            if (nextCardData) {
                this.cardStackData.push(nextCardData);
            } else {
                break; // もう取得できるカードがない
            }
        }
        this.uiHandler.updateCardStack(this.cardStackData);
    }


    selectNextCardLogic(isHint = false) { /* 変更なし (前回の全文コード参照) */
        if (!this.allMembers || this.allMembers.length === 0) { return null; }
        let selectedMember;
        if (!this.isFeverMode) {
            const weightedMembers = []; this.allMembers.forEach(member => { if (member.weight > 0) { for (let i = 0; i < member.weight; i++) weightedMembers.push(member); } });
            if (weightedMembers.length === 0) { selectedMember = this.allMembers.length > 0 ? this.allMembers[Math.floor(Math.random() * this.allMembers.length)] : null; }
            else { selectedMember = weightedMembers[Math.floor(Math.random() * weightedMembers.length)]; }
        } else { selectedMember = this.allMembers.length > 0 ? this.allMembers[Math.floor(Math.random() * this.allMembers.length)] : null; }
        if (!selectedMember) { return null; }
        const imagePaths = this.dataProvider.getMemberImagePaths(selectedMember.id, 'ero');
        if (!imagePaths || imagePaths.length === 0 || imagePaths[0] === 'images/placeholder.png') {
            return { member: selectedMember, imagePath: 'images/placeholder.png', serif: this.dataProvider.getRandomSerif(selectedMember.id) || `${selectedMember.name}の画像がありません。`, currentImageIndex: 0, totalImagesInMember: 0, };
        }
        let randomImagePath, selectedImageIndex = 0, attempts = 0; const maxAttempts = imagePaths.length * 2;
        do { selectedImageIndex = Math.floor(Math.random() * imagePaths.length); randomImagePath = imagePaths[selectedImageIndex]; attempts++; }
        while (this.shownImageHistory.has(`${selectedMember.id}-${randomImagePath}`) && attempts < maxAttempts && this.shownImageHistory.size < imagePaths.length);
        if (!isHint) { this.shownImageHistory.add(`${selectedMember.id}-${randomImagePath}`); if (this.shownImageHistory.size > (this.allMembers.length * 3 || 10)) { const oldest = this.shownImageHistory.values().next().value; this.shownImageHistory.delete(oldest); } }
        const serif = this.dataProvider.getRandomSerif(selectedMember.id);
        return { member: selectedMember, imagePath: randomImagePath, serif: serif, currentImageIndex: selectedImageIndex, totalImagesInMember: imagePaths.length, };
    }


    addSwipeListeners(cardElement) { /* 変更なし (前回の全文コード参照) */
        if (!cardElement) return;
        cardElement.addEventListener('mousedown', this.handleDragStart.bind(this)); cardElement.addEventListener('touchstart', this.handleDragStart.bind(this), { passive: true });
        document.addEventListener('mousemove', this.handleDragMove.bind(this)); document.addEventListener('mouseup', this.handleDragEnd.bind(this));
        document.addEventListener('mouseleave', this.handleDragEnd.bind(this));
        document.addEventListener('touchmove', this.handleDragMove.bind(this), { passive: false }); document.addEventListener('touchend', this.handleDragEnd.bind(this)); document.addEventListener('touchcancel', this.handleDragEnd.bind(this));
    }
    removeSwipeListeners(cardElement) { /* 変更なし (前回の全文コード参照、ただし実際にはあまり使われないかも) */
        if (!cardElement) return;
        cardElement.removeEventListener('mousedown', this.handleDragStart.bind(this)); cardElement.removeEventListener('touchstart', this.handleDragStart.bind(this));
    }

    handleDragStart(event) { /* 変更なし (前回の全文コード参照) */
        if (this.swipeInProgress || !this.currentCardElement) return;
        if (event.target !== this.currentCardElement && !this.currentCardElement.contains(event.target)) { return; }
        this.isDragging = true; this.startX = event.pageX || event.touches[0].pageX; this.startY = event.pageY || event.touches[0].pageY;
        if (this.currentCardElement) { this.currentCardElement.style.transition = 'none'; }
    }
    handleDragMove(event) { /* 変更なし (前回の全文コード参照) */
        if (!this.isDragging || !this.currentCardElement) return; event.preventDefault();
        this.currentX = event.pageX || event.touches[0].pageX; this.currentY = event.pageY || event.touches[0].pageY;
        const deltaX = this.currentX - this.startX; const deltaY = this.currentY - this.startY;
        const rotation = deltaX * (this.config.swipe.rotationFactor || 0.05);
        this.uiHandler.moveCardDuringSwipe(this.currentCardElement, deltaX, deltaY, rotation);
        const screenWidth = window.innerWidth; const overlayThreshold = screenWidth * (this.config.swipe.thresholdRatio || 0.25) * 0.4;
        if (deltaX > overlayThreshold) { this.uiHandler.toggleSwipeOverlay(this.currentCardElement, 'like'); }
        else if (deltaX < -overlayThreshold) { this.uiHandler.toggleSwipeOverlay(this.currentCardElement, 'nope'); }
        else { this.uiHandler.toggleSwipeOverlay(this.currentCardElement, null); }
    }

    handleDragEnd(event) { /* 変更なし (前回の全文コード参照) */
        if (!this.isDragging || !this.currentCardElement || this.swipeInProgress) {
            if (!this.isDragging && this.currentCardElement && !this.swipeInProgress) { this.uiHandler.resetCardPosition(this.currentCardElement); }
            return;
        }
        this.isDragging = false;
        const deltaX = this.currentX - this.startX; const screenWidth = window.innerWidth; const swipeThreshold = screenWidth * (this.config.swipe.thresholdRatio || 0.25);
        let swipeDirection = null;
        if (deltaX > swipeThreshold) { swipeDirection = 'right'; } else if (deltaX < -swipeThreshold) { swipeDirection = 'left'; }
        if (swipeDirection) {
            this.swipeInProgress = true;
            this.uiHandler.animateCardOut(this.currentCardElement, swipeDirection, () => {
                this.handleSwipe(swipeDirection);
            });
        } else { this.uiHandler.resetCardPosition(this.currentCardElement); }
        this.startX = 0; this.startY = 0; this.currentX = 0; this.currentY = 0;
    }

    handleSwipe(direction) {
        const swipedCardDataFromStack = this.cardStackData.length > 0 ? this.cardStackData[0] : null;
        if (!swipedCardDataFromStack) {
            console.warn("CardManager.handleSwipe: No card data in stack to swipe. Aborting.");
            this.swipeInProgress = false; // スワイプ処理が終わったのでフラグ解除
            return;
        }
        // console.log(`CardManager: Processing swipe: ${direction} for card:`, swipedCardDataFromStack.member.name);

        // currentCardElement はアニメーション後に不要になるので参照をクリア (DOM自体はUIHandlerが管理)
        // イベントリスナーも、新しい一番手前のカードに再設定されるので、古いものは気にしなくて良い
        this.currentCardElement = null;

        const swipeEvent = new CustomEvent('cardSwiped', {
            detail: {
                swipedCardData: swipedCardDataFromStack, // スタックの先頭のデータを渡す
                swipeDirection: direction
            }
        });
        document.dispatchEvent(swipeEvent);
        // swipeInProgress の解除は、新しいカードスタックが表示され、
        // 新しいアクティブカードにリスナーが設定された後 ('cardElementReady'イベント) で行う
    }

    setFeverMode(isFever) { /* 変更なし (前回の全文コード参照) */
        this.isFeverMode = isFever; this.shownImageHistory.clear();
    }
}
