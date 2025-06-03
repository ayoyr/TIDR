// CardManager.js (全文・フィーバー対応版)

class CardManager {
    constructor(config, uiHandler, dataProvider, feverHandler) {
        this.config = config;
        this.uiHandler = uiHandler;
        this.dataProvider = dataProvider;
        this.feverHandler = feverHandler; // FeverHandlerのインスタンスを保持

        this.allMembers = this.dataProvider.getAllMembers();
        this.currentCardElement = null;
        this.cardStackData = []; // 現在表示中のカードデータの配列 (最大4つ、手前から奥の順)

        this.isFeverMode = false; // フィーバーモード状態
        this.shownImageHistory = new Set(); // 表示済み画像の履歴 (通常モード用)

        this.isDragging = false;
        this.startX = 0; this.startY = 0;
        this.currentX = 0; this.currentY = 0;
        this.swipeInProgress = false; // スワイプアニメーション中の二重操作防止フラグ

        // UIHandlerからカード準備完了通知を受け取るリスナー
        document.addEventListener('cardElementReady', (event) => {
            const { cardElement, cardData } = event.detail;
            // cardStackDataの先頭と実際に表示されたカードのデータが一致するか確認
            if (this.cardStackData.length > 0 && cardData && this.cardStackData[0] && cardData.member && this.cardStackData[0].member && cardData.member.id === this.cardStackData[0].member.id && cardData.imagePath === this.cardStackData[0].imagePath) {
                 this.currentCardElement = cardElement; // 一番手前のカードを操作対象に
                 this.addSwipeListeners(cardElement);
            } else {
                // console.warn("CardManager: cardElementReady's cardData does not match top of stack or stack is empty.");
            }
            this.swipeInProgress = false; // 新しいカードの準備ができたらスワイプ処理中フラグを解除
            // console.log("CardManager: cardElementReady, swipeInProgress set to false.");
        });
    }

    // ユーザー設定を適用 (メンバー出現率など)
    applyUserSettings(settings) {
        if (settings && settings.memberWeights) {
            this.updateMemberWeights(settings.memberWeights);
        }
    }

    updateMemberWeights(newWeights) {
        this.allMembers.forEach(member => {
            if (newWeights[member.id] !== undefined) {
                member.weight = parseInt(newWeights[member.id], 10);
            } else {
                member.weight = this.config.defaultMemberWeight !== undefined ? this.config.defaultMemberWeight : 1;
            }
        });
        // console.log("CardManager: Member weights updated");
    }

    // カードスタックを初期化または更新する
    async initializeCardStack() {
        this.cardStackData = [];
        for (let i = 0; i < this.uiHandler.MAX_CARDS_IN_STACK; i++) {
            // isHintは、スタックの奥にあるカード（isHint=true）か、一番手前のカード（isHint=false）かを区別する
            const cardData = this.selectNextCardLogic(i !== 0);
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
            // 新しく補充するカードはスタックの最後尾なので、isHint=true とする
            const nextCardData = this.selectNextCardLogic(true);
            if (nextCardData) {
                this.cardStackData.push(nextCardData);
            } else {
                break; // もう取得できるカードがない
            }
        }
        this.uiHandler.updateCardStack(this.cardStackData);
    }

    // 次に表示するカードを選択するロジック (フィーバーモード対応)
    selectNextCardLogic(isHint = false) {
        if (this.isFeverMode) {
            const likedImages = this.dataProvider.getLikedImages();
            if (likedImages.length === 0) {
                console.warn("フィーバーモードですが、高評価画像がありません。通常選択ロジックにフォールバックします。");
                return this.selectNormalCardLogic(isHint); // 通常ロジックを呼び出す
            }
            // 高評価画像からランダムに選択
            const randomLikedImageInfo = likedImages[Math.floor(Math.random() * likedImages.length)];
            const member = this.dataProvider.getMemberById(randomLikedImageInfo.memberId);
            if (!member) {
                console.error("高評価画像に対応するメンバー情報が見つかりません:", randomLikedImageInfo.memberId);
                return this.selectNormalCardLogic(isHint); // フォールバック
            }
            const serif = this.dataProvider.getRandomSerif(member.id);
            // フィーバー中は shownImageHistory は適用しない（同じお気に入り画像が何度も出ることを許容）
            return {
                member: member,
                imagePath: randomLikedImageInfo.imagePath,
                serif: serif,
                currentImageIndex: 0, // フィーバー中は特定の画像なのでインデックスはあまり意味がない
                totalImagesInMember: 1, // フィーバー中は1枚の画像として扱う
            };

        } else {
            return this.selectNormalCardLogic(isHint);
        }
    }

