# GitHub Projects 自動化ガイド

## 📋 一括タスク登録の方法

GitHub Projectsでは**手動登録が基本**ですが、以下の方法で自動化できます：

### 🚀 **推奨方法1: GitHub API + Node.jsスクリプト**

#### 手順:
1. **Personal Access Token取得**
   - GitHub → Settings → Developer settings → Personal access tokens → Generate new token
   - 必要な権限: `repo`, `write:org`

2. **依存関係インストール**
   ```bash
   cd /Users/tomoki33/Desktop/Ordo/github-automation
   npm init -y
   npm install @octokit/rest
   ```

3. **設定更新**
   - `bulk-issue-creator.js` の CONFIG を更新:
   ```javascript
   const CONFIG = {
     owner: 'あなたのGitHubユーザー名',
     repo: 'ordo-app',
     token: '取得したPersonal Access Token'
   };
   ```

4. **実行**
   ```bash
   node bulk-issue-creator.js
   ```

#### ✅ 実行結果:
- ラベル14個自動作成
- マイルストーン3個自動作成  
- MVP Issues 8個自動作成
- 各Issueに適切なラベル・マイルストーン設定

### 🛠️ **方法2: GitHub CLI (gh) を使用**

```bash
# GitHub CLI インストール
brew install gh

# 認証
gh auth login

# Issues を一括作成（CSVから）
gh issue create --title "[MVP-001] 商品画像認識AI実装" --body-file task-templates/mvp-001.md --label "mvp:critical,feature:ai-vision"
```

### 📊 **方法3: CSV インポート (Projects Beta)**

1. **CSV ファイル作成**
```csv
Title,Description,Labels,Milestone,Assignee
"[MVP-001] 商品画像認識AI実装","商品画像から自動認識","mvp:critical,feature:ai-vision","MVP v0.1",""
"[MVP-002] 食品状態判定AI","食品の新鮮度をAI判定","mvp:critical,feature:ai-vision","MVP v0.1",""
```

2. **GitHub Projects (Beta) で Import**
   - Projects → Add items → Import from CSV

## 🎯 **Projects Board 設定手順**

### 1. GitHub Projects (New) 作成
```bash
# GitHub Projects (Beta) を使用
1. リポジトリ → Projects → New project
2. Board view を選択
3. プロジェクト名: "Ordo Development"
```

### 2. Column 設定
```
📋 Backlog     - 全タスク
🎯 Sprint      - 現在作業中
🔄 In Progress - 実装中
👀 Review      - レビュー待ち  
✅ Done        - 完了
🚀 Released    - リリース済み
```

### 3. Custom Fields 追加
- **Priority**: P0, P1, P2, P3
- **Size**: XS(1), S(2), M(3), L(5), XL(8)
- **Epic**: AI-Vision, UI-Core, Data, Voice
- **Status**: Todo, In Progress, Review, Done

## ⚡ **一括操作のコマンド例**

### Issues 作成
```bash
# MVP全タスクを一括作成
for task in MVP-001 MVP-002 MVP-003; do
  gh issue create \
    --title "[$task] タスク名" \
    --body "詳細内容" \
    --label "mvp:critical" \
    --milestone "MVP v0.1"
done
```

### ラベル一括作成
```bash
# ラベルを一括作成
labels=("mvp:critical:ff0000" "mvp:high:ff8800" "feature:ai-vision:8b5cf6")
for label in "${labels[@]}"; do
  IFS=':' read -r name color <<< "$label"
  gh api repos/:owner/:repo/labels -f name="$name" -f color="$color"
done
```

## 📈 **自動化のメリット**

### ✅ **時間短縮**
- 手動: 1タスク3-5分 × 94タスク = **約8時間**
- 自動: スクリプト実行3分 = **99%時間削減**

### ✅ **品質向上**  
- 一貫したフォーマット
- タイポ・設定ミスなし
- テンプレート標準化

### ✅ **メンテナンス容易**
- 設定変更時はスクリプト修正のみ
- バージョン管理で履歴追跡
- 他プロジェクトでの再利用

## 🔧 **追加の自動化アイデア**

### GitHub Actions 連携
```yaml
# .github/workflows/project-automation.yml
name: Project Automation
on:
  issues:
    types: [opened, closed]
jobs:
  update-project:
    runs-on: ubuntu-latest
    steps:
      - name: Add to project
        uses: actions/add-to-project@v0.4.0
```

### Zapier/IFTTT 連携
- Notion データベース → GitHub Issues
- Google Sheets → GitHub Projects
- Slack 通知 → タスク自動作成

## ⚠️ **注意事項**

### API制限
- GitHub API: 5000 requests/hour
- 大量作成時は `sleep` で間隔調整

### 権限設定
- Personal Access Token の適切なスコープ設定
- Organization の場合は admin 権限必要

### バックアップ
- 既存データのバックアップ推奨
- テスト用リポジトリでの事前検証

## 🎯 **実行推奨順序**

1. **テスト環境で検証** (新規リポジトリ作成)
2. **スクリプト実行** (ラベル→マイルストーン→Issues)
3. **Projects Board 作成・設定**
4. **Issues を Board に追加**
5. **Custom Fields 設定**

この手順で、**手動で8時間かかる作業が3分で完了**します！
