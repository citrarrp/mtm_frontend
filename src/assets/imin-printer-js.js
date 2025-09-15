// imin-printer-esm.js
// Clean ESM build of imin-printer v1.4.0
// - No UMD/CommonJS wrapper
// - No ActiveXObject (IE)
// - Safe console checks
// - Optional Vue plugin (auto-use only if Vue exists)

"use strict";

/* Vue plugin (optional) */
let _Vue;
const install = function (Vue) {
  if (install.installed && _Vue === Vue) {
    return;
  }
  install.installed = true;
  _Vue = Vue;

  const isDef = (v) => v !== void 0;

  const registerInstance = function (vm, callVal) {
    let i = vm.$options._parentVnode;
    if (
      isDef(i) &&
      isDef((i = i.data)) &&
      isDef((i = i.registerPrinterInstance))
    ) {
      i(vm, callVal);
    }
  };

  Vue.mixin({
    beforeCreate() {
      if (!this.print) {
        this.print = {};
      }
      if (isDef(this.$options.printer)) {
        this._printerRoot = this;
        this._printer = this.$options.printer;
      } else {
        this._printerRoot = (this.$parent && this.$parent._printerRoot) || this;
      }
      registerInstance(this, this);
    },
    destroyed() {
      registerInstance(this, void 0);
    },
  });

  Object.defineProperty(Vue.prototype, "$printer", {
    get() {
      return this._printerRoot._printer;
    },
  });
};

/* utils */
function assert(condition, message) {
  if (!condition) {
    throw new Error("[imin-printer] " + message);
  }
}

function warn(condition, message) {
  if (!condition) {
    if (typeof console !== "undefined" && typeof console.warn === "function") {
      console.warn("[imin-printer] " + message);
    }
  }
}

/* enums */
const PrinterType = {
  USB: "USB",
  SPI: "SPI",
  Bluetooth: "Bluetooth",
};

const PrinterStatus = {
  NORMAL: "0",
  OPEN: "3",
  NOPAPERFEED: "7",
  PAPERRUNNINGOUT: "8",
  NOTCONNECTED: "-1",
  NOTPOWEREDON: "1",
  OTHERERRORS: "99",
};

const TCPConnectProtocol = {
  WEBSOCKET_WS: "ws://",
  WEBSOCKET_WSS: "wss://",
  HTTP: "http://",
  HTTPS: "https://",
};

const TCPConnectPrefix = {
  WEBSOCKET: "/websocket",
  HTTP: "/upload",
};

/* helpers */
const stringify = (value) => JSON.stringify(value);
const parse = (value) => JSON.parse(value);

const dataURItoBlob = function (base64Data) {
  let byteString = "";
  if (base64Data.split(",")[0].indexOf("base64") >= 0) {
    byteString = atob(base64Data.split(",")[1]);
  } else {
    byteString = decodeURIComponent(base64Data.split(",")[1]);
  }
  const mimeString = base64Data.split(",")[0].split(":")[1].split(";")[0];
  const ia = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ia], { type: mimeString });
};

const compressImg = function (source, mime) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const originWidth = source.width;
  const originHeight = source.height;
  canvas.width = originWidth;
  canvas.height = originHeight;
  context.clearRect(0, 0, originWidth, originHeight);
  context.drawImage(source, 0, 0, originWidth, originHeight);
  return canvas.toDataURL(mime || "image/png");
};

const getPrinterStatusText = function (key) {
  switch (key.toString()) {
    case "0":
      return "The printer is normal";
    case "3":
      return "Print head open";
    case "7":
      return "No Paper Feed";
    case "8":
      return "Paper Running Out";
    case "99":
      return "Other errors";
    default:
      return "The printer is not connected or powered on";
  }
};

const inBrowser = typeof window !== "undefined";

/* Base WebSocket transport */
class PrinterWebSocket {
  constructor(address) {
    this.address = address || "127.0.0.1";
    this.port = 8081;
    this.protocol = TCPConnectProtocol.WEBSOCKET_WS;
    this.prefix = TCPConnectPrefix.WEBSOCKET;
    this.isLock = false;
    this.heart_time = 3000;
    this.check_time = 3000;
    this.lock_time = 4000;
    this.callback = function () {};
    this.ws = null;
    this.h_timer = null;
    this.c_timer = null;
    this.l_timer = null;
  }

