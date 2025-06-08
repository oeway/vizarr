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
