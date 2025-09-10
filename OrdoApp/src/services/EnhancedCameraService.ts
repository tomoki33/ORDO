/**
 * Enhanced Camera Service (8時間実装)
 * 
 * React Native Image Pickerをベースにした高度なカメラ機能
 * 撮影UI、フォーカス制御、フラッシュ制御、検出機能統合
 */

import React from 'react';
import {
  Alert,
  Platform,
  Dimensions,
  PermissionsAndroid,
  Vibration,
} from 'react-native';
import {
  launchImageLibrary,
  launchCamera,
  ImagePickerResponse,
  MediaType,
  PhotoQuality,
} from 'react-native-image-picker';
import ImageResizer from '@bam.tech/react-native-image-resizer';
import { DebugUtils } from '../utils';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export interface EnhancedCameraSettings {
  deviceType: 'back' | 'front';
  flashMode: 'off' | 'on' | 'auto';
  quality: 'low' | 'medium' | 'high' | 'max';
  aspectRatio: '1:1' | '4:3' | '16:9';
  gridLines: boolean;
  timer: 0 | 3 | 5 | 10; // seconds
  sound: boolean;
  autoSave: boolean;
  location: boolean;
  stabilization: boolean;
  focusMode: 'auto' | 'manual';
  exposureMode: 'auto' | 'manual';
  hdr: boolean;
  burstMode: boolean;
}

export interface CaptureOptions {
  quality?: PhotoQuality;
  maxWidth?: number;
  maxHeight?: number;
  includeBase64?: boolean;
  includeExtra?: boolean;
  customOptions?: {
    flash?: 'off' | 'on' | 'auto';
    timer?: number;
    burst?: boolean;
    hdr?: boolean;
  };
}

export interface EnhancedImageResult {
  uri: string;
  type?: string;
  fileName?: string;
  fileSize: number;
  width: number;
  height: number;
  base64?: string;
  timestamp: number;
  orientation: 'portrait' | 'landscape';
  location?: {
    latitude: number;
    longitude: number;
  };
  metadata?: {
    make?: string;
    model?: string;
    software?: string;
    exposureTime?: number;
    fNumber?: number;
    iso?: number;
    focalLength?: number;
    whiteBalance?: string;
    flash?: boolean;
    gps?: {
      latitude: number;
      longitude: number;
      altitude?: number;
    };
  };
}

export interface DetectionResult {
  objects: DetectedObject[];
  qrCodes: QRCode[];
  barcodes: Barcode[];
  texts: TextBlock[];
  confidence: number;
  processingTime: number;
}

export interface DetectedObject {
  id: string;
  label: string;
  category: 'food' | 'product' | 'package' | 'text' | 'other';
  subCategory?: string;
  confidence: number;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  properties?: {
    color?: string;
    size?: 'small' | 'medium' | 'large';
    condition?: 'fresh' | 'normal' | 'old' | 'damaged';
    brand?: string;
    type?: string;
  };
}

export interface QRCode {
  id: string;
  value: string;
  type: 'URL' | 'TEXT' | 'WIFI' | 'EMAIL' | 'PHONE' | 'SMS' | 'LOCATION' | 'OTHER';
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  format: string;
  parsedData?: {
    url?: string;
    text?: string;
    email?: string;
    phone?: string;
    wifi?: {
      ssid: string;
      password: string;
      security: string;
    };
  };
}

export interface Barcode {
  id: string;
  value: string;
  type: 'UPC_A' | 'UPC_E' | 'EAN_8' | 'EAN_13' | 'CODE_128' | 'CODE_39' | 'ITF' | 'PDF417' | 'QR_CODE';
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  productInfo?: {
    name?: string;
    brand?: string;
    category?: string;
    price?: number;
    description?: string;
  };
}

export interface TextBlock {
  id: string;
  text: string;
  confidence: number;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  language?: string;
  type: 'printed' | 'handwritten' | 'mixed';
}

export interface CameraState {
  isActive: boolean;
  isBusy: boolean;
  deviceType: 'back' | 'front';
  flashMode: 'off' | 'on' | 'auto';
  isTimerActive: boolean;
  timerCountdown: number;
  detectionMode: 'none' | 'objects' | 'qr' | 'barcode' | 'text' | 'all';
  isDetecting: boolean;
  lastError?: string;
}

// =============================================================================
// ENHANCED CAMERA SERVICE
// =============================================================================

export class EnhancedCameraService {
  private static instance: EnhancedCameraService;

  private settings: EnhancedCameraSettings = {
    deviceType: 'back',
    flashMode: 'off',
    quality: 'high',
    aspectRatio: '4:3',
    gridLines: true,
    timer: 0,
    sound: true,
    autoSave: true,
    location: false,
    stabilization: true,
    focusMode: 'auto',
    exposureMode: 'auto',
    hdr: false,
    burstMode: false,
  };

