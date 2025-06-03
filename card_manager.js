// card_manager.js - カードの生成、表示、スワイプ処理、次のカード選択ロジック

class CardManager {
    constructor(config, uiHandler, dataProvider, feverHandler) {
        this.config = config;
        this.uiHandler = uiHandler;
        this.dataProvider = dataProvider;
        this.feverHandler = feverHandler; // 今回はまだ使わない

        this.allMembers = this.dataProvider.getAllMembers();
        this.currentCardData = null;
        this.nextCardDataBuffer = []; // 次に表示するカードの候補を保持 (プリロード用)
        this.isFeverMode = false;
        this.shownImageHistory = new Set(); // 同じメンバーの同じ画像を連続で表示しないための履歴 (簡易版)
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
                member.weight = newWeights[member.id];
            } else {
                member.weight = this.config.defaultMemberWeight || 1;
            }
        });
        console.log("CardManager: Member weights updated", this.allMembers.map(m => `${m.name}:${m.weight}`));
    }


    // 初期カードの準備 (アプリ起動時に呼ばれる)
    async prepareInitialCards() {
        // 最初に表示するカードを1枚選ぶ
        this.currentCardData = this.selectNextCardLogic();
        // 必要であれば、さらに数枚プリロードしておく (今回は1枚のみ)
        if (this.currentCardData) {
            // 画像プリロード (今回は単純化のため省略、UIHandlerのimg.src設定で読み込まれる)
            console.log("Initial card prepared:", this.currentCardData.member.name);
        } else {
            console.warn("初期カードの準備ができませんでした。メンバー情報が空かもしれません。");
        }
    }

    // 次に表示するカードのデータを取得 (app.js などから呼ばれる)
    getNextCard(offset = 0) { // offset: 0なら現在表示すべきカード、1ならその次
        if (offset === 0) {
            // currentCardData があればそれを返し、なければ新しく選択
            if (!this.currentCardData) {
                this.currentCardData = this.selectNextCardLogic();
            }
            const cardToReturn = this.currentCardData;
            this.currentCardData = null; // 消費したのでクリア
            return cardToReturn;
        } else {
            // 予備バッファから取得、または新規選択 (今回は単純化)
            // return this.nextCardDataBuffer[offset -1] || this.selectNextCardLogic(true);
            // 今回は常に新しく選択する
             return this.selectNextCardLogic(true);
        }
    }

    // 次に表示するカードを選択するロジック
    selectNextCardLogic(isHint = false) { // isHint:裏に見せるカードの場合true
        if (this.allMembers.length === 0) {
            console.warn("表示できるメンバーがいません。");
            return null;
        }

        let selectedMember;
        // フィーバーモードでない場合、重み付けランダムでメンバーを選択
        if (!this.isFeverMode) {
            const weightedMembers = [];
            this.allMembers.forEach(member => {
                // weightが0のメンバーは選択対象外
                if (member.weight > 0) {
                    for (let i = 0; i < member.weight; i++) {
                        weightedMembers.push(member);
                    }
                }
            });

            if (weightedMembers.length === 0) {
                 console.warn("重み付けされた選択可能なメンバーがいません。");
                 // 重みが全て0の場合、ランダムに1人選ぶか、エラーとする。今回はランダムに選ぶ。
                 if (this.allMembers.length > 0) {
                    selectedMember = this.allMembers[Math.floor(Math.random() * this.allMembers.length)];
                 } else {
                    return null;
                 }
            } else {
                selectedMember = weightedMembers[Math.floor(Math.random() * weightedMembers.length)];
            }
        } else {
            // フィーバーモード中のロジック (今回は未実装、FeverHandlerと連携)
            // selectedMember = this.feverHandler.getRandomLikedMember();
            // 仮で通常と同じロジック
             selectedMember = this.allMembers[Math.floor(Math.random() * this.allMembers.length)];
        }

        if (!selectedMember) {
            console.error("カード選択ロジック: メンバーを選択できませんでした。");
            return null;
        }

        // 選択されたメンバーの 'ero' 画像からランダムに1枚選択
        // (同じ画像を連続で表示しないようにしたい場合は、表示履歴を考慮)
        const imagePaths = this.dataProvider.getMemberImagePaths(selectedMember.id, 'ero');
        if (imagePaths.length === 0) {
            console.warn(`メンバー ${selectedMember.name} の 'ero' 画像が見つかりません。`);
            // 別のメンバーを試すか、プレースホルダーでカードを生成する
             // 今回はプレースホルダーでカードを生成
            return {
                member: selectedMember,
                imagePath: 'images/placeholder.png',
                serif: `${selectedMember.name}の画像がありません。`,
                currentImageIndex: 0,
                totalImagesInMember: 0,
                // zIndex: isHint ? 0 : 1 // 重なり順の制御
            };
        }

        // 簡単な履歴チェック (メンバーIDと画像インデックスで管理)
        let randomImagePath;
        let attempts = 0;
        const maxAttempts = imagePaths.length * 2; // 無限ループ防止
        let selectedImageIndex = 0;

        do {
            selectedImageIndex = Math.floor(Math.random() * imagePaths.length);
            randomImagePath = imagePaths[selectedImageIndex];
            attempts++;
        } while (this.shownImageHistory.has(`${selectedMember.id}-${randomImagePath}`) && attempts < maxAttempts && this.shownImageHistory.size < imagePaths.length); // 全て表示済みなら履歴無視

        // 表示履歴に追加 (isHintがfalseのメインカードの場合のみ)
        if(!isHint){
            this.shownImageHistory.add(`${selectedMember.id}-${randomImagePath}`);
            // 履歴が溜まりすぎたら古いものから消す (簡易LRU)
            if (this.shownImageHistory.size > this.allMembers.length * 5) { // 適当な閾値
                 const oldest = this.shownImageHistory.values().next().value;
                 this.shownImageHistory.delete(oldest);
            }
        }


        const serif = this.dataProvider.getRandomSerif(selectedMember.id);

        return {
            member: selectedMember,
            imagePath: randomImagePath,
            serif: serif,
            currentImageIndex: selectedImageIndex, // 現在の画像がメンバーの何枚目か
            totalImagesInMember: imagePaths.length, // そのメンバーの総画像数
            // zIndex: isHint ? 0 : 1 // 重なり順の制御
        };
    }

    // スワイプ処理の呼び出し (今回はまだ実装しない)
    handleSwipe(direction) {
        // 1. 現在のカードを画面外にアニメーション (UIHandler)
        // 2. スワイプ結果をFeverHandlerに通知
        // 3. 次のカードを選択して表示 (UIHandler)
        console.log(`Swiped ${direction}. この機能は後で実装します。`);

        // カスタムイベントを発行してapp.jsに通知
        const swipeEvent = new CustomEvent('cardSwiped', {
            detail: {
                swipedCardData: this.currentCardData, // スワイプされたカードの情報
                swipeDirection: direction
            }
        });
        document.dispatchEvent(swipeEvent);

        // 次のカードを表示する処理をトリガー (app.js側でイベントを受けて行う)
    }

    setFeverMode(isFever) {
        this.isFeverMode = isFever;
        this.shownImageHistory.clear(); // フィーバーモード切り替え時に表示履歴リセット
        if (isFever) {
            console.log("CardManager: Fever mode ON");
            // フィーバーモード用のカード選択ロジックを準備 (FeverHandlerと連携)
        } else {
            console.log("CardManager: Fever mode OFF");
        }
    }
}
