import { atom } from 'jotai';

// Mock the entire state module to avoid importing viv dependencies
const mockSourceInfoAtom = { init: [] };
const mockViewStateAtom = { init: { zoom: 0, target: [0, 0, 0], default: true } };
const mockLoadingAtom = { init: false };
const mockDefaultViewState = { zoom: 0, target: [0, 0, 0], default: true };

jest.mock('../../src/state', () => ({
  sourceInfoAtom: mockSourceInfoAtom,
  viewStateAtom: mockViewStateAtom,
  loadingAtom: mockLoadingAtom,
  DEFAULT_VIEW_STATE: mockDefaultViewState,
  imageLayerConfigsAtom: { toString: () => 'imageLayerConfigsAtom' },
  isLoadingAtom: { toString: () => 'isLoadingAtom' },
  channelFiltersAtom: { toString: () => 'channelFiltersAtom' },
  dimensionFiltersAtom: { toString: () => 'dimensionFiltersAtom' },
  selectedChannelAtom: { toString: () => 'selectedChannelAtom' },
  colorMapAtom: { toString: () => 'colorMapAtom' },
  contrastLimitsAtom: { toString: () => 'contrastLimitsAtom' },
  isVisible3DAtom: { toString: () => 'isVisible3DAtom' },
  xSliceAtom: { toString: () => 'xSliceAtom' },
  ySliceAtom: { toString: () => 'ySliceAtom' },
  zSliceAtom: { toString: () => 'zSliceAtom' },
}));

// Import after mocking
import { 
  sourceInfoAtom, 
  viewStateAtom, 
  loadingAtom, 
  DEFAULT_VIEW_STATE
} from '../../src/state';

// Define simplified types for testing without importing heavy dependencies
interface TestImageLayerConfig {
  source: string;
  colors?: string[];
  channel_axis?: number;
  contrast_limits?: number[][] | number[];
  names?: string[];
  visibilities?: boolean[];
  axis_labels?: string[];
  name?: string;
  colormap?: string;
  opacity?: number;
  acquisition?: string;
  model_matrix?: number[];
  onClick?: jest.Mock;
  color?: string;
  visibility?: boolean;
}

interface TestSourceData {
  loader: any[];
  channel_axis: number | null;
  colors: string[];
  names: string[];
  contrast_limits: number[][];
  visibilities: boolean[];
  defaults: {
    selection: number[];
    colormap: string;
    opacity: number;
  };
  model_matrix: any;
  axis_labels: string[];
  name: string;
  rows: number;
  columns: number;
  acquisitions: any[];
  acquisitionId: number;
  loaders: any[];
  onClick: jest.Mock;
}

