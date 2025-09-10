/**
 * React Native Camera統合サービス (8時間実装)
 * 
 * 既存のCameraServiceを拡張し、高度なカメラ機能を提供
 * リアルタイムプレビュー、フォーカス制御、フラッシュ制御
 * QRコード・バーコード認識、カメラ設定管理
 */

import React from 'react';
import {
  Alert,
  Platform,
  Dimensions,
  PermissionsAndroid,
} from 'react-native';
import { DebugUtils } from '../utils';
import { cameraService, ImageResult, CameraOptions } from './CameraService';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export interface AdvancedCameraSettings {
  preferredDeviceType: 'back' | 'front';
  flashMode: 'off' | 'on' | 'auto';
  focusMode: 'auto' | 'manual';
  exposureMode: 'auto' | 'manual';
  videoStabilization: boolean;
  lowLightBoost: boolean;
  hdr: boolean;
  zoom: number;
  gridLines: boolean;
  timer: 0 | 3 | 5 | 10; // seconds
  aspectRatio: '1:1' | '4:3' | '16:9';
  quality: 'low' | 'medium' | 'high' | 'max';
}

export interface CaptureResult extends ImageResult {
  orientation: 'portrait' | 'landscape';
  timestamp: number;
  location?: {
    latitude: number;
    longitude: number;
  };
  metadata?: {
    exposureTime?: number;
    aperture?: number;
    iso?: number;
    focalLength?: number;
    whiteBalance?: string;
  };
}

export interface DetectedObject {
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
  label: string;
  category: 'food' | 'product' | 'text' | 'other';
  subCategory?: string;
}

export interface QRCode {
  value: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  format: string;
  type: 'URL' | 'TEXT' | 'WIFI' | 'EMAIL' | 'PHONE' | 'SMS' | 'OTHER';
}

export interface Barcode {
  value: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  format: string;
  type: 'UPC_A' | 'UPC_E' | 'EAN_8' | 'EAN_13' | 'CODE_128' | 'CODE_39' | 'ITF' | 'PDF417' | 'QR_CODE';
}

export interface CameraState {
  isActive: boolean;
  isRecording: boolean;
  flashMode: 'off' | 'on' | 'auto';
  cameraPosition: 'back' | 'front';
  zoom: number;
  isScanning: boolean;
  detectionMode: 'none' | 'objects' | 'qr' | 'barcode' | 'all';
}

export interface CameraError {
  code: string;
  message: string;
  cause?: Error;
  recoverable: boolean;
}

// =============================================================================
// ADVANCED CAMERA SERVICE
// =============================================================================

export class AdvancedCameraService {
  private static instance: AdvancedCameraService;
  
  private settings: AdvancedCameraSettings = {
    preferredDeviceType: 'back',
    flashMode: 'off',
    focusMode: 'auto',
    exposureMode: 'auto',
    videoStabilization: true,
    lowLightBoost: false,
    hdr: false,
    zoom: 1,
    gridLines: true,
    timer: 0,
    aspectRatio: '4:3',
    quality: 'high',
  };
  
  private state: CameraState = {
    isActive: false,
    isRecording: false,
    flashMode: 'off',
    cameraPosition: 'back',
    zoom: 1,
    isScanning: false,
    detectionMode: 'none',
  };

  private detectionCallbacks: {
    onObjectDetected?: (objects: DetectedObject[]) => void;
    onQRCodeDetected?: (qrCodes: QRCode[]) => void;
    onBarcodeDetected?: (barcodes: Barcode[]) => void;
    onError?: (error: CameraError) => void;
  } = {};

  private timerHandle: NodeJS.Timeout | null = null;

  private constructor() {}

  public static getInstance(): AdvancedCameraService {
    if (!AdvancedCameraService.instance) {
      AdvancedCameraService.instance = new AdvancedCameraService();
    }
    return AdvancedCameraService.instance;
  }

  // =============================================================================
  // CAMERA INITIALIZATION & SETUP
  // =============================================================================