  private state: CameraState = {
    isActive: false,
    isBusy: false,
    deviceType: 'back',
    flashMode: 'off',
    isTimerActive: false,
    timerCountdown: 0,
    detectionMode: 'none',
    isDetecting: false,
  };

  private timerHandle: NodeJS.Timeout | null = null;
  private detectionHandle: NodeJS.Timeout | null = null;

  private callbacks: {
    onStateChange?: (state: CameraState) => void;
    onDetection?: (result: DetectionResult) => void;
    onError?: (error: string) => void;
    onTimerTick?: (countdown: number) => void;
  } = {};

  private constructor() {}

  public static getInstance(): EnhancedCameraService {
    if (!EnhancedCameraService.instance) {
      EnhancedCameraService.instance = new EnhancedCameraService();
    }
    return EnhancedCameraService.instance;
  }

  // =============================================================================
  // INITIALIZATION & PERMISSIONS
  // =============================================================================

  /**
   * カメラサービスを初期化
   */
  public async initialize(): Promise<boolean> {
    try {
      DebugUtils.log('Initializing Enhanced Camera Service...');

      // 権限をリクエスト
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('Camera permissions denied');
      }

      // 状態を更新
      this.state.isActive = true;
      this.state.deviceType = this.settings.deviceType;
      this.state.flashMode = this.settings.flashMode;

      this.notifyStateChange();
      DebugUtils.log('Enhanced Camera Service initialized successfully');
      return true;
    } catch (error) {
      DebugUtils.log('Camera initialization error:', error);
      this.handleError('カメラの初期化に失敗しました');
      return false;
    }
  }

  /**
   * 必要な権限をリクエスト
   */
  private async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        const cameraGranted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'カメラの許可',
            message: '食品の撮影にカメラの使用を許可してください',
            buttonNeutral: '後で',
            buttonNegative: 'キャンセル',
            buttonPositive: 'OK',
          }
        );

        if (this.settings.location) {
          const locationGranted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title: '位置情報の許可',
              message: '撮影場所の記録に位置情報の使用を許可してください',
              buttonNeutral: '後で',
              buttonNegative: 'キャンセル',
              buttonPositive: 'OK',
            }
          );
        }

        return cameraGranted === PermissionsAndroid.RESULTS.GRANTED;
      }
      return true; // iOS
    } catch (error) {
      DebugUtils.log('Permission request error:', error);
      return false;
    }
  }

  // =============================================================================
  // SETTINGS MANAGEMENT
  // =============================================================================

  /**
   * 設定を更新
   */
  public updateSettings(newSettings: Partial<EnhancedCameraSettings>): void {
    this.settings = { ...this.settings, ...newSettings };

    // 状態も同期
    if (newSettings.deviceType) {
      this.state.deviceType = newSettings.deviceType;
    }
    if (newSettings.flashMode) {
      this.state.flashMode = newSettings.flashMode;
    }

    this.notifyStateChange();
    DebugUtils.log('Camera settings updated:', this.settings);
  }

  /**
   * 現在の設定を取得
   */
  public getSettings(): EnhancedCameraSettings {
    return { ...this.settings };
  }

  /**
   * 現在の状態を取得
   */
  public getState(): CameraState {
    return { ...this.state };
  }

  /**
   * フラッシュモードを切り替え
   */
  public toggleFlash(): void {
    const modes: Array<EnhancedCameraSettings['flashMode']> = ['off', 'auto', 'on'];
    const currentIndex = modes.indexOf(this.settings.flashMode);
    const nextIndex = (currentIndex + 1) % modes.length;

    this.settings.flashMode = modes[nextIndex];
    this.state.flashMode = modes[nextIndex];
    this.notifyStateChange();

    DebugUtils.log('Flash mode changed to:', this.settings.flashMode);
  }

  /**
   * カメラ位置を切り替え
   */
  public toggleCamera(): void {
    this.settings.deviceType = this.settings.deviceType === 'back' ? 'front' : 'back';
    this.state.deviceType = this.settings.deviceType;
    this.notifyStateChange();

    DebugUtils.log('Camera position changed to:', this.settings.deviceType);
  }

  /**
   * タイマーを設定
   */
  public setTimer(seconds: 0 | 3 | 5 | 10): void {
    this.settings.timer = seconds;
    DebugUtils.log('Timer set to:', seconds);
  }

  // =============================================================================
  // PHOTO CAPTURE
  // =============================================================================

  /**
   * 高機能写真撮影
   */
  public async capturePhoto(options: CaptureOptions = {}): Promise<EnhancedImageResult | null> {
    try {
      if (!this.state.isActive || this.state.isBusy) {
        throw new Error('Camera is not ready');
      }

      this.state.isBusy = true;
      this.notifyStateChange();

      // タイマーが設定されている場合
      if (this.settings.timer > 0) {
        await this.executeTimer();
      }

      // 撮影オプションを準備
      const captureOptions = this.prepareCaptureOptions(options);

      // 撮影実行
      const result = await this.executeCameraCapture(captureOptions);

      if (!result) {
        throw new Error('Capture failed');
      }

      // 拡張情報を追加
      const enhancedResult = await this.enhanceImageResult(result);

      // 音を鳴らす
      if (this.settings.sound) {
        this.playShutterSound();
      }

      this.state.isBusy = false;
      this.notifyStateChange();

      DebugUtils.log('Photo captured successfully:', enhancedResult);
      return enhancedResult;
    } catch (error) {
      this.state.isBusy = false;
      this.notifyStateChange();
      DebugUtils.log('Photo capture error:', error);
      this.handleError('写真の撮影に失敗しました');
      return null;
    }
  }

  /**
   * バーストモード撮影
   */
  public async captureBurst(count: number = 5): Promise<EnhancedImageResult[]> {
    const results: EnhancedImageResult[] = [];

    if (!this.settings.burstMode) {
      DebugUtils.log('Burst mode is disabled');
      return results;
    }

    try {
      this.state.isBusy = true;
      this.notifyStateChange();

      for (let i = 0; i < count; i++) {
        const result = await this.capturePhoto({ customOptions: { timer: 0 } });
        if (result) {
          results.push(result);
        }
        // 短い間隔を置く
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      this.state.isBusy = false;
      this.notifyStateChange();

      DebugUtils.log(`Burst capture completed: ${results.length}/${count} photos`);
      return results;
    } catch (error) {
      this.state.isBusy = false;
      this.notifyStateChange();
      DebugUtils.log('Burst capture error:', error);
      this.handleError('バースト撮影に失敗しました');
      return results;
    }
  }

  /**
   * タイマー実行
   */
  private async executeTimer(): Promise<void> {
    return new Promise((resolve) => {
      let countdown = this.settings.timer;
      this.state.isTimerActive = true;
      this.state.timerCountdown = countdown;
      this.notifyStateChange();

      const tick = () => {
        this.callbacks.onTimerTick?.(countdown);

        if (countdown <= 0) {
          this.state.isTimerActive = false;
          this.state.timerCountdown = 0;
          this.notifyStateChange();
          resolve();
          return;
        }

        // バイブレーション
        if (countdown <= 3) {
          Vibration.vibrate(100);
        }

        countdown--;
        this.state.timerCountdown = countdown;
        this.notifyStateChange();
        this.timerHandle = setTimeout(tick, 1000);
      };

      tick();
    });
  }

  /**
   * 撮影オプションを準備
   */
  private prepareCaptureOptions(options: CaptureOptions) {
    const qualityMap = {
      low: { quality: 0.3 as PhotoQuality, maxWidth: 640, maxHeight: 480 },
      medium: { quality: 0.7 as PhotoQuality, maxWidth: 1024, maxHeight: 768 },
      high: { quality: 0.85 as PhotoQuality, maxWidth: 1920, maxHeight: 1440 },
      max: { quality: 1.0 as PhotoQuality, maxWidth: 4000, maxHeight: 3000 },
    };

    const baseOptions = qualityMap[this.settings.quality];

    return {
      mediaType: 'photo' as MediaType,
      includeBase64: options.includeBase64 || false,
      includeExtra: options.includeExtra || true,
      ...baseOptions,
      ...options,
      storageOptions: {
        skipBackup: !this.settings.autoSave,
        cameraRoll: this.settings.autoSave,
      },
    };
  }

  /**
   * カメラ撮影を実行
   */
  private async executeCameraCapture(options: any): Promise<any> {
    return new Promise((resolve) => {
      launchCamera(options, (response: ImagePickerResponse) => {
        if (response.didCancel || response.errorMessage) {
          DebugUtils.log('Camera capture cancelled or error:', response.errorMessage);
          resolve(null);
          return;
        }

        if (response.assets && response.assets[0]) {
          resolve(response.assets[0]);
        } else {
          resolve(null);
        }
      });
    });
  }

  /**
   * 画像結果を拡張
   */
  private async enhanceImageResult(result: any): Promise<EnhancedImageResult> {
    const enhanced: EnhancedImageResult = {
      uri: result.uri,
      type: result.type,
      fileName: result.fileName,
      fileSize: result.fileSize || 0,
      width: result.width || 0,
      height: result.height || 0,
      base64: result.base64,
      timestamp: Date.now(),
      orientation: result.width > result.height ? 'landscape' : 'portrait',
    };

    // 位置情報を追加（権限がある場合）
    if (this.settings.location && result.location) {
      enhanced.location = {
        latitude: result.location.latitude,
        longitude: result.location.longitude,
      };
    }

    // メタデータを追加
    if (result.exif) {
      enhanced.metadata = {
        make: result.exif.Make,
        model: result.exif.Model,
        software: result.exif.Software,
        exposureTime: result.exif.ExposureTime,
        fNumber: result.exif.FNumber,
        iso: result.exif.ISOSpeedRatings,
        focalLength: result.exif.FocalLength,
        whiteBalance: result.exif.WhiteBalance,
        flash: result.exif.Flash,
        gps: result.exif.GPS ? {
          latitude: result.exif.GPS.Latitude,
          longitude: result.exif.GPS.Longitude,
          altitude: result.exif.GPS.Altitude,
        } : undefined,
      };
    }

    return enhanced;
  }

  /**
   * シャッター音を再生
   */
  private playShutterSound(): void {
    try {
      // React Nativeでのシャッター音実装
      // プラットフォーム固有の音再生
      if (Platform.OS === 'ios') {
        // iOS: システムサウンド
      } else {
        // Android: サウンドプール
      }
    } catch (error) {
      DebugUtils.log('Shutter sound error:', error);
    }
  }

  // =============================================================================
  // DETECTION FEATURES
  // =============================================================================

  /**
   * 検出モードを設定
   */
  public setDetectionMode(mode: 'none' | 'objects' | 'qr' | 'barcode' | 'text' | 'all'): void {
    this.state.detectionMode = mode;
    this.state.isDetecting = mode !== 'none';
    this.notifyStateChange();

    if (mode !== 'none') {
      this.startDetection();
    } else {
      this.stopDetection();
    }

    DebugUtils.log('Detection mode set to:', mode);
  }

  /**
   * 検出を開始
   */
  private startDetection(): void {
    if (this.detectionHandle) {
      clearInterval(this.detectionHandle);
    }

    this.detectionHandle = setInterval(() => {
      this.performDetection();
    }, 1000); // 1秒間隔
  }

  /**
   * 検出を停止
   */
  private stopDetection(): void {
    if (this.detectionHandle) {
      clearInterval(this.detectionHandle);
      this.detectionHandle = null;
    }
  }

  /**
   * 検出処理を実行（模擬実装）
   */
  private async performDetection(): Promise<void> {
    if (!this.state.isDetecting) return;

    try {
      // TODO: 実際のAI検出処理
      const mockResult: DetectionResult = {
        objects: [],
        qrCodes: [],
        barcodes: [],
        texts: [],
        confidence: 0.85,
        processingTime: 120,
      };

      // 模擬的な検出結果
      if (this.state.detectionMode === 'objects' || this.state.detectionMode === 'all') {
        mockResult.objects.push({
          id: 'obj_1',
          label: 'Apple',
          category: 'food',
          subCategory: 'fruit',
          confidence: 0.87,
          bounds: { x: 100, y: 100, width: 200, height: 150 },
          properties: {
            color: 'red',
            size: 'medium',
            condition: 'fresh',
          },
        });
      }

      this.callbacks.onDetection?.(mockResult);
    } catch (error) {
      DebugUtils.log('Detection error:', error);
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * コールバックを設定
   */
  public setCallbacks(callbacks: {
    onStateChange?: (state: CameraState) => void;
    onDetection?: (result: DetectionResult) => void;
    onError?: (error: string) => void;
    onTimerTick?: (countdown: number) => void;
  }): void {
    this.callbacks = callbacks;
    DebugUtils.log('Camera callbacks set');
  }

  /**
   * 状態変更を通知
   */
  private notifyStateChange(): void {
    this.callbacks.onStateChange?.(this.getState());
  }

  /**
   * エラーを処理
   */
  private handleError(message: string): void {
    this.state.lastError = message;
    this.notifyStateChange();
    this.callbacks.onError?.(message);
  }

  /**
   * カメラをリセット
   */
  public reset(): void {
    this.stopDetection();

    if (this.timerHandle) {
      clearTimeout(this.timerHandle);
      this.timerHandle = null;
    }

    this.state = {
      isActive: false,
      isBusy: false,
      deviceType: 'back',
      flashMode: 'off',
      isTimerActive: false,
      timerCountdown: 0,
      detectionMode: 'none',
      isDetecting: false,
    };

    this.notifyStateChange();
    DebugUtils.log('Camera service reset');
  }

  /**
   * サービスを破棄
   */
  public dispose(): void {
    this.reset();
    this.callbacks = {};
    DebugUtils.log('Camera service disposed');
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const enhancedCameraService = EnhancedCameraService.getInstance();

export default EnhancedCameraService;
