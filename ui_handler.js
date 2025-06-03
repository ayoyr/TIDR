// ui_handler.js - DOM操作とUI更新全般

class UIHandler {
    constructor(config) {
        this.config = config;
        this.cardStackArea = document.querySelector('.card-stack-area');
        this.storyProgressBar = document.querySelector('.story-progress-bar');
        this.feverGauge = document.querySelector('.fever-gauge');
        this.settingsModalOverlay = document.getElementById('settingsModalOverlay');
        this.memberWeightsSettingsDiv = document.getElementById('memberWeightsSettings');

        if (!this.cardStackArea) {
            console.error("要素 .card-stack-area が見つかりません。");
        }
    }

    // カード要素を生成する
    createCardElement(cardData) {
        const cardDiv = document.createElement('div');
        cardDiv.classList.add('card');
        // cardDiv.style.zIndex = cardData.zIndex; // 重なり順は後でCardManagerが制御

        // メイン画像
        const img = document.createElement('img');
        img.classList.add('main-image');
        img.src = cardData.imagePath;
        img.alt = cardData.member.name;
        // 画像読み込みエラー時の処理
        img.onerror = () => {
            console.warn(`画像の読み込みに失敗: ${cardData.imagePath}。プレースホルダーを表示します。`);
            img.src = 'images/placeholder.png'; // プレースホルダー画像のパス
        };
        cardDiv.appendChild(img);

        // カード内情報エリア
        const infoDiv = document.createElement('div');
        infoDiv.classList.add('card-info');

        // プロフィールアイコン
        const profileIcon = document.createElement('img');
        profileIcon.classList.add('profile-icon');
        profileIcon.src = cardData.member.profileIcon;
        profileIcon.alt = `${cardData.member.name} icon`;
        profileIcon.style.borderColor = cardData.member.color; // メンバーカラーで枠線
        profileIcon.onerror = () => {
            console.warn(`プロフィール画像の読み込みに失敗: ${cardData.member.profileIcon}。`);
            // アイコンがない場合の代替処理 (例: 非表示 or デフォルトアイコン)
            profileIcon.style.display = 'none';
        };
        infoDiv.appendChild(profileIcon);

        // メンバー詳細 (名前とセリフ)
        const memberDetailsDiv = document.createElement('div');
        memberDetailsDiv.classList.add('member-details');

        const nameH3 = document.createElement('h3');
        nameH3.classList.add('member-name');
        nameH3.textContent = cardData.member.name;
        memberDetailsDiv.appendChild(nameH3);

        const quoteP = document.createElement('p');
        quoteP.classList.add('member-quote');
        quoteP.textContent = cardData.serif; // DataProviderから取得したセリフ
        memberDetailsDiv.appendChild(quoteP);

        infoDiv.appendChild(memberDetailsDiv);
        cardDiv.appendChild(infoDiv);

        // 右スワイプ・左スワイプ時のオーバーレイ画像要素もここで作成しておく (初期は非表示)
        const likeOverlay = document.createElement('img');
        likeOverlay.src = this.config.swipe?.likeOverlayPath || 'images/like_overlay.png'; // config.jsからパス取得
        likeOverlay.classList.add('swipe-overlay', 'like-overlay');
        likeOverlay.style.display = 'none';
        cardDiv.appendChild(likeOverlay);

        const nopeOverlay = document.createElement('img');
        nopeOverlay.src = this.config.swipe?.nopeOverlayPath || 'images/nope_overlay.png'; // config.jsからパス取得
        nopeOverlay.classList.add('swipe-overlay', 'nope-overlay');
        nopeOverlay.style.display = 'none';
        cardDiv.appendChild(nopeOverlay);


        return cardDiv;
    }

    // カードをDOMに追加する (スタックの先頭、または指定に応じて)
    addCardToDOM(cardElement, addToTop = true) {
        if (!this.cardStackArea) return;
        if (addToTop) {
            this.cardStackArea.appendChild(cardElement); // 一番手前に表示 (CSSで調整)
        } else {
            this.cardStackArea.insertBefore(cardElement, this.cardStackArea.firstChild); // 奥に追加
        }
    }

