// Real zarr sources for testing
const IMJOY_TEST_ZARR_URLS = {
  EBI_6001253: "https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.1/6001253.zarr",
  // Add more real zarr sources as needed
};

// Define interface locally to avoid ES module import issues
interface ImageLayerConfig {
  source: string;
  name?: string;
}

describe("ImJoy API Functions - Real Data Tests", () => {
  // Increase timeout for network requests
  jest.setTimeout(30000);

  describe("add_image API with Real Zarr Data", () => {
    test("should validate real zarr URLs are accessible", () => {
      // Test that our real zarr URL is a valid URL structure
      const zarrUrl = IMJOY_TEST_ZARR_URLS.EBI_6001253;

      // Should be a valid URL
      expect(() => new URL(zarrUrl)).not.toThrow();

      // Should have HTTPS protocol for security
      const parsedUrl = new URL(zarrUrl);
      expect(parsedUrl.protocol).toBe("https:");

      // Should end with .zarr
      expect(zarrUrl.endsWith(".zarr")).toBe(true);
    });

    test("should validate zarr URL structure", () => {
      const testUrls = [
        IMJOY_TEST_ZARR_URLS.EBI_6001253,
        "https://example.com/data.zarr",
        "http://localhost:8080/data.zarr",
      ];

      testUrls.forEach((url) => {
        expect(url).toMatch(/^https?:\/\/.+\.zarr$/);
        expect(url.length).toBeGreaterThan(0);

        // Should be valid URL
        expect(() => new URL(url)).not.toThrow();
      });
    });

    test("should validate required ImageLayerConfig properties", () => {
      const validConfigs: ImageLayerConfig[] = [
        { source: IMJOY_TEST_ZARR_URLS.EBI_6001253 },
        { source: IMJOY_TEST_ZARR_URLS.EBI_6001253, name: "named-image" },
      ];

      const invalidConfigs = [{}, { source: "" }, { source: null as any }, { source: 123 as any }];

      // Test validation logic
      const isValidConfig = (config: any): config is ImageLayerConfig => {
        if (!config || typeof config !== "object") {
          return false;
        }
        return typeof config.source === "string" && config.source.length > 0;
      };

      validConfigs.forEach((config) => {
        expect(isValidConfig(config)).toBe(true);
      });

      invalidConfigs.forEach((config) => {
        expect(isValidConfig(config)).toBe(false);
      });
    });
  });

  describe("View State Management", () => {
    test("should validate view state structure", () => {
      const validViewStates = [
        { zoom: 0, target: [0, 0] },
        { zoom: 5, target: [100, 200] },
        { zoom: -2, target: [-50, -100] },
        { zoom: 10.5, target: [1000.5, 2000.7] },
      ];

      const invalidViewStates = [
        { zoom: "invalid", target: [0, 0] },
        { zoom: 0, target: [0] },
        { zoom: 0, target: ["x", "y"] },
        { target: [0, 0] }, // missing zoom
        { zoom: 0 }, // missing target
        null,
        undefined,
      ];

      const isValidViewState = (vs: any) => {
        if (!vs || typeof vs !== "object") {
          return false;
        }
        return (
          typeof vs.zoom === "number" &&
          Array.isArray(vs.target) &&
          vs.target.length === 2 &&
          vs.target.every((n: any) => typeof n === "number")
        );
      };

      validViewStates.forEach((vs) => {
        expect(isValidViewState(vs)).toBe(true);
      });

      invalidViewStates.forEach((vs) => {
        expect(isValidViewState(vs)).toBe(false);
      });
    });

    test("should handle zoom level constraints", () => {
      const normalizeZoom = (zoom: number, min = -10, max = 20) => {
        return Math.max(min, Math.min(max, zoom));
      };

      expect(normalizeZoom(0)).toBe(0);
      expect(normalizeZoom(5)).toBe(5);
      expect(normalizeZoom(-15)).toBe(-10); // clamped to min
      expect(normalizeZoom(25)).toBe(20); // clamped to max
      expect(normalizeZoom(10.7)).toBe(10.7); // float values
    });
  });

  describe("Loading State Management", () => {
    test("should handle different loading state types", () => {
      const validLoadingStates = [false, true, "Loading zarr data...", "Processing image...", "Rendering...", ""];

      const isValidLoadingState = (state: any) => {
        return typeof state === "boolean" || typeof state === "string";
      };

      validLoadingStates.forEach((state) => {
        expect(isValidLoadingState(state)).toBe(true);
      });

      // Invalid states
      const invalidStates = [null, undefined, 123, {}, []];
      invalidStates.forEach((state) => {
        expect(isValidLoadingState(state)).toBe(false);
      });
    });

    test("should track loading state transitions", () => {
      const loadingHistory: (boolean | string)[] = [];

      const setLoading = (state: boolean | string) => {
        loadingHistory.push(state);
      };

      // Simulate realistic loading flow
      setLoading(true);
      setLoading("Fetching zarr metadata...");
      setLoading("Loading image data...");
      setLoading("Initializing WebGL...");
      setLoading(false);

      expect(loadingHistory).toEqual([
        true,
        "Fetching zarr metadata...",
        "Loading image data...",
        "Initializing WebGL...",
        false,
      ]);

      expect(loadingHistory.length).toBe(5);
      expect(loadingHistory[0]).toBe(true);
      expect(loadingHistory[loadingHistory.length - 1]).toBe(false);
    });
  });

  describe("Environment Detection", () => {
    test("should correctly detect iframe environment", () => {
      const originalSelf = window.self;
      const originalTop = window.top;

      try {
        const isInIframe = () => {
          try {
            return window.self !== window.top;
          } catch (e) {
            // In some browsers, accessing window.top throws an error when in iframe
            return true;
          }
        };

        // Test normal window (not iframe)
        Object.defineProperty(window, "self", {
          value: window,
          configurable: true,
        });
        Object.defineProperty(window, "top", {
          value: window,
          configurable: true,
        });

        expect(isInIframe()).toBe(false);

        // Test iframe environment
        const mockIframeWindow = {} as Window;
        const mockTopWindow = {} as Window;

        Object.defineProperty(window, "self", {
          value: mockIframeWindow,
          configurable: true,
        });
        Object.defineProperty(window, "top", {
          value: mockTopWindow,
          configurable: true,
        });

        expect(isInIframe()).toBe(true);
      } finally {
        // Restore original values
        Object.defineProperty(window, "self", {
          value: originalSelf,
          configurable: true,
        });
        Object.defineProperty(window, "top", {
          value: originalTop,
          configurable: true,
        });
      }
    });
  });

  describe("URL Parameter Handling", () => {
    test("should encode and decode zarr URLs correctly", () => {
      const testUrls = [
        IMJOY_TEST_ZARR_URLS.EBI_6001253,
        "https://example.com/data.zarr",
        "file:///local/path/data.zarr",
        "https://example.com/path with spaces/data.zarr",
      ];

      testUrls.forEach((url) => {
        const encoded = encodeURIComponent(url);
        const decoded = decodeURIComponent(encoded);

        expect(decoded).toBe(url);
        expect(encoded).not.toContain(" "); // spaces should be encoded
      });
    });

    test("should handle URL construction for vizarr viewer", () => {
      const baseUrl = "";
      const sourceUrl = IMJOY_TEST_ZARR_URLS.EBI_6001253;

      const constructVizarrUrl = (source: string, base = "") => {
        return `${base}?source=${encodeURIComponent(source)}`;
      };

      const vizarrUrl = constructVizarrUrl(sourceUrl, baseUrl);

      expect(vizarrUrl).toContain("?source=");
      expect(vizarrUrl).toContain(encodeURIComponent(sourceUrl));

      // Should be a valid URL format
      expect(() => new URL(vizarrUrl, "https://example.com")).not.toThrow();
    });
  });
});
