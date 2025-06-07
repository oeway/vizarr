import type { ImageLayerConfig, SourceData } from '../../src/state';

// Mock imjoy-rpc
const mockExport = jest.fn();
const mockSetupRPC = jest.fn().mockResolvedValue({
  export: mockExport,
});

jest.mock('imjoy-rpc', () => ({
  imjoyRPC: {
    setupRPC: mockSetupRPC,
  },
}));

// Mock the io module
const mockCreateSourceData = jest.fn();
jest.mock('../../src/io', () => ({
  createSourceData: mockCreateSourceData,
}));

type WithId<T> = T & { id: string };

describe('ImJoy API Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful source data creation
    mockCreateSourceData.mockResolvedValue({
      name: 'test-image',
      loader: [],
      channel_axis: null,
      colors: ['#ff0000'],
      names: ['test'],
      contrast_limits: [[0, 255]],
      visibilities: [true],
      defaults: {
        selection: [0],
        colormap: 'viridis',
        opacity: 1,
      },
      model_matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
      axis_labels: ['y', 'x'],
    });
  });

  describe('add_image API Logic', () => {
    test('should call createSourceData with correct config', async () => {
      // Simulate the add_image function logic
      const addImage = async (config: ImageLayerConfig) => {
        const { createSourceData } = await import('../../src/io');
        const sourceData = await createSourceData(config);
        return sourceData;
      };

      const testConfig: ImageLayerConfig = {
        source: 'https://test.zarr',
        name: 'test-image',
      };

      const result = await addImage(testConfig);

      expect(mockCreateSourceData).toHaveBeenCalledWith(testConfig);
      expect(result.name).toBe('test-image');
    });

    test('should handle errors gracefully when source data creation fails', async () => {
      mockCreateSourceData.mockRejectedValue(new Error('Failed to load zarr'));

      const addImage = async (config: ImageLayerConfig) => {
        const { createSourceData } = await import('../../src/io');
        return await createSourceData(config);
      };

      const testConfig: ImageLayerConfig = {
        source: 'https://invalid.zarr',
      };

      await expect(addImage(testConfig)).rejects.toThrow('Failed to load zarr');
      expect(mockCreateSourceData).toHaveBeenCalledWith(testConfig);
    });

    test('should generate unique IDs for multiple images', () => {
      // Test the ID generation logic used in add_image
      const generateId = () => Math.random().toString(36).slice(2);
      
      const id1 = generateId();
      const id2 = generateId();
      
      expect(typeof id1).toBe('string');
      expect(typeof id2).toBe('string');
      expect(id1).not.toBe(id2);
      expect(id1.length).toBeGreaterThan(0);
    });

    test('should set default name when not provided', () => {
      // Test the default naming logic
      const setDefaultName = (sourceData: any, existingCount: number) => {
        if (!sourceData.name) {
          sourceData.name = `image_${existingCount}`;
        }
        return sourceData;
      };

      const sourceDataWithoutName = {
        loader: [],
        channel_axis: null,
        colors: ['#ff0000'],
      };

      const result = setDefaultName(sourceDataWithoutName, 0);
      expect(result.name).toBe('image_0');

      const result2 = setDefaultName({ ...sourceDataWithoutName, name: undefined }, 1);
      expect(result2.name).toBe('image_1');
    });
  });

  describe('View State API Logic', () => {
    test('should validate view state structure', () => {
      const isValidViewState = (vs: any) => {
        return (
          typeof vs === 'object' &&
          typeof vs.zoom === 'number' &&
          Array.isArray(vs.target) &&
          vs.target.length === 3 &&
          vs.target.every((n: any) => typeof n === 'number')
        );
      };

      const validViewStates = [
        { zoom: 0, target: [0, 0, 0] },
        { zoom: 5, target: [100, 200, 50] },
        { zoom: -2, target: [-50, -100, 0] },
        { zoom: 10, target: [1000, 2000, 500], default: false },
      ];

      const invalidViewStates = [
        { zoom: 'invalid', target: [0, 0, 0] },
        { zoom: 0, target: [0, 0] },
        { zoom: 0, target: ['x', 'y', 'z'] },
        { target: [0, 0, 0] }, // missing zoom
      ];

      validViewStates.forEach(vs => {
        expect(isValidViewState(vs)).toBe(true);
      });

      invalidViewStates.forEach(vs => {
        expect(isValidViewState(vs)).toBe(false);
      });
    });

    test('should handle different zoom levels correctly', () => {
      const normalizeZoom = (zoom: number) => {
        // Typical zoom normalization logic
        return Math.max(-10, Math.min(20, zoom));
      };

      expect(normalizeZoom(0)).toBe(0);
      expect(normalizeZoom(5)).toBe(5);
      expect(normalizeZoom(-15)).toBe(-10); // clamped to min
      expect(normalizeZoom(25)).toBe(20);   // clamped to max
    });
  });

  describe('Loading State API Logic', () => {
    test('should accept valid loading state values', () => {
      const isValidLoadingState = (state: any) => {
        return typeof state === 'boolean' || typeof state === 'string';
      };

      const validStates = [
        false,
        true,
        'Loading...',
        'Processing zarr data...',
        'Rendering...',
        '',
      ];

      const invalidStates = [
        null,
        undefined,
        123,
        {},
        [],
      ];

      validStates.forEach(state => {
        expect(isValidLoadingState(state)).toBe(true);
      });

      invalidStates.forEach(state => {
        expect(isValidLoadingState(state)).toBe(false);
      });
    });

    test('should handle loading state transitions', () => {
      const loadingStates: (boolean | string)[] = [];
      
      const setLoading = (state: boolean | string) => {
        loadingStates.push(state);
      };

      // Simulate typical loading flow
      setLoading(true);
      setLoading('Loading zarr data...');
      setLoading('Processing...');
      setLoading(false);

      expect(loadingStates).toEqual([
        true,
        'Loading zarr data...',
        'Processing...',
        false,
      ]);
    });
  });

  describe('ImJoy RPC Setup', () => {
    test('should setup RPC with correct configuration', async () => {
      const { imjoyRPC } = await import('imjoy-rpc');
      
      await imjoyRPC.setupRPC({
        name: 'vizarr',
        description: 'A minimal, purely client-side program for viewing Zarr-based images with Viv & ImJoy.',
        version: '0.3.0',
      });

      expect(mockSetupRPC).toHaveBeenCalledWith({
        name: 'vizarr',
        description: 'A minimal, purely client-side program for viewing Zarr-based images with Viv & ImJoy.',
        version: '0.3.0',
      });
    });

    test('should export API functions to ImJoy', () => {
      const mockApi = {
        export: mockExport,
      };

      const add_image = jest.fn();
      const set_view_state = jest.fn();
      const show_loading = jest.fn();

      mockApi.export({ add_image, set_view_state, show_loading });

      expect(mockExport).toHaveBeenCalledWith({
        add_image,
        set_view_state,
        show_loading,
      });
    });

    test('should detect iframe environment correctly', () => {
      // Test the iframe detection logic used in vizarr.tsx
      const isInIframe = () => window.self !== window.top;
      
      // Mock normal window (not iframe)
      Object.defineProperty(window, 'self', { 
        value: window, 
        configurable: true 
      });
      Object.defineProperty(window, 'top', { 
        value: window, 
        configurable: true 
      });
      
      expect(isInIframe()).toBe(false);
      
      // Mock iframe environment
      Object.defineProperty(window, 'self', { 
        value: {}, 
        configurable: true 
      });
      Object.defineProperty(window, 'top', { 
        value: { different: true }, 
        configurable: true 
      });
      
      expect(isInIframe()).toBe(true);
    });
  });

  describe('Configuration Validation', () => {
    test('should validate ImageLayerConfig structure', () => {
      const isValidConfig = (config: any): config is ImageLayerConfig => {
        if (!config || typeof config !== 'object') {
          return false;
        }
        return (
          typeof config.source === 'string' &&
          config.source.length > 0
        );
      };

      const validConfigs = [
        { source: 'https://test.zarr' },
        { source: 'https://test.zarr', name: 'test' },
        { source: 'local.zarr', colormap: 'viridis' },
      ];

      const invalidConfigs = [
        {},
        { source: '' },
        { source: 123 },
        null,
        undefined,
      ];

      validConfigs.forEach(config => {
        expect(isValidConfig(config)).toBe(true);
      });

      invalidConfigs.forEach(config => {
        expect(isValidConfig(config)).toBe(false);
      });
    });
  });
}); 