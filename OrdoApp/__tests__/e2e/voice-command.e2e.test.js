/**
 * Voice Command E2E Tests
 * 音声コマンドのエンドツーエンドテスト
 */

describe('Voice Command E2E Tests', () => {
  beforeEach(async () => {
    await resetAppData();
    await waitForElement('home-screen');
  });

  describe('Voice Recognition Flow', () => {
    test('should enable voice recognition and process commands', async () => {
      // Navigate to voice command screen
      await tapAndWait('voice-command-button', 'voice-command-screen');
      
      // Verify voice permission is granted
      await waitForElement('voice-permission-status');
      await expect(element(by.id('voice-permission-status'))).toHaveText('Authorized');
      
      // Start voice recognition
      await tapAndWait('start-voice-button', 'voice-listening-indicator');
      
      // Verify listening state
      await expect(element(by.id('voice-listening-indicator'))).toBeVisible();
      
      // Simulate voice input
      await simulateVoiceInput('りんごを3つ追加', 0.9);
      
      // Wait for command processing
      await waitForElementWithText('Command processed successfully');
      
      // Verify command was executed
      await waitForElement('product-added-confirmation');
      await expect(element(by.text('りんご (3個) を追加しました'))).toBeVisible();
      
      // Stop voice recognition
      await element(by.id('stop-voice-button')).tap();
      
      // Verify stopped state
      await expect(element(by.id('voice-listening-indicator'))).not.toBeVisible();
    });

    test('should handle low confidence voice commands', async () => {
      await tapAndWait('voice-command-button', 'voice-command-screen');
      await tapAndWait('start-voice-button', 'voice-listening-indicator');
      
      // Simulate low confidence voice input
      await simulateVoiceInput('unclear speech', 0.3);
      
      // Should show suggestion dialog
      await waitForElementWithText('音声コマンド確認');
      await expect(element(by.text('もしかして以下のコマンドですか？'))).toBeVisible();
      
      // Select first suggestion
      await element(by.text('りんごを追加')).tap();
      
      // Verify command was processed
      await waitForElement('product-added-confirmation');
    });

    test('should handle voice recognition errors gracefully', async () => {
      await tapAndWait('voice-command-button', 'voice-command-screen');
      
      // Simulate voice recognition error
      await device.shake(); // This could trigger error simulation
      
      // Should show error message
      await waitForElementWithText('音声認識でエラーが発生しました');
      
      // Verify app remains functional
      await element(by.text('OK')).tap();
      await expect(element(by.id('voice-command-screen'))).toBeVisible();
    });
  });

  describe('Multi-language Voice Support', () => {
    test('should switch voice recognition language', async () => {
      await tapAndWait('voice-command-button', 'voice-command-screen');
      await tapAndWait('voice-settings-button', 'voice-settings-screen');
      
      // Change language to English
      await element(by.id('language-selector')).tap();
      await element(by.text('English')).tap();
      
      // Save settings
      await element(by.id('save-settings-button')).tap();
      
      // Test English voice command
      await tapAndWait('start-voice-button', 'voice-listening-indicator');
      await simulateVoiceInput('add three apples', 0.9);
      
      // Verify English command processing
      await waitForElementWithText('Command processed successfully');
      await expect(element(by.text('apples (3) added successfully'))).toBeVisible();
    });
  });

  describe('Voice Command Integration', () => {
    test('should integrate voice commands with product management', async () => {
      // Add product via voice
      await tapAndWait('voice-command-button', 'voice-command-screen');
      await tapAndWait('start-voice-button', 'voice-listening-indicator');
      await simulateVoiceInput('バナナを5つ追加', 0.9);
      
      await waitForElement('product-added-confirmation');
      
      // Navigate back to home
      await element(by.id('back-button')).tap();
      await waitForElement('home-screen');
      
      // Verify product appears in list
      await element(by.id('product-list')).scroll(200, 'down');
      await expect(element(by.text('バナナ (5個)'))).toBeVisible();
      
      // Remove product via voice
      await tapAndWait('voice-command-button', 'voice-command-screen');
      await tapAndWait('start-voice-button', 'voice-listening-indicator');
      await simulateVoiceInput('バナナを削除', 0.9);
      
      // Confirm deletion
      await waitForElementWithText('コマンド確認');
      await element(by.text('実行')).tap();
      
      await waitForElement('product-removed-confirmation');
      
      // Verify product removed from list
      await element(by.id('back-button')).tap();
      await expect(element(by.text('バナナ (5個)'))).not.toBeVisible();
    });

    test('should show voice command history', async () => {
      // Execute multiple voice commands
      const commands = [
        'りんごを3つ追加',
        'パンを2つ追加',
        '在庫を確認',
      ];
      
      for (const command of commands) {
        await tapAndWait('voice-command-button', 'voice-command-screen');
        await tapAndWait('start-voice-button', 'voice-listening-indicator');
        await simulateVoiceInput(command, 0.9);
        await waitForElement('command-processed-indicator');
        await element(by.id('back-button')).tap();
      }
      
      // View command history
      await tapAndWait('voice-command-button', 'voice-command-screen');
      await tapAndWait('command-history-button', 'command-history-screen');
      
      // Verify all commands appear in history
      for (const command of commands) {
        await expect(element(by.text(command))).toBeVisible();
      }
      
      // Check command details
      await element(by.text('りんごを3つ追加')).tap();
      await waitForElement('command-detail-screen');
      await expect(element(by.id('command-confidence'))).toBeVisible();
      await expect(element(by.id('execution-time'))).toBeVisible();
    });
  });

  describe('Voice Command Analytics', () => {
    test('should track voice command usage analytics', async () => {
      // Execute commands to generate analytics data
      const commands = [
        'りんごを追加',
        'バナナを追加',
        'りんごを検索',
        '在庫を確認',
        'ヘルプ',
      ];
      
      for (const command of commands) {
        await tapAndWait('voice-command-button', 'voice-command-screen');
        await tapAndWait('start-voice-button', 'voice-listening-indicator');
        await simulateVoiceInput(command, 0.9);
        await waitForElement('command-processed-indicator');
        await element(by.id('back-button')).tap();
      }
      
      // Navigate to analytics
      await tapAndWait('analytics-button', 'analytics-screen');
      await tapAndWait('voice-analytics-tab', 'voice-analytics-view');
      
      // Verify analytics data
      await expect(element(by.id('total-commands-count'))).toHaveText('5');
      await expect(element(by.id('successful-commands-count'))).toHaveText('5');
      
      // Check top commands
      await scrollAndFind('analytics-scroll-view', 'top-commands-section');
      await expect(element(by.text('ADD_PRODUCT'))).toBeVisible();
      await expect(element(by.text('CHECK_INVENTORY'))).toBeVisible();
    });
  });

  describe('Performance and Reliability', () => {
    test('should handle rapid voice commands', async () => {
      await tapAndWait('voice-command-button', 'voice-command-screen');
      
      // Execute rapid commands
      const rapidCommands = [
        'りんごを1つ追加',
        'バナナを1つ追加',
        'オレンジを1つ追加',
      ];
      
      for (const command of rapidCommands) {
        await tapAndWait('start-voice-button', 'voice-listening-indicator');
        await simulateVoiceInput(command, 0.9);
        await waitForElement('command-processed-indicator');
        // Short delay between commands
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Verify all commands were processed
      await element(by.id('back-button')).tap();
      await waitForElement('home-screen');
      
      for (const productName of ['りんご', 'バナナ', 'オレンジ']) {
        await expect(element(by.text(`${productName} (1個)`))).toBeVisible();
      }
    });

    test('should maintain performance during extended use', async () => {
      const startTime = Date.now();
      
      // Execute many commands to test performance
      for (let i = 0; i < 20; i++) {
        await tapAndWait('voice-command-button', 'voice-command-screen');
        await tapAndWait('start-voice-button', 'voice-listening-indicator');
        await simulateVoiceInput(`商品${i}を追加`, 0.9);
        await waitForElement('command-processed-indicator');
        await element(by.id('back-button')).tap();
      }
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Should complete within reasonable time (less than 2 minutes)
      expect(totalTime).toBeLessThan(120000);
      
      // Verify app is still responsive
      await tapAndWait('home-screen-button', 'home-screen');
      await expect(element(by.id('home-screen'))).toBeVisible();
    });

    test('should recover from memory pressure', async () => {
      // Simulate memory pressure by creating many operations
      for (let i = 0; i < 50; i++) {
        await tapAndWait('voice-command-button', 'voice-command-screen');
        await element(by.id('back-button')).tap();
      }
      
      // App should still be functional
      await tapAndWait('voice-command-button', 'voice-command-screen');
      await tapAndWait('start-voice-button', 'voice-listening-indicator');
      await simulateVoiceInput('メモリテスト商品を追加', 0.9);
      
      await waitForElement('command-processed-indicator');
      await expect(element(by.text('Command processed successfully'))).toBeVisible();
    });
  });

  describe('Accessibility and Usability', () => {
    test('should be accessible with screen reader', async () => {
      // Enable accessibility for testing
      await device.setAccessibility(true);
      
      await tapAndWait('voice-command-button', 'voice-command-screen');
      
      // Check accessibility labels
      await checkAccessibility('start-voice-button');
      await checkAccessibility('voice-settings-button');
      await checkAccessibility('command-history-button');
      
      // Test voice button accessibility
      await expect(element(by.id('start-voice-button')))
        .toHaveAccessibilityLabel('Start voice recognition');
      
      await device.setAccessibility(false);
    });

    test('should provide visual feedback for voice state', async () => {
      await tapAndWait('voice-command-button', 'voice-command-screen');
      
      // Check initial state
      await expect(element(by.id('voice-state-indicator'))).toHaveText('Ready');
      
      // Start listening
      await element(by.id('start-voice-button')).tap();
      await expect(element(by.id('voice-state-indicator'))).toHaveText('Listening...');
      
      // Simulate speech detection
      await simulateVoiceInput('テスト', 0.9);
      await expect(element(by.id('voice-state-indicator'))).toHaveText('Processing...');
      
      // After processing
      await waitForElement('command-processed-indicator');
      await expect(element(by.id('voice-state-indicator'))).toHaveText('Ready');
    });
  });
});
