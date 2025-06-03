// card_manager.js (全文・エラー修正版)

class CardManager {
    constructor(config, uiHandler, dataProvider, feverHandler) {
        this.config = config;
        this.uiHandler = uiHandler;
        this.dataProvider = dataProvider;
        this.feverHandler = feverHandler;

        this.allMembers = this.dataProvider.getAllMembers();
        this.currentCardElement = null; // 現在操作対象のカードDOM要素
        this.currentCardData = null;    // 現在表示中のカードのデータ
        this.isFeverMode = false;
        this.shownImageHistory = new Set();

        // ドラッグ状態管理用
        this.isDragging = false;
        this.startX = 0;
        this.startY = 0;
        this.currentX = 0;
        this.currentY = 0;

        this.swipeInProgress = false; // スワイプ処理中フラグ

        // UIHandlerからカード準備完了通知を受け取るリスナー
        document.addEventListener('cardElementReady', (event) => {
            const { cardElement, cardData } = event.detail;
            this.currentCardElement = cardElement;
            this.currentCardData = cardData;
            this.addSwipeListeners(cardElement);
            this.swipeInProgress = false; // 新しいカードの準備ができたらスワイプ処理中フラグを解除
            // console.log("CardManager: cardElementReady, swipeInProgress set to false.");
        });
    }