  connect() {
    const self = this;
    return new Promise(function (resolve, reject) {
      const Socket =
        (inBrowser && (window.MozWebSocket || window.WebSocket)) || null;
      if (!Socket) {
        reject(assert(Socket, "Browser does not support WebSocket!"));
        return;
      }
      try {
        const ws = new Socket(
          `${self.protocol}${self.address}:${self.port}${self.prefix}`
        );
        ws.onopen = function () {
          self.heartCheck();
          if (ws.readyState === ws.OPEN) {
            resolve(true);
          } else {
            reject(new Error("WebSocket not open"));
          }
        };
        ws.onclose = function () {
          self.reconnect();
        };
        ws.onerror = function () {
          self.reconnect();
        };
        ws.onmessage = function (e) {
          try {
            // keepalive
            const isPing =
              e.data === "request" ||
              (typeof e.data === "string" &&
                parse(e.data) &&
                parse(e.data).data &&
                parse(e.data).data.text === "ping");

            if (isPing) {
              self.heartCheck();
              return;
            }
            const parsed = typeof e.data === "string" ? parse(e.data) : e.data;
            self.callback(parsed);
          } catch (err) {
            if (typeof console !== "undefined" && console.error) {
              console.error("[imin-printer] parse message error:", err);
            }
          }
        };
        self.ws = ws;
      } catch (error) {
        self.reconnect();
        reject(error);
      }
    });
  }

  sendParameter(text, type, value, labelData, object) {
    return stringify({
      data: Object.assign(
        {},
        {
          text: text !== undefined ? text : "",
          value: value !== undefined ? value : -1,
          labelData: labelData !== undefined ? labelData : {},
        },
        object ? object : {}
      ),
      type: type !== undefined ? type : 0,
    });
  }

  heartCheck() {
    const self = this;
    if (self.h_timer) clearTimeout(self.h_timer);
    if (self.c_timer) clearTimeout(self.c_timer);
    self.h_timer = setTimeout(function () {
      self.send(self.sendParameter("ping"));
      self.c_timer = setTimeout(function () {
        if (!self.ws || self.ws.readyState !== 1) {
          self.close();
        }
      }, self.check_time);
    }, self.heart_time);
  }

  reconnect() {
    const self = this;
    if (self.isLock) return;
    self.isLock = true;
    if (self.l_timer) clearTimeout(self.l_timer);
    self.l_timer = setTimeout(function () {
      self.connect().catch(() => {});
      self.isLock = false;
    }, self.lock_time);
  }

  send(message) {
    if (this.ws && this.ws.readyState === 1) {
      this.ws.send(message);
    } else {
      if (typeof console !== "undefined" && console.warn) {
        console.warn("[imin-printer] WebSocket not open, message dropped");
      }
    }
  }

  close() {
    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {
        console.log("error ws", e);
      }
      this.ws = null;
    }
  }
}

/* Main API */
class IminPrinter extends PrinterWebSocket {
  constructor(url) {
    super(url);
    warn(
      this instanceof IminPrinter,
      "Printer must be called with the new operator."
    );
    IminPrinter.connect_type = PrinterType.SPI;
  }

  /* Initialize the printer */
  initPrinter(connectType = PrinterType.SPI) {
    this.connect_type = connectType;
    this.send(this.sendParameter(connectType, 1));
  }

  /* Get printer status */
  getPrinterStatus(connectType = PrinterType.SPI) {
    const self = this;
    return new Promise(function (resolve) {
      self.connect_type = connectType;
      self.send(self.sendParameter(connectType, 2));
      self.callback = function (data) {
        if (data.type === 2) {
          resolve(
            Object.assign({}, data.data, {
              text: getPrinterStatusText(data.data.value),
            })
          );
        }
      };
    });
  }

  /* Basic paper ops */
  printAndLineFeed() {
    this.send(this.sendParameter("", 3));
  }

  printAndFeedPaper(height) {
    this.send(
      this.sendParameter("", 4, height <= 0 ? 0 : height >= 255 ? 255 : height)
    );
  }

  partialCut() {
    this.send(this.sendParameter("", 5));
  }

