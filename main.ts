import debounce from "just-debounce-it";
import * as vizarr from "./src/index";
import { hyphaWebsocketClient } from "hypha-rpc";

async function main() {
  console.log(`vizarr v${vizarr.version}: https://github.com/hms-dbmi/vizarr`);
  // biome-ignore lint/style/noNonNullAssertion: We know the element exists
  const viewer = await vizarr.createViewer(document.querySelector("#root")!);
  const url = new URL(window.location.href);

  // Initialize HyphaCore integration only when running in an iframe
  const isInIframe = window.self !== window.top;
  
  if (isInIframe) {
    try {
      console.log("Running in iframe - connecting to Hypha Core...");
      // @ts-expect-error - TODO: fix this
      const api = await hyphaWebsocketClient.setupLocalClient({
        enable_execution: false,
      });
    console.log("✅ Connected to Hypha Core successfully", api);

    // Export viewer services to make them available via window proxy
    await api.export({
      
      async addImage(config: vizarr.ImageLayerConfig) {
        console.log("📸 addImage called via HyphaCore API:", config);
        try {
          viewer.addImage(config);
          console.log("✅ Image added successfully");
          return {
            success: true,
            message: "Image added successfully",
            config: config
          };
        } catch (error) {
          console.error("❌ Error adding image:", error);
          throw new Error(`Failed to add image: ${error instanceof Error ? error.message : String(error)}`);
        }
      },

      async add_shapes(shapes: any[], options: any = {}) {
        console.log("🎨 add_shapes called via HyphaCore API:", { shapesCount: shapes.length, options });
        try {
          // Create a new annotation layer
          const layerId = `annotation-layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const layerName = options.name || `Annotation ${Date.now()}`;
          
          // Convert shapes to GeoJSON features
          const features = shapes.map((shape, index) => {
            let geometry;
            
            // Handle different shape types
            if (options.shape_type === 'polygon' || !options.shape_type) {
              geometry = {
                type: 'Polygon',
                coordinates: [shape] // Polygon coordinates should be an array of rings
              };
            } else if (options.shape_type === 'path') {
              geometry = {
                type: 'LineString',
                coordinates: shape
              };
            } else if (options.shape_type === 'rectangle') {
              // Rectangle should be 4 points
              geometry = {
                type: 'Polygon',
                coordinates: [shape]
              };
            }
            
            return {
              id: `feature-${index}-${Date.now()}`,
              type: 'Feature',
              geometry,
              properties: {
                label: options.label || '',
                edge_color: options.edge_color || '#ff8c00',
                face_color: options.face_color || 'rgba(255, 140, 0, 0.3)',
                edge_width: options.edge_width || 2,
                size: options.size || 1
              }
            };
          });

          // Wait for annotation controller to be available
          let annotationController = (window as any).annotationController;
          let retries = 0;
          const maxRetries = 50; // Wait up to 5 seconds
          
          while (!annotationController && retries < maxRetries) {
            console.log(`⏳ Waiting for annotation controller... (${retries + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, 100));
            annotationController = (window as any).annotationController;
            retries++;
          }

          if (!annotationController) {
            throw new Error("Annotation controller not available after waiting. Make sure Vizarr is fully loaded with annotation system.");
          }

          console.log("✅ Annotation controller found, adding layer...");
          await annotationController.addAnnotationLayer({
            id: layerId,
            name: layerName,
            features: features,
            visible: true,
            selectedFeatureIndexes: []
          });

          // Return layer API object with _rintf marked functions
          const layerAPI = {
            id: layerId,
            name: layerName,
            
            get_features: Object.assign(async function() {
              console.log("🔍 get_features called for layer:", layerId);
              const controller = (window as any).annotationController;
              if (!controller) {
                throw new Error("Annotation controller not available");
              }
              return await controller.getLayerFeatures(layerId);
            }, { _rintf: true }),
            
            set_features: Object.assign(async function(features: any[]) {
              console.log("📝 set_features called for layer:", layerId, "features:", features.length);
              const controller = (window as any).annotationController;
              if (!controller) {
                throw new Error("Annotation controller not available");
              }
              await controller.setLayerFeatures(layerId, features);
            }, { _rintf: true }),
            
            add_feature: Object.assign(async function(feature: any) {
              console.log("➕ add_feature called for layer:", layerId);
              const controller = (window as any).annotationController;
              if (!controller) {
                throw new Error("Annotation controller not available");
              }
              await controller.addFeatureToLayer(layerId, feature);
            }, { _rintf: true }),
            
            add_features: Object.assign(async function(features: any[]) {
              console.log("➕ add_features called for layer:", layerId, "count:", features.length);
              const controller = (window as any).annotationController;
              if (!controller) {
                throw new Error("Annotation controller not available");
              }
              await controller.addFeaturesToLayer(layerId, features);
            }, { _rintf: true }),
            
            remove_feature: Object.assign(async function(id: string) {
              console.log("🗑️ remove_feature called for layer:", layerId, "feature:", id);
              const controller = (window as any).annotationController;
              if (!controller) {
                throw new Error("Annotation controller not available");
              }
              await controller.removeFeatureFromLayer(layerId, id);
            }, { _rintf: true }),
            
            remove_features: Object.assign(async function(ids: string[]) {
              console.log("🗑️ remove_features called for layer:", layerId, "features:", ids);
              const controller = (window as any).annotationController;
              if (!controller) {
                throw new Error("Annotation controller not available");
              }
              await controller.removeFeaturesFromLayer(layerId, ids);
            }, { _rintf: true }),
            
            clear_features: Object.assign(async function() {
              console.log("🧹 clear_features called for layer:", layerId);
              const controller = (window as any).annotationController;
              if (!controller) {
                throw new Error("Annotation controller not available");
              }
              await controller.clearLayerFeatures(layerId);
            }, { _rintf: true }),
            
            update_feature: Object.assign(async function(id: string, new_feature: any) {
              console.log("✏️ update_feature called for layer:", layerId, "feature:", id);
              const controller = (window as any).annotationController;
              if (!controller) {
                throw new Error("Annotation controller not available");
              }
              await controller.updateFeatureInLayer(layerId, id, new_feature);
            }, { _rintf: true }),
            
            select_feature: Object.assign(async function(id: string) {
              console.log("🎯 select_feature called for layer:", layerId, "feature:", id);
              const controller = (window as any).annotationController;
              if (!controller) {
                throw new Error("Annotation controller not available");
              }
              await controller.selectFeatureInLayer(layerId, id);
            }, { _rintf: true }),
            
            select_features: Object.assign(async function(ids: string[]) {
              console.log("🎯 select_features called for layer:", layerId, "features:", ids);
              const controller = (window as any).annotationController;
              if (!controller) {
                throw new Error("Annotation controller not available");
              }
              await controller.selectFeaturesInLayer(layerId, ids);
            }, { _rintf: true }),
            
            update_config: Object.assign(async function(config: any) {
              console.log("⚙️ update_config called for layer:", layerId, "config:", config);
              const controller = (window as any).annotationController;
              if (!controller) {
                throw new Error("Annotation controller not available");
              }
              await controller.updateLayerConfig(layerId, config);
            }, { _rintf: true })
          };

          console.log("✅ Annotation layer created successfully:", layerId);
          return layerAPI;
        } catch (error) {
          console.error("❌ Error creating annotation layer:", error);
          throw new Error(`Failed to create annotation layer: ${error instanceof Error ? error.message : String(error)}`);
        }
      },

      async get_layers() {
        console.log("📋 get_layers called via HyphaCore API");
        try {
          const annotationController = (window as any).annotationController;
          if (annotationController) {
            const layers = await annotationController.getAllLayers();
            return {
              success: true,
              layers: layers
            };
          }
          return {
            success: true,
            layers: []
          };
        } catch (error) {
          console.error("❌ Error getting layers:", error);
          throw new Error(`Failed to get layers: ${error instanceof Error ? error.message : String(error)}`);
        }
      },

      async remove_layer(layerId: string) {
        console.log("🗑️ remove_layer called via HyphaCore API:", layerId);
        try {
          const annotationController = (window as any).annotationController;
          if (annotationController) {
            await annotationController.removeLayer(layerId);
            return {
              success: true,
              message: "Layer removed successfully"
            };
          }
          throw new Error("Annotation controller not available");
        } catch (error) {
          console.error("❌ Error removing layer:", error);
          throw new Error(`Failed to remove layer: ${error instanceof Error ? error.message : String(error)}`);
        }
      },

      async get_layer(layerId: string) {
        console.log("🔍 get_layer called via HyphaCore API:", layerId);
        try {
          const annotationController = (window as any).annotationController;
          if (annotationController) {
            const features = await annotationController.getLayerFeatures(layerId);
            const layers = await annotationController.getAllLayers();
            const layerInfo = layers.find((l: any) => l.id === layerId);
            
            if (!layerInfo) {
              throw new Error(`Layer with ID ${layerId} not found`);
            }

            // Return layer API object similar to add_shapes return value with _rintf marked functions
            const layerAPI = {
              id: layerId,
              name: layerInfo.name,
              
              get_features: Object.assign(async function() {
                return await annotationController.getLayerFeatures(layerId);
              }, { _rintf: true }),
              
              set_features: Object.assign(async function(features: any[]) {
                await annotationController.setLayerFeatures(layerId, features);
              }, { _rintf: true }),
              
              add_feature: Object.assign(async function(feature: any) {
                await annotationController.addFeatureToLayer(layerId, feature);
              }, { _rintf: true }),
              
              add_features: Object.assign(async function(features: any[]) {
                await annotationController.addFeaturesToLayer(layerId, features);
              }, { _rintf: true }),
              
              remove_feature: Object.assign(async function(id: string) {
                await annotationController.removeFeatureFromLayer(layerId, id);
              }, { _rintf: true }),
              
              remove_features: Object.assign(async function(ids: string[]) {
                await annotationController.removeFeaturesFromLayer(layerId, ids);
              }, { _rintf: true }),
              
              clear_features: Object.assign(async function() {
                await annotationController.clearLayerFeatures(layerId);
              }, { _rintf: true }),
              
              update_feature: Object.assign(async function(id: string, new_feature: any) {
                await annotationController.updateFeatureInLayer(layerId, id, new_feature);
              }, { _rintf: true }),
              
              select_feature: Object.assign(async function(id: string) {
                await annotationController.selectFeatureInLayer(layerId, id);
              }, { _rintf: true }),
              
              select_features: Object.assign(async function(ids: string[]) {
                await annotationController.selectFeaturesInLayer(layerId, ids);
              }, { _rintf: true }),
              
              update_config: Object.assign(async function(config: any) {
                await annotationController.updateLayerConfig(layerId, config);
              }, { _rintf: true })
            };

            return {
              success: true,
              layer: layerAPI,
              info: layerInfo
            };
          }
          throw new Error("Annotation controller not available");
        } catch (error) {
          console.error("❌ Error getting layer:", error);
          throw new Error(`Failed to get layer: ${error instanceof Error ? error.message : String(error)}`);
        }
      },
      
      async setViewState(viewState: vizarr.ViewState) {
        console.log("🗺️ setViewState called via HyphaCore API:", viewState);
        try {
          viewer.setViewState(viewState);
          console.log("✅ View state updated successfully");
          return {
            success: true,
            message: "View state updated successfully",
            viewState: viewState
          };
        } catch (error) {
          console.error("❌ Error setting view state:", error);
          throw new Error(`Failed to set view state: ${error instanceof Error ? error.message : String(error)}`);
        }
      },
      
      async getViewState() {
        console.log("📍 getViewState called via HyphaCore API");
        return new Promise((resolve) => {
          // Get current view state by listening to the next viewStateChange event
          viewer.on("viewStateChange", (viewState: vizarr.ViewState) => {
            resolve({
              success: true,
              viewState: viewState
            });
          });
          
          // Trigger a small view state change to get current state
          // This is a workaround since viewer doesn't have a direct getViewState method
          const currentUrl = new URL(window.location.href);
          const currentViewState = currentUrl.searchParams.get("viewState");
          if (currentViewState) {
            try {
              resolve({
                success: true,
                viewState: JSON.parse(currentViewState)
              });
            } catch (e) {
              resolve({
                success: false,
                error: "Could not parse current view state"
              });
            }
          } else {
            resolve({
              success: false,
              error: "No view state available"
            });
          }
        });
      },
      
      async destroy() {
        console.log("🗑️ destroy called via HyphaCore API");
        try {
          viewer.destroy();
          console.log("✅ Viewer destroyed successfully");
          return {
            success: true,
            message: "Viewer destroyed successfully"
          };
        } catch (error) {
          console.error("❌ Error destroying viewer:", error);
          throw new Error(`Failed to destroy viewer: ${error instanceof Error ? error.message : String(error)}`);
        }
      },

      async getVersion() {
        console.log("ℹ️ getVersion called via HyphaCore API");
        return {
          success: true,
          version: vizarr.version,
          name: "Vizarr",
          repository: "https://github.com/hms-dbmi/vizarr"
        };
      }
    });

    console.log("✅ Vizarr services exported to Hypha Core");
    
      // Store API reference globally for debugging
      (window as any).hyphaApi = api;
      
    } catch (error) {
      console.warn("⚠️ Hypha Core connection failed - falling back to standalone mode:", error);
      // Continue with normal operation even if HyphaCore connection fails
    }
  } else {
    console.log("🏠 Running in standalone mode - Hypha Core connection disabled");
  }

  // Handle URL parameters for direct image loading (backward compatibility)
  if (url.searchParams.has("source")) {
    console.log("📂 Loading image from URL parameters...");
    
    // see if we have initial viewState
    const viewStateString = url.searchParams.get("viewState");
    if (viewStateString) {
      const viewState = JSON.parse(viewStateString);
      viewer.setViewState(viewState);
    }

    // Add event listener to sync viewState as query param.
    // Debounce to limit how quickly we are pushing to browser history
    viewer.on(
      "viewStateChange",
      debounce((update: vizarr.ViewState) => {
        const url = new URL(window.location.href);
        url.searchParams.set("viewState", JSON.stringify(update));
        window.history.pushState({}, "", decodeURIComponent(url.href));
      }, 200),
    );

    // parse image config
    // @ts-expect-error - TODO: validate config
    const config: vizarr.ImageLayerConfig = {};

    for (const [key, value] of url.searchParams) {
      // @ts-expect-error - TODO: validate config
      config[key] = value;
    }

    // Make sure the source URL is decoded.
    viewer.addImage(config);

    const newLocation = decodeURIComponent(url.href);

    // Only update history if the new location is different from the current
    if (window.location.href !== newLocation) {
      window.history.pushState(null, "", newLocation);
    }
  } else {
    console.log("🎯 Vizarr ready - waiting for API calls or manual image loading");
  }
}

main();