    // ユーザー設定を適用
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
                // configにdefaultMemberWeightがない場合も考慮してフォールバック
                member.weight = this.config.defaultMemberWeight !== undefined ? this.config.defaultMemberWeight : 1;
            }
        });
        // console.log("CardManager: Member weights updated");
    }

    // 初期カードの準備 (app.jsの最初のgetNextCardで処理される)
    async prepareInitialCards() {
        // console.log("CardManager: prepareInitialCards called (no direct action, handled by getNextCard).");
    }

    // 次に表示するカードのデータを取得
    getNextCard(offset = 0) {
        let cardToReturn;
        if (offset === 0) {
            // 現在表示すべきカード
            cardToReturn = this.selectNextCardLogic();
            // this.currentCardData は cardElementReady で設定される
        } else {
            // 裏に見せるヒント用のカードなど (offset >= 1)
            // このロジックは、スタック表示の際に何枚先まで見せるかによって調整が必要
            // 今は単純に「次の次」の候補を生成する
            cardToReturn = this.selectNextCardLogic(true);
        }
        return cardToReturn;
    }


    // 次に表示するカードを選択するロジック
    selectNextCardLogic(isHint = false) {
        if (!this.allMembers || this.allMembers.length === 0) {
            console.warn("表示できるメンバーがいません (allMembers is empty or undefined)。");
            return null;
        }

        let selectedMember;
        // フィーバーモードでない場合、重み付けランダムでメンバーを選択
        if (!this.isFeverMode) {
            const weightedMembers = [];
            this.allMembers.forEach(member => {
                if (member.weight > 0) {
                    for (let i = 0; i < member.weight; i++) {
                        weightedMembers.push(member);
                    }
                }
            });

            if (weightedMembers.length === 0) {
                 console.warn("重み付けされた選択可能なメンバーがいません (all weights might be 0)。");
                 selectedMember = this.allMembers.length > 0 ? this.allMembers[Math.floor(Math.random() * this.allMembers.length)] : null;
            } else {
                selectedMember = weightedMembers[Math.floor(Math.random() * weightedMembers.length)];
            }
        } else {
            // フィーバーモード中のロジック (FeverHandlerと連携) - 今回は仮
            // TODO: Implement proper fever mode logic with feverHandler.getLikedImageMember() or similar
            selectedMember = this.allMembers.length > 0 ? this.allMembers[Math.floor(Math.random() * this.allMembers.length)] : null;
        }

        if (!selectedMember) {
            console.error("カード選択ロジック: メンバーを選択できませんでした。");
            return null;
        }

        const imagePaths = this.dataProvider.getMemberImagePaths(selectedMember.id, 'ero');
        if (!imagePaths || imagePaths.length === 0 || imagePaths[0] === 'images/placeholder.png') {
            // console.warn(`メンバー ${selectedMember.name} の 'ero' 画像が見つかりません。プレースホルダーを使用します。`);
            return {
                member: selectedMember,
                imagePath: 'images/placeholder.png',
                serif: this.dataProvider.getRandomSerif(selectedMember.id) || `${selectedMember.name}の画像がありません。`,
                currentImageIndex: 0,
                totalImagesInMember: 0,
            };
        }

        let randomImagePath;
        let selectedImageIndex = 0;
        let attempts = 0;
        const maxAttempts = imagePaths.length * 2;

        do {
            selectedImageIndex = Math.floor(Math.random() * imagePaths.length);
            randomImagePath = imagePaths[selectedImageIndex];
            attempts++;
        } while (this.shownImageHistory.has(`${selectedMember.id}-${randomImagePath}`) && attempts < maxAttempts && this.shownImageHistory.size < imagePaths.length);

        if (!isHint) { // メインカードの場合のみ履歴に追加・管理
            this.shownImageHistory.add(`${selectedMember.id}-${randomImagePath}`);
            if (this.shownImageHistory.size > (this.allMembers.length * 3 || 10)) { // 履歴サイズの上限
                 const oldest = this.shownImageHistory.values().next().value; // 最も古いものを削除 (簡易LRU)
                 this.shownImageHistory.delete(oldest);
            }
        }
        const serif = this.dataProvider.getRandomSerif(selectedMember.id);
        return {
            member: selectedMember,
            imagePath: randomImagePath,
            serif: serif,
            currentImageIndex: selectedImageIndex,
            totalImagesInMember: imagePaths.length,
        };
    }


    // --- スワイプイベントリスナーと処理ロジック ---
    addSwipeListeners(cardElement) {
        if (!cardElement) return;
        // console.log("CardManager: Adding swipe listeners to card.");
        cardElement.addEventListener('mousedown', this.handleDragStart.bind(this));
        cardElement.addEventListener('touchstart', this.handleDragStart.bind(this), { passive: true });

        document.addEventListener('mousemove', this.handleDragMove.bind(this));
        document.addEventListener('mouseup', this.handleDragEnd.bind(this));
        // mouseleave は document ではなく window や、より限定的な要素で監視するか、
        // ドラッグ中にカード外に出た場合の挙動を別途考慮する必要がある。今回は document のままとする。
        document.addEventListener('mouseleave', this.handleDragEnd.bind(this));

        document.addEventListener('touchmove', this.handleDragMove.bind(this), { passive: false });
        document.addEventListener('touchend', this.handleDragEnd.bind(this));
        document.addEventListener('touchcancel', this.handleDragEnd.bind(this));
    }

    removeSwipeListeners(cardElement) {
        if (!cardElement) return;
        // console.log("CardManager: Removing swipe listeners from card.");
        cardElement.removeEventListener('mousedown', this.handleDragStart.bind(this));
        cardElement.removeEventListener('touchstart', this.handleDragStart.bind(this));

        // documentに対するリスナーは、対象カードがなくなったからといって無闇に解除すると
        // 他の処理に影響する可能性があるため、ここでは解除しない。
        // もし解除が必要な場合は、より慎重な管理が必要。
        // 今回は document へのリスナーはアプリの生存期間中有効とする。
    }


    handleDragStart(event) {
        // スワイプ処理中、または対象カードがない場合は何もしない
        if (this.swipeInProgress || !this.currentCardElement) return;
        // イベントターゲットが現在のカード、またはその子要素であることを確認
        if (event.target !== this.currentCardElement && !this.currentCardElement.contains(event.target)) {
            return;
        }

        // console.log("CardManager: DragStart on card:", this.currentCardData.member.name, event.type);
        this.isDragging = true;
        this.startX = event.pageX || event.touches[0].pageX;
        this.startY = event.pageY || event.touches[0].pageY;
        if (this.currentCardElement) { // currentCardElement が存在することを確認
             this.currentCardElement.style.transition = 'none';
        }
    }

    handleDragMove(event) {
        if (!this.isDragging || !this.currentCardElement) return;
        event.preventDefault();

        this.currentX = event.pageX || event.touches[0].pageX;
        this.currentY = event.pageY || event.touches[0].pageY;

        const deltaX = this.currentX - this.startX;
        const deltaY = this.currentY - this.startY;

        const rotationStrength = this.config.swipe.rotationFactor || 0.05;
        const rotation = deltaX * rotationStrength;

        this.uiHandler.moveCardDuringSwipe(this.currentCardElement, deltaX, deltaY, rotation);

        const screenWidth = window.innerWidth;
        // オーバーレイ表示の閾値をスワイプ確定の閾値より小さくする
        const overlayThreshold = screenWidth * (this.config.swipe.thresholdRatio || 0.25) * 0.4;

        if (deltaX > overlayThreshold) {
            this.uiHandler.toggleSwipeOverlay(this.currentCardElement, 'like');
        } else if (deltaX < -overlayThreshold) {
            this.uiHandler.toggleSwipeOverlay(this.currentCardElement, 'nope');
        } else {
            this.uiHandler.toggleSwipeOverlay(this.currentCardElement, null);
        }
    }

    handleDragEnd(event) {
        if (!this.isDragging || !this.currentCardElement || this.swipeInProgress) {
            // console.log("CardManager: DragEnd skipped - not dragging, no current card, or swipe in progress.");
            // isDragging が false でここに来た場合は、mouseup/mouseleave が mousemoveなしで呼ばれたなど
            if (!this.isDragging && this.currentCardElement && !this.swipeInProgress) {
                // ドラッグ実質なしでクリックに近い操作だった場合など、位置をリセット
                 this.uiHandler.resetCardPosition(this.currentCardElement);
            }
            return;
        }
        this.isDragging = false; // まずドラッグ状態を解除

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
            this.swipeInProgress = true; // スワイプ処理を開始
            // console.log(`CardManager: Swipe determined: ${swipeDirection}. Starting animation.`);
            this.uiHandler.animateCardOut(this.currentCardElement, swipeDirection, () => {
                this.handleSwipe(swipeDirection);
                // swipeInProgress の解除は cardElementReady イベントで行う
            });
        } else {
            // console.log("CardManager: Swipe threshold not met. Resetting card position.");
            this.uiHandler.resetCardPosition(this.currentCardElement);
            // スワイプしなかった場合は swipeInProgress は true にしない
        }
        
        // 座標リセット
        this.startX = 0; this.startY = 0; this.currentX = 0; this.currentY = 0;
    }


    // スワイプ処理 (カードが画面外にアニメーションされた後に呼ばれる)
    handleSwipe(direction) {
        if (!this.currentCardData) { // ガード節: currentCardDataがnullなら何もしない
            console.warn("CardManager.handleSwipe: currentCardData is null. Aborting swipe process.");
            this.swipeInProgress = false; // 念のためフラグをリセット
            return;
        }

        // console.log(`CardManager: Processing swipe: ${direction} for card:`, this.currentCardData.member.name);
        const swipedData = this.currentCardData; // イベントに渡すデータを先に退避

        // removeSwipeListeners は現在のカードが不要になった時点で呼ばれるべきだが、
        // documentへのリスナーは安易に解除しない方が良い。
        // cardElementに対するリスナーは、その要素がDOMから消えれば自動的に無効になる。
        // ここでは、操作対象だった currentCardElement をクリアする。
        // if(this.currentCardElement) {
        //     this.removeSwipeListeners(this.currentCardElement); // 実際にはあまり意味がないかもしれない
        // }
        this.currentCardElement = null; // DOM要素への参照をクリア

        const swipeEvent = new CustomEvent('cardSwiped', {
            detail: {
                swipedCardData: swipedData,
                swipeDirection: direction
            }
        });
        document.dispatchEvent(swipeEvent);
        this.currentCardData = null; // データもクリア
        // swipeInProgress の解除は、新しいカードの準備が完了したことを示す
        // 'cardElementReady' イベントのリスナー内で行う
    }

    setFeverMode(isFever) {
        this.isFeverMode = isFever;
        this.shownImageHistory.clear(); // モード変更時に表示履歴をリセット
        // console.log(`CardManager: Fever mode ${isFever ? 'ON' : 'OFF'}`);
    }
}