  partialCutPaper() {
    this.send(this.sendParameter("", 36));
  }

  /* Text settings */
  setAlignment(alignment) {
    this.send(
      this.sendParameter(
        "",
        6,
        alignment <= 0 ? 0 : alignment >= 2 ? 2 : alignment
      )
    );
  }

  setTextSize(size) {
    this.send(this.sendParameter("", 7, size));
  }

  setTextTypeface(typeface) {
    this.send(this.sendParameter("", 8, typeface));
  }

  setTextStyle(style) {
    this.send(
      this.sendParameter("", 9, style <= 0 ? 0 : style >= 3 ? 3 : style)
    );
  }

  setTextLineSpacing(space) {
    this.send(this.sendParameter("", 10, space));
  }

  setTextWidth(width) {
    this.send(
      this.sendParameter("", 11, width <= 0 ? 0 : width >= 576 ? 576 : width)
    );
  }

  /* Print text */
  printText(text, type) {
    this.send(
      this.sendParameter(
        type !== void 0 && !type && text.charAt(text.length - 2) === "\n"
          ? text.slice(0, text.length - 1) + "\n"
          : type !== void 0
          ? text
          : text + "\n",
        type !== void 0 ? 13 : 12,
        type !== void 0 ? (type <= 0 ? 0 : type >= 2 ? 2 : type) : void 0
      )
    );
  }

  /* Table (not support Arabic) */
  printColumnsText(colTextArr, colWidthArr, colAlignArr, size, width) {
    this.send(
      this.sendParameter(
        "",
        14,
        width < 0 ? 0 : width > 576 ? 576 : width,
        void 0,
        {
          colTextArr: colTextArr,
          colWidthArr: colWidthArr,
          colAlign: colAlignArr.map(function (item) {
            return item <= 0 ? 0 : item >= 2 ? 2 : item;
          }),
          size: size,
        }
      )
    );
  }

  /* Barcode */
  setBarCodeWidth(width) {
    this.send(
      this.sendParameter(
        "",
        15,
        width !== void 0 ? (width <= 1 ? 1 : width >= 6 ? 6 : width) : 3
      )
    );
  }

  setBarCodeHeight(height) {
    this.send(
      this.sendParameter("", 16, height <= 1 ? 1 : height >= 255 ? 255 : height)
    );
  }

  setBarCodeContentPrintPos(position) {
    this.send(
      this.sendParameter(
        "",
        17,
        position <= 0 ? 0 : position >= 3 ? 3 : position
      )
    );
  }

  printBarCode(barCodeType, barCodeContent, alignmentMode) {
    this.send(
      this.sendParameter(
        barCodeContent,
        alignmentMode !== void 0 ? 19 : 18,
        barCodeType <= 0 ? 0 : barCodeType >= 6 ? 6 : barCodeType,
        void 0,
        alignmentMode !== void 0
          ? {
              alignmentMode:
                alignmentMode <= 0 ? 0 : alignmentMode >= 2 ? 2 : alignmentMode,
            }
          : {}
      )
    );
  }

  /* QR code */
  setQrCodeSize(level) {
    this.send(
      this.sendParameter("", 20, level <= 1 ? 1 : level >= 9 ? 9 : level)
    );
  }

  setQrCodeErrorCorrectionLev(level) {
    this.send(
      this.sendParameter("", 21, level <= 48 ? 48 : level >= 51 ? 51 : level)
    );
  }

  setLeftMargin(marginValue) {
    this.send(
      this.sendParameter(
        "",
        22,
        marginValue <= 0 ? 0 : marginValue >= 576 ? 576 : marginValue
      )
    );
  }

  printQrCode(qrStr, alignmentMode) {
    this.send(
      this.sendParameter(
        qrStr,
        alignmentMode !== void 0 ? 24 : 23,
        alignmentMode !== void 0
          ? alignmentMode <= 0
            ? 0
            : alignmentMode >= 2
            ? 2
            : alignmentMode
          : void 0
      )
    );
  }

  /* Page format */
  setPageFormat(style) {
    this.send(this.sendParameter("", 25, style >= 1 ? 1 : 0));
  }

  /* Cash drawer */
  openCashBox() {
    this.send(this.sendParameter("", 100));
  }

