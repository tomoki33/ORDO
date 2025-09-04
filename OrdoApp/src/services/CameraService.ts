import {launchImageLibrary, launchCamera, ImagePickerResponse, MediaType, PhotoQuality} from 'react-native-image-picker';
import ImageResizer from '@bam.tech/react-native-image-resizer';
import {PermissionsAndroid, Platform, Alert} from 'react-native';
import {DebugUtils} from '../utils';

export interface CameraOptions {
  quality?: PhotoQuality;
  maxWidth?: number;
  maxHeight?: number;
  storageOptions?: {
    skipBackup?: boolean;
    path?: string;
  };
}

export interface ImageResult {
  uri: string;
  type?: string;
  fileName?: string;
  fileSize?: number;
  width?: number;
  height?: number;
}

export interface ResizeOptions {
  maxWidth: number;
  maxHeight: number;
  quality?: number;
  format?: 'JPEG' | 'PNG';
  keepMeta?: boolean;
}

export class CameraService {
  private static instance: CameraService;

  private constructor() {}

  public static getInstance(): CameraService {
    if (!CameraService.instance) {
      CameraService.instance = new CameraService();
    }
    return CameraService.instance;
  }

  /**
   * カメラの権限をリクエスト
   */
  public async requestCameraPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'カメラの許可',
            message: '食品の写真を撮影するためにカメラの使用を許可してください',
            buttonNeutral: '後で確認',
            buttonNegative: 'キャンセル',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
      return true; // iOSではinfo.plistで管理
    } catch (error) {
      DebugUtils.log('Camera permission error:', error);
      return false;
    }
  }

  /**
   * ギャラリーから画像を選択
   */
  public async selectFromGallery(options: CameraOptions = {}): Promise<ImageResult | null> {
    try {
      const defaultOptions = {
        mediaType: 'photo' as MediaType,
        quality: options.quality || 0.8 as PhotoQuality,
        maxWidth: options.maxWidth || 1024,
        maxHeight: options.maxHeight || 1024,
        storageOptions: {
          skipBackup: true,
          ...options.storageOptions,
        },
      };

      return new Promise((resolve) => {
        launchImageLibrary(defaultOptions, (response: ImagePickerResponse) => {
          if (response.didCancel || response.errorMessage) {
            DebugUtils.log('Gallery selection cancelled or error:', response.errorMessage);
            resolve(null);
            return;
          }

          if (response.assets && response.assets[0]) {
            const asset = response.assets[0];
            const result: ImageResult = {
              uri: asset.uri!,
              type: asset.type,
              fileName: asset.fileName,
              fileSize: asset.fileSize,
              width: asset.width,
              height: asset.height,
            };
            DebugUtils.log('Image selected from gallery:', result);
            resolve(result);
          } else {
            resolve(null);
          }
        });
      });
    } catch (error) {
      DebugUtils.log('Gallery selection error:', error);
      Alert.alert('エラー', 'ギャラリーから画像を選択できませんでした');
      return null;
    }
  }

  /**
   * カメラで写真を撮影
   */
  public async takePhoto(options: CameraOptions = {}): Promise<ImageResult | null> {
    try {
      // カメラ権限を確認
      const hasPermission = await this.requestCameraPermission();
      if (!hasPermission) {
        Alert.alert('権限エラー', 'カメラの使用権限が必要です');
        return null;
      }

      const defaultOptions = {
        mediaType: 'photo' as MediaType,
        quality: options.quality || 0.8 as PhotoQuality,
        maxWidth: options.maxWidth || 1024,
        maxHeight: options.maxHeight || 1024,
        storageOptions: {
          skipBackup: true,
          ...options.storageOptions,
        },
      };

      return new Promise((resolve) => {
        launchCamera(defaultOptions, (response: ImagePickerResponse) => {
          if (response.didCancel || response.errorMessage) {
            DebugUtils.log('Camera capture cancelled or error:', response.errorMessage);
            resolve(null);
            return;
          }

          if (response.assets && response.assets[0]) {
            const asset = response.assets[0];
            const result: ImageResult = {
              uri: asset.uri!,
              type: asset.type,
              fileName: asset.fileName,
              fileSize: asset.fileSize,
              width: asset.width,
              height: asset.height,
            };
            DebugUtils.log('Photo taken with camera:', result);
            resolve(result);
          } else {
            resolve(null);
          }
        });
      });
    } catch (error) {
      DebugUtils.log('Camera capture error:', error);
      Alert.alert('エラー', 'カメラで写真を撮影できませんでした');
      return null;
    }
  }

  /**
   * 画像をリサイズ・圧縮
   */
  public async resizeImage(
    imageUri: string,
    options: ResizeOptions = {maxWidth: 800, maxHeight: 600, quality: 80}
  ): Promise<ImageResult | null> {
    try {
      const resizedImage = await ImageResizer.createResizedImage(
        imageUri,
        options.maxWidth,
        options.maxHeight,
        options.format || 'JPEG',
        options.quality || 80,
        0, // rotation
        undefined, // outputPath
        options.keepMeta || false
      );

      const result: ImageResult = {
        uri: resizedImage.uri,
        type: `image/${(options.format || 'JPEG').toLowerCase()}`,
        fileName: resizedImage.name,
        fileSize: resizedImage.size,
        width: resizedImage.width,
        height: resizedImage.height,
      };

      DebugUtils.log('Image resized:', result);
      return result;
    } catch (error) {
      DebugUtils.log('Image resize error:', error);
      Alert.alert('エラー', '画像のリサイズに失敗しました');
      return null;
    }
  }

  /**
   * 画像選択オプションを表示（カメラ or ギャラリー）
   */
  public async showImagePickerOptions(options: CameraOptions = {}): Promise<ImageResult | null> {
    return new Promise((resolve) => {
      Alert.alert(
        '画像を選択',
        '画像の取得方法を選択してください',
        [
          {
            text: 'キャンセル',
            style: 'cancel',
            onPress: () => resolve(null),
          },
          {
            text: 'ギャラリー',
            onPress: async () => {
              const result = await this.selectFromGallery(options);
              resolve(result);
            },
          },
          {
            text: 'カメラ',
            onPress: async () => {
              const result = await this.takePhoto(options);
              resolve(result);
            },
          },
        ],
        {cancelable: true, onDismiss: () => resolve(null)}
      );
    });
  }

  /**
   * 画像を最適化（リサイズ + 圧縮）
   */
  public async optimizeImage(
    imageUri: string,
    targetSize: 'thumbnail' | 'medium' | 'large' = 'medium'
  ): Promise<ImageResult | null> {
    try {
      let resizeOptions: ResizeOptions;

      switch (targetSize) {
        case 'thumbnail':
          resizeOptions = {
            maxWidth: 200,
            maxHeight: 200,
            quality: 70,
            format: 'JPEG',
          };
          break;
        case 'medium':
          resizeOptions = {
            maxWidth: 800,
            maxHeight: 600,
            quality: 80,
            format: 'JPEG',
          };
          break;
        case 'large':
          resizeOptions = {
            maxWidth: 1200,
            maxHeight: 900,
            quality: 85,
            format: 'JPEG',
          };
          break;
      }

      return await this.resizeImage(imageUri, resizeOptions);
    } catch (error) {
      DebugUtils.log('Image optimization error:', error);
      return null;
    }
  }

  /**
   * 複数の画像を一括で最適化
   */
  public async optimizeMultipleImages(
    imageUris: string[],
    targetSize: 'thumbnail' | 'medium' | 'large' = 'medium'
  ): Promise<(ImageResult | null)[]> {
    const results: (ImageResult | null)[] = [];

    for (const uri of imageUris) {
      const optimized = await this.optimizeImage(uri, targetSize);
      results.push(optimized);
    }

    return results;
  }

  /**
   * 画像のファイルサイズを取得
   */
  public getImageFileSize(imageResult: ImageResult): string {
    if (!imageResult.fileSize) return '不明';

    const sizeInKB = imageResult.fileSize / 1024;
    if (sizeInKB < 1024) {
      return `${sizeInKB.toFixed(1)} KB`;
    } else {
      const sizeInMB = sizeInKB / 1024;
      return `${sizeInMB.toFixed(1)} MB`;
    }
  }

  /**
   * 画像の解像度を取得
   */
  public getImageResolution(imageResult: ImageResult): string {
    if (!imageResult.width || !imageResult.height) return '不明';
    return `${imageResult.width} × ${imageResult.height}`;
  }
}

export const cameraService = CameraService.getInstance();
