// data_provider.js - データソースの管理 (セリフ読み込み対応・全文)

class DataProvider {
    constructor(config) {
        this.config = config;
        this.userSettings = this.loadUserSettings(); // membersパースより先に実行してweightの初期値に使う
        this.members = this.parseMembers(config.members);
        this.serifsByMember = {}; // メンバー名ごとにセリフを格納するオブジェクト
    }

    // configからメンバー情報を扱いやすい形に初期化
    parseMembers(memberConfigs) {
        if (!memberConfigs || memberConfigs.length === 0) {
            console.error("メンバー情報がconfig.jsに設定されていません。");
            return [];
        }
        return memberConfigs.map(member => ({
            id: member.id,
            name: member.name,
            color: member.color,
            profileIcon: member.profileIcon,
            imageFolders: member.imageFolders, // eroとhutuuのパスと枚数
            // 初期出現率の重みを設定 (設定モーダルで変更可能にする想定)
            // loadUserSettingsを先に呼んでいるので、ここでの読み込みは不要になる
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
        if (!member || !member.imageFolders[imageType]) {
            console.warn(`メンバーID "${memberId}" または画像タイプ "${imageType}" の情報が見つかりません。`);
            return ['images/placeholder.png']; // 安全のためプレースホルダーを返す
        }

        const folderInfo = member.imageFolders[imageType];
        const basePath = folderInfo.path;
        const count = folderInfo.imageCount;
        const paths = [];

        if (count === 0) {
            // imageCountが0の場合もプレースホルダーを返す
            console.warn(`メンバー ${member.name} (${memberId}) の ${imageType} 画像枚数が0です。placeholderを表示します。`);
            return ['images/placeholder.png'];
        }

        for (let i = 1; i <= count; i++) {
            // 画像ファイル名は 1.jpg, 2.jpg ... と想定
            paths.push(`${basePath}${i}.jpg`);
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
            return memberSerifs[randomIndex].quote; // quoteプロパティを返す
        }
        // CSVにセリフがない、またはまだ読み込まれていない場合のフォールバック
        return `${member.name}のセリフは準備中です。`;
    }

    // --- ユーザー設定関連 ---
    loadUserSettings() {
        // localStorageから読み込む想定
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
            // this.members にも即座に反映
            this.members.forEach(member => {
                if (weights[member.id] !== undefined) {
                    member.weight = parseInt(weights[member.id], 10); // 数値型で保存
                }
            });
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
            this.parseSerifCsv(csvData);
            console.log("セリフデータを読み込み、パースしました。");
        } catch (error) {
            console.error(`セリフCSV (${this.config.data.serifCsvPath}) の読み込み中にネットワークエラー等が発生しました:`, error);
            this.generateDummySerifsForAllMembers(); // エラー時もダミーセリフを生成
        }
    }

    // CSV文字列をパースしてメンバーごとにセリフを格納する
    parseSerifCsv(csvData) {
        this.serifsByMember = {}; // 初期化
        const lines = csvData.split(/\r?\n/); // 改行コードCRLFとLF両方に対応

        if (lines.length === 0) {
            console.warn("セリフCSVファイルが空です。");
            this.generateDummySerifsForAllMembers();
            return;
        }

        const headerLine = lines.shift(); // ヘッダー行を取り出す
        if (!headerLine) {
            console.warn("セリフCSVファイルにヘッダー行がありません。");
            this.generateDummySerifsForAllMembers();
            return;
        }
        // ヘッダーをパース (簡易的にカンマ区切り)
        const header = headerLine.split(',').map(h => h.trim());
        const memberNameIndex = header.indexOf('MemberName');
        const quoteIndex = header.indexOf('Quote');
        const tagsIndex = header.indexOf('Tags'); // オプショナル

        if (memberNameIndex === -1 || quoteIndex === -1) {
            console.error("CSVヘッダーに 'MemberName' または 'Quote' が見つかりません。現在のヘッダー:", header);
            this.generateDummySerifsForAllMembers();
            return;
        }

        lines.forEach((line, index) => {
            if (line.trim() === '') return; // 空行はスキップ

            // ダブルクォーテーションで囲まれたカンマを考慮したCSV行パーサー
            const values = [];
            let currentField = '';
            let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"' && (i === 0 || line[i-1] !== '\\')) { // エスケープされた"は無視しない簡易版
                    // 次の文字も " なら "" (エスケープされたダブルクォート) として処理
                    if (inQuotes && i + 1 < line.length && line[i+1] === '"') {
                        currentField += '"';
                        i++; // 次の " をスキップ
                        continue;
                    }
                    inQuotes = !inQuotes;
                } else if (char === (this.config.data.csvFieldSeparator || ',') && !inQuotes) {
                    values.push(currentField);
                    currentField = '';
                } else {
                    currentField += char;
                }
            }
            values.push(currentField); // 最後のフィールドを追加

            if (values.length > Math.max(memberNameIndex, quoteIndex)) {
                const memberName = values[memberNameIndex].trim();
                let quote = values[quoteIndex]; // トリムは最後に行うか、フィールドごとに

                // ダブルクォーテーションで囲まれていたら削除 (フィールドの最初と最後のみ)
                if (quote.startsWith('"') && quote.endsWith('"')) {
                    quote = quote.substring(1, quote.length - 1);
                }
                // "" (エスケープされたダブルクォート) を " に置換
                quote = quote.replace(/""/g, '"');

                const tagsString = (tagsIndex !== -1 && values.length > tagsIndex) ? values[tagsIndex] : '';
                const tags = tagsString ? tagsString.split(this.config.data.csvTagSeparator || '|').map(tag => tag.trim()) : [];

                if (memberName) {
                    if (!this.serifsByMember[memberName]) {
                        this.serifsByMember[memberName] = [];
                    }
                    this.serifsByMember[memberName].push({ quote: quote.trim(), tags });
                } else {
                    console.warn(`セリフCSV ${index + 2}行目: MemberNameが空です。`);
                }
            } else {
                 console.warn(`セリフCSV ${index + 2}行目: 列の数が不足しています。 Line: "${line}" Values:`, values);
            }
        });

        // セリフが一つも読み込めなかったメンバーにダミーセリフを割り当てる
        this.allMembers.forEach(member => {
            if (!this.serifsByMember[member.name] || this.serifsByMember[member.name].length === 0) {
                 if(!this.serifsByMember[member.name]) this.serifsByMember[member.name] = []; // 配列初期化
                this.serifsByMember[member.name].push({ quote: `${member.name}さんのセリフがCSVに見つかりませんでした。`, tags: [] });
                console.warn(`${member.name}さんのセリフがCSVに見つからなかったため、ダミーセリフを設定しました。`)
            }
        });
    }

    // 全メンバーにダミーセリフを生成する（CSV読み込み失敗時など）
    generateDummySerifsForAllMembers() {
        console.warn("全メンバーにダミーセリフを生成します。");
        this.allMembers.forEach(member => {
            // 既に何らかのセリフ (空配列含む) があっても上書きしないようにする、または意図的に上書きするかどうか。
            // ここでは、まだ存在しないメンバーに対してのみ、または強制的にダミーを設定する。
            if (!this.serifsByMember[member.name]) {
                this.serifsByMember[member.name] = [];
            }
            // ダミーを重複して追加しないように、既にダミーがあるかチェックするのも良い
            this.serifsByMember[member.name].push({ quote: `${member.name}のダミーセリフです。CSVを確認してください。`, tags: [] });
        });
    }

    // アプリ初期化時に全てのデータを読み込む
    async loadAllData() {
        // メンバー情報はコンストラクタでパース済み
        // セリフを読み込む
        await this.loadSerifs();
        // 他にも読み込むべきデータがあればここに追加 (例: 画像タグ情報など)
        console.log("DataProvider: All data loaded (or attempted).");
    }
}
