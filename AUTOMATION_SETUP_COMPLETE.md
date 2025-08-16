# GitHub Automation 自動化完了ガイド

あなたのOrdoプロジェクト用のGitHub自動化システムが正常に設定されました！

## 🎉 完了している項目

✅ **GitHub Actions ワークフロー**
- `.github/workflows/add-to-project.yml` - Issue自動追加
- `.github/workflows/project-automation.yml` - プロジェクト管理
- `.github/workflows/smart-project.yml` - 高度な自動化

✅ **Issue自動生成システム**  
- `bulk-issue-creator.js` - 一括Issue作成スクリプト
- 8個のMVPタスクを自動生成済み

✅ **セキュリティ対策**
- Personal Access Tokenを環境変数に変更
- Secret Scanningによる保護有効

## 🔧 残りの設定手順

### 1. Personal Access Token の設定

1. [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. 新しいClassic Tokenを作成（Fine-grained tokenは使用しない）
3. 以下の権限を付与：
   ```
   ✅ repo (Full control)
   ✅ read:project 
   ✅ write:project
   ✅ admin:repo_hook
   ```

### 2. Repository Secrets の設定

1. [ORDO Repository > Settings > Secrets and variables > Actions](https://github.com/tomoki33/ORDO/settings/secrets/actions)
2. "New repository secret"をクリック
3. 以下のSecretを追加：
   ```
   Name: ADD_TO_PROJECT_PAT
   Value: 上記で作成したToken
   ```

### 3. GitHub Projects の設定

1. [ORDO Repository > Projects](https://github.com/tomoki33/ORDO/projects)
2. "New project"で新しいProjectを作成
3. プロジェクトでカスタムフィールドを追加：
   ```
   - Priority: High/Medium/Low
   - Epic: Text field
   - Size: 1/2/3/5/8
   - Status: Todo/In Progress/Done
   ```

### 4. ワークフローの設定更新

Projectを作成後、正しいプロジェクト番号を確認して以下のファイルを更新：

`.github/workflows/add-to-project.yml`:
```yaml
PROJECT_URL: "https://github.com/users/tomoki33/projects/YOUR_PROJECT_NUMBER"
```

## 🚀 使用方法

### Issue作成時の自動化
1. 新しいIssueを作成
2. ラベル（`MVP`, `enhancement`, `bug`など）を追加  
3. GitHub ActionsがIssueを自動的にProjectに追加
4. 優先度やエピック情報を自動設定

### 手動Issue一括作成
```bash
cd github-automation
GITHUB_TOKEN=your_token node bulk-issue-creator.js
```

## 📋 次のステップ

1. **GitHub Projects設定完了** → 自動化テスト
2. **MVP開発開始** → React Native環境構築  
3. **AI機能実装** → 画像認識システム開発

問題が発生した場合は、Actions タブでワークフローの実行状況を確認してください。

---

**注意**: GitHub Personal Access Tokenは絶対にソースコードにコミットしないでください。常に環境変数を使用してください。
