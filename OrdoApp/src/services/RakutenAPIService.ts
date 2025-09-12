/**
 * RakutenAPI Service
 * Handles product information retrieval from Rakuten API
 */

import { LoggingService, LogCategory } from './LoggingService';

export interface ProductInfo {
  itemCode: string;
  itemName: string;
  itemCaption: string;
  itemPrice: number;
  itemUrl: string;
  imageUrl: string;
  shopName: string;
  shopCode: string;
  reviewCount?: number;
  reviewAverage?: number;
  genreId?: string;
  availability?: number;
  taxFlag?: number;
  postageFlag?: number;
  creditCardFlag?: number;
  shopOfTheYearFlag?: number;
  shipOverseasFlag?: number;
  shipOverseasArea?: string;
  asurakuFlag?: number;
  asurakuClosingTime?: string;
  asurakuArea?: string;
  affiliateUrl?: string;
  smallImageUrls?: string[];
  mediumImageUrls?: string[];
  carrier?: number;
  giftFlag?: number;
}

export interface SearchOptions {
  keyword?: string;
  genreId?: string;
  shopCode?: string;
  itemCode?: string;
  sort?: 'standard' | 'sales' | 'price+asc' | 'price+desc' | 'review+desc' | 'new+desc';
  minPrice?: number;
  maxPrice?: number;
  availability?: 0 | 1;
  field?: number;
  carrier?: number;
  imageFlag?: 0 | 1;
  orFlag?: 0 | 1;
  NGKeyword?: string;
  genreInformationFlag?: 0 | 1;
  tagInformationFlag?: 0 | 1;
  page?: number;
  hits?: number;
}

export interface SearchResult {
  count: number;
  page: number;
  first: number;
  last: number;
  hits: number;
  carrier: number;
  pageCount: number;
  items: ProductInfo[];
  genreInformation?: any[];
  tagInformation?: any[];
}

export interface APIError {
  error: string;
  error_description: string;
}

export class RakutenAPIService {
  private static instance: RakutenAPIService;
  private logger: LoggingService;
  private applicationId: string;
  private affiliateId?: string;
  private baseUrl: string = 'https://app.rakuten.co.jp/services/api';
  private rateLimitDelay: number = 100; // 100ms between requests

  private constructor() {
    this.logger = new LoggingService();
    // In production, these should be set from environment variables
    this.applicationId = process.env.RAKUTEN_APPLICATION_ID || 'YOUR_APPLICATION_ID';
    this.affiliateId = process.env.RAKUTEN_AFFILIATE_ID;
  }

  public static getInstance(): RakutenAPIService {
    if (!RakutenAPIService.instance) {
      RakutenAPIService.instance = new RakutenAPIService();
    }
    return RakutenAPIService.instance;
  }

  /**
   * Initialize the Rakuten API service
   */
  public async initialize(applicationId: string, affiliateId?: string): Promise<void> {
    try {
      this.logger.info(LogCategory.SYSTEM, 'Initializing Rakuten API service');
      
      this.applicationId = applicationId;
      this.affiliateId = affiliateId;
      
      // Test API connection
      await this.testConnection();
      
      this.logger.info(LogCategory.SYSTEM, 'Rakuten API service initialized successfully');
    } catch (error) {
      this.logger.error(LogCategory.ERROR, 'Failed to initialize Rakuten API service', error as Error);
      throw error;
    }
  }

  /**
   * Test API connection
   */
  private async testConnection(): Promise<void> {
    try {
      // Perform a simple search to test the connection
      await this.searchProducts({ keyword: 'test', hits: 1 });
    } catch (error) {
      throw new Error(`Rakuten API connection test failed: ${error}`);
    }
  }

