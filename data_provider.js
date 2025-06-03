// DataProvider.js (全文)

class DataProvider {
    constructor(config) {
        this.config = config;
        this.userSettings = this.loadUserSettings(); // membersパースより先に実行してweightの初期値に使う
        this.members = this.parseMembers(config.members); // ここで this.members が初期化される
        this.serifsByMember = {}; // メンバー名ごとにセリフを格納するオブジェクト
        this.likedImages = this.loadLikedImages(); // 高評価画像を起動時に読み込む
    }

    // configからメンバー情報を扱いやすい形に初期化
    parseMembers(memberConfigs) {
        if (!memberConfigs || memberConfigs.length === 0) {
            console.error("config.jsにメンバー情報 (config.members) が設定されていないか空です。");
            return []; // 空の配列を返す
        }
        return memberConfigs.map(member => ({
            id: member.id,
            name: member.name,
            color: member.color,
            profileIcon: member.profileIcon, // アイコン非表示にしたがデータとしては残す
            imageFolders: member.imageFolders,
            // hueOffsetForSticker もメンバーオブジェクトに含まれている想定
            hueOffsetForSticker: member.hueOffsetForSticker || '0deg',
            weight: this.userSettings?.memberWeights?.[member.id] !== undefined ?
                    this.userSettings.memberWeights[member.id] :
                    (this.config.defaultMemberWeight !== undefined ? this.config.defaultMemberWeight : 1),
        }));
    }

    // 全メンバーの情報を取得
    getAllMembers() {
        return this.members;
    }

    // IDで特定のメンバー情報を取得
    getMemberById(id) {
        return this.members.find(member => member.id === id);
    }

    // Nameで特定のメンバー情報を取得 (セリフ紐付け用)
    getMemberByName(name) {
        return this.members.find(member => member.name === name);
    }

    // 特定メンバーの指定タイプ(ero/hutuu)の画像パスリストを取得
    getMemberImagePaths(memberId, imageType = 'ero') {
        const member = this.getMemberById(memberId);
        if (!member || !member.imageFolders || !member.imageFolders[imageType]) {
            console.warn(`メンバーID "${memberId}" または画像タイプ "${imageType}" の情報が見つかりません (member or imageFolders or imageType invalid)。`);
            return ['images/placeholder.png']; // 安全のためプレースホルダーを返す
        }

        const folderInfo = member.imageFolders[imageType];
        const basePath = folderInfo.path;
        const count = folderInfo.imageCount;
        const paths = [];

        if (typeof count !== 'number' || count === 0) {
            console.warn(`メンバー ${member.name} (${memberId}) の ${imageType} 画像枚数 (imageCount) が0または不正です。placeholderを表示します。`);
            return ['images/placeholder.png'];
        }

        for (let i = 1; i <= count; i++) {
            paths.push(`${basePath}${i}.jpg`); // ファイル名が数字.jpgと想定
        }
        return paths;
    }

    // 指定されたメンバーのセリフをランダムに取得
    getRandomSerif(memberId) {
        const member = this.getMemberById(memberId);
        if (!member || !member.name) {
            return "メンバー情報が見つかりません。";
        }
        const memberSerifs = this.serifsByMember[member.name];
        if (memberSerifs && memberSerifs.length > 0) {
            const randomIndex = Math.floor(Math.random() * memberSerifs.length);
            return memberSerifs[randomIndex].quote;
        }
        return `${member.name}のセリフは準備中です。`; // CSVにセリフがない場合のフォールバック
    }

    // --- ユーザー設定関連 ---
    loadUserSettings() {
        const storedWeights = localStorage.getItem(this.config.localStorageKeys.memberWeights);
        let memberWeights = {};
        if (storedWeights) {
            try {
                memberWeights = JSON.parse(storedWeights);
            } catch (e) {
                console.error("localStorageからメンバー出現率の読み込みに失敗しました:", e);
                memberWeights = {};
            }
        }
        return {
            memberWeights: memberWeights
        };
    }

    saveMemberWeights(weights) {
        try {
            localStorage.setItem(this.config.localStorageKeys.memberWeights, JSON.stringify(weights));
            if (this.members && typeof this.members.forEach === 'function') {
                this.members.forEach(member => {
                    if (weights[member.id] !== undefined) {
                        member.weight = parseInt(weights[member.id], 10); // 数値型で保存
                    }
                });
            }
            this.userSettings.memberWeights = weights; // 内部状態も更新
            console.log("メンバー出現率を保存しました:", weights);
        } catch (e) {
            console.error("メンバー出現率のlocalStorageへの保存に失敗しました:", e);
        }
    }

