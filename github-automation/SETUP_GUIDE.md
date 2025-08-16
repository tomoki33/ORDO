# 🚀 GitHub Projects 自動セットアップ手順

## 📋 現状の課題
- GitHub Projectsは基本的に**手動でのタスク登録が必要**
- 94個のタスクを手動作成すると約**8時間**かかる
- 設定ミス・フォーマット不統一のリスク

## ✅ 解決策: 自動化スクリプト

### 🎯 **3分で完了する自動セットアップ**

#### STEP 1: 準備 (5分)
```bash
# 1. Personal Access Token 取得
# GitHub → Settings → Developer settings → Personal access tokens
# 権限: repo, write:org

# 2. 依存関係インストール  
cd /Users/tomoki33/Desktop/Ordo/github-automation
npm install
```

#### STEP 2: 設定 (2分)
`bulk-issue-creator.js` の CONFIG を更新:
```javascript
const CONFIG = {
  owner: 'あなたのGitHubユーザー名',    // ← 変更
  repo: 'ordo-app',                    // ← リポジトリ名
  token: 'github_pat_xxxxxxxxxxxxx'    // ← 取得したトークン
};
```

#### STEP 3: 実行 (1分)
```bash
npm run setup-project
```

#### STEP 4: Projects Board 作成 (3分)
1. GitHub リポジトリ → Projects → New project
2. Board view 選択
3. 作成された Issues を Board に追加

## 🎊 **自動作成される内容**

### ✅ ラベル (14個)
- `mvp:critical`, `mvp:high`, `mvp:nice-to-have`
- `feature:ai-vision`, `feature:ui-core`, `feature:data`
- `size:s`, `size:m`, `size:l`, `size:xl`  
- `priority:p0`, `priority:p1`, `priority:p2`, `priority:p3`

### ✅ マイルストーン (3個)
- MVP v0.1 (2024-11-15)
- Beta v0.5 (2025-02-15)  
- Production v1.0 (2025-08-15)

### ✅ Issues (8個) - MVP Phase 1
1. **[MVP-001]** 商品画像認識AI実装 (48h)
2. **[MVP-002]** 食品状態判定AI (24h)
3. **[MVP-003]** 複数商品同時認識 (16h)
4. **[MVP-004]** カメラUI実装 (20h)
5. **[MVP-005]** 商品一覧表示 (16h)
6. **[MVP-006]** 基本データベース (16h)
7. **[MVP-007]** 期限通知機能 (12h)
8. **[MVP-008]** 基本設定画面 (8h)

## 📊 **効率比較**

| 方法 | 時間 | 品質 | メンテナンス |
|------|------|------|-------------|
| **手動作成** | 8時間 | ❌ 不統一 | ❌ 困難 |
| **自動化** | 3分 | ✅ 統一 | ✅ 容易 |

## 🔧 **さらなる自動化**

### GitHub Actions 連携
- Issue作成時にProjectへ自動追加
- ラベル変更時にColumn移動
- PR作成時にIssue自動Close

### 他ツール連携
- Notion → GitHub Issues 同期
- Google Sheets → Projects 連携
- Slack → タスク自動作成

## ⚡ **今すぐ始める手順**

1. **リポジトリ作成**
   ```bash
   # GitHub で新規リポジトリ "ordo-app" を作成
   ```

2. **トークン取得**  
   ```
   GitHub → Settings → Developer settings → 
   Personal access tokens → Generate new token
   ```

3. **スクリプト実行**
   ```bash
   cd github-automation
   npm install
   # CONFIG 設定後
   npm run setup-project
   ```

4. **Projects Board 作成**
   ```
   GitHub → Projects → New project → Board
   ```

**これで、8時間の手作業が3分で完了します！** 🎉

## 🎯 次のアクション

1. まず**テスト用リポジトリ**で試行
2. 問題なければ**本番リポジトリ**で実行  
3. **Projects Board**を作成・設定
4. **開発開始**！

自動化により、セットアップではなく**実際の開発**に時間を集中できます。
