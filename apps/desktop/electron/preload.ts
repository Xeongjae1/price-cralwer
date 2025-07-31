import { contextBridge, ipcRenderer } from "electron";

// React 19와 호환되는 안전한 API 노출
contextBridge.exposeInMainWorld("electronAPI", {
  // 상품 관련
  getProducts: () => ipcRenderer.invoke("get-products"),
  addProduct: (productData: any) =>
    ipcRenderer.invoke("add-product", productData),

  // 크롤링 관련
  startCrawling: (productIds: string[]) =>
    ipcRenderer.invoke("start-crawling", productIds),

  // 앱 정보
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),

  // 이벤트 리스너 (메모리 누수 방지)
  onPriceUpdate: (callback: (data: any) => void) => {
    const subscription = (event: any, data: any) => callback(data);
    ipcRenderer.on("price-update", subscription);

    return () => {
      ipcRenderer.removeListener("price-update", subscription);
    };
  },
});

// React 19용 타입 정의
declare global {
  interface Window {
    electronAPI: {
      getProducts: () => Promise<any>;
      addProduct: (productData: any) => Promise<any>;
      startCrawling: (productIds: string[]) => Promise<any>;
      getAppVersion: () => Promise<string>;
      onPriceUpdate: (callback: (data: any) => void) => () => void;
    };
  }
}
