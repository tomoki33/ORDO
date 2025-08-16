# GitHub Actions 自動化設定ガイド

## 🚀 作成されたワークフロー

### 1. `add-to-project.yml` - 基本的なプロジェクト追加
- Issue/PR作成時にプロジェクトに自動追加
- ラベルに基づくフィルタリング

### 2. `project-automation.yml` - 高度な自動化
- ラベルに基づく自動的なフィールド設定
- Status の自動更新
- Epic の自動分類

### 3. `smart-project.yml` - インテリジェント管理
- JavaScript スクリプトによる高度な自動化
- 動的なフィールド設定
- PR との連携

## ⚙️ 設定手順

### STEP 1: Personal Access Token 作成

新しい Personal Access Token を以下の権限で作成:

**必要な権限:**
- `repo` (Full control)
- `project` (Project access)
- `write:org` (Organization access)

### STEP 2: GitHub Secrets 設定

1. GitHub リポジトリ → Settings → Secrets and variables → Actions
2. **New repository secret** をクリック
3. 以下のシークレットを追加:

```
Name: ADD_TO_PROJECT_PAT
Value: ghp_xxxxxxxxxxxxxxx (先ほど作成したトークン)
```

### STEP 3: プロジェクト URL の更新

現在のワークフローファイルの `project-url` を実際のプロジェクトURLに更新:

```yaml
# 更新が必要
project-url: https://github.com/users/tomoki33/projects/YOUR_PROJECT_NUMBER
```

## 🔍 プロジェクト URL の取得方法

1. GitHub で作成したプロジェクトを開く
2. ブラウザのURL を確認
3. `https://github.com/users/tomoki33/projects/1` の形式

## 🎯 自動化される機能

### ✅ Issue 作成時
- プロジェクトに自動追加
- ラベルから優先度を自動設定
- Epic を自動分類
- Status を "Backlog" に設定

### ✅ Issue 完了時  
- Status を "Done" に自動移動
- 完了日を記録

### ✅ PR 作成時
- プロジェクトに自動追加
- Status を "In Review" に設定

### ✅ ラベル変更時
- 優先度の自動更新
- Epic の再分類

## 🏷️ プロジェクトフィールド設定

プロジェクトに以下のカスタムフィールドを作成してください:

### Priority (Single select)
- 🔥 Critical (赤)
- ⚡ High (オレンジ) 
- 📋 Medium (黄色)
- 📅 Low (緑)

### Epic (Single select)
- 🤖 AI Vision (紫)
- 🎨 UI Core (青)
- 💾 Data (茶色)
- 🔧 Other (グレー)

### Size (Single select)
- 🐋 XL (8ポイント)
- 🦑 Large (5ポイント)
- 📏 Medium (3ポイント)
- 🐁 Small (1ポイント)

### Status (Single select)
- 📋 Backlog
- 🎯 Sprint
- 🔄 In Progress
- 👀 Review  
- ✅ Done
- 🚀 Released

## 🧪 テスト方法

1. 新しい Issue を作成
2. `mvp:critical` ラベルを付与
3. プロジェクトに自動追加されることを確認
4. Priority が "🔥 Critical" に設定されることを確認

## 🚨 トラブルシューティング

### エラー: "Resource not accessible by integration"
- Personal Access Token の権限を確認
- `project` スコープが有効か確認

### エラー: "Not Found"
- プロジェクト URL が正しいか確認
- プロジェクトがパブリックか確認

### フィールドが設定されない
- プロジェクトのカスタムフィールド名を確認
- 大文字・小文字の違いをチェック

## 🔄 次のステップ

1. **Personal Access Token** を作成
2. **GitHub Secrets** を設定
3. **プロジェクト URL** を更新
4. **カスタムフィールド** を作成
5. **テスト Issue** を作成して動作確認

この設定により、手動でのプロジェクト管理作業が大幅に削減されます！