  /**
   * Search products by keyword or barcode
   */
  public async searchProducts(options: SearchOptions): Promise<SearchResult> {
    try {
      this.logger.info(LogCategory.NETWORK, 'Searching products on Rakuten', { options });

      const params = this.buildSearchParams(options);
      const url = `${this.baseUrl}/IchibaItem/Search/20170706?${params}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json() as APIError;
        throw new Error(`API Error: ${errorData.error} - ${errorData.error_description}`);
      }

      const data = await response.json();
      const searchResult = this.processSearchResponse(data);

      this.logger.info(LogCategory.NETWORK, 'Product search completed', {
        count: searchResult.count,
        items: searchResult.items.length,
      });

      // Rate limiting
      await this.delay(this.rateLimitDelay);

      return searchResult;
    } catch (error) {
      this.logger.error(LogCategory.ERROR, 'Product search failed', error as Error, { options });
      throw error;
    }
  }

  /**
   * Search products by barcode
   */
  public async searchByBarcode(barcode: string): Promise<ProductInfo[]> {
    try {
      this.logger.info(LogCategory.NETWORK, 'Searching products by barcode', { barcode });

      // Search by barcode as keyword
      const searchResult = await this.searchProducts({
        keyword: barcode,
        hits: 10,
        sort: 'standard',
      });

      // Filter results that might be relevant to the barcode
      const relevantProducts = searchResult.items.filter(item => 
        item.itemName.includes(barcode) || 
        item.itemCaption.includes(barcode) ||
        item.itemCode === barcode
      );

      this.logger.info(LogCategory.NETWORK, 'Barcode search completed', {
        barcode,
        totalResults: searchResult.items.length,
        relevantResults: relevantProducts.length,
      });

      return relevantProducts;
    } catch (error) {
      this.logger.error(LogCategory.ERROR, 'Barcode search failed', error as Error, { barcode });
      throw error;
    }
  }

  /**
   * Get product details by item code
   */
  public async getProductDetails(itemCode: string): Promise<ProductInfo | null> {
    try {
      this.logger.info(LogCategory.NETWORK, 'Getting product details', { itemCode });

      const searchResult = await this.searchProducts({
        itemCode,
        hits: 1,
      });

      const product = searchResult.items.length > 0 ? searchResult.items[0] : null;

      this.logger.info(LogCategory.NETWORK, 'Product details retrieved', {
        itemCode,
        found: !!product,
      });

      return product;
    } catch (error) {
      this.logger.error(LogCategory.ERROR, 'Failed to get product details', error as Error, { itemCode });
      throw error;
    }
  }

  /**
   * Build search parameters for API request
   */
  private buildSearchParams(options: SearchOptions): string {
    const params = new URLSearchParams();

    // Required parameters
    params.append('applicationId', this.applicationId);
    params.append('format', 'json');

    // Optional parameters
    if (options.keyword) params.append('keyword', options.keyword);
    if (options.genreId) params.append('genreId', options.genreId);
    if (options.shopCode) params.append('shopCode', options.shopCode);
    if (options.itemCode) params.append('itemCode', options.itemCode);
    if (options.sort) params.append('sort', options.sort);
    if (options.minPrice !== undefined) params.append('minPrice', options.minPrice.toString());
    if (options.maxPrice !== undefined) params.append('maxPrice', options.maxPrice.toString());
    if (options.availability !== undefined) params.append('availability', options.availability.toString());
    if (options.field !== undefined) params.append('field', options.field.toString());
    if (options.carrier !== undefined) params.append('carrier', options.carrier.toString());
    if (options.imageFlag !== undefined) params.append('imageFlag', options.imageFlag.toString());
    if (options.orFlag !== undefined) params.append('orFlag', options.orFlag.toString());
    if (options.NGKeyword) params.append('NGKeyword', options.NGKeyword);
    if (options.genreInformationFlag !== undefined) params.append('genreInformationFlag', options.genreInformationFlag.toString());
    if (options.tagInformationFlag !== undefined) params.append('tagInformationFlag', options.tagInformationFlag.toString());
    if (options.page !== undefined) params.append('page', options.page.toString());
    if (options.hits !== undefined) params.append('hits', options.hits.toString());

    // Add affiliate ID if available
    if (this.affiliateId) {
      params.append('affiliateId', this.affiliateId);
    }

    return params.toString();
  }

  /**
   * Process API search response
   */
  private processSearchResponse(data: any): SearchResult {
    const items: ProductInfo[] = data.Items?.map((item: any) => {
      const itemData = item.Item;
      return {
        itemCode: itemData.itemCode,
        itemName: itemData.itemName,
        itemCaption: itemData.itemCaption,
        itemPrice: itemData.itemPrice,
        itemUrl: itemData.itemUrl,
        imageUrl: itemData.mediumImageUrls?.[0]?.imageUrl || itemData.smallImageUrls?.[0]?.imageUrl || '',
        shopName: itemData.shopName,
        shopCode: itemData.shopCode,
        reviewCount: itemData.reviewCount,
        reviewAverage: itemData.reviewAverage,
        genreId: itemData.genreId,
        availability: itemData.availability,
        taxFlag: itemData.taxFlag,
        postageFlag: itemData.postageFlag,
        creditCardFlag: itemData.creditCardFlag,
        shopOfTheYearFlag: itemData.shopOfTheYearFlag,
        shipOverseasFlag: itemData.shipOverseasFlag,
        shipOverseasArea: itemData.shipOverseasArea,
        asurakuFlag: itemData.asurakuFlag,
        asurakuClosingTime: itemData.asurakuClosingTime,
        asurakuArea: itemData.asurakuArea,
        affiliateUrl: itemData.affiliateUrl,
        smallImageUrls: itemData.smallImageUrls?.map((img: any) => img.imageUrl),
        mediumImageUrls: itemData.mediumImageUrls?.map((img: any) => img.imageUrl),
        carrier: itemData.carrier,
        giftFlag: itemData.giftFlag,
      };
    }) || [];

    return {
      count: data.count || 0,
      page: data.page || 1,
      first: data.first || 1,
      last: data.last || 1,
      hits: data.hits || 30,
      carrier: data.carrier || 0,
      pageCount: data.pageCount || 1,
      items,
      genreInformation: data.GenreInformation,
      tagInformation: data.TagInformation,
    };
  }

  /**
   * Get product recommendations based on genre
   */
  public async getRecommendations(genreId?: string, limit: number = 10): Promise<ProductInfo[]> {
    try {
      this.logger.info(LogCategory.NETWORK, 'Getting product recommendations', { genreId, limit });

      const searchOptions: SearchOptions = {
        genreId,
        hits: limit,
        sort: 'sales',
        availability: 1,
        imageFlag: 1,
      };

      const searchResult = await this.searchProducts(searchOptions);

      this.logger.info(LogCategory.NETWORK, 'Product recommendations retrieved', {
        genreId,
        count: searchResult.items.length,
      });

      return searchResult.items;
    } catch (error) {
      this.logger.error(LogCategory.ERROR, 'Failed to get recommendations', error as Error, { genreId });
      throw error;
    }
  }

  /**
   * Get product categories/genres
   */
  public async getGenres(genreId?: string): Promise<any[]> {
    try {
      this.logger.info(LogCategory.NETWORK, 'Getting product genres', { genreId });

      const params = new URLSearchParams();
      params.append('applicationId', this.applicationId);
      params.append('format', 'json');
      
      if (genreId) {
        params.append('genreId', genreId);
      }

      const url = `${this.baseUrl}/IchibaGenre/Search/20140222?${params}`;

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      this.logger.info(LogCategory.NETWORK, 'Product genres retrieved', {
        genreId,
        count: data.children?.length || 0,
      });

      await this.delay(this.rateLimitDelay);

      return data.children || [];
    } catch (error) {
      this.logger.error(LogCategory.ERROR, 'Failed to get genres', error as Error, { genreId });
      throw error;
    }
  }

  /**
   * Rate limiting delay
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Set rate limit delay
   */
  public setRateLimitDelay(ms: number): void {
    this.rateLimitDelay = ms;
  }

  /**
   * Get service configuration
   */
  public getConfiguration(): {
    applicationId: string;
    hasAffiliateId: boolean;
    baseUrl: string;
    rateLimitDelay: number;
  } {
    return {
      applicationId: this.applicationId ? 'configured' : 'not configured',
      hasAffiliateId: !!this.affiliateId,
      baseUrl: this.baseUrl,
      rateLimitDelay: this.rateLimitDelay,
    };
  }

  /**
   * Clean up resources
   */
  public async cleanup(): Promise<void> {
    try {
      this.logger.info(LogCategory.SYSTEM, 'Rakuten API service cleaned up');
    } catch (error) {
      this.logger.error(LogCategory.ERROR, 'Failed to cleanup Rakuten API service', error as Error);
    }
  }
}