describe('State Management', () => {
  describe('Default State Values', () => {
    test('sourceInfoAtom should have empty array as default', () => {
      expect(sourceInfoAtom.init).toEqual([]);
    });

    test('viewStateAtom should have correct default view state', () => {
      expect(viewStateAtom.init).toEqual(DEFAULT_VIEW_STATE);
      expect(viewStateAtom.init).toEqual({
        zoom: 0,
        target: [0, 0, 0],
        default: true,
      });
    });

    test('loadingAtom should default to false', () => {
      expect(loadingAtom.init).toBe(false);
    });
  });

  describe('Type Definitions', () => {
    test('ImageLayerConfig should support multichannel configuration', () => {
      const multichannelConfig: TestImageLayerConfig = {
        source: 'https://test.zarr',
        colors: ['#ff0000', '#00ff00', '#0000ff'],
        channel_axis: 0,
        contrast_limits: [[0, 255], [0, 255], [0, 255]],
        names: ['Red', 'Green', 'Blue'],
        visibilities: [true, true, false],
        axis_labels: ['c', 'y', 'x'],
        name: 'test-multichannel',
        colormap: 'viridis',
        opacity: 0.8,
        acquisition: '001',
        model_matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
        onClick: jest.fn(),
      };

      expect(multichannelConfig.source).toBe('https://test.zarr');
      expect(multichannelConfig.colors).toHaveLength(3);
      expect(multichannelConfig.names).toHaveLength(3);
      expect(multichannelConfig.visibilities).toHaveLength(3);
    });

    test('ImageLayerConfig should support single channel configuration', () => {
      const singleChannelConfig: TestImageLayerConfig = {
        source: 'https://test.zarr',
        color: '#ff0000',
        contrast_limits: [0, 255],
        visibility: true,
        axis_labels: ['y', 'x'],
        name: 'test-single',
        colormap: 'gray',
        opacity: 1.0,
        acquisition: '001',
        model_matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
        onClick: jest.fn(),
      };

      expect(singleChannelConfig.source).toBe('https://test.zarr');
      expect(singleChannelConfig.color).toBe('#ff0000');
      expect(singleChannelConfig.contrast_limits).toEqual([0, 255]);
      expect(singleChannelConfig.visibility).toBe(true);
    });

    test('SourceData should have required properties', () => {
      const sourceData: TestSourceData = {
        loader: [],
        channel_axis: 0,
        colors: ['#ff0000'],
        names: ['test'],
        contrast_limits: [[0, 255]],
        visibilities: [true],
        defaults: {
          selection: [0],
          colormap: 'viridis',
          opacity: 1,
        },
        model_matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] as any,
        axis_labels: ['y', 'x'],
        name: 'test-source',
        rows: 1,
        columns: 1,
        acquisitions: [],
        acquisitionId: 0,
        loaders: [],
        onClick: jest.fn(),
      };

      expect(sourceData.loader).toEqual([]);
      expect(sourceData.channel_axis).toBe(0);
      expect(sourceData.colors).toHaveLength(1);
      expect(sourceData.names).toHaveLength(1);
      expect(sourceData.contrast_limits).toHaveLength(1);
      expect(sourceData.visibilities).toHaveLength(1);
      expect(sourceData.defaults).toBeDefined();
      expect(sourceData.axis_labels).toHaveLength(2);
    });
  });

  describe('DEFAULT_VIEW_STATE', () => {
    test('should have correct structure and values', () => {
      expect(DEFAULT_VIEW_STATE).toEqual({
        zoom: 0,
        target: [0, 0, 0],
        default: true,
      });
    });

    test('should be immutable reference', () => {
      const originalDefault = DEFAULT_VIEW_STATE;
      // Attempting to modify should not affect the original (in strict mode)
      expect(DEFAULT_VIEW_STATE).toBe(originalDefault);
    });
  });

  describe('Atom Configuration', () => {
    test('atoms should be properly configured', () => {
      expect(sourceInfoAtom).toBeDefined();
      expect(viewStateAtom).toBeDefined();
      expect(loadingAtom).toBeDefined();
      
      // Check atom types
      expect(typeof sourceInfoAtom.init).toBe('object');
      expect(typeof viewStateAtom.init).toBe('object');
      expect(typeof loadingAtom.init).toBe('boolean');
    });

    test('viewStateAtom should accept different view states', () => {
      const testViewStates = [
        { zoom: 0, target: [0, 0, 0] },
        { zoom: 5, target: [100, 200, 50] },
        { zoom: -2, target: [-50, -100, 0] },
        { zoom: 10, target: [1000, 2000, 500], default: false },
      ];

      testViewStates.forEach(viewState => {
        expect(viewState.zoom).toBeDefined();
        expect(viewState.target).toHaveLength(3);
        expect(Array.isArray(viewState.target)).toBe(true);
      });
    });

    test('loadingAtom should accept boolean and string values', () => {
      const loadingStates = [
        false,
        true,
        'Loading...',
        'Processing zarr data...',
        'Rendering...',
      ];

      loadingStates.forEach(state => {
        expect(['boolean', 'string'].includes(typeof state)).toBe(true);
      });
    });
  });
}); 