  /**
   * カメラを初期化
   */
  public async initializeCamera(): Promise<boolean> {
    try {
      DebugUtils.log('Initializing advanced camera service...');
      
      // 基本的な権限チェック
      const hasPermission = await cameraService.requestCameraPermission();
      if (!hasPermission) {
        throw new Error('Camera permission denied');
      }

      // カメラ状態を更新
      this.state.isActive = true;
      this.state.cameraPosition = this.settings.preferredDeviceType;
      this.state.flashMode = this.settings.flashMode;
      this.state.zoom = this.settings.zoom;

      DebugUtils.log('Advanced camera service initialized successfully');
      return true;
    } catch (error) {
      DebugUtils.log('Camera initialization error:', error);
      this.handleError({
        code: 'INIT_ERROR',
        message: 'カメラの初期化に失敗しました',
        cause: error as Error,
        recoverable: true,
      });
      return false;
    }
  }

  /**
   * カメラを停止
   */
  public async stopCamera(): Promise<void> {
    try {
      this.state.isActive = false;
      this.state.isRecording = false;
      this.state.isScanning = false;
      
      if (this.timerHandle) {
        clearTimeout(this.timerHandle);
        this.timerHandle = null;
      }

      DebugUtils.log('Camera stopped');
    } catch (error) {
      DebugUtils.log('Camera stop error:', error);
    }
  }

  // =============================================================================
  // CAMERA SETTINGS MANAGEMENT
  // =============================================================================

  /**
   * カメラ設定を更新
   */
  public updateSettings(newSettings: Partial<AdvancedCameraSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    
    // 状態も同期
    if (newSettings.preferredDeviceType) {
      this.state.cameraPosition = newSettings.preferredDeviceType;
    }
    if (newSettings.flashMode) {
      this.state.flashMode = newSettings.flashMode;
    }
    if (newSettings.zoom) {
      this.state.zoom = newSettings.zoom;
    }

    DebugUtils.log('Advanced camera settings updated:', this.settings);
  }

