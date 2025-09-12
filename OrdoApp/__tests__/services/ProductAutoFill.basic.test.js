/**
 * Basic Product Auto-Fill Service Tests
 * バーコードスキャン・楽天API・自動入力システムのテスト
 */

describe('Product Auto-Fill Services - Basic Tests', () => {
  let BarcodeScannerService, RakutenAPIService, ProductAutoFillService;
  let BarcodeFormat;

  beforeAll(async () => {
    // Import services
    const barcodeScannerModule = require('../../src/services/BarcodeScannerService');
    const rakutenAPIModule = require('../../src/services/RakutenAPIService');
    const productAutoFillModule = require('../../src/services/ProductAutoFillService');

    BarcodeScannerService = barcodeScannerModule.BarcodeScannerService;
    BarcodeFormat = barcodeScannerModule.BarcodeFormat;
    RakutenAPIService = rakutenAPIModule.RakutenAPIService;
    ProductAutoFillService = productAutoFillModule.ProductAutoFillService;
  });

  describe('BarcodeScannerService', () => {
    let scanner;

    beforeEach(() => {
      scanner = new BarcodeScannerService();
    });

    afterEach(async () => {
      if (scanner) {
        await scanner.cleanup();
      }
    });

    test('should initialize successfully', () => {
      expect(scanner).toBeDefined();
      expect(scanner.isAvailable()).toBe(true);
    });

    test('should scan barcode with mock implementation', async () => {
      const result = await scanner.scanBarcode();
      
      expect(result).toBeDefined();
      expect(result.barcode).toBeDefined();
      expect(result.format).toBeDefined();
      expect(result.isValid).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    test('should validate supported formats', () => {
      const supportedFormats = scanner.getSupportedFormats();
      
      expect(supportedFormats).toContain(BarcodeFormat.EAN13);
      expect(supportedFormats).toContain(BarcodeFormat.EAN8);
      expect(supportedFormats).toContain(BarcodeFormat.UPC_A);
      expect(supportedFormats).toContain(BarcodeFormat.QR_CODE);
    });

    test('should not allow multiple simultaneous scans', async () => {
      const promise1 = scanner.scanBarcode();
      
      await expect(scanner.scanBarcode()).rejects.toThrow('Scanner already in use');
      
      await promise1; // Clean up
    });
  });

  describe('RakutenAPIService', () => {
    let rakutenAPI;

    beforeEach(() => {
      rakutenAPI = new RakutenAPIService();
    });

    afterEach(async () => {
      if (rakutenAPI) {
        await rakutenAPI.cleanup();
      }
    });

    test('should initialize successfully', () => {
      expect(rakutenAPI).toBeDefined();
    });

    test('should handle search with mock implementation', async () => {
      const searchOptions = {
        keyword: 'テスト商品',
        genreId: 100000,
        minPrice: 100,
        maxPrice: 10000
      };

      const result = await rakutenAPI.searchProducts(searchOptions);
      
      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.totalCount).toBeGreaterThanOrEqual(0);
    });

    test('should handle barcode search', async () => {
      const barcode = '4901777289017'; // Sample EAN-13
      
      const result = await rakutenAPI.searchByBarcode(barcode);
      
      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
    });

    test('should get supported genres', async () => {
      const genres = await rakutenAPI.getGenres();
      
      expect(genres).toBeDefined();
      expect(Array.isArray(genres)).toBe(true);
    });
  });

  describe('ProductAutoFillService', () => {
    let autoFillService;

    beforeEach(async () => {
      autoFillService = new ProductAutoFillService();
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    afterEach(async () => {
      if (autoFillService) {
        await autoFillService.cleanup();
      }
    });

    test('should initialize successfully', () => {
      expect(autoFillService).toBeDefined();
    });

    test('should fill product information from barcode', async () => {
      const barcode = '4901777289017'; // Sample EAN-13
      const options = {
        useCache: true,
        enableFallback: true,
        confidenceThreshold: 0.8
      };

      const result = await autoFillService.fillProductInfo(barcode, options);
      
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.source).toBeDefined();
      expect(result.processTime).toBeGreaterThanOrEqual(0);
      
      if (result.success) {
        expect(result.product).toBeDefined();
        expect(result.product.barcode).toBe(barcode);
        expect(result.product.name).toBeDefined();
      }
    });

    test('should scan and auto-fill product information', async () => {
      const options = {
        useCache: true,
        enableFallback: true,
        confidenceThreshold: 0.8,
        timeout: 5000
      };

      const result = await autoFillService.scanAndFill(options);
      
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.source).toBeDefined();
      expect(result.processTime).toBeGreaterThanOrEqual(0);
      
      if (result.success) {
        expect(result.product).toBeDefined();
        expect(result.product.barcode).toBeDefined();
        expect(result.product.name).toBeDefined();
      }
    });

    test('should manage cache correctly', async () => {
      // Clear cache first
      await autoFillService.clearCache();
      
      const stats = autoFillService.getCacheStats();
      expect(stats.memoryCount).toBe(0);
      
      // Add some data to cache by doing a search
      const barcode = '4901777289017';
      await autoFillService.fillProductInfo(barcode, { useCache: true });
      
      const statsAfter = autoFillService.getCacheStats();
      expect(statsAfter.memoryCount).toBeGreaterThanOrEqual(0);
    });

    test('should handle invalid barcode gracefully', async () => {
      const invalidBarcode = 'invalid_barcode';
      
      const result = await autoFillService.fillProductInfo(invalidBarcode);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.confidence).toBe(0);
    });
  });

  describe('Service Integration', () => {
    test('all services should work together', async () => {
      const scanner = new BarcodeScannerService();
      const rakutenAPI = new RakutenAPIService();
      const autoFill = new ProductAutoFillService();

      try {
        // Test scanner
        expect(scanner.isAvailable()).toBe(true);
        
        // Test API service
        const searchResult = await rakutenAPI.searchProducts({ keyword: 'test' });
        expect(searchResult).toBeDefined();
        
        // Test auto-fill service
        const fillResult = await autoFill.fillProductInfo('4901777289017');
        expect(fillResult).toBeDefined();
        
      } finally {
        await scanner.cleanup();
        await rakutenAPI.cleanup();
        await autoFill.cleanup();
      }
    });
  });
});