    // --- セリフCSV読み込みとパース ---
    async loadSerifs() {
        try {
            const response = await fetch(this.config.data.serifCsvPath);
            if (!response.ok) {
                console.error(`セリフCSVの読み込みに失敗: ${this.config.data.serifCsvPath} - ${response.status} ${response.statusText}`);
                this.generateDummySerifsForAllMembers(); // ダミーセリフを生成
                return;
            }
            const csvData = await response.text();
            this.parseSerifCsv(csvData); // パース処理を呼び出す
            console.log("セリフデータを読み込み、パース処理を試みました。");
        } catch (error) {
            console.error(`セリフCSV (${this.config.data.serifCsvPath}) の読み込み中にネットワークエラー等が発生しました:`, error);
            this.generateDummySerifsForAllMembers(); // エラー時もダミーセリフを生成
        }
    }

    // CSV文字列をパースしてメンバーごとにセリフを格納する (ヘッダーなしCSV対応版)
    parseSerifCsv(csvData) {
        this.serifsByMember = {}; // 初期化
        const lines = csvData.split(/\r?\n/);

        if (lines.length === 0 || (lines.length === 1 && lines[0].trim() === '')) {
            console.warn("セリフCSVファイルが空か、内容がありません。");
            this.generateDummySerifsForAllMembers(); // ダミー生成
            return;
        }

        // 列のインデックスを固定値として定義 (0から始まる)
        const memberNameIndex = 0; // 1列目がメンバー名
        const quoteIndex = 1;      // 2列目がセリフ
        const tagsIndex = 2;       // 3列目がタグ (この列は存在しなくても良い)

        lines.forEach((line, lineIndex) => {
            if (line.trim() === '') return; // 空行はスキップ

            const values = [];
            let currentField = '';
            let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"' && (i === 0 || line[i-1] !== '\\')) { //簡易的なエスケープ処理
                    if (inQuotes && i + 1 < line.length && line[i+1] === '"') { // "" の場合
                        currentField += '"';
                        i++; // 次の " をスキップ
                        continue;
                    }
                    inQuotes = !inQuotes;
                } else if (char === (this.config.data.csvFieldSeparator || ',') && !inQuotes) { // configから区切り文字取得
                    values.push(currentField);
                    currentField = '';
                } else {
                    currentField += char;
                }
            }
            values.push(currentField); // 最後のフィールドを追加

            if (values.length > quoteIndex) { // quoteIndex は1なので、values.length が2以上ならOK
                const memberName = values[memberNameIndex].trim();
                let quote = values[quoteIndex];

                if (typeof quote === 'string') {
                    if (quote.startsWith('"') && quote.endsWith('"')) {
                        quote = quote.substring(1, quote.length - 1);
                    }
                    quote = quote.replace(/""/g, '"').trim(); // エスケープされた "" を " に置換し、トリム
                } else {
                    quote = ''; // quoteがundefinedやnullの場合、空文字にする
                }

                const tagsString = (values.length > tagsIndex && values[tagsIndex] !== undefined) ? values[tagsIndex] : '';
                const tags = tagsString ? tagsString.split(this.config.data.csvTagSeparator || '|').map(tag => tag.trim()) : [];

                if (memberName) {
                    if (!this.serifsByMember[memberName]) {
                        this.serifsByMember[memberName] = [];
                    }
                    this.serifsByMember[memberName].push({ quote, tags });
                } else {
                    console.warn(`セリフCSV ${lineIndex + 1}行目: MemberName (1列目) が空です。`);
                }
            } else {
                 console.warn(`セリフCSV ${lineIndex + 1}行目: 列の数が不足しています (メンバー名とセリフの2列は必須)。 Line: "${line}"`);
            }
        });

        // セリフが一つも読み込めなかったメンバーにダミーセリフを割り当てる
        if (this.members && typeof this.members.forEach === 'function') {
            this.members.forEach(member => {
                if (!this.serifsByMember[member.name] || this.serifsByMember[member.name].length === 0) {
                     if(!this.serifsByMember[member.name]) {
                        this.serifsByMember[member.name] = [];
                     }
                    const hasDummy = this.serifsByMember[member.name].some(serif => serif.quote.includes("ダミーセリフです"));
                    if (!hasDummy) {
                        this.serifsByMember[member.name].push({ quote: `${member.name}さんのセリフがCSVに見つかりませんでした。`, tags: [] });
                        console.warn(`${member.name}さんのセリフがCSVに見つからなかったため、ダミーセリフを設定しました。`);
                    }
                }
            });
        } else {
            console.error("parseSerifCsv (ダミー生成部): this.members が未定義またはforEachをサポートしていません。");
        }
    }

    // 全メンバーにダミーセリフを生成する（CSV読み込み失敗時など）
    generateDummySerifsForAllMembers() {
        console.warn("全メンバーにダミーセリフを生成します（generateDummySerifsForAllMembers呼び出し）。");
        if (this.members && typeof this.members.forEach === 'function') {
            this.members.forEach(member => {
                if (!this.serifsByMember[member.name]) { // まだ当該メンバーのセリフ配列がなければ作成
                    this.serifsByMember[member.name] = [];
                }
                // ダミーを重複して追加しないように簡易チェック
                const hasDummy = this.serifsByMember[member.name].some(serif => serif.quote.includes("ダミーセリフです"));
                if (!hasDummy) {
                     this.serifsByMember[member.name].push({ quote: `${member.name}のダミーセリフです。CSVを確認してください。`, tags: [] });
                }
            });
        } else {
            console.error("generateDummySerifsForAllMembers: this.members が未定義またはforEachをサポートしていません。DataProviderコンストラクタでの初期化を確認してください。");
        }
    }

    /**
     * アプリケーションで使用する全ての画像パスを収集する
     * @returns {string[]} 画像パスの配列
     */
    getAllImagePathsToPreload() {
        const imagePaths = new Set(); // 重複を避けるためにSetを使用

        if (this.members && this.members.length > 0) {
            this.members.forEach(member => {
                // プロフィールアイコン (UIから消したが、データとしては残っている可能性あり)
                if (member.profileIcon) {
                    imagePaths.add(member.profileIcon);
                }
                // hutuu 画像
                if (member.imageFolders && member.imageFolders.hutuu && member.imageFolders.hutuu.path && member.imageFolders.hutuu.imageCount > 0) {
                    const hutuuFolder = member.imageFolders.hutuu;
                    for (let i = 1; i <= hutuuFolder.imageCount; i++) {
                        imagePaths.add(`${hutuuFolder.path}${i}.jpg`);
                    }
                }
                // ero 画像
                if (member.imageFolders && member.imageFolders.ero && member.imageFolders.ero.path && member.imageFolders.ero.imageCount > 0) {
                    const eroFolder = member.imageFolders.ero;
                    for (let i = 1; i <= eroFolder.imageCount; i++) {
                        imagePaths.add(`${eroFolder.path}${i}.jpg`);
                    }
                }
            });
        } else {
            console.warn("メンバー情報が見つからないため、メンバー画像のプリロードはスキップされます。");
        }

        if (this.config.fever && this.config.fever.stickerPaths && this.config.fever.stickerPaths.length > 0) {
            this.config.fever.stickerPaths.forEach(path => imagePaths.add(path));
        }

        if (this.config.swipe) {
            if (this.config.swipe.likeOverlayPath) {
                imagePaths.add(this.config.swipe.likeOverlayPath);
            }
            if (this.config.swipe.nopeOverlayPath) {
                imagePaths.add(this.config.swipe.nopeOverlayPath);
            }
        }
        
        imagePaths.add('images/placeholder.png'); // プレースホルダーも読み込んでおく

        console.log(`Total unique images to preload: ${imagePaths.size}`);
        return Array.from(imagePaths); // Setを配列に変換して返す
    }

    // 高評価画像リスト関連のメソッド
    loadLikedImages() {
        const storedLikedImages = localStorage.getItem(this.config.localStorageKeys.feverLikedImages);
        if (storedLikedImages) {
            try {
                const images = JSON.parse(storedLikedImages);
                return Array.isArray(images) ? images : []; // 配列でなければ空配列を返す
            } catch (e) {
                console.error("localStorageから高評価画像の読み込みに失敗しました:", e);
                return [];
            }
        }
        return []; // localStorageに何もなければ空配列
    }

    addLikedImage(cardData) {
        if (!cardData || !cardData.member || !cardData.imagePath) return;

        const likedImageInfo = {
            memberId: cardData.member.id,
            memberName: cardData.member.name, // デバッグや表示用に保持
            imagePath: cardData.imagePath,
            // 必要ならセリフや他の情報も cardData から取得して保存
            timestamp: Date.now() // いつ高評価されたか
        };

        // 重複を避ける (同じ画像パスが既にリストになければ追加)
        if (!this.likedImages.some(img => img.imagePath === likedImageInfo.imagePath)) {
            this.likedImages.push(likedImageInfo);
            // オプション: 古いものから削除して最大件数を保つロジック
            // const MAX_LIKED_IMAGES = this.config.fever?.maxLikedImageHistory || 50;
            // if (this.likedImages.length > MAX_LIKED_IMAGES) {
            //     this.likedImages.sort((a, b) => a.timestamp - b.timestamp); // 古い順
            //     this.likedImages.splice(0, this.likedImages.length - MAX_LIKED_IMAGES);
            // }
            this.saveLikedImages();
            console.log("高評価画像を追加:", likedImageInfo.imagePath);
        }
    }

    saveLikedImages() {
        try {
            localStorage.setItem(this.config.localStorageKeys.feverLikedImages, JSON.stringify(this.likedImages));
        } catch (e) {
            console.error("高評価画像のlocalStorageへの保存に失敗しました:", e);
        }
    }

    getLikedImages() {
        return this.likedImages; // 現在メモリ上にあるリストを返す
    }


    async loadAllData() {
        this.likedImages = this.loadLikedImages(); // likedImagesも初期ロード時に読み込む
        await this.loadSerifs();
        // 他の非同期データ読み込みがあればここに追加
        console.log("DataProvider: 全データの読み込み処理が完了しました。");
    }
}
