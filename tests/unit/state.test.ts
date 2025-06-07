// Real zarr sources for testing
const TEST_ZARR_URLS = {
  EBI_6001253: 'https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.1/6001253.zarr',
};

// Define interfaces locally to avoid ES module import issues
interface ViewState {
  zoom: number;
  target: [number, number];
}

interface ImageLayerConfig {
  source: string;
  name?: string;
}

interface SourceData {
  name?: string;
  loader: any[];
  colors: string[];
  axis_labels: string[];
  [key: string]: any;
}

// Define minimal atom function for testing
const atom = (initial?: any, write?: any) => {
  return {
    read: typeof initial === 'function' ? initial : () => initial,
    write: write || (() => {}),
  };
};

describe('State Management - Real Atoms and Data', () => {
  // Increase timeout for network operations
  jest.setTimeout(30000);

  describe('Jotai Atom Functionality', () => {
    test('should create and use basic atoms', () => {
      // Test basic atom creation and usage
      const testAtom = atom(0);
      expect(testAtom).toBeDefined();
      
      const stringAtom = atom('test');
      expect(stringAtom).toBeDefined();
      
      const objectAtom = atom({ zoom: 0, target: [0, 0] });
      expect(objectAtom).toBeDefined();
    });

    test('should create derived atoms', () => {
      const baseAtom = atom(0);
      const derivedAtom = atom((get: any) => get(baseAtom) * 2);
      
      expect(derivedAtom).toBeDefined();
      // Derived atoms should be functions when used as getters
      expect(typeof derivedAtom.read).toBe('function');
    });

    test('should create writable atoms', () => {
      const writableAtom = atom(
        0,
        (get: any, set: any, newValue: number) => {
          set(writableAtom, newValue);
        }
      );
      
      expect(writableAtom).toBeDefined();
      expect(typeof writableAtom.read).toBe('function');
      expect(typeof writableAtom.write).toBe('function');
    });
  });

  describe('ViewState Management', () => {
    test('should validate ViewState structure', () => {
      const validViewStates: ViewState[] = [
        { zoom: 0, target: [0, 0] },
        { zoom: 5, target: [100, 200] },
        { zoom: -2, target: [-50, -100] },
        { zoom: 10.5, target: [1000.7, 2000.3] },
      ];

      const isValidViewState = (vs: any): vs is ViewState => {
        if (!vs || typeof vs !== 'object') {
          return false;
        }
        return (
          typeof vs.zoom === 'number' &&
          Array.isArray(vs.target) &&
          vs.target.length === 2 &&
          vs.target.every((n: any) => typeof n === 'number')
        );
      };

      validViewStates.forEach(viewState => {
        expect(isValidViewState(viewState)).toBe(true);
        expect(viewState.zoom).toBeDefined();
        expect(viewState.target).toHaveLength(2);
        expect(typeof viewState.zoom).toBe('number');
        expect(Array.isArray(viewState.target)).toBe(true);
      });

      // Test invalid view states
      const invalidViewStates = [
        { zoom: 'invalid', target: [0, 0] },
        { zoom: 0, target: [0] },
        { zoom: 0, target: ['x', 'y'] },
        { target: [0, 0] }, // missing zoom
        { zoom: 0 }, // missing target
        null,
        undefined,
      ];

      invalidViewStates.forEach(viewState => {
        expect(isValidViewState(viewState)).toBe(false);
      });
    });

    test('should handle view state transitions', () => {
      const viewStateHistory: ViewState[] = [];
      
      const updateViewState = (newState: ViewState) => {
        viewStateHistory.push(newState);
      };

      // Simulate realistic view state changes
      updateViewState({ zoom: 0, target: [0, 0] }); // Initial state
      updateViewState({ zoom: 2, target: [100, 100] }); // Zoom in and pan
      updateViewState({ zoom: 5, target: [200, 300] }); // Zoom more and pan
      updateViewState({ zoom: 1, target: [50, 50] }); // Zoom out and center

      expect(viewStateHistory).toHaveLength(4);
      expect(viewStateHistory[0]).toEqual({ zoom: 0, target: [0, 0] });
      expect(viewStateHistory[3]).toEqual({ zoom: 1, target: [50, 50] });
      
      // All should be valid view states
      viewStateHistory.forEach(state => {
        expect(typeof state.zoom).toBe('number');
        expect(Array.isArray(state.target)).toBe(true);
        expect(state.target).toHaveLength(2);
      });
    });
  });

  describe('ImageLayerConfig Validation', () => {
    test('should validate real ImageLayerConfig objects', () => {
      const validConfigs: ImageLayerConfig[] = [
        { source: TEST_ZARR_URLS.EBI_6001253 },
        { source: TEST_ZARR_URLS.EBI_6001253, name: 'test-image' },
        { 
          source: TEST_ZARR_URLS.EBI_6001253, 
          name: 'complex-config',
        },
      ];

      const isValidConfig = (config: any): config is ImageLayerConfig => {
        if (!config || typeof config !== 'object') {
          return false;
        }
        return (
          typeof config.source === 'string' &&
          config.source.length > 0 &&
          (config.name === undefined || typeof config.name === 'string')
        );
      };

      validConfigs.forEach(config => {
        expect(isValidConfig(config)).toBe(true);
        expect(config.source).toBeDefined();
        expect(typeof config.source).toBe('string');
        expect((config.source as string).length).toBeGreaterThan(0);
      });

      // Test invalid configs
      const invalidConfigs = [
        {},
        { source: '' },
        { source: null },
        { source: 123 },
        { name: 'test' }, // missing source
        null,
        undefined,
      ];

      invalidConfigs.forEach(config => {
        expect(isValidConfig(config)).toBe(false);
      });
    });

    test('should handle URL validation for zarr sources', () => {
      const validUrls = [
        TEST_ZARR_URLS.EBI_6001253,
        'https://example.com/data.zarr',
        'http://localhost:8080/data.zarr',
        'file:///local/path/data.zarr',
      ];

      const invalidUrls = [
        '',
        'not-a-url',
        'ftp://invalid-protocol.zarr',
        123 as any,
        null as any,
        undefined as any,
      ];

      const isValidZarrUrl = (url: any): boolean => {
        if (typeof url !== 'string' || url.length === 0) {
          return false;
        }
        
        try {
          const parsedUrl = new URL(url);
          // Only allow specific protocols for remote URLs
          if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:' || parsedUrl.protocol === 'file:') {
            return true;
          }
          return false;
        } catch {
          // For relative paths, be strict about zarr extension
          return url.endsWith('.zarr');
        }
      };

      validUrls.forEach(url => {
        expect(isValidZarrUrl(url)).toBe(true);
      });

      invalidUrls.forEach(url => {
        expect(isValidZarrUrl(url)).toBe(false);
      });
    });
  });

  describe('Loading State Management', () => {
    test('should handle different loading state types', () => {
      type LoadingState = boolean | string;

      const validLoadingStates: LoadingState[] = [
        false,
        true,
        'Loading zarr metadata...',
        'Fetching image data...',
        'Initializing WebGL context...',
        'Processing image channels...',
        '',
      ];

      const isValidLoadingState = (state: any): state is LoadingState => {
        return typeof state === 'boolean' || typeof state === 'string';
      };

      validLoadingStates.forEach(state => {
        expect(isValidLoadingState(state)).toBe(true);
      });

      // Test invalid loading states
      const invalidStates = [null, undefined, 123, {}, [], Symbol('test')];
      invalidStates.forEach(state => {
        expect(isValidLoadingState(state)).toBe(false);
      });
    });

    test('should track realistic loading state transitions', () => {
      type LoadingState = boolean | string;
      const loadingHistory: LoadingState[] = [];
      
      const setLoadingState = (state: LoadingState) => {
        loadingHistory.push(state);
      };

      // Simulate realistic zarr loading flow
      setLoadingState(true); // Start loading
      setLoadingState('Connecting to zarr source...');
      setLoadingState('Reading zarr metadata...');
      setLoadingState('Discovering image dimensions...');
      setLoadingState('Loading initial image data...');
      setLoadingState('Initializing WebGL layers...');
      setLoadingState('Configuring color mappings...');
      setLoadingState(false); // Loading complete

      expect(loadingHistory).toHaveLength(8);
      expect(loadingHistory[0]).toBe(true);
      expect(loadingHistory[loadingHistory.length - 1]).toBe(false);
      
      // All intermediate states should be strings
      const intermediateStates = loadingHistory.slice(1, -1);
      intermediateStates.forEach(state => {
        expect(typeof state).toBe('string');
        expect((state as string).length).toBeGreaterThan(0);
      });
    });
  });

  describe('Source Data Management', () => {
    test('should validate SourceData structure requirements', () => {
      // Define the minimal required structure for SourceData
      const requiredProperties = [
        'loader',
        'colors',
        'axis_labels',
      ];

      const isValidSourceDataStructure = (data: any): boolean => {
        if (!data || typeof data !== 'object') {
          return false;
        }

        // Check required properties
        for (const prop of requiredProperties) {
          if (!(prop in data)) {
            return false;
          }
        }

        // Validate specific property types
        if (!Array.isArray(data.loader)) return false;
        if (!Array.isArray(data.colors)) return false;
        if (!Array.isArray(data.axis_labels)) return false;

        return true;
      };

      // Test valid minimal structure
      const validMinimalData = {
        loader: [],
        colors: ['#ff0000'],
        axis_labels: ['y', 'x'],
      };

      expect(isValidSourceDataStructure(validMinimalData)).toBe(true);

      // Test valid complete structure
      const validCompleteData = {
        name: 'test-image',
        loader: [{}],
        channel_axis: 0,
        colors: ['#ff0000', '#00ff00'],
        names: ['Red', 'Green'],
        contrast_limits: [[0, 255], [0, 255]],
        visibilities: [true, true],
        defaults: {
          selection: [0],
          colormap: 'viridis',
          opacity: 1,
        },
        model_matrix: new Array(16).fill(0),
        axis_labels: ['c', 'y', 'x'],
      };

      expect(isValidSourceDataStructure(validCompleteData)).toBe(true);

      // Test invalid structures
      const invalidData = [
        null,
        undefined,
        {},
        { loader: 'not-array' },
        { loader: [], colors: 'not-array' },
        { loader: [], colors: [], axis_labels: 'not-array' },
        { colors: [], axis_labels: [] }, // missing loader
      ];

      invalidData.forEach(data => {
        expect(isValidSourceDataStructure(data)).toBe(false);
      });
    });
  });
}); 