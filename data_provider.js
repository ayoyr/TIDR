// data_provider.js (全文・CSVヘッダーなし対応・エラー対策強化版)

class DataProvider {
    constructor(config) {
        this.config = config;
        this.userSettings = this.loadUserSettings(); // membersパースより先に実行してweightの初期値に使う
        this.members = this.parseMembers(config.members); // ここで this.members が初期化される
        this.serifsByMember = {}; // メンバー名ごとにセリフを格納するオブジェクト
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
            profileIcon: member.profileIcon,
            imageFolders: member.imageFolders,
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
            return ['images/placeholder.png'];
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
            return memberSerifs[randomIndex].quote;
        }
        return `${member.name}のセリフは準備中です。`;
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
                        member.weight = parseInt(weights[member.id], 10);
                    }
                });
            }
            this.userSettings.memberWeights = weights;
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
                this.generateDummySerifsForAllMembers();
                return;
            }
            const csvData = await response.text();
            this.parseSerifCsv(csvData); // パース処理を呼び出す
            console.log("セリフデータを読み込み、パース処理を試みました。");
        } catch (error) {
            console.error(`セリフCSV (${this.config.data.serifCsvPath}) の読み込み中にネットワークエラー等が発生しました:`, error);
            this.generateDummySerifsForAllMembers();
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
                if (char === '"' && (i === 0 || line[i-1] !== '\\')) {
                    if (inQuotes && i + 1 < line.length && line[i+1] === '"') {
                        currentField += '"';
                        i++;
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
            values.push(currentField);

            if (values.length > quoteIndex) {
                const memberName = values[memberNameIndex].trim();
                let quote = values[quoteIndex];

                if (typeof quote === 'string') {
                    if (quote.startsWith('"') && quote.endsWith('"')) {
                        quote = quote.substring(1, quote.length - 1);
                    }
                    quote = quote.replace(/""/g, '"').trim();
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
                // 既にserifsByMemberにエントリがなくても、ここで作成してダミーを追加
                if (!this.serifsByMember[member.name]) {
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

    // アプリ初期化時に全てのデータを読み込む
    async loadAllData() {
        // メンバー情報はコンストラクタでパース済み
        await this.loadSerifs(); // セリフを読み込む
        console.log("DataProvider: 全データの読み込み処理が完了しました。");
    }
}