  /**
   * 現在の設定を取得
   */
  public getSettings(): AdvancedCameraSettings {
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
    const modes: Array<AdvancedCameraSettings['flashMode']> = ['off', 'auto', 'on'];
    const currentIndex = modes.indexOf(this.settings.flashMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    
    this.settings.flashMode = modes[nextIndex];
    this.state.flashMode = modes[nextIndex];
    DebugUtils.log('Flash mode changed to:', this.settings.flashMode);
  }

  /**
   * カメラ位置を切り替え
   */
  public toggleCameraPosition(): void {
    this.settings.preferredDeviceType = 
      this.settings.preferredDeviceType === 'back' ? 'front' : 'back';
    this.state.cameraPosition = this.settings.preferredDeviceType;
    DebugUtils.log('Camera position changed to:', this.settings.preferredDeviceType);
  }

  /**
   * ズームレベルを設定
   */
  public setZoom(zoom: number): void {
    const normalizedZoom = Math.max(1, Math.min(zoom, 10)); // 1x-10x
    this.settings.zoom = normalizedZoom;
    this.state.zoom = normalizedZoom;
    DebugUtils.log('Zoom level set to:', this.settings.zoom);
  }

  /**
   * アスペクト比を設定
   */
  public setAspectRatio(ratio: '1:1' | '4:3' | '16:9'): void {
    this.settings.aspectRatio = ratio;
    DebugUtils.log('Aspect ratio set to:', ratio);
  }

  /**
   * 品質設定を変更
   */
  public setQuality(quality: 'low' | 'medium' | 'high' | 'max'): void {
    this.settings.quality = quality;
    DebugUtils.log('Quality set to:', quality);
  }

  // =============================================================================
  // PHOTO CAPTURE WITH ADVANCED FEATURES
  // =============================================================================

  /**
   * 高度な写真撮影機能
   */
  public async takeAdvancedPhoto(): Promise<CaptureResult | null> {
    try {
      if (!this.state.isActive) {
        throw new Error('Camera is not active');
      }

      // タイマーが設定されている場合
      if (this.settings.timer > 0) {
        return await this.takePhotoWithTimer();
      }

      // 品質に応じたオプション設定
      const qualityOptions = this.getQualityOptions();
      
      // 基本的なカメラサービスを使用して撮影
      const result = await cameraService.takePhoto(qualityOptions);
      
      if (!result) {
        throw new Error('Failed to capture photo');
      }

      // 拡張情報を追加
      const advancedResult: CaptureResult = {
        ...result,
        orientation: 'portrait', // TODO: 実際の向きを取得
        timestamp: Date.now(),
        metadata: {
          // TODO: EXIFデータから抽出
          iso: 100,
          exposureTime: 1/60,
          aperture: 2.8,
          focalLength: 26,
          whiteBalance: 'auto',
        },
      };

      DebugUtils.log('Advanced photo captured:', advancedResult);
      return advancedResult;
    } catch (error) {
      DebugUtils.log('Advanced photo capture error:', error);
      this.handleError({
        code: 'CAPTURE_ERROR',
        message: '写真の撮影に失敗しました',
        cause: error as Error,
        recoverable: true,
      });
      return null;
    }
  }

  /**
   * タイマー付き撮影
   */
  private async takePhotoWithTimer(): Promise<CaptureResult | null> {
    return new Promise((resolve) => {
      let countdown = this.settings.timer;
      
      const countdownTimer = () => {
        if (countdown <= 0) {
          // 実際の撮影実行
          this.takeAdvancedPhoto().then(resolve);
          return;
        }
        
        DebugUtils.log(`Photo timer countdown: ${countdown}`);
        countdown--;
        this.timerHandle = setTimeout(countdownTimer, 1000);
      };
      
      countdownTimer();
    });
  }

  /**
   * 品質設定に応じたオプションを取得
   */
  private getQualityOptions(): CameraOptions {
    const qualityMap = {
      low: { quality: 0.3, maxWidth: 640, maxHeight: 480 },
      medium: { quality: 0.7, maxWidth: 1024, maxHeight: 768 },
      high: { quality: 0.85, maxWidth: 1920, maxHeight: 1440 },
      max: { quality: 1.0, maxWidth: 4000, maxHeight: 3000 },
    };

    return qualityMap[this.settings.quality] as CameraOptions;
  }

  // =============================================================================
  // DETECTION & SCANNING
  // =============================================================================

  /**
   * 検出モードを設定
   */
  public setDetectionMode(mode: 'none' | 'objects' | 'qr' | 'barcode' | 'all'): void {
    this.state.detectionMode = mode;
    this.state.isScanning = mode !== 'none';
    DebugUtils.log('Detection mode set to:', mode);
  }

  /**
   * 検出コールバックを設定
   */
  public setDetectionCallbacks(callbacks: {
    onObjectDetected?: (objects: DetectedObject[]) => void;
    onQRCodeDetected?: (qrCodes: QRCode[]) => void;
    onBarcodeDetected?: (barcodes: Barcode[]) => void;
    onError?: (error: CameraError) => void;
  }): void {
    this.detectionCallbacks = callbacks;
    DebugUtils.log('Detection callbacks set');
  }

  /**
   * QRコード/バーコードスキャンを開始
   */
  public startScanning(): void {
    this.state.isScanning = true;
    this.state.detectionMode = 'all';
    DebugUtils.log('Scanning started');
    
    // TODO: 実際の検出処理を開始
    this.simulateDetection();
  }

  /**
   * スキャンを停止
   */
  public stopScanning(): void {
    this.state.isScanning = false;
    this.state.detectionMode = 'none';
    DebugUtils.log('Scanning stopped');
  }

  /**
   * 検出処理のシミュレーション（実装時には実際の検出ロジックに置き換え）
   */
  private simulateDetection(): void {
    if (!this.state.isScanning) return;

    // 模擬的な検出結果
    setTimeout(() => {
      if (this.state.isScanning && this.state.detectionMode !== 'none') {
        // 模擬オブジェクト検出
        if (this.state.detectionMode === 'objects' || this.state.detectionMode === 'all') {
          const mockObjects: DetectedObject[] = [
            {
              bounds: { x: 100, y: 100, width: 200, height: 150 },
              confidence: 0.87,
              label: 'Apple',
              category: 'food',
              subCategory: 'fruit',
            },
          ];
          this.detectionCallbacks.onObjectDetected?.(mockObjects);
        }

        this.simulateDetection(); // 継続的な検出
      }
    }, 1000);
  }

  // =============================================================================
  // FOCUS & EXPOSURE CONTROL
  // =============================================================================

  /**
   * 手動フォーカス設定
   */
  public async setFocus(point: { x: number; y: number }): Promise<void> {
    try {
      // TODO: 実際のフォーカス制御実装
      DebugUtils.log('Focus set to point:', point);
      
      // フォーカスモードを手動に変更
      this.settings.focusMode = 'manual';
    } catch (error) {
      DebugUtils.log('Focus error:', error);
      this.handleError({
        code: 'FOCUS_ERROR',
        message: 'フォーカス設定に失敗しました',
        cause: error as Error,
        recoverable: true,
      });
    }
  }

  /**
   * 露出設定
   */
  public async setExposure(point: { x: number; y: number }): Promise<void> {
    try {
      // TODO: 実際の露出制御実装
      DebugUtils.log('Exposure set to point:', point);
      
      // 露出モードを手動に変更
      this.settings.exposureMode = 'manual';
    } catch (error) {
      DebugUtils.log('Exposure error:', error);
      this.handleError({
        code: 'EXPOSURE_ERROR',
        message: '露出設定に失敗しました',
        cause: error as Error,
        recoverable: true,
      });
    }
  }

  /**
   * オートフォーカス・オート露出に戻す
   */
  public resetAutoControls(): void {
    this.settings.focusMode = 'auto';
    this.settings.exposureMode = 'auto';
    DebugUtils.log('Auto controls reset');
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * カメラの状態をチェック
   */
  public async checkCameraStatus(): Promise<{
    isAvailable: boolean;
    hasPermission: boolean;
    isActive: boolean;
    error?: string;
  }> {
    try {
      const hasPermission = await cameraService.requestCameraPermission();
      
      return {
        isAvailable: true, // React Nativeでは基本的に利用可能
        hasPermission,
        isActive: this.state.isActive,
      };
    } catch (error) {
      return {
        isAvailable: false,
        hasPermission: false,
        isActive: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * 設定をリセット
   */
  public resetSettings(): void {
    this.settings = {
      preferredDeviceType: 'back',
      flashMode: 'off',
      focusMode: 'auto',
      exposureMode: 'auto',
      videoStabilization: true,
      lowLightBoost: false,
      hdr: false,
      zoom: 1,
      gridLines: true,
      timer: 0,
      aspectRatio: '4:3',
      quality: 'high',
    };
    
    this.state = {
      ...this.state,
      flashMode: 'off',
      cameraPosition: 'back',
      zoom: 1,
    };
    
    DebugUtils.log('Advanced camera settings reset to defaults');
  }

  /**
   * エラーハンドリング
   */
  private handleError(error: CameraError): void {
    DebugUtils.log('Camera error:', error);
    
    // エラーコールバックがあれば呼び出し
    this.detectionCallbacks.onError?.(error);
    
    // 回復可能なエラーの場合は自動回復を試行
    if (error.recoverable) {
      setTimeout(() => {
        DebugUtils.log('Attempting camera error recovery...');
        // TODO: 回復処理の実装
      }, 1000);
    }
  }

  /**
   * カメラ情報の取得
   */
  public getCameraInfo(): {
    settings: AdvancedCameraSettings;
    state: CameraState;
    capabilities: {
      hasFlash: boolean;
      canZoom: boolean;
      canSwitchCamera: boolean;
      supportedAspectRatios: string[];
      supportedQualityLevels: string[];
    };
  } {
    return {
      settings: this.getSettings(),
      state: this.getState(),
      capabilities: {
        hasFlash: Platform.OS === 'ios' || Platform.OS === 'android',
        canZoom: true,
        canSwitchCamera: true,
        supportedAspectRatios: ['1:1', '4:3', '16:9'],
        supportedQualityLevels: ['low', 'medium', 'high', 'max'],
      },
    };
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const advancedCameraService = AdvancedCameraService.getInstance();

export default AdvancedCameraService;

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export interface CameraSettings {
  preferredDeviceType: 'back' | 'front';
  flashMode: 'off' | 'on' | 'auto';
  focusMode: 'auto' | 'manual';
  exposureMode: 'auto' | 'manual';
  videoStabilization: boolean;
  lowLightBoost: boolean;
  hdr: boolean;
  zoom: number;
}

export interface CaptureResult {
  uri: string;
  width: number;
  height: number;
  orientation: 'portrait' | 'landscape';
  timestamp: number;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface FrameProcessorResult {
  objects?: DetectedObject[];
  qrCodes?: QRCode[];
  barcodes?: Barcode[];
  faces?: Face[];
}

export interface DetectedObject {
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
  label: string;
  category: string;
}

export interface QRCode {
  value: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  format: string;
}

export interface Barcode {
  value: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  format: string;
  type: 'UPC_A' | 'UPC_E' | 'EAN_8' | 'EAN_13' | 'CODE_128' | 'CODE_39' | 'ITF' | 'PDF417';
}

export interface Face {
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  landmarks?: {
    leftEye: { x: number; y: number };
    rightEye: { x: number; y: number };
    nose: { x: number; y: number };
    mouth: { x: number; y: number };
  };
  emotions?: {
    happy: number;
    sad: number;
    angry: number;
    surprised: number;
    neutral: number;
  };
}

export interface CameraError {
  code: string;
  message: string;
  cause?: Error;
}

// =============================================================================
// VISION CAMERA SERVICE
// =============================================================================

export class VisionCameraService {
  private static instance: VisionCameraService;
  
  private cameraRef: React.RefObject<Camera> | null = null;
  private settings: CameraSettings = {
    preferredDeviceType: 'back',
    flashMode: 'off',
    focusMode: 'auto',
    exposureMode: 'auto',
    videoStabilization: true,
    lowLightBoost: false,
    hdr: false,
    zoom: 1,
  };
  
  private frameProcessorCallbacks: {
    onObjectDetected?: (objects: DetectedObject[]) => void;
    onQRCodeDetected?: (qrCodes: QRCode[]) => void;
    onBarcodeDetected?: (barcodes: Barcode[]) => void;
    onFaceDetected?: (faces: Face[]) => void;
  } = {};

  private constructor() {}

  public static getInstance(): VisionCameraService {
    if (!VisionCameraService.instance) {
      VisionCameraService.instance = new VisionCameraService();
    }
    return VisionCameraService.instance;
  }

  // =============================================================================
  // PERMISSION MANAGEMENT
  // =============================================================================

  /**
   * カメラ権限をリクエスト
   */
  public async requestCameraPermission(): Promise<boolean> {
    try {
      const permission = await Camera.requestCameraPermission();
      
      switch (permission) {
        case 'granted':
          DebugUtils.log('Camera permission granted');
          return true;
        case 'denied':
          DebugUtils.log('Camera permission denied');
          Alert.alert(
            'カメラ権限が必要です',
            '食品の撮影にはカメラのアクセス権限が必要です。設定からカメラの権限を有効にしてください。',
            [{ text: 'OK' }]
          );
          return false;
        case 'restricted':
          DebugUtils.log('Camera permission restricted');
          Alert.alert('カメラが利用できません', 'このデバイスではカメラが制限されています。');
          return false;
        default:
          return false;
      }
    } catch (error) {
      DebugUtils.log('Camera permission request error:', error);
      return false;
    }
  }

  /**
   * マイク権限をリクエスト（動画撮影用）
   */
  public async requestMicrophonePermission(): Promise<boolean> {
    try {
      const permission = await Camera.requestMicrophonePermission();
      return permission === 'granted';
    } catch (error) {
      DebugUtils.log('Microphone permission request error:', error);
      return false;
    }
  }

  /**
   * 現在の権限状態を取得
   */
  public async getPermissionStatus(): Promise<{
    camera: CameraPermissionStatus;
    microphone: CameraPermissionStatus;
  }> {
    try {
      const cameraStatus = await Camera.getCameraPermissionStatus();
      const microphoneStatus = await Camera.getMicrophonePermissionStatus();
      
      return {
        camera: cameraStatus,
        microphone: microphoneStatus,
      };
    } catch (error) {
      DebugUtils.log('Permission status check error:', error);
      return {
        camera: 'not-determined',
        microphone: 'not-determined',
      };
    }
  }

  // =============================================================================
  // CAMERA DEVICE MANAGEMENT
  // =============================================================================

  /**
   * 利用可能なカメラデバイスを取得
   */
  public getAvailableDevices(): CameraDevice[] {
    try {
      const devices = Camera.getAvailableCameraDevices();
      DebugUtils.log('Available camera devices:', devices.length);
      return devices;
    } catch (error) {
      DebugUtils.log('Get available devices error:', error);
      return [];
    }
  }

  /**
   * 最適なカメラデバイスを選択
   */
  public getBestDevice(position: 'back' | 'front' = 'back'): CameraDevice | null {
    try {
      const devices = this.getAvailableDevices();
      
      // 指定された位置のデバイスをフィルタ
      const filteredDevices = devices.filter(device => device.position === position);
      
      if (filteredDevices.length === 0) {
        DebugUtils.log(`No ${position} camera found`);
        return null;
      }

      // より高機能なデバイスを優先
      const sortedDevices = filteredDevices.sort((a, b) => {
        // 超広角 < 広角 < 望遠 の順で優先
        const deviceTypeOrder = { 'ultra-wide-angle': 1, 'wide-angle': 2, 'telephoto': 3 };
        return (deviceTypeOrder[b.deviceType] || 0) - (deviceTypeOrder[a.deviceType] || 0);
      });

      const selectedDevice = sortedDevices[0];
      DebugUtils.log('Selected camera device:', {
        id: selectedDevice.id,
        position: selectedDevice.position,
        deviceType: selectedDevice.deviceType,
        hasFlash: selectedDevice.hasFlash,
        hasTorch: selectedDevice.hasTorch,
        supportsFocus: selectedDevice.supportsFocus,
      });

      return selectedDevice;
    } catch (error) {
      DebugUtils.log('Get best device error:', error);
      return null;
    }
  }

  /**
   * 最適なカメラフォーマットを取得
   */
  public getBestFormat(device: CameraDevice): CameraDeviceFormat | null {
    try {
      if (!device.formats || device.formats.length === 0) {
        DebugUtils.log('No formats available for device');
        return null;
      }

      const screenDimensions = Dimensions.get('screen');
      const targetAspectRatio = screenDimensions.height / screenDimensions.width;

      // フォーマットを品質とアスペクト比でソート
      const sortedFormats = device.formats.sort((a, b) => {
        const aAspectRatio = a.photoHeight / a.photoWidth;
        const bAspectRatio = b.photoHeight / b.photoWidth;
        
        const aAspectRatioDiff = Math.abs(aAspectRatio - targetAspectRatio);
        const bAspectRatioDiff = Math.abs(bAspectRatio - targetAspectRatio);
        
        // アスペクト比が近いものを優先
        if (Math.abs(aAspectRatioDiff - bAspectRatioDiff) > 0.1) {
          return aAspectRatioDiff - bAspectRatioDiff;
        }
        
        // 解像度が高いものを優先
        return (b.photoWidth * b.photoHeight) - (a.photoWidth * a.photoHeight);
      });

      const selectedFormat = sortedFormats[0];
      DebugUtils.log('Selected camera format:', {
        photoWidth: selectedFormat.photoWidth,
        photoHeight: selectedFormat.photoHeight,
        videoWidth: selectedFormat.videoWidth,
        videoHeight: selectedFormat.videoHeight,
        maxFps: selectedFormat.maxFps,
        supportsVideoHdr: selectedFormat.supportsVideoHdr,
        supportsPhotoHdr: selectedFormat.supportsPhotoHdr,
      });

      return selectedFormat;
    } catch (error) {
      DebugUtils.log('Get best format error:', error);
      return null;
    }
  }

  // =============================================================================
  // CAMERA SETTINGS
  // =============================================================================

  /**
   * カメラ設定を更新
   */
  public updateSettings(newSettings: Partial<CameraSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    DebugUtils.log('Camera settings updated:', this.settings);
  }

  /**
   * 現在の設定を取得
   */
  public getSettings(): CameraSettings {
    return { ...this.settings };
  }

  /**
   * フラッシュモードを切り替え
   */
  public toggleFlash(): void {
    const modes: Array<CameraSettings['flashMode']> = ['off', 'auto', 'on'];
    const currentIndex = modes.indexOf(this.settings.flashMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    
    this.settings.flashMode = modes[nextIndex];
    DebugUtils.log('Flash mode changed to:', this.settings.flashMode);
  }

  /**
   * カメラ位置を切り替え
   */
  public toggleCameraPosition(): void {
    this.settings.preferredDeviceType = 
      this.settings.preferredDeviceType === 'back' ? 'front' : 'back';
    DebugUtils.log('Camera position changed to:', this.settings.preferredDeviceType);
  }

  /**
   * ズームレベルを設定
   */
  public setZoom(zoom: number): void {
    this.settings.zoom = Math.max(1, Math.min(zoom, 10)); // 1x-10x
    DebugUtils.log('Zoom level set to:', this.settings.zoom);
  }

  // =============================================================================
  // PHOTO CAPTURE
  // =============================================================================

  /**
   * 写真を撮影
   */
  public async takePhoto(options?: Partial<TakePhotoOptions>): Promise<CaptureResult | null> {
    try {
      if (!this.cameraRef?.current) {
        throw new Error('Camera reference not available');
      }

      const defaultOptions: TakePhotoOptions = {
        flash: this.settings.flashMode,
        enableAutoRedEyeReduction: true,
        enableAutoStabilization: true,
        enableShutterSound: Platform.OS === 'ios',
        ...options,
      };

      const photo: PhotoFile = await this.cameraRef.current.takePhoto(defaultOptions);
      
      const result: CaptureResult = {
        uri: `file://${photo.path}`,
        width: photo.width,
        height: photo.height,
        orientation: photo.orientation === 'portrait' ? 'portrait' : 'landscape',
        timestamp: Date.now(),
      };

      DebugUtils.log('Photo captured:', result);
      return result;
    } catch (error) {
      DebugUtils.log('Take photo error:', error);
      Alert.alert('撮影エラー', '写真の撮影に失敗しました');
      return null;
    }
  }

  /**
   * スナップショットを撮影（プレビューから）
   */
  public async takeSnapshot(options?: Partial<TakeSnapshotOptions>): Promise<CaptureResult | null> {
    try {
      if (!this.cameraRef?.current) {
        throw new Error('Camera reference not available');
      }

      const defaultOptions: TakeSnapshotOptions = {
        quality: 85,
        skipMetadata: false,
        ...options,
      };

      const snapshot = await this.cameraRef.current.takeSnapshot(defaultOptions);
      
      const result: CaptureResult = {
        uri: `file://${snapshot.path}`,
        width: snapshot.width,
        height: snapshot.height,
        orientation: 'portrait', // スナップショットは常にプレビュー方向
        timestamp: Date.now(),
      };

      DebugUtils.log('Snapshot captured:', result);
      return result;
    } catch (error) {
      DebugUtils.log('Take snapshot error:', error);
      Alert.alert('撮影エラー', 'スナップショットの撮影に失敗しました');
      return null;
    }
  }

  // =============================================================================
  // FRAME PROCESSOR
  // =============================================================================

  /**
   * フレームプロセッサのコールバックを設定
   */
  public setFrameProcessorCallbacks(callbacks: {
    onObjectDetected?: (objects: DetectedObject[]) => void;
    onQRCodeDetected?: (qrCodes: QRCode[]) => void;
    onBarcodeDetected?: (barcodes: Barcode[]) => void;
    onFaceDetected?: (faces: Face[]) => void;
  }): void {
    this.frameProcessorCallbacks = callbacks;
    DebugUtils.log('Frame processor callbacks set');
  }

  /**
   * フレームプロセッサを作成
   */
  public createFrameProcessor() {
    return useFrameProcessor((frame) => {
      'worklet';
      
      try {
        // AI検出処理はここで実装
        // リアルタイム物体検出、QRコード/バーコード検出など
        
        // 検出結果をJSスレッドに送信
        runOnJS(this.handleFrameProcessorResult)({
          objects: [], // TODO: 実際の検出結果
          qrCodes: [], // TODO: QRコード検出結果
          barcodes: [], // TODO: バーコード検出結果
          faces: [], // TODO: 顔検出結果
        });
      } catch (error) {
        runOnJS(this.handleFrameProcessorError)(error);
      }
    }, []);
  }

  /**
   * フレームプロセッサ結果を処理
   */
  private handleFrameProcessorResult = (result: FrameProcessorResult): void => {
    if (result.objects && result.objects.length > 0) {
      this.frameProcessorCallbacks.onObjectDetected?.(result.objects);
    }
    
    if (result.qrCodes && result.qrCodes.length > 0) {
      this.frameProcessorCallbacks.onQRCodeDetected?.(result.qrCodes);
    }
    
    if (result.barcodes && result.barcodes.length > 0) {
      this.frameProcessorCallbacks.onBarcodeDetected?.(result.barcodes);
    }
    
    if (result.faces && result.faces.length > 0) {
      this.frameProcessorCallbacks.onFaceDetected?.(result.faces);
    }
  };

  /**
   * フレームプロセッサエラーを処理
   */
  private handleFrameProcessorError = (error: any): void => {
    DebugUtils.log('Frame processor error:', error);
  };

  // =============================================================================
  // CAMERA REFERENCE MANAGEMENT
  // =============================================================================

  /**
   * カメラ参照を設定
   */
  public setCameraRef(ref: React.RefObject<Camera>): void {
    this.cameraRef = ref;
    DebugUtils.log('Camera reference set');
  }

  /**
   * カメラ参照を取得
   */
  public getCameraRef(): React.RefObject<Camera> | null {
    return this.cameraRef;
  }

  // =============================================================================
  // FOCUS & EXPOSURE CONTROL
  // =============================================================================

  /**
   * フォーカスポイントを設定
   */
  public async focus(point: { x: number; y: number }): Promise<void> {
    try {
      if (!this.cameraRef?.current) {
        throw new Error('Camera reference not available');
      }

      await this.cameraRef.current.focus(point);
      DebugUtils.log('Focus set to point:', point);
    } catch (error) {
      DebugUtils.log('Focus error:', error);
    }
  }

  /**
   * 露出ポイントを設定
   */
  public async setExposure(point: { x: number; y: number }): Promise<void> {
    try {
      if (!this.cameraRef?.current) {
        throw new Error('Camera reference not available');
      }

      // Vision Cameraの露出制御API
      // 実装は使用するバージョンに依存
      DebugUtils.log('Exposure set to point:', point);
    } catch (error) {
      DebugUtils.log('Exposure error:', error);
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * カメラの状態をチェック
   */
  public async checkCameraStatus(): Promise<{
    isAvailable: boolean;
    hasPermission: boolean;
    error?: string;
  }> {
    try {
      const devices = this.getAvailableDevices();
      const permissions = await this.getPermissionStatus();
      
      return {
        isAvailable: devices.length > 0,
        hasPermission: permissions.camera === 'granted',
        error: devices.length === 0 ? 'No camera devices available' : undefined,
      };
    } catch (error) {
      return {
        isAvailable: false,
        hasPermission: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * カメラ設定をリセット
   */
  public resetSettings(): void {
    this.settings = {
      preferredDeviceType: 'back',
      flashMode: 'off',
      focusMode: 'auto',
      exposureMode: 'auto',
      videoStabilization: true,
      lowLightBoost: false,
      hdr: false,
      zoom: 1,
    };
    DebugUtils.log('Camera settings reset to defaults');
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const visionCameraService = VisionCameraService.getInstance();

// =============================================================================
// REACT HOOKS
// =============================================================================

/**
 * カメラデバイス選択フック
 */
export const useCameraDevice = (position: 'back' | 'front' = 'back') => {
  const devices = useCameraDevices();
  const device = devices[position];
  
  React.useEffect(() => {
    if (device) {
      DebugUtils.log(`${position} camera device selected:`, device.id);
    }
  }, [device, position]);

  return device;
};

/**
 * カメラフォーマット選択フック
 */
export const useCameraFormatSelection = (device: CameraDevice | undefined) => {
  const format = useCameraFormat(device, [
    { photoAspectRatio: 4/3 },
    { photoResolution: 'max' },
    { fps: 30 },
  ]);

  React.useEffect(() => {
    if (format && device) {
      DebugUtils.log('Camera format selected:', {
        device: device.id,
        photoResolution: `${format.photoWidth}x${format.photoHeight}`,
        videoResolution: `${format.videoWidth}x${format.videoHeight}`,
        maxFps: format.maxFps,
      });
    }
  }, [format, device]);

  return format;
};

export default VisionCameraService;