    // カードを表示する (実際にはCardManagerがこれを呼び出す)
    // nextCardHintData は裏に見せる次のカードの情報（今回はまだ使わない）
    displayCard(cardData, nextCardHintData = null) {
        if (!cardData) {
            this.showNoMoreCardsMessage();
            return;
        }

        // 既存のカードがあれば一旦すべて削除 (シンプルな表示のため)
        // 本来はスタック構造を維持し、アニメーションで処理する
        // while (this.cardStackArea.firstChild) {
        //     this.cardStackArea.removeChild(this.cardStackArea.firstChild);
        // }

        const cardElement = this.createCardElement(cardData);
        this.addCardToDOM(cardElement);

        // ストーリープログレスバー更新 (今回はダミー)
        this.updateStoryProgressBar(cardData.member, cardData.currentImageIndex, cardData.totalImagesInMember);

        // フィーバーゲージ更新 (今回はダミー)
        this.updateFeverGauge(0, cardData.member.color); // 初期値0
    }

    // ストーリープログレスバーを更新
    updateStoryProgressBar(member, currentImageIndex = 0, totalImages = 1) {
        if (!this.storyProgressBar) return;
        this.storyProgressBar.innerHTML = ''; // 一旦クリア

        if (totalImages <= 0) totalImages = 1; // 0除算を防ぐ

        for (let i = 0; i < totalImages; i++) {
            const segment = document.createElement('div');
            segment.classList.add('segment');
            // 画像枚数が1枚で、それが表示されている場合など、インデックスの扱いに注意
            if (i === currentImageIndex) {
                segment.classList.add('active');
            }
            this.storyProgressBar.appendChild(segment);
        }
    }

    // フィーバーゲージを更新
    updateFeverGauge(percentage, color) {
        if (!this.feverGauge) return;
        this.feverGauge.style.width = `${percentage}%`;
        if (color) { // フィーバーゲージの色もメンバーカラーに連動させるか、固定アクセントカラーか
            const gaugeColor = this.config.fever?.gaugeColor || color; // configで固定色を指定できるようにする
            this.feverGauge.style.backgroundColor = gaugeColor;
        }
    }

    // 表示するカードがもうない場合のメッセージ
    showNoMoreCardsMessage() {
        if (!this.cardStackArea) return;
        this.cardStackArea.innerHTML = '<p style="color: white; text-align: center;">表示できるカードがありません。<br>設定を確認するか、アプリをリロードしてください。</p>';
        // 必要なら背景をデフォルトに戻す
        document.body.style.backgroundColor = '#333';
        this.updateStoryProgressBar(null,0,0);
        this.updateFeverGauge(0, '#ccc');

    }

    // アプリ全体の背景色を更新
    updateAppBackground(color) {
        if (color) {
            document.body.style.backgroundColor = color;
        }
    }

    // --- 設定モーダル関連 ---
    openSettingsModal(members, currentWeights) {
        if (!this.settingsModalOverlay || !this.memberWeightsSettingsDiv) return;

        this.memberWeightsSettingsDiv.innerHTML = ''; // 内容をクリア

        members.forEach(member => {
            const memberSettingDiv = document.createElement('div');
            memberSettingDiv.classList.add('member-weight-setting');

            const label = document.createElement('label');
            label.setAttribute('for', `weight-${member.id}`);
            label.textContent = `${member.name}: `;
            memberSettingDiv.appendChild(label);

            const slider = document.createElement('input');
            slider.type = 'range';
            slider.id = `weight-${member.id}`;
            slider.name = `weight-${member.id}`;
            slider.min = '0'; // 出現させない
            slider.max = '5'; // 重みの最大値 (適宜調整)
            slider.step = '1';
            slider.value = currentWeights[member.id] !== undefined ? currentWeights[member.id] : (this.config.defaultMemberWeight || 1);
            slider.dataset.memberId = member.id; // memberIdを保持

            const valueSpan = document.createElement('span');
            valueSpan.id = `weight-value-${member.id}`;
            valueSpan.textContent = slider.value;
            slider.oninput = () => { valueSpan.textContent = slider.value; };


            memberSettingDiv.appendChild(slider);
            memberSettingDiv.appendChild(valueSpan);
            this.memberWeightsSettingsDiv.appendChild(memberSettingDiv);
        });

        this.settingsModalOverlay.style.display = 'flex';
    }

    closeSettingsModal() {
        if (this.settingsModalOverlay) {
            this.settingsModalOverlay.style.display = 'none';
        }
    }

    getMemberWeightsFromModal() {
        const weights = {};
        if (!this.memberWeightsSettingsDiv) return weights;

        const sliders = this.memberWeightsSettingsDiv.querySelectorAll('input[type="range"]');
        sliders.forEach(slider => {
            weights[slider.dataset.memberId] = parseInt(slider.value, 10);
        });
        return weights;
    }
}
