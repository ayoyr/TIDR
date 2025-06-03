// card_manager.js (スワイプ対応の変更箇所・追加箇所)

class CardManager {
    constructor(config, uiHandler, dataProvider, feverHandler) {
        this.config = config;
        this.uiHandler = uiHandler;
        this.dataProvider = dataProvider;
        this.feverHandler = feverHandler;

        this.allMembers = this.dataProvider.getAllMembers();
        this.currentCardElement = null; // 現在操作対象のカードDOM要素
        this.currentCardData = null;    // 現在表示中のカードのデータ
        // this.nextCardDataBuffer = []; // 変更なし
        this.isFeverMode = false;
        this.shownImageHistory = new Set();

        // ドラッグ状態管理用
        this.isDragging = false;
        this.startX = 0;
        this.startY = 0;
        this.currentX = 0;
        this.currentY = 0;

        // UIHandlerからカード準備完了通知を受け取るリスナー
        document.addEventListener('cardElementReady', (event) => {
            const { cardElement, cardData } = event.detail;
            this.currentCardElement = cardElement;
            this.currentCardData = cardData; // スワイプされたカードの情報を保持
            this.addSwipeListeners(cardElement);
        });
    }

    // ユーザー設定を適用 (変更なし)
    applyUserSettings(settings) {
        if (settings && settings.memberWeights) {
            this.updateMemberWeights(settings.memberWeights);
        }
    }
    updateMemberWeights(newWeights) {
        this.allMembers.forEach(member => {
            if (newWeights[member.id] !== undefined) {
                member.weight = newWeights[member.id];
            } else {
                member.weight = this.config.defaultMemberWeight || 1;
            }
        });
        // console.log("CardManager: Member weights updated");
    }

    // 初期カードの準備 (変更なし)
    async prepareInitialCards() {
        // currentCardData は getNextCard でセットされるので、ここでは直接セットしない
        // console.log("Initial card to be prepared by getNextCard");
    }

    // 次に表示するカードのデータを取得 (変更なし)
    getNextCard(offset = 0) {
        let cardToReturn;
        if (offset === 0) {
            cardToReturn = this.selectNextCardLogic();
            // this.currentCardData は cardElementReady で設定されるのでここでは不要
        } else {
            cardToReturn = this.selectNextCardLogic(true); // 裏に見せるヒント用
        }
        return cardToReturn;
    }


    // 次に表示するカードを選択するロジック (変更なし)
    selectNextCardLogic(isHint = false) {
        if (this.allMembers.length === 0) return null;
        let selectedMember;
        if (!this.isFeverMode) {
            const weightedMembers = [];
            this.allMembers.forEach(member => {
                if (member.weight > 0) {
                    for (let i = 0; i < member.weight; i++) weightedMembers.push(member);
                }
            });
            if (weightedMembers.length === 0) {
                selectedMember = this.allMembers.length > 0 ? this.allMembers[Math.floor(Math.random() * this.allMembers.length)] : null;
            } else {
                selectedMember = weightedMembers[Math.floor(Math.random() * weightedMembers.length)];
            }
        } else {
            // フィーバーモードロジック (FeverHandlerと連携) - 今回は仮
            selectedMember = this.allMembers[Math.floor(Math.random() * this.allMembers.length)];
        }
        if (!selectedMember) return null;

        const imagePaths = this.dataProvider.getMemberImagePaths(selectedMember.id, 'ero');
        if (imagePaths.length === 0) {
            return {
                member: selectedMember,
                imagePath: 'images/placeholder.png',
                serif: `${selectedMember.name}の画像がありません。`,
                currentImageIndex: 0, totalImagesInMember: 0,
            };
        }
        let randomImagePath, selectedImageIndex, attempts = 0;
        const maxAttempts = imagePaths.length * 2;
        do {
            selectedImageIndex = Math.floor(Math.random() * imagePaths.length);
            randomImagePath = imagePaths[selectedImageIndex];
            attempts++;
        } while (this.shownImageHistory.has(`${selectedMember.id}-${randomImagePath}`) && attempts < maxAttempts && this.shownImageHistory.size < imagePaths.length);
        if (!isHint) {
            this.shownImageHistory.add(`${selectedMember.id}-${randomImagePath}`);
            if (this.shownImageHistory.size > this.allMembers.length * 3) { // 履歴サイズ調整
                 const oldest = this.shownImageHistory.values().next().value;
                 this.shownImageHistory.delete(oldest);
            }
        }
        const serif = this.dataProvider.getRandomSerif(selectedMember.id);
        return {
            member: selectedMember, imagePath: randomImagePath, serif: serif,
            currentImageIndex: selectedImageIndex, totalImagesInMember: imagePaths.length,
        };
    }


    // --- スワイプイベントリスナーと処理ロジック ---
    addSwipeListeners(cardElement) {
        if (!cardElement) return;
        // console.log("Adding swipe listeners to:", cardElement);
        cardElement.addEventListener('mousedown', this.handleDragStart.bind(this));
        cardElement.addEventListener('touchstart', this.handleDragStart.bind(this), { passive: true }); // passive:true でスクロールブロック警告を回避

        // mousemove と mouseup は document に対して設定し、カード外にマウスが行っても追跡する
        document.addEventListener('mousemove', this.handleDragMove.bind(this));
        document.addEventListener('mouseup', this.handleDragEnd.bind(this));
        document.addEventListener('mouseleave', this.handleDragEnd.bind(this)); // カード外でマウスアップされた場合も考慮

        document.addEventListener('touchmove', this.handleDragMove.bind(this), { passive: false }); // passive:false でスワイプ中のスクロールを止める
        document.addEventListener('touchend', this.handleDragEnd.bind(this));
        document.addEventListener('touchcancel', this.handleDragEnd.bind(this));
    }

