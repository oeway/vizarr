# Debugging Annotation Issues

## Common Issues and Solutions

### Issue 1: Polygon drawing doesn't stop on mouse up

**Cause**: This is expected behavior with `DrawPolygonMode`. Unlike `DrawPolygonByDraggingMode`, this mode requires clicking individual points.

**Solution**: 
- Click individual points to create polygon vertices
- Double-click to complete the polygon
- The system will automatically switch back to view mode

### Issue 2: Polygon doesn't persist after completion

**Cause**: State management or event handling issues.

**Debugging steps**:

1. **Check console logs**: The system logs edit events, look for:
   ```
   Edit event: { updatedData: {...}, editType: "addFeature", ... }
   Polygon completed, switching to view mode
   ```

2. **Verify feature count**: Check if features are being added:
   ```javascript
   // In handleEdit callback
   console.log('Feature count:', updatedData.features.length);
   ```

3. **Check layer recreation**: The layer should not be recreated unnecessarily:
   - Layer is created with `useMemo` to prevent unnecessary recreations
   - Only recreated when mode changes or features change

## Expected Behavior

### Drawing Process
1. Click pencil button → Drawing mode active (orange button)
2. Click points on the image → Orange polygon outline appears
3. Double-click → Polygon completes and is added to features
4. System automatically switches to view mode
5. Polygon persists and is visible

### Event Flow
```
User clicks pencil → isDrawing = true → mode = DrawPolygonMode
User clicks points → tentative polygon shows
User double-clicks → onEdit called with editType: "addFeature"
Polygon completed → isDrawing = false → mode = ViewMode
```

## Troubleshooting

### If polygon doesn't complete:
- Make sure to double-click the last point
- Check console for error messages
- Verify the `selectedFeatureIndexes` is properly set (should be empty array)

### If polygon disappears:
- Check if `handleEdit` is called with correct data
- Verify that `setFeatures` is updating state correctly
- Ensure the layer is not being recreated inappropriately

### Performance issues:
- The layer uses `useMemo` to prevent unnecessary recreations
- Edit events should not cause layer recreation

## Code Examples

### Minimal test setup:
```tsx
const [features, setFeatures] = useState({
  type: 'FeatureCollection',
  features: []
});

const handleEdit = (editResult) => {
  console.log('Edit result:', editResult);
  setFeatures(editResult.updatedData);
};

// In render:
<AnnotationController 
  onFeaturesChange={handleEdit}
  onLayerChange={setAnnotationLayer}
/>
```

### Debug the edit callback:
```tsx
const handleEdit = useCallback((editResult: any) => {
  console.log('=== EDIT EVENT ===');
  console.log('Edit type:', editResult.editType);
  console.log('Feature count:', editResult.updatedData.features.length);
  console.log('Full edit result:', editResult);
  
  setFeatures(editResult.updatedData);
}, []);
``` 