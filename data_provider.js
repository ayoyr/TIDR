// data_provider.js - データソースの管理 (セリフ読み込み対応版)

class DataProvider {
    constructor(config) {
        this.config = config;
        this.members = this.parseMembers(config.members);
        this.serifsByMember = {}; // メンバー名ごとにセリフを格納するオブジェクト
        this.userSettings = this.loadUserSettings();
    }

    // configからメンバー情報を扱いやすい形に初期化
    parseMembers(memberConfigs) {
        // (前回から変更なし)
        if (!memberConfigs || memberConfigs.length === 0) {
            console.error("メンバー情報がconfig.jsに設定されていません。");
            return [];
        }
        return memberConfigs.map(member => ({
            id: member.id,
            name: member.name,
            color: member.color,
            profileIcon: member.profileIcon,
            imageFolders: member.imageFolders,
            weight: this.userSettings?.memberWeights?.[member.id] || this.config.defaultMemberWeight || 1,
        }));
    }

    // 全メンバーの情報を取得
    getAllMembers() {
        // (前回から変更なし)
        return this.members;
    }

    // IDで特定のメンバー情報を取得
    getMemberById(id) {
        // (前回から変更なし)
        return this.members.find(member => member.id === id);
    }
    // Nameで特定のメンバー情報を取得 (セリフ紐付け用)
    getMemberByName(name) {
        return this.members.find(member => member.name === name);
    }


    // 特定メンバーの指定タイプ(ero/hutuu)の画像パスリストを取得
    getMemberImagePaths(memberId, imageType = 'ero') {
        // (前回から変更なし)
        const member = this.getMemberById(memberId);
        if (!member || !member.imageFolders[imageType]) {
            console.warn(`メンバー ${memberId} または画像タイプ ${imageType} の情報が見つかりません。`);
            return [];
        }
        const folderInfo = member.imageFolders[imageType];
        const basePath = folderInfo.path;
        const count = folderInfo.imageCount;
        const paths = [];
        if (count === 0) {
            console.warn(`メンバー ${memberId} の ${imageType} 画像枚数が0です。placeholderを表示します。`);
            return ['images/placeholder.png'];
        }
        for (let i = 1; i <= count; i++) {
            paths.push(`<span class="math-inline">\{basePath\}</span>{i}.jpg`);
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
        return `${member.name}のセリフは準備中です。`; // CSVにセリフがない場合のフォールバック
    }

    // --- ユーザー設定関連 (前回から変更なし) ---
    loadUserSettings() {
        const storedWeights = localStorage.getItem(this.config.localStorageKeys.memberWeights);
        return {
            memberWeights: storedWeights ? JSON.parse(storedWeights) : {}
        };
    }

    saveMemberWeights(weights) {
        localStorage.setItem(this.config.localStorageKeys.memberWeights, JSON.stringify(weights));
        this.members.forEach(member => {
            if (weights[member.id] !== undefined) {
                member.weight = weights[member.id];
            }
        });
        console.log("メンバー出現率を保存しました:", weights);
    }

    // --- セリフCSV読み込みとパース ---
    async loadSerifs() {
        try {
            const response = await fetch(this.config.data.serifCsvPath);
            if (!response.ok) {
                console.error(`セリフCSVの読み込みに失敗: ${response.status} ${response.statusText}`);
                this.generateDummySerifsForAllMembers(); // ダミーセリフを生成
                return;
            }
            const csvData = await response.text();
            this.parseSerifCsv(csvData);
            console.log("セリフデータを読み込み、パースしました。", this.serifsByMember);
        } catch (error) {
            console.error("セリフCSVの読み込み中にエラーが発生しました:", error);
            this.generateDummySerifsForAllMembers(); // エラー時もダミーセリフを生成
        }
    }

    // CSV文字列をパースしてメンバーごとにセリフを格納する
    parseSerifCsv(csvData) {
        this.serifsByMember = {}; // 初期化
        const lines = csvData.split(/\r?\n/); // 改行コードCRLFとLF両方に対応
        if (lines.length === 0) return;

        const header = lines[0].split(','); // ヘッダー行をカンマで分割
        const memberNameIndex = header.indexOf('MemberName');
        const quoteIndex = header.indexOf('Quote');
        const tagsIndex = header.indexOf('Tags');

        if (memberNameIndex === -1 || quoteIndex === -1) {
            console.error("CSVヘッダーに 'MemberName' または 'Quote' が見つかりません。");
            return;
        }

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (line.trim() === '') continue; // 空行はスキップ

            // ダブルクォーテーションで囲まれたカンマを考慮した簡易的なCSV行パーサー
            const values = [];
            let currentField = '';
            let inQuotes = false;
            for (let char of line) {
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    values.push(currentField.trim());
                    currentField = '';
                } else {
                    currentField += char;
                }
            }
            values.push(currentField.trim()); // 最後のフィールドを追加

            if (values.length > Math.max(memberNameIndex, quoteIndex)) {
                const memberName = values[memberNameIndex];
                let quote = values[quoteIndex];
                // ダブルクォーテーションで囲まれていたら削除
                if (quote.startsWith('"') && quote.endsWith('"')) {
                    quote = quote.substring(1, quote.length - 1).replace(/""/g, '"'); // "" は " に置換
                }

                const tagsString = tagsIndex !== -1 && values.length > tagsIndex ? values[tagsIndex] : '';
                const tags = tagsString ? tagsString.split(this.config.data.csvTagSeparator || '|') : [];

                if (memberName) {
                    if (!this.serifsByMember[memberName]) {
                        this.serifsByMember[memberName] = [];
                    }
                    this.serifsByMember[memberName].push({ quote, tags });
                }
            }
        }
        // セリフが一つも読み込めなかったメンバーにダミーセリフを割り当てる
        this.allMembers.forEach(member => {
            if (!this.serifsByMember[member.name] || this.serifsByMember[member.name].length === 0) {
                this.serifsByMember[member.name] = [{ quote: `${member.name}のセリフはCSVにありませんでした。`, tags: [] }];
                console.warn(`${member.name}さんのセリフがCSVに見つからなかったため、ダミーセリフを設定しました。`)
            }
        });
    }
    
    // 全メンバーにダミーセリフを生成する（CSV読み込み失敗時など）
    generateDummySerifsForAllMembers() {
        console.warn("セリフCSVの読み込みに失敗したため、全メンバーにダミーセリフを生成します。");
        this.allMembers.forEach(member => {
            if (!this.serifsByMember[member.name]) {
                this.serifsByMember[member.name] = [];
            }
            this.serifsByMember[member.name].push({ quote: `${member.name}のダミーセリフです。CSVを確認してください。`, tags: [] });
        });
    }


    // アプリ初期化時に全てのデータを読み込む
    async loadAllData() {
        await this.loadSer