    removeSwipeListeners(cardElement) { // カードが消える時などにリスナーを解除
        if (!cardElement) return;
        // console.log("Removing swipe listeners from:", cardElement);
        cardElement.removeEventListener('mousedown', this.handleDragStart.bind(this));
        cardElement.removeEventListener('touchstart', this.handleDragStart.bind(this));

        document.removeEventListener('mousemove', this.handleDragMove.bind(this));
        document.removeEventListener('mouseup', this.handleDragEnd.bind(this));
        document.removeEventListener('mouseleave', this.handleDragEnd.bind(this));

        document.removeEventListener('touchmove', this.handleDragMove.bind(this));
        document.removeEventListener('touchend', this.handleDragEnd.bind(this));
        document.removeEventListener('touchcancel', this.handleDragEnd.bind(this));
        this.currentCardElement = null; // リスナー解除時にクリア
    }


    handleDragStart(event) {
        if (!this.currentCardElement || (event.target !== this.currentCardElement && !this.currentCardElement.contains(event.target))) {
            // console.log("DragStart: Target is not the current card or drag already in progress elsewhere.");
            return;
        }
        // console.log("DragStart event on card:", this.currentCardData.member.name, event.type);
        this.isDragging = true;
        // pageX/Y はタッチイベントとマウスイベントで共通して使える
        this.startX = event.pageX || event.touches[0].pageX;
        this.startY = event.pageY || event.touches[0].pageY;
        this.currentCardElement.style.transition = 'none'; // ドラッグ開始時はトランジションをきる
    }

    handleDragMove(event) {
        if (!this.isDragging || !this.currentCardElement) return;
        event.preventDefault(); // 特にtouchmoveではスクロールを防ぐ

        this.currentX = event.pageX || event.touches[0].pageX;
        this.currentY = event.pageY || event.touches[0].pageY;

        const deltaX = this.currentX - this.startX;
        const deltaY = this.currentY - this.startY; // Y方向の移動も取得（傾きなどに使える）

        // X方向の移動量に基づいてカードを傾ける
        const rotationStrength = this.config.swipe.rotationFactor || 0.05;
        const rotation = deltaX * rotationStrength;

        this.uiHandler.moveCardDuringSwipe(this.currentCardElement, deltaX, deltaY, rotation);

        // スワイプ方向に応じてオーバーレイを表示
        const screenWidth = window.innerWidth;
        const decisionThreshold = screenWidth * (this.config.swipe.thresholdRatio || 0.25) * 0.5; // 早めにオーバーレイを出すための閾値

        if (deltaX > decisionThreshold) {
            this.uiHandler.toggleSwipeOverlay(this.currentCardElement, 'like');
        } else if (deltaX < -decisionThreshold) {
            this.uiHandler.toggleSwipeOverlay(this.currentCardElement, 'nope');
        } else {
            this.uiHandler.toggleSwipeOverlay(this.currentCardElement, null);
        }
    }

    handleDragEnd(event) {
        if (!this.isDragging || !this.currentCardElement) return;
        // console.log("DragEnd event", event.type);
        this.isDragging = false;

        const deltaX = this.currentX - this.startX;
        const screenWidth = window.innerWidth;
        const swipeThreshold = screenWidth * (this.config.swipe.thresholdRatio || 0.25);

        let swipeDirection = null;

        if (deltaX > swipeThreshold) {
            swipeDirection = 'right';
        } else if (deltaX < -swipeThreshold) {
            swipeDirection = 'left';
        }

        if (swipeDirection) {
            // console.log(`Swipe detected: ${swipeDirection}`);
            this.uiHandler.animateCardOut(this.currentCardElement, swipeDirection, () => {
                this.handleSwipe(swipeDirection); // アニメーション完了後に実際のロジック処理
            });
        } else {
            // console.log("Swipe threshold not met, resetting card position.");
            this.uiHandler.resetCardPosition(this.currentCardElement);
        }
        // reset startX, currentX etc.
        this.startX = 0; this.startY = 0; this.currentX = 0; this.currentY = 0;
    }


    // スワイプ処理 (カードが画面外にアニメーションされた後に呼ばれる)
    handleSwipe(direction) {
        // console.log(`Processing swipe: ${direction} for card:`, this.currentCardData.member.name);

        // 次のカード表示などのために、現在のカードのリスナーを解除
        if(this.currentCardElement) { //念のためチェック
            this.removeSwipeListeners(this.currentCardElement);
        }

        // カスタムイベントを発行してapp.jsに通知
        const swipeEvent = new CustomEvent('cardSwiped', {
            detail: {
                swipedCardData: this.currentCardData, // スワイプされたカードの情報
                swipeDirection: direction
            }
        });
        document.dispatchEvent(swipeEvent);
        this.currentCardData = null; // 消費したのでクリア
    }

    setFeverMode(isFever) { // 変更なし
        this.isFeverMode = isFever;
        this.shownImageHistory.clear();
        // console.log(`CardManager: Fever mode ${isFever ? 'ON' : 'OFF'}`);
    }
}
