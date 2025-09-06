/**
 * 受け入れ要件検証実行スクリプト
 */

import { AcceptanceCriteriaValidator } from '../src/utils/AcceptanceCriteriaValidator';

async function runAcceptanceValidation() {
  try {
    console.log('🎯 Ordo App 受け入れ要件検証開始\n');
    
    const validator = AcceptanceCriteriaValidator.getInstance();
    const report = await validator.validateAllCriteria();
    
    console.log('\n📋 最終検証結果:');
    console.log('============================================================');
    
    if (report.overallStatus === 'passed') {
      console.log('🎉 すべての受け入れ要件を満たしています！');
      console.log('✅ プロダクションリリース準備完了');
    } else {
      console.log('⚠️  一部の受け入れ要件が未達成です');
      console.log('📝 改善が必要な項目があります');
    }
    
    console.log(`\n📊 合格率: ${report.summary.passed}/${report.summary.totalCriteria} (${Math.round(report.summary.passed / report.summary.totalCriteria * 100)}%)`);
    
    if (report.summary.blockers.length > 0) {
      console.log('\n🚫 リリースブロッカー:');
      report.summary.blockers.forEach((blocker: string) => {
        console.log(`   ${blocker}`);
      });
    }
    
  } catch (error) {
    console.error('❌ 受け入れ要件検証失敗:', error);
  }
}

// 実行
runAcceptanceValidation();
