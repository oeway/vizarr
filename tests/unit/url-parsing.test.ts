import type { ImageLayerConfig } from "../../src/state";

// Mock window.location for testing
const mockLocation = (search: string) => {
  (window as any).location = undefined;
  window.location = {
    search,
    href: `http://localhost:3030${search}`,
    pathname: "/",
    hash: "",
  } as any;
};

describe("URL Parameter Parsing", () => {
  beforeEach(() => {
    // Reset location before each test
    mockLocation("");
  });

  describe("URLSearchParams parsing for image configuration", () => {
    test("should parse basic source parameter", () => {
      const testUrl = "?source=https://test.zarr";
      mockLocation(testUrl);

      const params = new URLSearchParams(window.location.search);

      expect(params.has("source")).toBe(true);
      expect(params.get("source")).toBe("https://test.zarr");
    });

    test("should parse encoded source parameter", () => {
      const originalUrl = "https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.1/6001253.zarr";
      const encodedUrl = encodeURIComponent(originalUrl);
      const testUrl = `?source=${encodedUrl}`;
      mockLocation(testUrl);

      const params = new URLSearchParams(window.location.search);
      const config = {} as any;

      for (const [key, value] of params) {
        config[key] = value;
      }

      // Decode the source URL as done in vizarr.tsx
      config.source = decodeURIComponent(config.source);

      expect(config.source).toBe(originalUrl);
    });

    test("should parse multiple configuration parameters", () => {
      const testUrl = "?source=https://test.zarr&name=test-image&colormap=viridis&opacity=0.8";
      mockLocation(testUrl);

      const params = new URLSearchParams(window.location.search);
      const config = {} as any;

      for (const [key, value] of params) {
        config[key] = value;
      }

      config.source = decodeURIComponent(config.source);

      const imageConfig: ImageLayerConfig = config as ImageLayerConfig;

      expect(imageConfig.source).toBe("https://test.zarr");
      expect(imageConfig.name).toBe("test-image");
      expect(imageConfig.colormap).toBe("viridis");
      expect(imageConfig.opacity).toBe("0.8"); // Note: URL params are strings
    });

    test("should handle empty parameters", () => {
      const testUrl = "";
      mockLocation(testUrl);

      const params = new URLSearchParams(window.location.search);

      expect(params.has("source")).toBe(false);
      expect(Array.from(params.entries())).toHaveLength(0);
    });

    test("should handle special characters in source URL", () => {
      const originalUrl = "https://test.com/path/file.zarr?query=value&other=123";
      const encodedUrl = encodeURIComponent(originalUrl);
      const testUrl = `?source=${encodedUrl}&name=special`;
      mockLocation(testUrl);

      const params = new URLSearchParams(window.location.search);
      const config = {} as any;

      for (const [key, value] of params) {
        config[key] = value;
      }

      config.source = decodeURIComponent(config.source);

      expect(config.source).toBe(originalUrl);
      expect(config.name).toBe("special");
    });

    test("should handle array-like parameters for multichannel config", () => {
      const testUrl = "?source=https://test.zarr&colors=%23ff0000&colors=%23008000&names=Red&names=Green";
      mockLocation(testUrl);

      const params = new URLSearchParams(window.location.search);

      // Get all colors and names (URLSearchParams.getAll for array values)
      const colors = params.getAll("colors").map((c) => decodeURIComponent(c));
      const names = params.getAll("names");

      expect(colors).toEqual(["#ff0000", "#008000"]);
      expect(names).toEqual(["Red", "Green"]);
    });
  });

  describe("URL History Management", () => {
    test("should generate correct URL for source parameter", () => {
      const sourceUrl = "https://test.zarr";
      const expectedHref = `http://localhost:3030/?source=${sourceUrl}`;

      const href = new URL("http://localhost:3030/");
      href.searchParams.set("source", sourceUrl);
      const newLocation = decodeURIComponent(href.toString());

      expect(newLocation).toBe(expectedHref);
    });

    test("should handle URL updates correctly", () => {
      const originalLocation = "http://localhost:3030/";
      const sourceUrl = "https://test.zarr";

      const href = new URL(originalLocation);
      href.searchParams.set("source", sourceUrl);
      const newLocation = decodeURIComponent(href.toString());

      expect(newLocation).toBe(`${originalLocation}?source=${sourceUrl}`);
      expect(newLocation).not.toBe(originalLocation);
    });

    test("should preserve existing parameters when adding source", () => {
      const originalLocation = "http://localhost:3030/?existing=param";
      const sourceUrl = "https://test.zarr";

      const href = new URL(originalLocation);
      href.searchParams.set("source", sourceUrl);
      const newLocation = decodeURIComponent(href.toString());

      expect(newLocation).toContain("existing=param");
      expect(newLocation).toContain(`source=${sourceUrl}`);
    });
  });

  describe("Configuration Type Conversion", () => {
    test("should handle string to number conversion for numeric parameters", () => {
      const testUrl = "?source=https://test.zarr&opacity=0.8&channel_axis=2";
      mockLocation(testUrl);

      const params = new URLSearchParams(window.location.search);
      const config = {} as any;

      for (const [key, value] of params) {
        config[key] = value;
      }

      config.source = decodeURIComponent(config.source);

      // Simulate type conversion as might be needed in the application
      if (config.opacity) config.opacity = Number.parseFloat(config.opacity);
      if (config.channel_axis) config.channel_axis = Number.parseInt(config.channel_axis);

      expect(typeof config.opacity).toBe("number");
      expect(config.opacity).toBe(0.8);
      expect(typeof config.channel_axis).toBe("number");
      expect(config.channel_axis).toBe(2);
    });

    test("should handle boolean-like string conversion", () => {
      const testUrl = "?source=https://test.zarr&visibility=true";
      mockLocation(testUrl);

      const params = new URLSearchParams(window.location.search);
      const config = {} as any;

      for (const [key, value] of params) {
        config[key] = value;
      }

      config.source = decodeURIComponent(config.source);

      // Simulate boolean conversion
      if (config.visibility) {
        config.visibility = config.visibility === "true";
      }

      expect(typeof config.visibility).toBe("boolean");
      expect(config.visibility).toBe(true);
    });

    test("should handle JSON-like array parameters", () => {
      const contrastLimits = JSON.stringify([
        [0, 255],
        [0, 1000],
      ]);
      const testUrl = `?source=https://test.zarr&contrast_limits=${encodeURIComponent(contrastLimits)}`;
      mockLocation(testUrl);

      const params = new URLSearchParams(window.location.search);
      const config = {} as any;

      for (const [key, value] of params) {
        config[key] = value;
      }

      config.source = decodeURIComponent(config.source);

      // Simulate JSON parsing for complex parameters
      if (config.contrast_limits) {
        config.contrast_limits = JSON.parse(decodeURIComponent(config.contrast_limits));
      }

      expect(Array.isArray(config.contrast_limits)).toBe(true);
      expect(config.contrast_limits).toEqual([
        [0, 255],
        [0, 1000],
      ]);
    });
  });
});