  /* Upload & print single image */
  printSingleBitmap(bitmap, alignmentMode) {
    const self = this;

    return new Promise((resolve, reject) => {
      const image = new Image();
      const regex =
        /^\s*data:([a-z]+\/[a-z0-9-+.]+(;[a-z-]+=[a-z0-9-]+)?)?(;base64)?,([a-z0-9!$&',()*+;=\-._~:@/?%\s]*?)\s*$/i;

      if (!regex.test(bitmap)) {
        image.crossOrigin = "anonymous";
        image.src = bitmap + "?v=" + new Date().getTime();
      } else {
        image.src = bitmap;
      }

      image.onload = function () {
        // Determine MIME if dataURI, else default to PNG
        let mime = "image/png";
        if (regex.test(bitmap)) {
          try {
            mime =
              bitmap.split(",")[0].split(":")[1].split(";")[0] || "image/png";
          } catch (e) {
            console.error(e, "error");
          }
        }

        const formData = new FormData();
        const dataUrl = compressImg(image, mime);
        formData.append("file", dataURItoBlob(dataUrl));

        if (typeof XMLHttpRequest === "undefined") {
          reject(new Error("XMLHttpRequest is not supported"));
          return;
        }

        let XHR = new XMLHttpRequest();
        XHR.open(
          "POST",
          `${TCPConnectProtocol.HTTP}${self.address}:${self.port}${TCPConnectPrefix.HTTP}`
        );

        XHR.onreadystatechange = function () {
          if (XHR.readyState === 4) {
            if (XHR.status === 200) {
              const resultValue = XHR.responseText;
              if (resultValue) {
                self.send(
                  self.sendParameter(
                    "",
                    alignmentMode !== void 0 ? 27 : 26,
                    alignmentMode !== void 0 ? alignmentMode : void 0
                  )
                );

                self.callback = (data) => {
                  resolve(data.data.value);
                };
              } else {
                reject(new Error("No response data"));
              }
            } else {
              reject(new Error("Request failed with status: " + XHR.status));
            }
            XHR = null;
          }
        };

        XHR.send(formData);
      };

      image.onerror = function () {
        reject(new Error("Failed to load image"));
      };
    });
  }

  /* Double QR settings and print */
  setDoubleQRSize(size) {
    this.send(this.sendParameter("", 28, size));
  }

  setDoubleQR1Level(level) {
    this.send(this.sendParameter("", 29, level));
  }

  setDoubleQR1MarginLeft(marginValue) {
    this.send(this.sendParameter("", 31, marginValue));
  }

  setDoubleQR1Version(version) {
    this.send(this.sendParameter("", 33, version));
  }

  setDoubleQR2Level(level) {
    this.send(this.sendParameter("", 30, level));
  }

  setDoubleQR2MarginLeft(marginValue) {
    this.send(this.sendParameter("", 32, marginValue));
  }

  setDoubleQR2Version(version) {
    this.send(this.sendParameter("", 34, version));
  }

  printDoubleQR(colTextArr) {
    this.send(
      this.sendParameter("", 35, void 0, void 0, {
        colTextArr: colTextArr,
      })
    );
  }

  /* Label APIs */
  labelInitCanvas(labelData) {
    this.send(this.sendParameter("", 200, void 0, labelData));
  }

  labelAddText(labelData) {
    this.send(this.sendParameter("", 201, void 0, labelData));
  }

  labelAddBarCod(labelData) {
    this.send(this.sendParameter("", 202, void 0, labelData));
  }

  labelAddQrCode(labelData) {
    this.send(this.sendParameter("", 203, void 0, labelData));
  }

  labelAddBitmap(bitmap, labelData) {
    const self = this;

    return new Promise((resolve, reject) => {
      const image = new Image();
      const regex =
        /^\s*data:([a-z]+\/[a-z0-9-+.]+(;[a-z-]+=[a-z0-9-]+)?)?(;base64)?,([a-z0-9!$&',()*+;=\-._~:@/?%\s]*?)\s*$/i;

      if (!regex.test(bitmap)) {
        image.crossOrigin = "anonymous";
        image.src = bitmap + "?v=" + new Date().getTime();
      } else {
        image.src = bitmap;
      }

      image.onload = function () {
        let mime = "image/png";
        if (regex.test(bitmap)) {
          try {
            mime =
              bitmap.split(",")[0].split(":")[1].split(";")[0] || "image/png";
          } catch (e) {
            console.error(e, "error 2");
          }
        }

        const formData = new FormData();
        const dataUrl = compressImg(image, mime);
        formData.append("file", dataURItoBlob(dataUrl));

        if (typeof XMLHttpRequest === "undefined") {
          reject(new Error("XMLHttpRequest is not supported"));
          return;
        }

        let XHR = new XMLHttpRequest();
        XHR.open(
          "POST",
          `${TCPConnectProtocol.HTTP}${self.address}:${self.port}${TCPConnectPrefix.HTTP}`
        );

        XHR.onreadystatechange = function () {
          if (XHR.readyState === 4) {
            if (XHR.status === 200) {
              const resultValue = XHR.responseText;
              if (resultValue) {
                self.send(self.sendParameter("", 204, void 0, labelData));
                self.callback = (data) => {
                  resolve(data.data.value);
                };
              } else {
                reject(new Error("No response data"));
              }
            } else {
              reject(new Error("Request failed with status: " + XHR.status));
            }
            XHR = null;
          }
        };

        XHR.send(formData);
      };

      image.onerror = function () {
        reject(new Error("Failed to load image"));
      };
    });
  }

  labelAddArea(labelData) {
    this.send(this.sendParameter("", 205, void 0, labelData));
  }

  labelPrintCanvas(labelData) {
    this.send(this.sendParameter("", 206, void 0, labelData));
  }

  labelLearning(labelData) {
    this.send(this.sendParameter("", 207, void 0, labelData));
  }

  setPrintMode(labelData) {
    this.send(this.sendParameter("", 208, void 0, labelData));
  }

  getPrintModel(labelData) {
    this.send(this.sendParameter("", 209, void 0, labelData));
  }

  printLabelBitmap(bitmap, labelData) {
    const self = this;

    return new Promise((resolve, reject) => {
      const image = new Image();
      const regex =
        /^\s*data:([a-z]+\/[a-z0-9-+.]+(;[a-z-]+=[a-z0-9-]+)?)?(;base64)?,([a-z0-9!$&',()*+;=\-._~:@/?%\s]*?)\s*$/i;

      if (!regex.test(bitmap)) {
        image.crossOrigin = "anonymous";
        image.src = bitmap + "?v=" + new Date().getTime();
      } else {
        image.src = bitmap;
      }

      image.onload = function () {
        let mime = "image/png";
        if (regex.test(bitmap)) {
          try {
            mime =
              bitmap.split(",")[0].split(":")[1].split(";")[0] || "image/png";
          } catch (e) {
            console.error(e, "Error 3");
          }
        }

        const formData = new FormData();
        const dataUrl = compressImg(image, mime);
        formData.append("file", dataURItoBlob(dataUrl));

        if (typeof XMLHttpRequest === "undefined") {
          reject(new Error("XMLHttpRequest is not supported"));
          return;
        }

        let XHR = new XMLHttpRequest();
        XHR.open(
          "POST",
          `${TCPConnectProtocol.HTTP}${self.address}:${self.port}${TCPConnectPrefix.HTTP}`
        );

        XHR.onreadystatechange = function () {
          if (XHR.readyState === 4) {
            if (XHR.status === 200) {
              const resultValue = XHR.responseText;
              if (resultValue) {
                self.send(self.sendParameter("", 210, void 0, labelData));
                self.callback = (data) => {
                  resolve(data.data.value);
                };
              } else {
                reject(new Error("No response data"));
              }
            } else {
              reject(new Error("Request failed with status: " + XHR.status));
            }
            XHR = null;
          }
        };

        XHR.send(formData);
      };

      image.onerror = function () {
        reject(new Error("Failed to load image"));
      };
    });
  }
}

/* plugin metadata */
IminPrinter.install = install;
IminPrinter.version = "1.4.0";

/* Auto-use Vue plugin if Vue exists (optional) */
if (inBrowser && typeof window.Vue !== "undefined") {
  window.Vue.use(IminPrinter);
}

export default IminPrinter;
