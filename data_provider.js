// data_provider.js - データソースの管理

class DataProvider {
    constructor(config) {
        this.config = config;
        this.members = this.parseMembers(config.members);
        this.serifs = []; // 今回はセリフCSVの読み込みは後回し
        this.userSettings = this.loadUserSettings();
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
            weight: this.userSettings?.memberWeights?.[member.id] || this.config.defaultMemberWeight || 1,
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

    // 特定メンバーの指定タイプ(ero/hutuu)の画像パスリストを取得
    getMemberImagePaths(memberId, imageType = 'ero') {
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
            return ['images/placeholder.png']; // 画像がない場合のプレースホルダー
        }

        for (let i = 1; i <= count; i++) {
            // 画像ファイル名は 1.jpg, 2.jpg ... と想定
            paths.push(`${basePath}${i}.jpg`);
        }
        return paths;
    }

    // ダミーのセリフを取得 (今回は固定)
    getRandomSerif(memberId) {
        // 本来はCSVから読み込んだセリフを返す
        const member = this.getMemberById(memberId);
        return member ? `${member.name}のサンプルセリフです。` : "セリフが見つかりません。";
    }

    // --- ユーザー設定関連 (今回はダミー実装) ---
    loadUserSettings() {
        // localStorageから読み込む想定 (app.jsで実装予定)
        const storedWeights = localStorage.getItem(this.config.localStorageKeys.memberWeights);
        return {
            memberWeights: storedWeights ? JSON.parse(storedWeights) : {}
        };
    }

    saveMemberWeights(weights) {
        localStorage.setItem(this.config.localStorageKeys.memberWeights, JSON.stringify(weights));
        // weightsをthis.membersにも反映
        this.members.forEach(member => {
            if (weights[member.id] !== undefined) {
                member.weight = weights[member.id];
            }
        });
        console.log("メンバー出現率を保存しました:", weights);
    }

    // --- セリフCSV読み込み (今回はまだ実装しない) ---
    async loadSerifs() {
        // const response = await fetch(this.config.data.serifCsvPath);
        // const csvData = await response.text();
        // this.serifs = this.parseSerifCsv(csvData);
        console.log("セリフデータは後ほど読み込みます。");
    }

    parseSerifCsv(csvData) {
        // CSVパース処理 (papaparse.jsなどのライブラリ利用も検討)
        return [];
    }

    async loadAllData() {
        await this.loadSerifs(); // 今回は中身はほぼ何もしない
        // 他にも読み込むべきデータがあればここに追加
    }
}
