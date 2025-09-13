/**
 * Type Definitions for Cloud Services
 * クラウドサービス用型定義
 */

// Firebase/AWS SDKのモック型定義
declare module '@react-native-firebase/app' {
  export default interface FirebaseApp {
    options: any;
    name: string;
  }
}

declare module '@react-native-firebase/auth' {
  export interface User {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
  }

  export interface AuthCredential {
    providerId: string;
    signInMethod: string;
  }

  export default function auth(): {
    currentUser: User | null;
    signInWithEmailAndPassword: (email: string, password: string) => Promise<any>;
    createUserWithEmailAndPassword: (email: string, password: string) => Promise<any>;
    signOut: () => Promise<void>;
    onAuthStateChanged: (callback: (user: User | null) => void) => () => void;
    GoogleAuthProvider: any;
    FacebookAuthProvider: any;
    signInWithCredential: (credential: AuthCredential) => Promise<any>;
  };
}

declare module '@react-native-firebase/firestore' {
  export interface DocumentSnapshot {
    id: string;
    data: () => any;
    exists: boolean;
  }

  export interface QuerySnapshot {
    docs: DocumentSnapshot[];
    forEach: (callback: (doc: DocumentSnapshot) => void) => void;
  }

  export default function firestore(): {
    collection: (path: string) => {
      doc: (id?: string) => {
        set: (data: any) => Promise<void>;
        get: () => Promise<DocumentSnapshot>;
        update: (data: any) => Promise<void>;
        delete: () => Promise<void>;
        onSnapshot: (callback: (snapshot: DocumentSnapshot) => void) => () => void;
      };
      add: (data: any) => Promise<any>;
      get: () => Promise<QuerySnapshot>;
      onSnapshot: (callback: (snapshot: QuerySnapshot) => void) => () => void;
      where: (field: string, operator: string, value: any) => any;
      orderBy: (field: string, direction?: string) => any;
      limit: (count: number) => any;
    };
  };
}

declare module '@react-native-firebase/storage' {
  export default function storage(): {
    ref: (path?: string) => {
      putFile: (localPath: string) => Promise<any>;
      putString: (data: string, format?: string) => Promise<any>;
      getDownloadURL: () => Promise<string>;
      delete: () => Promise<void>;
    };
  };
}

declare module '@react-native-firebase/functions' {
  export default function functions(): {
    httpsCallable: (name: string) => (data?: any) => Promise<any>;
  };
}

declare module '@react-native-firebase/analytics' {
  export default function analytics(): {
    logEvent: (name: string, parameters?: any) => Promise<void>;
    setUserId: (id: string) => Promise<void>;
    setUserProperty: (name: string, value: string) => Promise<void>;
    resetAnalyticsData: () => Promise<void>;
  };
}

declare module '@react-native-firebase/crashlytics' {
  export default function crashlytics(): {
    log: (message: string) => void;
    recordError: (error: Error) => void;
    setUserId: (id: string) => Promise<void>;
    setAttributes: (attributes: Record<string, string>) => Promise<void>;
    crash: () => void;
  };
}

declare module '@react-native-firebase/messaging' {
  export default function messaging(): {
    requestPermission: () => Promise<any>;
    getToken: () => Promise<string>;
    onMessage: (callback: (message: any) => void) => () => void;
    onNotificationOpenedApp: (callback: (message: any) => void) => void;
    getInitialNotification: () => Promise<any>;
    subscribeToTopic: (topic: string) => Promise<void>;
    unsubscribeFromTopic: (topic: string) => Promise<void>;
  };
}

declare module '@react-native-firebase/remote-config' {
  export default function remoteConfig(): {
    setDefaults: (defaults: Record<string, any>) => Promise<void>;
    fetchAndActivate: () => Promise<boolean>;
    getValue: (key: string) => { asString: () => string; asNumber: () => number; asBoolean: () => boolean };
  };
}

// AWS Amplifyのモック型定義
declare module 'aws-amplify' {
  export class Amplify {
    static configure(config: any): void;
  }

  export class Auth {
    static signUp(params: any): Promise<any>;
    static signIn(username: string, password: string): Promise<any>;
    static signOut(): Promise<void>;
    static currentAuthenticatedUser(): Promise<any>;
    static currentSession(): Promise<any>;
    static confirmSignUp(username: string, code: string): Promise<any>;
    static resendSignUp(username: string): Promise<any>;
    static forgotPassword(username: string): Promise<any>;
    static forgotPasswordSubmit(username: string, code: string, newPassword: string): Promise<any>;
  }