    // 通常モード時のカード選択ロジック
    selectNormalCardLogic(isHint = false) {
        if (!this.allMembers || this.allMembers.length === 0) {
            console.warn("表示できるメンバーがいません (allMembers is empty or undefined)。");
            return null;
        }
        let selectedMember;
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

        if (!selectedMember) {
            console.error("通常カード選択ロジック: メンバーを選択できませんでした。");
            return null;
        }

        const imagePaths = this.dataProvider.getMemberImagePaths(selectedMember.id, 'ero');
        if (!imagePaths || imagePaths.length === 0 || (imagePaths.length === 1 && imagePaths[0] === 'images/placeholder.png')) {
            // console.warn(`メンバー ${selectedMember.name} の 'ero' 画像が見つかりません。プレースホルダーを使用します。`);
            return {
                member: selectedMember,
                imagePath: 'images/placeholder.png',
                serif: this.dataProvider.getRandomSerif(selectedMember.id) || `${selectedMember.name}の画像がありません。`,
                currentImageIndex: 0,
                totalImagesInMember: 0, // プレースホルダーなので0
            };
        }

        let randomImagePath;
        let selectedImageIndex = 0;
        let attempts = 0;
        const maxAttempts = imagePaths.length * 2; // 無限ループ防止

        do {
            selectedImageIndex = Math.floor(Math.random() * imagePaths.length);
            randomImagePath = imagePaths[selectedImageIndex];
            attempts++;
        } while (!isHint && this.shownImageHistory.has(`${selectedMember.id}-${randomImagePath}`) && attempts < maxAttempts && this.shownImageHistory.size < imagePaths.length);
        // isHint が true の場合 (スタックの奥のカード) は履歴チェックを緩めるかスキップする
        // ここでは isHint でない場合のみ履歴チェックを厳密に行う

        if (!isHint) { // メインカードの場合のみ履歴に追加・管理
            this.shownImageHistory.add(`${selectedMember.id}-${randomImagePath}`);
            if (this.shownImageHistory.size > (this.allMembers.length * 3 || 10)) {
                 const oldest = this.shownImageHistory.values().next().value;
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


    // スワイプイベントリスナーの追加
    addSwipeListeners(cardElement) {
        if (!cardElement) return;
        cardElement.addEventListener('mousedown', this.handleDragStart.bind(this));
        cardElement.addEventListener('touchstart', this.handleDragStart.bind(this), { passive: true });

        document.addEventListener('mousemove', this.handleDragMove.bind(this));
        document.addEventListener('mouseup', this.handleDragEnd.bind(this));
        document.addEventListener('mouseleave', this.handleDragEnd.bind(this));

        document.addEventListener('touchmove', this.handleDragMove.bind(this), { passive: false });
        document.addEventListener('touchend', this.handleDragEnd.bind(this));
        document.addEventListener('touchcancel', this.handleDragEnd.bind(this));
    }

    // スワイプイベントリスナーの削除 (基本的には使わないが念のため)
    removeSwipeListeners(cardElement) {
        if (!cardElement) return;
        cardElement.removeEventListener('mousedown', this.handleDragStart.bind(this));
        cardElement.removeEventListener('touchstart', this.handleDragStart.bind(this));
        // documentに対するリスナーはここでは解除しない
    }

    // ドラッグ開始処理
    handleDragStart(event) {
        if (this.swipeInProgress || !this.currentCardElement) return;
        if (event.target !== this.currentCardElement && !this.currentCardElement.contains(event.target)) {
            return;
        }
        this.isDragging = true;
        this.startX = event.pageX || event.touches[0].pageX;
        this.startY = event.pageY || event.touches[0].pageY;
        if (this.currentCardElement) {
             this.currentCardElement.style.transition = 'none'; // ドラッグ中はCSSトランジションを無効化
        }
    }

    // ドラッグ中の処理
    handleDragMove(event) {
        if (!this.isDragging || !this.currentCardElement) return;
        event.preventDefault(); // ページスクロールを防ぐ

        this.currentX = event.pageX || event.touches[0].pageX;
        this.currentY = event.pageY || event.touches[0].pageY;

        const deltaX = this.currentX - this.startX;
        const deltaY = this.currentY - this.startY;
        const rotation = deltaX * (this.config.swipe.rotationFactor || 0.05);

        this.uiHandler.moveCardDuringSwipe(this.currentCardElement, deltaX, deltaY, rotation);

        const screenWidth = window.innerWidth;
        const overlayThreshold = screenWidth * (this.config.swipe.thresholdRatio || 0.25) * 0.4;

        if (deltaX > overlayThreshold) {
            this.uiHandler.toggleSwipeOverlay(this.currentCardElement, 'like');
        } else if (deltaX < -overlayThreshold) {
            this.uiHandler.toggleSwipeOverlay(this.currentCardElement, 'nope');
        } else {
            this.uiHandler.toggleSwipeOverlay(this.currentCardElement, null);
        }
    }

    // ドラッグ終了処理
    handleDragEnd(event) {
        if (!this.isDragging || !this.currentCardElement || this.swipeInProgress) {
            if (!this.isDragging && this.currentCardElement && !this.swipeInProgress) {
                 this.uiHandler.resetCardPosition(this.currentCardElement); // 実質クリックのような場合
            }
            return;
        }
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
            this.swipeInProgress = true; // スワイプ処理開始のフラグ
            const swipedCardDataForFeverHandler = this.cardStackData.length > 0 ? this.cardStackData[0] : null;

            this.uiHandler.animateCardOut(this.currentCardElement, swipeDirection, () => {
                if (swipeDirection === 'right' && swipedCardDataForFeverHandler) {
                    this.feverHandler.handleRightSwipe(swipedCardDataForFeverHandler);
                }
                this.handleSwipe(swipeDirection); // アニメーション完了後に実際のカード処理
            });
        } else {
            this.uiHandler.resetCardPosition(this.currentCardElement);
        }
        
        this.startX = 0; this.startY = 0; this.currentX = 0; this.currentY = 0; // 座標リセット
    }

    // スワイプ処理の本体 (カードが画面外にアニメーションされた後に呼ばれる)
    handleSwipe(direction) {
        const swipedCardDataFromStack = this.cardStackData.length > 0 ? this.cardStackData[0] : null;

        if (!swipedCardDataFromStack) {
            console.warn("CardManager.handleSwipe: No card data in stack to actually swipe. Aborting.");
            this.swipeInProgress = false; // スワイプ処理が終わったのでフラグ解除
            return;
        }

        // console.log(`CardManager: Processing swipe: ${direction} for card:`, swipedCardDataFromStack.member.name);
        this.currentCardElement = null; // 操作対象だったDOM要素への参照をクリア

        // カスタムイベントを発行してapp.jsに通知
        const swipeEvent = new CustomEvent('cardSwiped', {
            detail: {
                swipedCardData: swipedCardDataFromStack,
                swipeDirection: direction
            }
        });
        document.dispatchEvent(swipeEvent);
        // this.cardStackData からの削除は updateStackAfterSwipe で行われる
        // swipeInProgress の解除は、新しいカードスタックが表示され、
        // 新しいアクティブカードにリスナーが設定された後 ('cardElementReady'イベント) で行う
    }

    // フィーバーモードの設定
    setFeverMode(isFever) {
        this.isFeverMode = isFever;
        this.shownImageHistory.clear(); // モード変更時に表示履歴をリセット
        console.log(`CardManager: Fever mode ${isFever ? 'ON' : 'OFF'}`);
        // フィーバーモードの開始/終了時には、App.js側で initializeCardStack を呼び出し、
        // カードスタックを再構築する
    }
}