  export class Storage {
    static put(key: string, object: any, config?: any): Promise<any>;
    static get(key: string, config?: any): Promise<any>;
    static remove(key: string): Promise<any>;
    static list(path: string): Promise<any>;
  }

  export class API {
    static graphql(params: any): Promise<any>;
    static get(apiName: string, path: string, init?: any): Promise<any>;
    static post(apiName: string, path: string, init?: any): Promise<any>;
    static put(apiName: string, path: string, init?: any): Promise<any>;
    static del(apiName: string, path: string, init?: any): Promise<any>;
  }

  export class Analytics {
    static record(event: any): Promise<any>;
    static updateEndpoint(config: any): Promise<any>;
  }
}

// React Native Biometricsの型定義
declare module 'react-native-biometrics' {
  export interface BiometryType {
    biometryType: 'TouchID' | 'FaceID' | 'Biometrics' | null;
    available: boolean;
    error?: string;
  }

  export interface BiometricPromptOptions {
    promptMessage: string;
    cancelButtonText?: string;
    fallbackPromptMessage?: string;
  }

  export interface BiometricAuthenticationResult {
    success: boolean;
    error?: string;
  }

  export default class ReactNativeBiometrics {
    static isSensorAvailable(): Promise<BiometryType>;
    static createKeys(): Promise<{ publicKey: string }>;
    static biometricKeysExist(): Promise<{ keysExist: boolean }>;
    static deleteKeys(): Promise<{ keysDeleted: boolean }>;
    static createSignature(options: {
      promptMessage: string;
      payload: string;
      cancelButtonText?: string;
    }): Promise<{ success: boolean; signature?: string; error?: string }>;
    static simplePrompt(options: BiometricPromptOptions): Promise<BiometricAuthenticationResult>;
  }
}

// React Native Keychainの型定義
declare module 'react-native-keychain' {
  export interface UserCredentials {
    username: string;
    password: string;
    service?: string;
  }

  export interface Options {
    service?: string;
    accessGroup?: string;
    accessControl?: string;
    authenticationType?: string;
    accessibilityLevel?: string;
    storage?: string;
  }

  export function setInternetCredentials(
    server: string,
    username: string,
    password: string,
    options?: Options
  ): Promise<boolean>;

  export function getInternetCredentials(
    server: string,
    options?: Options
  ): Promise<false | UserCredentials>;

  export function resetInternetCredentials(
    server: string,
    options?: Options
  ): Promise<boolean>;

  export function setGenericPassword(
    username: string,
    password: string,
    options?: Options
  ): Promise<boolean>;

  export function getGenericPassword(
    options?: Options
  ): Promise<false | UserCredentials>;

  export function resetGenericPassword(
    options?: Options
  ): Promise<boolean>;
}

// React Native NetInfoの型定義
declare module '@react-native-community/netinfo' {
  export interface NetInfoState {
    type: string;
    isConnected: boolean | null;
    isInternetReachable: boolean | null;
    details: any;
  }

  export interface NetInfoConfiguration {
    reachabilityUrl?: string;
    reachabilityTest?: (response: Response) => Promise<boolean>;
    reachabilityShortTimeout?: number;
    reachabilityLongTimeout?: number;
    reachabilityRequestTimeout?: number;
    reachabilityShouldRun?: () => boolean;
    shouldFetchWiFiSSID?: boolean;
    useNativeReachability?: boolean;
  }

  export default class NetInfo {
    static fetch(): Promise<NetInfoState>;
    static addEventListener(listener: (state: NetInfoState) => void): () => void;
    static configure(configuration: NetInfoConfiguration): void;
  }
}

// Node.js Timer型定義の修正
declare global {
  namespace NodeJS {
    interface Timeout {
      [Symbol.toPrimitive](): number;
    }
  }

  // React Native環境でのsetInterval型定義
  function setInterval(callback: () => void, ms: number): number;
  function clearInterval(intervalId: number): void;
  function setTimeout(callback: () => void, ms: number): number;
  function clearTimeout(timeoutId: number): void;
}

// AsyncStorageの型定義
declare module '@react-native-async-storage/async-storage' {
  export default class AsyncStorage {
    static getItem(key: string): Promise<string | null>;
    static setItem(key: string, value: string): Promise<void>;
    static removeItem(key: string): Promise<void>;
    static multiGet(keys: string[]): Promise<Array<[string, string | null]>>;
    static multiSet(keyValuePairs: Array<[string, string]>): Promise<void>;
    static multiRemove(keys: string[]): Promise<void>;
    static clear(): Promise<void>;
    static getAllKeys(): Promise<string[]>;
  }
}
